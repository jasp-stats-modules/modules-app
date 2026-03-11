import fs from 'node:fs/promises';
import path, { join } from 'node:path';
import { Octokit } from '@octokit/core';
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql';
import chalk from 'chalk';
import { graphql, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import tmp from 'tmp';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';
import type { GqlRelease } from './scrape';
import {
  batchedArray,
  detectMissingArchitectures,
  extractArchitectureFromUrl,
  extractBareSubmodules,
  extractTranslationsFromPoFiles,
  findOlderReleaseWithArchitecture,
  groupByChannel,
  latestReleasePerJaspVersionRange,
  logBareRepoStats,
  logChannelStats,
  logReleaseStatistics,
  nameAndDescriptionFromSubmodules,
  parseDescriptionFile,
  parseDescriptionQml,
  parseReleaseFrontMatter,
  path2channel,
  releaseAssets,
  resolveHomepageUrl,
  transformRelease,
  url2nameWithOwner,
  versionFromTagName,
} from './scrape';
import type { BareRepository, Release, Repository, Submodule } from './types';

describe('url2nameWithOwner', () => {
  test('extracts owner and repo from GitHub URL', () => {
    const url = 'https://github.com/jasp-stats-modules/jaspBain.git';
    expect(url2nameWithOwner(url)).toBe('jasp-stats-modules/jaspBain');
  });

  test('throws error for invalid URL', () => {
    const url = 'https://example.com/not-a-github-url';
    expect(() => url2nameWithOwner(url)).toThrow('Invalid GitHub URL');
  });
});

describe('path2channel', () => {
  test('extracts channel from path', () => {
    expect(path2channel('jasp-modules/jaspAnova')).toBe('jasp-modules');
  });

  test('handles single segment path', () => {
    expect(() => path2channel('standalone')).toThrow('Invalid path');
  });
});

describe('batchedArray', () => {
  test('splits array into batches of specified size', () => {
    const input = [1, 2, 3, 4, 5, 6, 7];
    const result = batchedArray(input, 3);
    expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  test('handles empty array', () => {
    expect(batchedArray([], 5)).toEqual([]);
  });

  test('handles batch size larger than array', () => {
    const input = [1, 2, 3];
    expect(batchedArray(input, 10)).toEqual([[1, 2, 3]]);
  });
});

describe('versionFromTagName', () => {
  test('extracts version from tag name', () => {
    expect(versionFromTagName('0.95.0_2cbd8a6d_R-4-5-1')).toBe('0.95.0');
  });

  test('handles version with multiple dots', () => {
    expect(versionFromTagName('1.2.3.4_abc123_R-4-5-1')).toBe('1.2.3.4');
  });
});

describe('parseReleaseFrontMatter', () => {
  test('extracts version range, description and name', () => {
    const description = `---\njasp: ">=0.95.0"\nname: My Module\ndescription: This is a test module.\n---\n`;
    const result = parseReleaseFrontMatter(description);
    expect(result).toEqual({
      jasp: '>=0.95.0',
      name: 'My Module',
      description: 'This is a test module.',
    });
  });

  test('extracts single quoted version range', () => {
    const description = "---\njasp: '>=0.95.1'\n---\n";
    expect(parseReleaseFrontMatter(description)).toEqual({ jasp: '>=0.95.1' });
  });

  test('extracts double quoted version range', () => {
    const description = '---\njasp: ">=0.95.1"\n---\n';
    expect(parseReleaseFrontMatter(description).jasp).toBe('>=0.95.1');
  });

  test('extracts unquoted version range', () => {
    const description = '---\njasp: >=0.95.1\n---\n';
    expect(parseReleaseFrontMatter(description).jasp).toBe('>=0.95.1');
  });

  test('returns undefined for missing frontmatter', () => {
    const description = 'Just a regular description';
    expect(parseReleaseFrontMatter(description).jasp).toBeUndefined();
  });

  test('returns undefined for missing jasp field', () => {
    const description = '---\nother: value\n---\n';
    expect(parseReleaseFrontMatter(description).jasp).toBeUndefined();
  });
});

describe('latestReleasePerJaspVersionRange', () => {
  test('returns latest release for each version range', () => {
    const input: GqlRelease[] = [
      {
        isDraft: false,
        isPrerelease: false,
        publishedAt: '2025-01-02T00:00:00Z',
        releaseAssets: { nodes: [] },
        tagName: 'v1.1.1',
        description: '---\njasp: >=0.95.1\n---\n',
      },
      {
        isDraft: false,
        isPrerelease: false,
        publishedAt: '2025-01-01T00:00:00Z',
        releaseAssets: { nodes: [] },
        tagName: 'v1.1.0',
        description: '---\njasp: >=0.95.1\n---\n',
      },
      {
        isDraft: false,
        isPrerelease: false,
        publishedAt: '2024-12-02T00:00:00Z',
        releaseAssets: { nodes: [] },
        tagName: 'v1.0.1',
        description: '---\njasp: >=0.95.0\n---\n',
      },
      {
        isDraft: false,
        isPrerelease: false,
        publishedAt: '2024-12-01T00:00:00Z',
        releaseAssets: { nodes: [] },
        tagName: '0.95.5-release.1_3307653d_R-4-5-2_Release',
        description: '---\njasp: >=0.95.0\n---\n',
      },
    ];

    const result = latestReleasePerJaspVersionRange(input, 0);
    expect(result).toEqual([input[0], input[2]]);
  });

  test('skips releases without description', () => {
    const input: GqlRelease[] = [
      {
        isDraft: false,
        isPrerelease: false,
        publishedAt: '2025-01-01T00:00:00Z',
        releaseAssets: { nodes: [] },
        tagName: '0.95.5-release.1_3307653d_R-4-5-2_Release',
        description: undefined,
      },
    ];

    const result = latestReleasePerJaspVersionRange(input, 0);
    expect(result).toEqual([]);
  });

  test('skips releases with invalid description', () => {
    const input: GqlRelease[] = [
      {
        isDraft: false,
        isPrerelease: false,
        publishedAt: '2025-01-01T00:00:00Z',
        releaseAssets: { nodes: [] },
        tagName: '0.95.5-release.1_3307653d_R-4-5-2_Release',
        description: 'No frontmatter here',
      },
    ];

    const result = latestReleasePerJaspVersionRange(input, 0);
    expect(result).toEqual([]);
  });

  test('keeps latest release even with not enough assets', () => {
    const input: GqlRelease[] = [
      {
        isDraft: false,
        isPrerelease: false,
        publishedAt: '2025-01-01T00:00:00Z',
        releaseAssets: { nodes: [] },
        tagName: '0.95.5-release.1_3307653d_R-4-5-2_Release',
        description: '---\njasp: >=0.95.0\n---\n',
      },
    ];

    const result = latestReleasePerJaspVersionRange(input, 1);
    expect(result).toEqual([input[0]]);
  });

  test('appends older release that fills missing architecture', () => {
    const input: GqlRelease[] = [
      {
        isDraft: false,
        isPrerelease: false,
        publishedAt: '2025-01-02T00:00:00Z',
        releaseAssets: {
          nodes: [
            {
              downloadUrl:
                'https://example.com/jaspAnova_1.2.0_MacOS_x86_64_R-4-5-1.JASPModule',
              downloadCount: 10,
            },
            {
              downloadUrl:
                'https://example.com/jaspAnova_1.2.0_MacOS_arm64_R-4-5-1.JASPModule',
              downloadCount: 10,
            },
            {
              downloadUrl:
                'https://example.com/jaspAnova_1.2.0_Flatpak_x86_64_R-4-5-1.JASPModule',
              downloadCount: 10,
            },
          ],
        },
        tagName: '1.2.0_abcdef_R-4-5-1',
        description: '---\njasp: >=0.95.0\n---\n',
      },
      {
        isDraft: false,
        isPrerelease: false,
        publishedAt: '2025-01-01T00:00:00Z',
        releaseAssets: {
          nodes: [
            {
              downloadUrl:
                'https://example.com/jaspAnova_1.1.0_Windows_x86-64_R-4-5-1.JASPModule',
              downloadCount: 20,
            },
          ],
        },
        tagName: '1.1.0_123456_R-4-5-1',
        description: '---\njasp: >=0.95.0\n---\n',
      },
    ];

    const result = latestReleasePerJaspVersionRange(input, 4);
    expect(result).toEqual([input[0], input[1]]);
  });
});

describe('extractArchitectureFromUrl', () => {
  test.each([
    ['jaspAnova_0.95.0_MacOS_x86_64_R-4-5-1.JASPModule', 'MacOS_x86_64'],
    ['jaspAnova_0.95.0_MacOS_x86-64_R-4-5-1.JASPModule', 'MacOS_x86_64'],
    ['jaspAnova_0.95.0_MacOS_arm64_R-4-5-1.JASPModule', 'MacOS_arm64'],
    ['jaspAnova_0.95.0_Windows_x86-64_R-4-5-1.JASPModule', 'Windows_x86-64'],
    ['jaspAnova_0.95.0_Windows_arm64_R-4-5-1.JASPModule', 'Windows_arm64'],
    ['jaspAnova_0.95.0_Flatpak_x86_64_R-4-5-1.JASPModule', 'Flatpak_x86_64'],
    ['jaspAnova_0.95.0_Linux_arm64_R-4-5-1.JASPModule', 'Linux_arm64'],
    [
      'https://github.com/owner/repo/releases/download/0.95.5_ab108567_R-4-5-1_Release/jaspAcceptanceSampling_0.95.5_Flatpak_x86_64_R-4-5-1.JASPModule',
      'Flatpak_x86_64',
    ],
  ])('from %s extracts %s', (url, expected) => {
    expect(extractArchitectureFromUrl(url)).toBe(expected);
  });

  test('throws error for URL without filename', () => {
    expect(() => extractArchitectureFromUrl('https://example.com/')).toThrow(
      'does not contain a filename',
    );
  });

  test('throws error for unknown architecture', () => {
    expect(() =>
      extractArchitectureFromUrl('jaspAnova_0.95.0_UnknownArch.JASPModule'),
    ).toThrow('Unknown architecture in filename');
  });
});

describe('transformRelease', () => {
  test('transforms GqlRelease to Release', () => {
    const input: GqlRelease = {
      isDraft: false,
      isPrerelease: false,
      publishedAt: '2025-01-01T00:00:00Z',
      tagName: '0.95.0_2cbd8a6d_R-4-5-1',
      description:
        '---\njasp: >=0.95.0\nname: My module\ndescription: A description of my module\n---\n',
      releaseAssets: {
        nodes: [
          {
            downloadUrl:
              'https://example.com/module_0.95.0_MacOS_x86_64_R-4-5-1.JASPModule',
            downloadCount: 10,
          },
          {
            downloadUrl:
              'https://example.com/module_0.95.0_Windows_x86-64_R-4-5-1.JASPModule',
            downloadCount: 20,
          },
          {
            downloadUrl: 'https://example.com/module_0.95.0.zip',
            downloadCount: 5,
          },
        ],
      },
    };

    const [result, frontmatter] = transformRelease(input, 'owner/repo');

    expect(result.version).toBe('0.95.0');
    expect(result.jaspVersionRange).toBe('>=0.95.0');
    expect(result.publishedAt).toBe('2025-01-01T00:00:00Z');
    expect(result.assets).toHaveLength(2);
    expect(result.assets[0].architecture).toBe('MacOS_x86_64');
    expect(result.assets[1].architecture).toBe('Windows_x86-64');
    expect(frontmatter).toStrictEqual({
      jasp: '>=0.95.0',
      name: 'My module',
      description: 'A description of my module',
    });
  });

  test('falls back to default JASP version for malformed description', () => {
    const input: GqlRelease = {
      isDraft: false,
      isPrerelease: false,
      publishedAt: '2025-01-01T00:00:00Z',
      tagName: '0.95.0_2cbd8a6d_R-4-5-1',
      description: 'No frontmatter',
      releaseAssets: { nodes: [] },
    };

    const [result] = transformRelease(input, 'owner/repo');
    expect(result.jaspVersionRange).toBe('>=0.95.0');
  });

  test('filters out non-JASPModule assets', () => {
    const input: GqlRelease = {
      isDraft: false,
      isPrerelease: false,
      publishedAt: '2025-01-01T00:00:00Z',
      tagName: '0.95.0_2cbd8a6d_R-4-5-1',
      description: '---\njasp: >=0.95.0\n---\n',
      releaseAssets: {
        nodes: [
          {
            downloadUrl: 'https://example.com/source.tar.gz',
            downloadCount: 5,
          },
          {
            downloadUrl: 'https://example.com/module_MacOS_x86_64.JASPModule',
            downloadCount: 10,
          },
        ],
      },
    };

    const [result, _frontmatter] = transformRelease(input, 'owner/repo');
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].downloadUrl).toContain('.JASPModule');
  });

  test('sorts assets by architecture alphabetically', () => {
    const input: GqlRelease = {
      isDraft: false,
      isPrerelease: false,
      publishedAt: '2025-01-01T00:00:00Z',
      tagName: '0.95.0_2cbd8a6d_R-4-5-1',
      description: '---\njasp: >=0.95.0\n---\n',
      releaseAssets: {
        nodes: [
          {
            downloadUrl: 'https://example.com/module_Windows_x86-64.JASPModule',
            downloadCount: 10,
          },
          {
            downloadUrl: 'https://example.com/module_MacOS_arm64.JASPModule',
            downloadCount: 15,
          },
          {
            downloadUrl: 'https://example.com/module_Flatpak_x86_64.JASPModule',
            downloadCount: 20,
          },
        ],
      },
    };

    const [result, _frontmatter] = transformRelease(input, 'owner/repo');
    expect(result.assets[0].architecture).toBe('Flatpak_x86_64');
    expect(result.assets[1].architecture).toBe('MacOS_arm64');
    expect(result.assets[2].architecture).toBe('Windows_x86-64');
  });
});

describe('releaseAssets', () => {
  const MyOctokit = Octokit.plugin(paginateGraphQL);
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test('fetches release assets for repositories', async () => {
    server.use(
      graphql.operation(({ query }) => {
        // Match queries with 'repository(' (releaseAssets queries)
        if (query.includes('repository(')) {
          return HttpResponse.json({
            data: {
              repository: {
                name: 'jaspAnova',
                nameWithOwner: 'jasp-stats-modules/jaspAnova',
                parent: {
                  nameWithOwner: 'jasp-stats-modules/jaspAnova',
                  owner: {
                    login: 'jasp-stats-modules',
                  },
                },
                releases: {
                  nodes: [
                    {
                      tagName: '0.95.0_2cbd8a6d_R-4-5-1',
                      publishedAt: '2025-01-01T00:00:00Z',
                      description: '---\njasp: >=0.95.0\n---\n',
                      isDraft: false,
                      isPrerelease: false,
                      releaseAssets: {
                        nodes: [
                          {
                            downloadUrl:
                              'https://example.com/jaspAnova_0.95.0_MacOS_x86_64_R-4-5-1.JASPModule',
                            downloadCount: 100,
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          });
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });
    const bareRepos: BareRepository[] = [
      {
        id: 'jaspAnova',
        channels: ['Official'],
        releaseSource: 'jasp-stats-modules/jaspAnova',
        name: 'jaspAnova',
        description: 'Anova module',
        translations: {},
      },
    ];

    const result = await releaseAssets(bareRepos, 1, 20, 20, octokit);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'jaspAnova',
          name: 'jaspAnova',
          releaseSource: 'jasp-stats-modules/jaspAnova',
          channels: ['Official'],
          description: 'Anova module',
          organization: 'jasp-stats-modules',
          translations: {},
          releases: [
            {
              version: '0.95.0',
              jaspVersionRange: '>=0.95.0',
              publishedAt: '2025-01-01T00:00:00Z',
              assets: [
                {
                  downloadUrl:
                    'https://example.com/jaspAnova_0.95.0_MacOS_x86_64_R-4-5-1.JASPModule',
                  architecture: 'MacOS_x86_64',
                  downloadCount: 100,
                },
              ],
            },
          ],
          preReleases: [],
        }),
      ]),
    );
  });

  test('filters out repositories with no releases', async () => {
    server.use(
      graphql.operation(({ query }) => {
        if (query.includes('repository(')) {
          return HttpResponse.json({
            data: {
              repository: {
                name: 'jaspAnova',
                nameWithOwner: 'jasp-stats-modules/jaspAnova',
                parent: {
                  nameWithOwner: 'jasp-stats-modules/jaspAnova',
                  owner: {
                    login: 'jasp-stats-modules',
                  },
                },
                releases: {
                  nodes: [],
                },
              },
            },
          });
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });
    const bareRepos: BareRepository[] = [
      {
        id: 'jaspAnova',
        channels: ['Official'],
        releaseSource: 'jasp-stats-modules/jaspAnova',
        name: 'jaspAnova',
        description: 'Anova module',
        translations: {},
      },
    ];

    const result = await releaseAssets(bareRepos, 1, 20, 20, octokit);

    expect(result).toHaveLength(0);
  });

  test('separates production and pre-releases', async () => {
    server.use(
      graphql.operation(({ query }) => {
        if (query.includes('repository(')) {
          return HttpResponse.json({
            data: {
              repository: {
                name: 'jaspAnova',
                nameWithOwner: 'jasp-stats-modules/jaspAnova',
                parent: {
                  nameWithOwner: 'jasp-stats-modules/jaspAnova',
                  owner: {
                    login: 'jasp-stats-modules',
                  },
                },
                releases: {
                  nodes: [
                    {
                      tagName: '0.95.0_2cbd8a6d_R-4-5-1',
                      publishedAt: '2025-01-01T00:00:00Z',
                      description: '---\njasp: >=0.95.0\n---\n',
                      isDraft: false,
                      isPrerelease: false,
                      releaseAssets: {
                        nodes: [
                          {
                            downloadUrl:
                              'https://example.com/jaspAnova_0.95.0_MacOS_x86_64_R-4-5-1.JASPModule',
                            downloadCount: 100,
                          },
                        ],
                      },
                    },
                    {
                      tagName: '0.96.0_abc123def_R-4-5-1',
                      publishedAt: '2025-01-15T00:00:00Z',
                      description: '---\njasp: >=0.95.0\n---\n',
                      isDraft: false,
                      isPrerelease: true,
                      releaseAssets: {
                        nodes: [
                          {
                            downloadUrl:
                              'https://example.com/jaspAnova_0.96.0_MacOS_x86_64_R-4-5-1.JASPModule',
                            downloadCount: 50,
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          });
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });
    const bareRepos: BareRepository[] = [
      {
        id: 'jaspAnova',
        channels: ['Official'],
        releaseSource: 'jasp-stats-modules/jaspAnova',
        name: 'jaspAnova',
        description: 'Anova module',
        translations: {},
      },
    ];

    const result = await releaseAssets(bareRepos, 1, 20, 20, octokit);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'jaspAnova',
          name: 'jaspAnova',
          releaseSource: 'jasp-stats-modules/jaspAnova',
          channels: ['Official'],
          description: 'Anova module',
          organization: 'jasp-stats-modules',
          translations: {},
          releases: expect.arrayContaining([
            expect.objectContaining({
              version: '0.95.0',
              jaspVersionRange: '>=0.95.0',
              publishedAt: '2025-01-01T00:00:00Z',
              assets: expect.arrayContaining([
                expect.objectContaining({
                  downloadUrl:
                    'https://example.com/jaspAnova_0.95.0_MacOS_x86_64_R-4-5-1.JASPModule',
                  architecture: 'MacOS_x86_64',
                  downloadCount: 100,
                }),
              ]),
            }),
          ]),
          preReleases: expect.arrayContaining([
            expect.objectContaining({
              version: '0.96.0',
              jaspVersionRange: '>=0.95.0',
              publishedAt: '2025-01-15T00:00:00Z',
              assets: expect.arrayContaining([
                expect.objectContaining({
                  downloadUrl:
                    'https://example.com/jaspAnova_0.96.0_MacOS_x86_64_R-4-5-1.JASPModule',
                  architecture: 'MacOS_x86_64',
                  downloadCount: 50,
                }),
              ]),
            }),
          ]),
        }),
      ]),
    );
  });

  test('keeps homepageUrl from bare repository metadata', async () => {
    server.use(
      graphql.operation(({ query }) => {
        if (query.includes('repository(')) {
          return HttpResponse.json({
            data: {
              repository: {
                name: 'jaspAnova',
                nameWithOwner: 'jasp-stats-modules/jaspAnova',
                parent: {
                  nameWithOwner: 'jasp-stats-modules/jaspAnova',
                  owner: {
                    login: 'jasp-stats-modules',
                  },
                },
                releases: {
                  nodes: [
                    {
                      tagName: '0.95.0_2cbd8a6d_R-4-5-1',
                      publishedAt: '2025-01-01T00:00:00Z',
                      description: '---\njasp: >=0.95.0\n---\n',
                      isDraft: false,
                      isPrerelease: false,
                      releaseAssets: {
                        nodes: [
                          {
                            downloadUrl:
                              'https://example.com/jaspAnova_0.95.0_MacOS_x86_64_R-4-5-1.JASPModule',
                            downloadCount: 100,
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          });
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });
    const bareRepos: BareRepository[] = [
      {
        id: 'jaspAnova',
        channels: ['Official'],
        releaseSource: 'jasp-stats-modules/jaspAnova',
        name: 'jaspAnova',
        description: 'Anova module',
        homepageUrl: 'https://example.com/jasp-anova',
        translations: {},
      },
    ];

    const result = await releaseAssets(bareRepos, 1, 20, 20, octokit);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'jaspAnova',
          name: 'jaspAnova',
          releaseSource: 'jasp-stats-modules/jaspAnova',
          homepageUrl: 'https://example.com/jasp-anova',
          channels: ['Official'],
          description: 'Anova module',
          organization: 'jasp-stats-modules',
          translations: {},
          releases: expect.arrayContaining([
            expect.objectContaining({
              version: '0.95.0',
              jaspVersionRange: '>=0.95.0',
              publishedAt: '2025-01-01T00:00:00Z',
              assets: expect.any(Array),
            }),
          ]),
          preReleases: [],
        }),
      ]),
    );
  });

  test('uses parent repository for homepage fallback when homepage is missing', async () => {
    server.use(
      graphql.operation(({ query }) => {
        if (query.includes('repository(')) {
          return HttpResponse.json({
            data: {
              repository: {
                name: 'jaspSyntheticData',
                nameWithOwner: 'jasp-stats-modules/jaspSyntheticData',
                parent: {
                  nameWithOwner: 'doomlab/jasp-synthetic-data',
                  owner: {
                    login: 'doomlab',
                  },
                },
                releases: {
                  nodes: [
                    {
                      tagName: '0.95.0_2cbd8a6d_R-4-5-1',
                      publishedAt: '2025-01-01T00:00:00Z',
                      description: '---\njasp: >=0.95.0\n---\n',
                      isDraft: false,
                      isPrerelease: false,
                      releaseAssets: {
                        nodes: [
                          {
                            downloadUrl:
                              'https://example.com/jaspSyntheticData_0.95.0_MacOS_x86_64_R-4-5-1.JASPModule',
                            downloadCount: 100,
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          });
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });
    const bareRepos: BareRepository[] = [
      {
        id: 'jaspSyntheticData',
        channels: ['Official'],
        releaseSource: 'jasp-stats-modules/jaspSyntheticData',
        name: 'jaspSyntheticData',
        description: 'Synthetic data module',
        translations: {},
      },
    ];

    const result = await releaseAssets(bareRepos, 1, 20, 20, octokit);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'jaspSyntheticData',
          homepageUrl: 'https://github.com/doomlab/jasp-synthetic-data',
          organization: 'doomlab',
        }),
      ]),
    );
  });

  test('handles missing parent organization', async () => {
    server.use(
      graphql.operation(({ query }) => {
        if (query.includes('repository(')) {
          return HttpResponse.json({
            data: {
              repository: {
                name: 'jaspAnova',
                nameWithOwner: 'jasp-stats-modules/jaspAnova',
                releases: {
                  nodes: [
                    {
                      tagName: '0.95.0_2cbd8a6d_R-4-5-1',
                      publishedAt: '2025-01-01T00:00:00Z',
                      description: '---\njasp: >=0.95.0\n---\n',
                      isDraft: false,
                      isPrerelease: false,
                      releaseAssets: {
                        nodes: [
                          {
                            downloadUrl:
                              'https://example.com/jaspAnova_0.95.0_MacOS_x86_64_R-4-5-1.JASPModule',
                            downloadCount: 100,
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          });
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });
    const bareRepos: BareRepository[] = [
      {
        id: 'jaspAnova',
        channels: ['Official'],
        releaseSource: 'jasp-stats-modules/jaspAnova',
        name: 'jaspAnova',
        description: 'Anova module',
        translations: {},
      },
    ];

    const result = await releaseAssets(bareRepos, 1, 20, 20, octokit);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'jaspAnova',
          name: 'jaspAnova',
          releaseSource: 'jasp-stats-modules/jaspAnova',
          channels: ['Official'],
          description: 'Anova module',
          organization: 'unknown_org',
          translations: {},
          releases: expect.arrayContaining([
            expect.objectContaining({
              version: '0.95.0',
              jaspVersionRange: '>=0.95.0',
              publishedAt: '2025-01-01T00:00:00Z',
              assets: expect.arrayContaining([
                expect.objectContaining({
                  downloadUrl:
                    'https://example.com/jaspAnova_0.95.0_MacOS_x86_64_R-4-5-1.JASPModule',
                  architecture: 'MacOS_x86_64',
                  downloadCount: 100,
                }),
              ]),
            }),
          ]),
          preReleases: [],
        }),
      ]),
    );
  });

  test('stops pagination early when latest release is already complete', async () => {
    let callCount = 0;

    server.use(
      graphql.operation(({ query }) => {
        if (!query.includes('repository(')) {
          return HttpResponse.json({ data: {} });
        }

        callCount++;
        return HttpResponse.json({
          data: {
            repository: {
              name: 'jaspAnova',
              nameWithOwner: 'jasp-stats-modules/jaspAnova',
              parent: {
                nameWithOwner: 'jasp-stats-modules/jaspAnova',
                owner: { login: 'jasp-stats-modules' },
              },
              releases: {
                nodes: [
                  {
                    tagName: '1.2.0_abcdef_R-4-5-1',
                    publishedAt: '2025-01-02T00:00:00Z',
                    description: '---\njasp: >=0.95.0\n---\n',
                    isDraft: false,
                    isPrerelease: false,
                    releaseAssets: {
                      nodes: [
                        {
                          downloadUrl:
                            'https://example.com/jaspAnova_1.2.0_MacOS_x86_64_R-4-5-1.JASPModule',
                          downloadCount: 1,
                        },
                        {
                          downloadUrl:
                            'https://example.com/jaspAnova_1.2.0_MacOS_arm64_R-4-5-1.JASPModule',
                          downloadCount: 1,
                        },
                        {
                          downloadUrl:
                            'https://example.com/jaspAnova_1.2.0_Windows_x86-64_R-4-5-1.JASPModule',
                          downloadCount: 1,
                        },
                        {
                          downloadUrl:
                            'https://example.com/jaspAnova_1.2.0_Flatpak_x86_64_R-4-5-1.JASPModule',
                          downloadCount: 1,
                        },
                      ],
                    },
                  },
                ],
                pageInfo: {
                  hasNextPage: true,
                  endCursor: 'cursor-1',
                },
              },
            },
          },
        });
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });
    const bareRepos: BareRepository[] = [
      {
        id: 'jaspAnova',
        channels: ['Official'],
        releaseSource: 'jasp-stats-modules/jaspAnova',
        name: 'jaspAnova',
        description: 'Anova module',
        translations: {},
      },
    ];

    const result = await releaseAssets(bareRepos, 4, 20, 20, octokit);

    expect(result).toHaveLength(1);
    expect(callCount).toBe(1);
  });

  test('stops right after missing architecture is found on later page', async () => {
    server.use(
      graphql.operation(({ query }) => {
        if (!query.includes('repository(')) {
          return HttpResponse.json({ data: {} });
        }
        if (!query.includes('after: ')) {
          return HttpResponse.json({
            data: {
              repository: {
                name: 'jaspAnova',
                nameWithOwner: 'jasp-stats-modules/jaspAnova',
                parent: {
                  nameWithOwner: 'jasp-stats-modules/jaspAnova',
                  owner: { login: 'jasp-stats-modules' },
                },
                releases: {
                  nodes: [
                    {
                      tagName: '1.2.0-release_R-4-5-1',
                      publishedAt: '2025-01-02T00:00:00Z',
                      description: '---\njasp: >=0.95.0\n---\n',
                      isDraft: false,
                      isPrerelease: false,
                      releaseAssets: {
                        nodes: [
                          {
                            downloadUrl:
                              'https://example.com/jaspAnova_1.2.0_MacOS_x86_64_R-4-5-1.JASPModule',
                            downloadCount: 1,
                          },
                          {
                            downloadUrl:
                              'https://example.com/jaspAnova_1.2.0_MacOS_arm64_R-4-5-1.JASPModule',
                            downloadCount: 1,
                          },
                          {
                            downloadUrl:
                              'https://example.com/jaspAnova_1.2.0_Flatpak_x86_64_R-4-5-1.JASPModule',
                            downloadCount: 1,
                          },
                        ],
                      },
                    },
                  ],
                  pageInfo: {
                    hasNextPage: true,
                    endCursor: 'cursor-1',
                  },
                },
              },
            },
          });
        }
        if (query.includes('after: "cursor-1"')) {
          return HttpResponse.json({
            data: {
              repository: {
                name: 'jaspAnova',
                nameWithOwner: 'jasp-stats-modules/jaspAnova',
                parent: {
                  nameWithOwner: 'jasp-stats-modules/jaspAnova',
                  owner: { login: 'jasp-stats-modules' },
                },
                releases: {
                  nodes: [
                    {
                      tagName: '1.1.0_123456_R-4-5-1',
                      publishedAt: '2025-01-01T00:00:00Z',
                      description: '---\njasp: >=0.95.0\n---\n',
                      isDraft: false,
                      isPrerelease: false,
                      releaseAssets: {
                        nodes: [
                          {
                            downloadUrl:
                              'https://example.com/jaspAnova_1.1.0_Windows_x86-64_R-4-5-1.JASPModule',
                            downloadCount: 1,
                          },
                        ],
                      },
                    },
                  ],
                  pageInfo: {
                    hasNextPage: false,
                    endCursor: 'cursor-2',
                  },
                },
              },
            },
          });
        }
        return HttpResponse.json({ data: {} });
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });
    const bareRepos: BareRepository[] = [
      {
        id: 'jaspAnova',
        channels: ['Official'],
        releaseSource: 'jasp-stats-modules/jaspAnova',
        name: 'jaspAnova',
        description: 'Anova module',
        translations: {},
      },
    ];

    const result = await releaseAssets(bareRepos, 4, 1, 1, octokit);

    expect(result).toHaveLength(1);
    expect(result[0].releases).toHaveLength(2);
  });
});

describe('logReleaseStatistics', () => {
  test('returns correct counts and integer average', () => {
    const repositories: Repository[] = [
      {
        id: 'repoA',
        name: 'repoA',
        description: 'A',
        organization: 'org',
        translations: {},
        releaseSource: 'org/repoA',
        channels: [],
        releases: [
          {
            version: '1.0.0',
            publishedAt: '2025-01-01T00:00:00Z',
            assets: [
              {
                downloadUrl: 'u1',
                downloadCount: 0,
                architecture: 'Flatpak_x86_64',
              },
              {
                downloadUrl: 'u2',
                downloadCount: 0,
                architecture: 'MacOS_x86_64',
              },
            ],
          },
        ],
        preReleases: [
          {
            version: '1.0.1',
            publishedAt: '2025-01-02T00:00:00Z',
            assets: [
              {
                downloadUrl: 'u3',
                downloadCount: 0,
                architecture: 'Windows_x86-64',
              },
            ],
          },
        ],
      },
      {
        id: 'repoB',
        name: 'repoB',
        description: 'B',
        organization: 'org',
        translations: {},
        releaseSource: 'org/repoB',
        channels: [],
        releases: [
          {
            version: '1.0.0',
            publishedAt: '2025-01-03T00:00:00Z',
            assets: [
              {
                downloadUrl: 'u4',
                downloadCount: 0,
                architecture: 'Flatpak_x86_64',
              },
              {
                downloadUrl: 'u5',
                downloadCount: 0,
                architecture: 'Linux_arm64',
              },
            ],
          },
        ],
        preReleases: [],
      },
    ];

    const msg = logReleaseStatistics(repositories);
    const expected = [
      'Repositories: 2',
      'Total releases: 2',
      'Total pre-releases: 1',
      'Average number of assets per release: 2',
    ].join('\n');
    expect(msg).toEqual(expected);
  });

  test('returns red formatted average for non-integer average', () => {
    const repositories: Repository[] = [
      {
        id: 'repoA',
        name: 'repoA',
        description: 'A',
        organization: 'org',
        translations: {},
        releaseSource: 'org/repoA',
        channels: [],
        releases: [
          {
            version: '1.0.0',
            publishedAt: '2025-01-01T00:00:00Z',
            assets: [
              {
                downloadUrl: 'u1',
                downloadCount: 0,
                architecture: 'Flatpak_x86_64',
              },
              {
                downloadUrl: 'u2',
                downloadCount: 0,
                architecture: 'MacOS_x86_64',
              },
            ],
          },
        ],
        preReleases: [],
      },
      {
        id: 'repoB',
        name: 'repoB',
        description: 'B',
        organization: 'org',
        translations: {},
        releaseSource: 'org/repoB',
        channels: [],
        releases: [
          {
            version: '1.0.0',
            publishedAt: '2025-01-03T00:00:00Z',
            assets: [
              {
                downloadUrl: 'u3',
                downloadCount: 0,
                architecture: 'Windows_arm64',
              },
            ],
          },
        ],
        preReleases: [],
      },
    ];

    const msg = logReleaseStatistics(repositories);
    const expected = [
      'Repositories: 2',
      'Total releases: 2',
      'Total pre-releases: 0',
      `Average number of assets per release: ${chalk.red('1.50')}`,
    ].join('\n');
    expect(msg).toEqual(expected);
  });
});

describe('logChannelStats', () => {
  test('returns formatted channel statistics', () => {
    const repo2channels: Record<string, string[]> = {
      'owner/repoA': ['jasp-modules'],
      'owner/repoB': ['community-modules', 'experimental-modules'],
    };
    const msg = logChannelStats(repo2channels);
    const expected = [
      'Found 3 channels',
      ' - jasp-modules: 1',
      ' - community-modules: 1',
      ' - experimental-modules: 1',
    ].join('\n');
    expect(msg).toEqual(expected);
  });
});

async function writePoFileForDutch(moduleDir: string) {
  const poDir = path.join(moduleDir, 'po');
  await fs.mkdir(poDir);
  const poContent = `msgid ""
msgstr ""
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"
"X-Language: nl\\n"
"X-Source-Language: American English\\n"
"X-Qt-Contexts: true\\n"

msgctxt "Description|"
msgid "ANOVA"
msgstr "ANOVA"

msgctxt "Description|"
msgid "Classical"
msgstr "Klassiek"

msgctxt "Description|"
msgid "Repeated Measures ANOVA"
msgstr "Herhaalde Metingen ANOVA"

msgctxt "Description|"
msgid "ANCOVA"
msgstr "ANCOVA"

msgctxt "Description|"
msgid "MANOVA"
msgstr "MANOVA"
`;
  await fs.writeFile(path.join(poDir, 'QML-nl.po'), poContent);
}

describe('extractTranslationsFromPoFiles', () => {
  let tempDir: tmp.DirResult;

  beforeEach(async () => {
    // Create temp directory using tmp package
    tempDir = tmp.dirSync({ unsafeCleanup: true });
  });

  afterEach(() => {
    // Clean up temp directory
    tempDir.removeCallback();
  });

  test('extracts language and translated name/description', async () => {
    await writePoFileForDutch(tempDir.name);
    const result = await extractTranslationsFromPoFiles(
      tempDir.name,
      'ANOVA',
      'Classical',
    );

    const expected = {
      nl: {
        name: 'ANOVA',
        description: 'Klassiek',
      },
    };
    expect(result).toEqual(expected);
  });

  test('given empty dir returns empty object', async () => {
    const result = await extractTranslationsFromPoFiles(
      path.join(tempDir.name),
      'ANOVA',
      'NonExistentDescription',
    );

    const expected = {};
    expect(result).toEqual(expected);
  });
});

describe('parseDescriptionQml', () => {
  test('extracts title and description from Description.qml', () => {
    const qml = `
import QtQuick
import JASP.Module

Description {
        title           : qsTr("ANOVA")
        icon            : "analysis-classical-anova.svg"
        description     : qsTr("Evaluate the difference between multiple means")
}
`;
    const result = parseDescriptionQml(qml);
    expect(result.title).toBe('ANOVA');
    expect(result.description).toBe(
      'Evaluate the difference between multiple means',
    );
    expect(result.icon).toBe('analysis-classical-anova.svg');
  });

  test('extracts icon with different spacing and trailing comment', () => {
    const qml = `
Description {
  title: qsTr("Synthetic Data")
  description: qsTr("A module to create synthetic data")
  icon        : "jsdIcon.png" // Located in /inst/icons/
}
`;
    const result = parseDescriptionQml(qml);
    expect(result.icon).toBe('jsdIcon.png');
  });

  test('extracts extensionless top-level icon', () => {
    const qml = `
Description {
  title: qsTr("Bain")
  description: qsTr("A module")
  icon: "bain-module"
}
`;
    const result = parseDescriptionQml(qml);
    expect(result.icon).toBe('bain-module');
  });

  test('prefers top-level Description icon over nested GroupTitle icon', () => {
    const qml = `
import QtQuick
import JASP.Module

Description
{
    title           : qsTr("Summary Statistics")
    description     : qsTr("Apply common Bayesian tests from sufficient statistics")
    icon            : "analysis-bayesian-ttest.svg"
    requiresData    : false
    hasWrappers     : false
    preloadData     : false

    GroupTitle
    {
        title: qsTr("Regression")
        icon:  "analysis-bayesian-regression.svg"
    }
}
`;
    const result = parseDescriptionQml(qml);
    const expected = {
      title: 'Summary Statistics',
      description: 'Apply common Bayesian tests from sufficient statistics',
      icon: 'analysis-bayesian-ttest.svg',
    };
    expect(result).toEqual(expected);
  });

  test('does not pick nested icon when top-level icon is missing', () => {
    const qml = `
Description {
  title: qsTr("Dyads")
  description: qsTr("Dyadic analysis")
  GroupTitle {
    title: qsTr("Single Level")
    icon: "single_level.svg"
  }
}
`;
    const result = parseDescriptionQml(qml);
    expect(result.icon).toBeUndefined();
  });

  test('returns undefined for missing fields', () => {
    const qml = `Description {}`;
    expect(() => {
      parseDescriptionQml(qml);
    }).toThrowError(
      'Failed to parse name and description from Description.qml content',
    );
  });
});

describe('parseDescriptionFile', () => {
  test('extracts key-value pairs from DESCRIPTION content', () => {
    const content = `Package: jaspAnova
Type: Package
Title: ANOVA
Website: example.com/jasp-anova
`;

    const result = parseDescriptionFile(content);
    expect(result).toEqual({
      Package: 'jaspAnova',
      Type: 'Package',
      Title: 'ANOVA',
      Website: 'example.com/jasp-anova',
    });
  });

  test('handles DESCRIPTION content without Website key', () => {
    const content = `Package: jaspAnova
Type: Package
Title: ANOVA
`;

    const result = parseDescriptionFile(content);
    expect(result).toEqual({
      Package: 'jaspAnova',
      Type: 'Package',
      Title: 'ANOVA',
    });
    expect(result.Website).toBeUndefined();
  });

  test('supports multiline values', () => {
    const content = `Description: First line
  second line
Website: https://example.com/jasp-anova
`;

    const result = parseDescriptionFile(content);
    expect(result).toEqual({
      Description: 'First line second line',
      Website: 'https://example.com/jasp-anova',
    });
  });

  test('supports website on indented continuation line', () => {
    const content = `Website:
  http://foo.com
Title: foo

`;

    const result = parseDescriptionFile(content);
    expect(result).toEqual({
      Website: 'http://foo.com',
      Title: 'foo',
    });
  });
});

describe('resolveHomepageUrl', () => {
  test('adds https when website has no scheme', () => {
    const result = resolveHomepageUrl('example.com/jasp-anova');
    expect(result).toBe('https://example.com/jasp-anova');
  });

  test('returns undefined for placeholder host', () => {
    const result = resolveHomepageUrl('https://www.jasp-stats.org/');
    expect(result).toBeUndefined();
  });

  test('returns undefined when website is missing or invalid', () => {
    expect(resolveHomepageUrl(undefined)).toBeUndefined();
    expect(resolveHomepageUrl(':::not-a-url:::')).toBeUndefined();
  });

  test('drops .git suffix from website urls', () => {
    const result = resolveHomepageUrl(
      'https://github.com/doomlab/jasp-synthetic-data.git',
    );
    expect(result).toBe('https://github.com/doomlab/jasp-synthetic-data');
  });
});

describe('given a mock registry with a single submodule with a single translation', () => {
  let tempDir: tmp.DirResult;

  beforeEach(async () => {
    // Create temp directory using tmp package
    tempDir = tmp.dirSync({ unsafeCleanup: true });

    const gimodulesFile = path.join(tempDir.name, '.gitmodules');
    const content = `[submodule "beta-modules/jaspAnova"]
path = Official/jaspAnova
url = https://github.com/jasp-stats-modules/jaspAnova.git
`;
    await fs.writeFile(gimodulesFile, content);

    const moduleDir = path.join(tempDir.name, 'Official/jaspAnova');
    await fs.mkdir(moduleDir, { recursive: true });
    const instDir = path.join(moduleDir, 'inst');
    await fs.mkdir(instDir);
    const iconsDir = path.join(instDir, 'icons');
    await fs.mkdir(iconsDir);

    const descriptionQmlContent = `import QtQuick
import JASP.Module

Description {
        title           : qsTr("Classical")
        icon            : "analysis-classical-anova.svg"
        description     : qsTr("Repeated Measures ANOVA")
}
`;
    await fs.writeFile(
      path.join(instDir, 'Description.qml'),
      descriptionQmlContent,
    );
    await fs.writeFile(
      path.join(iconsDir, 'analysis-classical-anova.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#2563eb"/></svg>',
    );

    await fs.writeFile(
      path.join(moduleDir, 'DESCRIPTION'),
      'Package: jaspAnova\nWebsite: jasp-stats.org\n',
    );

    await writePoFileForDutch(moduleDir);
  });

  afterEach(() => {
    // Clean up temp directory
    tempDir.removeCallback();
  });

  test('extractBareSubmodules', async () => {
    const result = await extractBareSubmodules(tempDir.name);
    const expected = [
      {
        gitUrl: 'https://github.com/jasp-stats-modules/jaspAnova.git',
        path: join(tempDir.name, 'Official', 'jaspAnova'),
      },
    ];
    expect(result).toEqual(expected);
  });

  test('nameAndDescriptionFromSubmodules', async () => {
    const bareSubmodules = [
      {
        gitUrl: 'https://github.com/jasp-stats-modules/jaspAnova.git',
        path: join(tempDir.name, 'Official', 'jaspAnova'),
      },
    ];

    const result = await nameAndDescriptionFromSubmodules(bareSubmodules);
    expect(result).toEqual([
      expect.objectContaining({
        description: 'Repeated Measures ANOVA',
        gitUrl: 'https://github.com/jasp-stats-modules/jaspAnova.git',
        name: 'Classical',
        path: join(tempDir.name, 'Official', 'jaspAnova'),
        homepageUrl: undefined,
        translations: {
          nl: {
            description: 'Herhaalde Metingen ANOVA',
            name: 'Klassiek',
          },
        },
      }),
    ]);
    expect(result[0].iconUrl).toContain('data:image/svg+xml,');
    expect(result[0].iconUrl).toContain('%3Csvg');
  });

  test('removes svg metadata/editor junk before data url encoding', async () => {
    const moduleDir = join(tempDir.name, 'Official', 'jaspAnova');
    await fs.writeFile(
      join(moduleDir, 'inst', 'icons', 'analysis-classical-anova.svg'),
      `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" inkscape:version="1.3" viewBox="0 0 8 8">
  <metadata>junk</metadata>
  <rect width="8" height="8" fill="#2563eb"/>
</svg>`,
    );

    const result = await nameAndDescriptionFromSubmodules([
      {
        gitUrl: 'https://github.com/jasp-stats-modules/jaspAnova.git',
        path: moduleDir,
      },
    ]);

    const iconUrl = result[0].iconUrl;
    expect(iconUrl).toContain('data:image/svg+xml,');
    expect(iconUrl).not.toContain('metadata');
    expect(iconUrl).not.toContain('inkscape');
  });

  test('encodes png icon as base64 data url', async () => {
    const moduleDir = join(tempDir.name, 'Official', 'jaspAnova');
    const qmlPath = join(moduleDir, 'inst', 'Description.qml');
    await fs.writeFile(
      qmlPath,
      `Description {
  title: qsTr("Classical")
  icon: "analysis-classical-anova.png"
  description: qsTr("Repeated Measures ANOVA")
}
`,
    );
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]);
    await fs.writeFile(
      join(moduleDir, 'inst', 'icons', 'analysis-classical-anova.png'),
      pngBytes,
    );

    const result = await nameAndDescriptionFromSubmodules([
      {
        gitUrl: 'https://github.com/jasp-stats-modules/jaspAnova.git',
        path: moduleDir,
      },
    ]);

    expect(result[0].iconUrl).toContain('data:image/png;base64,');
    expect(result[0].iconUrl?.length).toBeGreaterThan(24);
  });

  test('extracts embedded png from svg and encodes as png data url', async () => {
    const moduleDir = join(tempDir.name, 'Official', 'jaspAnova');
    const onePixelPngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    await fs.writeFile(
      join(moduleDir, 'inst', 'icons', 'analysis-classical-anova.svg'),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><image href="data:image/png;base64,${onePixelPngBase64}" width="1" height="1"/></svg>`,
    );

    const result = await nameAndDescriptionFromSubmodules([
      {
        gitUrl: 'https://github.com/jasp-stats-modules/jaspAnova.git',
        path: moduleDir,
      },
    ]);

    expect(result[0].iconUrl).toContain('data:image/png;base64,');
  });

  test('falls back to svg data url when embedded png payload is malformed', async () => {
    const moduleDir = join(tempDir.name, 'Official', 'jaspAnova');
    await fs.writeFile(
      join(moduleDir, 'inst', 'icons', 'analysis-classical-anova.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><image href="data:image/png;base64,not-base64!" width="8" height="8"/><rect width="8" height="8" fill="#2563eb"/></svg>',
    );

    const result = await nameAndDescriptionFromSubmodules([
      {
        gitUrl: 'https://github.com/jasp-stats-modules/jaspAnova.git',
        path: moduleDir,
      },
    ]);

    expect(result[0].iconUrl).toContain('data:image/svg+xml,');
  });

  test('ignores unsupported icon extension', async () => {
    const moduleDir = join(tempDir.name, 'Official', 'jaspAnova');
    const qmlPath = join(moduleDir, 'inst', 'Description.qml');
    await fs.writeFile(
      qmlPath,
      `Description {
  title: qsTr("Classical")
  icon: "analysis-classical-anova.jpg"
  description: qsTr("Repeated Measures ANOVA")
}
`,
    );
    await fs.writeFile(
      join(moduleDir, 'inst', 'icons', 'analysis-classical-anova.jpg'),
      'not-a-real-jpeg',
    );

    const result = await nameAndDescriptionFromSubmodules([
      {
        gitUrl: 'https://github.com/jasp-stats-modules/jaspAnova.git',
        path: moduleDir,
      },
    ]);

    expect(result[0].iconUrl).toBeUndefined();
  });

  test('throws when DESCRIPTION file is missing', async () => {
    const moduleDir = join(tempDir.name, 'Official', 'jaspAnova');
    await fs.rm(join(moduleDir, 'DESCRIPTION'));

    await expect(
      nameAndDescriptionFromSubmodules([
        {
          gitUrl: 'https://github.com/jasp-stats-modules/jaspAnova.git',
          path: moduleDir,
        },
      ]),
    ).rejects.toThrow();
  });

  describe('groupByChannel', () => {
    test('given one submodule', () => {
      const submodules: Submodule[] = [
        {
          description: 'Repeated Measures ANOVA',
          gitUrl: 'https://github.com/jasp-stats-modules/jaspAnova.git',
          name: 'Classical',
          path: join(tempDir.name, 'Official', 'jaspAnova'),
          homepageUrl: undefined,
          translations: {
            nl: {
              description: 'Herhaalde Metingen ANOVA',
              name: 'Klassiek',
            },
          },
        },
      ];

      const bareRepos = groupByChannel(submodules);

      const expected: BareRepository[] = [
        {
          id: 'jaspAnova',
          releaseSource: 'jasp-stats-modules/jaspAnova',
          channels: ['Official'],
          description: 'Repeated Measures ANOVA',
          name: 'Classical',
          homepageUrl: undefined,
          translations: {
            nl: {
              description: 'Herhaalde Metingen ANOVA',
              name: 'Klassiek',
            },
          },
        },
      ];
      expect(bareRepos).toEqual(expected);
    });
  });

  test('given 1 submodules pointing to same repo', () => {
    const submodules: Submodule[] = [
      {
        description: 'Repeated Measures ANOVA',
        gitUrl: 'https://github.com/jasp-stats-modules/jaspAnova.git',
        name: 'Classical',
        path: join(tempDir.name, 'Official', 'jaspAnova'),
        homepageUrl: undefined,
        translations: {
          nl: {
            description: 'Herhaalde Metingen ANOVA',
            name: 'Klassiek',
          },
        },
      },
      {
        description: 'Repeated Measures ANOVA',
        gitUrl: 'https://github.com/jasp-stats-modules/jaspAnova.git',
        name: 'Classical',
        path: join(tempDir.name, 'Community', 'jaspAnova'),
        homepageUrl: undefined,
        translations: {
          nl: {
            description: 'Herhaalde Metingen ANOVA',
            name: 'Klassiek',
          },
        },
      },
    ];

    const bareRepos = groupByChannel(submodules);

    const expected: BareRepository[] = [
      {
        id: 'jaspAnova',
        releaseSource: 'jasp-stats-modules/jaspAnova',
        channels: ['Official', 'Community'],
        description: 'Repeated Measures ANOVA',
        name: 'Classical',
        homepageUrl: undefined,
        translations: {
          nl: {
            description: 'Herhaalde Metingen ANOVA',
            name: 'Klassiek',
          },
        },
      },
    ];
    expect(bareRepos).toEqual(expected);
  });
});

test('logBareRepoStats', () => {
  const submodules: BareRepository[] = [
    {
      id: 'jaspAnova',
      releaseSource: 'jasp-stats-modules/jaspAnova',
      channels: ['Official'],
      description: 'Repeated Measures ANOVA',
      name: 'Classical',
      translations: {
        nl: {
          description: 'Herhaalde Metingen ANOVA',
          name: 'Klassiek',
        },
      },
    },
  ];

  const result = logBareRepoStats(submodules);
  const expected = [
    'Found 1 submodules',
    'Average number of translations per submodule: 1',
  ].join('\n');
  expect(result).toEqual(expected);
});

describe('detectMissingArchitectures', () => {
  test('detects missing architectures from a release with partial assets', () => {
    const release: Release = {
      version: '1.0.0',
      publishedAt: '2025-01-01T00:00:00Z',
      jaspVersionRange: '>=0.95.0',
      assets: [
        {
          downloadUrl: 'https://example.com/module-Windows_x86-64.JASPModule',
          downloadCount: 10,
          architecture: 'Windows_x86-64',
        },
        {
          downloadUrl: 'https://example.com/module-MacOS_arm64.JASPModule',
          downloadCount: 5,
          architecture: 'MacOS_arm64',
        },
      ],
    };

    const missing = detectMissingArchitectures(release);
    expect(missing).toEqual(['MacOS_x86_64', 'Flatpak_x86_64']);
  });

  test('returns empty array when all architectures are present', () => {
    const release: Release = {
      version: '1.0.0',
      publishedAt: '2025-01-01T00:00:00Z',
      jaspVersionRange: '>=0.95.0',
      assets: [
        {
          downloadUrl: 'https://example.com/module-Windows_x86-64.JASPModule',
          downloadCount: 10,
          architecture: 'Windows_x86-64',
        },
        {
          downloadUrl: 'https://example.com/module-MacOS_x86_64.JASPModule',
          downloadCount: 8,
          architecture: 'MacOS_x86_64',
        },
        {
          downloadUrl: 'https://example.com/module-MacOS_arm64.JASPModule',
          downloadCount: 5,
          architecture: 'MacOS_arm64',
        },
        {
          downloadUrl: 'https://example.com/module-Flatpak_x86_64.JASPModule',
          downloadCount: 3,
          architecture: 'Flatpak_x86_64',
        },
      ],
    };

    const missing = detectMissingArchitectures(release);
    expect(missing).toEqual([]);
  });
});

describe('findOlderReleaseWithArchitecture', () => {
  test('finds older release with specific architecture in same version range', () => {
    const releases: Release[] = [
      {
        version: '1.2.0',
        publishedAt: '2025-01-03T00:00:00Z',
        jaspVersionRange: '>=0.95.0',
        assets: [
          {
            downloadUrl: 'https://example.com/module-Windows_x86-64.JASPModule',
            downloadCount: 10,
            architecture: 'Windows_x86-64',
          },
        ],
      },
      {
        version: '1.1.0',
        publishedAt: '2025-01-02T00:00:00Z',
        jaspVersionRange: '>=0.95.0',
        assets: [
          {
            downloadUrl: 'https://example.com/module-Windows_x86-64.JASPModule',
            downloadCount: 8,
            architecture: 'Windows_x86-64',
          },
          {
            downloadUrl: 'https://example.com/module-Flatpak_x86_64.JASPModule',
            downloadCount: 5,
            architecture: 'Flatpak_x86_64',
          },
        ],
      },
      {
        version: '1.0.0',
        publishedAt: '2025-01-01T00:00:00Z',
        jaspVersionRange: '>=0.95.0',
        assets: [
          {
            downloadUrl: 'https://example.com/module-Flatpak_x86_64.JASPModule',
            downloadCount: 3,
            architecture: 'Flatpak_x86_64',
          },
        ],
      },
    ];

    const older = findOlderReleaseWithArchitecture(
      '>=0.95.0',
      'Flatpak_x86_64',
      releases,
    );
    expect(older?.version).toBe('1.1.0');
  });

  test('returns undefined when no older release has the architecture', () => {
    const releases: Release[] = [
      {
        version: '1.0.0',
        publishedAt: '2025-01-01T00:00:00Z',
        jaspVersionRange: '>=0.95.0',
        assets: [
          {
            downloadUrl: 'https://example.com/module-Windows_x86-64.JASPModule',
            downloadCount: 10,
            architecture: 'Windows_x86-64',
          },
        ],
      },
    ];

    const older = findOlderReleaseWithArchitecture(
      '>=0.95.0',
      'Flatpak_x86_64',
      releases,
    );
    expect(older).toBeUndefined();
  });

  test('respects version range boundaries', () => {
    const releases: Release[] = [
      {
        version: '2.0.0',
        publishedAt: '2025-01-02T00:00:00Z',
        jaspVersionRange: '>=0.95.0',
        assets: [
          {
            downloadUrl: 'https://example.com/module-Flatpak_x86_64.JASPModule',
            downloadCount: 10,
            architecture: 'Flatpak_x86_64',
          },
        ],
      },
      {
        version: '1.0.0',
        publishedAt: '2025-01-01T00:00:00Z',
        jaspVersionRange: '>=0.98.0',
        assets: [
          {
            downloadUrl: 'https://example.com/module-Flatpak_x86_64.JASPModule',
            downloadCount: 8,
            architecture: 'Flatpak_x86_64',
          },
        ],
      },
    ];

    // Should not find v1.0.0 because it's a different version range
    const older = findOlderReleaseWithArchitecture(
      '>=0.95.0',
      'Flatpak_x86_64',
      releases,
    );
    expect(older?.version).toBe('2.0.0');
  });
});
