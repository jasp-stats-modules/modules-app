import { Octokit } from '@octokit/core';
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql';
import chalk from 'chalk';
import { graphql, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from 'vitest';
import type { GqlRelease } from './scrape';
import {
  addQuotesInDescription,
  batchedArray,
  downloadSubmodules,
  downloadSubmodulesFromBranch,
  extractArchitectureFromUrl,
  jaspVersionRangeFromDescription,
  latestReleasePerJaspVersionRange,
  logChannelStats,
  logReleaseStatistics,
  path2channel,
  releaseAssetsPaged,
  transformRelease,
  url2nameWithOwner,
  versionFromTagName,
} from './scrape';
import type { Repository } from './types';

// Tests for branch-specific submodule fetching
describe('downloadSubmodulesFromBranch', () => {
  const MyOctokit = Octokit.plugin(paginateGraphQL);
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test('fetches and maps submodules from branch .gitmodules', async () => {
    server.use(
      graphql.query('getGitmodules', ({ variables }) => {
        expect(variables.expression).toBe('feature-branch:.gitmodules');
        return HttpResponse.json({
          data: {
            repository: {
              object: {
                text: `
[submodule "jasp-modules/jaspAnova"]
	path = jasp-modules/jaspAnova
	url = https://github.com/jasp-stats-modules/jaspAnova.git

[submodule "community-modules/jaspAcceptanceSampling"]
	path = community-modules/jaspAcceptanceSampling
	url = https://github.com/jasp-stats-modules/jaspAcceptanceSampling.git
`,
              },
            },
          },
        });
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });
    const result = await downloadSubmodulesFromBranch(
      'jasp-stats-modules',
      'modules-registry',
      'feature-branch',
      octokit,
    );

    expect(result).toEqual({
      'jasp-stats-modules/jaspAnova': ['jasp-modules'],
      'jasp-stats-modules/jaspAcceptanceSampling': ['community-modules'],
    });
  });

  test('ignores malformed entries and non-github-https urls', async () => {
    server.use(
      graphql.query('getGitmodules', () => {
        return HttpResponse.json({
          data: {
            repository: {
              object: {
                text: `
[submodule "jasp-modules/jaspAnova"]
	path = jasp-modules/jaspAnova
	url = https://github.com/jasp-stats-modules/jaspAnova.git

[submodule "bad-entry"]
	path = 
	url = not-a-url

[submodule "other-entry"]
	path = other-modules/jaspOther
	url = git@github.com:someowner/somerepo.git
`,
              },
            },
          },
        });
      }),
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const octokit = new MyOctokit({ auth: 'fake-token' });
    const result = await downloadSubmodulesFromBranch(
      'jasp-stats-modules',
      'modules-registry',
      'main',
      octokit,
    );

    expect(result).toEqual({
      'jasp-stats-modules/jaspAnova': ['jasp-modules'],
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping submodule other-modules/jaspOther'),
    );

    warnSpy.mockRestore();
  });
});

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
    expect(path2channel('standalone')).toBe('standalone');
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

describe('addQuotesInDescription', () => {
  test('adds quotes to unquoted version range', () => {
    const input = '---\njasp: >=0.95.0\n---\n';
    const result = addQuotesInDescription(input);
    expect(result).toContain('jasp: ">=0.95.0"');
  });

  test('leaves already quoted strings unchanged', () => {
    const input = '---\njasp: ">=0.95.0"\n---\n';
    const result = addQuotesInDescription(input);
    expect(result).toBe(input);
  });
});

describe('jaspVersionRangeFromDescription', () => {
  test('extracts single quoted version range', () => {
    const description = "---\njasp: '>=0.95.1'\n---\n";
    expect(jaspVersionRangeFromDescription(description)).toBe('>=0.95.1');
  });

  test('extracts double quoted version range', () => {
    const description = '---\njasp: ">=0.95.1"\n---\n';
    expect(jaspVersionRangeFromDescription(description)).toBe('>=0.95.1');
  });

  test('extracts unquoted version range', () => {
    const description = '---\njasp: >=0.95.1\n---\n';
    expect(jaspVersionRangeFromDescription(description)).toBe('>=0.95.1');
  });

  test('returns undefined for missing frontmatter', () => {
    const description = 'Just a regular description';
    expect(jaspVersionRangeFromDescription(description)).toBeUndefined();
  });

  test('returns undefined for missing jasp field', () => {
    const description = '---\nother: value\n---\n';
    expect(jaspVersionRangeFromDescription(description)).toBeUndefined();
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
        tagName: 'v1.0.0',
        description: '---\njasp: >=0.95.0\n---\n',
      },
    ];

    const result = latestReleasePerJaspVersionRange(input);
    expect(result).toEqual([input[0], input[2]]);
  });

  test('skips releases without description', () => {
    const input: GqlRelease[] = [
      {
        isDraft: false,
        isPrerelease: false,
        publishedAt: '2025-01-01T00:00:00Z',
        releaseAssets: { nodes: [] },
        tagName: 'v1.0.0',
        description: undefined,
      },
    ];

    const result = latestReleasePerJaspVersionRange(input);
    expect(result).toEqual([]);
  });

  test('skips releases with invalid description', () => {
    const input: GqlRelease[] = [
      {
        isDraft: false,
        isPrerelease: false,
        publishedAt: '2025-01-01T00:00:00Z',
        releaseAssets: { nodes: [] },
        tagName: 'v1.0.0',
        description: 'No frontmatter here',
      },
    ];

    const result = latestReleasePerJaspVersionRange(input);
    expect(result).toEqual([]);
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
      description: '---\njasp: >=0.95.0\n---\n',
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

    const result = transformRelease(input, 'owner/repo');

    expect(result.version).toBe('0.95.0');
    expect(result.jaspVersionRange).toBe('>=0.95.0');
    expect(result.publishedAt).toBe('2025-01-01T00:00:00Z');
    expect(result.assets).toHaveLength(2);
    expect(result.assets[0].architecture).toBe('MacOS_x86_64');
    expect(result.assets[1].architecture).toBe('Windows_x86-64');
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

    const result = transformRelease(input, 'owner/repo');
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

    const result = transformRelease(input, 'owner/repo');
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

    const result = transformRelease(input, 'owner/repo');
    expect(result.assets[0].architecture).toBe('Flatpak_x86_64');
    expect(result.assets[1].architecture).toBe('MacOS_arm64');
    expect(result.assets[2].architecture).toBe('Windows_x86-64');
  });
});

describe('downloadSubmodules', () => {
  const MyOctokit = Octokit.plugin(paginateGraphQL);
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test('fetches and maps submodules to channels', async () => {
    server.use(
      graphql.query('paginate', () => {
        return HttpResponse.json({
          data: {
            repository: {
              submodules: {
                nodes: [
                  {
                    gitUrl:
                      'https://github.com/jasp-stats-modules/jaspAnova.git',
                    path: 'jasp-modules/jaspAnova',
                  },
                  {
                    gitUrl:
                      'https://github.com/jasp-stats-modules/jaspBain.git',
                    path: 'jasp-modules/jaspBain',
                  },
                  {
                    gitUrl:
                      'https://github.com/jasp-stats-modules/jaspAcceptanceSampling.git',
                    path: 'community-modules/jaspAcceptanceSampling',
                  },
                ],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null,
                },
              },
            },
          },
        });
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });
    const result = await downloadSubmodules(
      'jasp-stats-modules',
      'modules-registry',
      octokit,
    );

    expect(result).toEqual({
      'jasp-stats-modules/jaspAnova': ['jasp-modules'],
      'jasp-stats-modules/jaspBain': ['jasp-modules'],
      'jasp-stats-modules/jaspAcceptanceSampling': ['community-modules'],
    });
  });

  test('handles pagination correctly', async () => {
    let callCount = 0;

    server.use(
      graphql.query('paginate', ({ variables }) => {
        callCount++;

        if (!variables.cursor) {
          return HttpResponse.json({
            data: {
              repository: {
                submodules: {
                  nodes: [
                    {
                      gitUrl:
                        'https://github.com/jasp-stats-modules/jaspAnova.git',
                      path: 'jasp-modules/jaspAnova',
                    },
                  ],
                  pageInfo: {
                    hasNextPage: true,
                    endCursor: 'cursor123',
                  },
                },
              },
            },
          });
        }

        return HttpResponse.json({
          data: {
            repository: {
              submodules: {
                nodes: [
                  {
                    gitUrl:
                      'https://github.com/jasp-stats-modules/jaspBain.git',
                    path: 'jasp-modules/jaspBain',
                  },
                ],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null,
                },
              },
            },
          },
        });
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });
    const result = await downloadSubmodules(
      'jasp-stats-modules',
      'modules-registry',
      octokit,
    );

    expect(result).toEqual({
      'jasp-stats-modules/jaspAnova': ['jasp-modules'],
      'jasp-stats-modules/jaspBain': ['jasp-modules'],
    });
    expect(callCount).toBeGreaterThan(1);
  });

  test('groups modules in multiple channels', async () => {
    server.use(
      graphql.query('paginate', () => {
        return HttpResponse.json({
          data: {
            repository: {
              submodules: {
                nodes: [
                  {
                    gitUrl:
                      'https://github.com/jasp-stats-modules/jaspAnova.git',
                    path: 'jasp-modules/jaspAnova',
                  },
                  {
                    gitUrl:
                      'https://github.com/jasp-stats-modules/jaspAnova.git',
                    path: 'experimental-modules/jaspAnova',
                  },
                ],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null,
                },
              },
            },
          },
        });
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });
    const result = await downloadSubmodules(
      'jasp-stats-modules',
      'modules-registry',
      octokit,
    );

    expect(result).toEqual({
      'jasp-stats-modules/jaspAnova': ['jasp-modules', 'experimental-modules'],
    });
  });

  test('handles empty submodules list', async () => {
    server.use(
      graphql.query('paginate', () => {
        return HttpResponse.json({
          data: {
            repository: {
              submodules: {
                nodes: [],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null,
                },
              },
            },
          },
        });
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });
    const result = await downloadSubmodules(
      'jasp-stats-modules',
      'modules-registry',
      octokit,
    );

    expect(result).toEqual({});
  });

  test('uses default owner and repo parameters', async () => {
    let capturedVariables: { owner?: string; repo?: string } | undefined;

    server.use(
      graphql.query('paginate', ({ variables }) => {
        capturedVariables = variables;

        return HttpResponse.json({
          data: {
            repository: {
              submodules: {
                nodes: [],
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null,
                },
              },
            },
          },
        });
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });
    await downloadSubmodules(undefined, undefined, octokit);

    expect(capturedVariables).toEqual({
      owner: 'jasp-stats-modules',
      repo: 'modules-registry',
    });
  });

  test('handles network errors gracefully', async () => {
    server.use(
      graphql.query('paginate', () => {
        return HttpResponse.error();
      }),
    );

    const octokit = new MyOctokit({ auth: 'fake-token' });

    await expect(
      downloadSubmodules('jasp-stats-modules', 'modules-registry', octokit),
    ).rejects.toThrow();
  });
});

describe('releaseAssetsPaged', () => {
  const MyOctokit = Octokit.plugin(paginateGraphQL);
  const server = setupServer();

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test('fetches release assets for repositories', async () => {
    server.use(
      graphql.operation(({ query }) => {
        // Match queries with 'repo0:' (releaseAssets queries)
        if (query.includes('repo0:')) {
          return HttpResponse.json({
            data: {
              repo0: {
                name: 'jaspAnova',
                nameWithOwner: 'jasp-stats-modules/jaspAnova',
                shortDescriptionHTML: '<p>Anova module</p>',
                parent: {
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
    const repo2channels = {
      'jasp-stats-modules/jaspAnova': ['jasp-modules'],
    };

    const result = await releaseAssetsPaged(repo2channels, 10, octokit);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'jaspAnova',
          releaseSource: 'jasp-stats-modules/jaspAnova',
          channels: ['jasp-modules'],
          shortDescriptionHTML: '<p>Anova module</p>',
          organization: 'jasp-stats-modules',
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

  test('filters out repositories with no releases', async () => {
    server.use(
      graphql.operation(({ query }) => {
        if (query.includes('repo0:')) {
          return HttpResponse.json({
            data: {
              repo0: {
                name: 'jaspAnova',
                nameWithOwner: 'jasp-stats-modules/jaspAnova',
                shortDescriptionHTML: '<p>Anova module</p>',
                parent: {
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
    const repo2channels = {
      'jasp-stats-modules/jaspAnova': ['jasp-modules'],
    };

    const result = await releaseAssetsPaged(repo2channels, 10, octokit);

    expect(result).toHaveLength(0);
  });

  test('separates production and pre-releases', async () => {
    server.use(
      graphql.operation(({ query }) => {
        if (query.includes('repo0:')) {
          return HttpResponse.json({
            data: {
              repo0: {
                name: 'jaspAnova',
                nameWithOwner: 'jasp-stats-modules/jaspAnova',
                shortDescriptionHTML: '<p>Anova module</p>',
                parent: {
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
    const repo2channels = {
      'jasp-stats-modules/jaspAnova': ['jasp-modules'],
    };

    const result = await releaseAssetsPaged(repo2channels, 10, octokit);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'jaspAnova',
          releaseSource: 'jasp-stats-modules/jaspAnova',
          channels: ['jasp-modules'],
          shortDescriptionHTML: '<p>Anova module</p>',
          organization: 'jasp-stats-modules',
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

  test('includes optional homepageUrl when present', async () => {
    server.use(
      graphql.operation(({ query }) => {
        if (query.includes('repo0:')) {
          return HttpResponse.json({
            data: {
              repo0: {
                name: 'jaspAnova',
                nameWithOwner: 'jasp-stats-modules/jaspAnova',
                shortDescriptionHTML: '<p>Anova module</p>',
                homepageUrl: 'https://example.com/jasp-anova',
                parent: {
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
    const repo2channels = {
      'jasp-stats-modules/jaspAnova': ['jasp-modules'],
    };

    const result = await releaseAssetsPaged(repo2channels, 10, octokit);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'jaspAnova',
          releaseSource: 'jasp-stats-modules/jaspAnova',
          homepageUrl: 'https://example.com/jasp-anova',
          channels: ['jasp-modules'],
          shortDescriptionHTML: '<p>Anova module</p>',
          organization: 'jasp-stats-modules',
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

  test('handles missing parent organization', async () => {
    server.use(
      graphql.operation(({ query }) => {
        if (query.includes('repo0:')) {
          return HttpResponse.json({
            data: {
              repo0: {
                name: 'jaspAnova',
                nameWithOwner: 'jasp-stats-modules/jaspAnova',
                shortDescriptionHTML: '<p>Anova module</p>',
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
    const repo2channels = {
      'jasp-stats-modules/jaspAnova': ['jasp-modules'],
    };

    const result = await releaseAssetsPaged(repo2channels, 10, octokit);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'jaspAnova',
          releaseSource: 'jasp-stats-modules/jaspAnova',
          channels: ['jasp-modules'],
          shortDescriptionHTML: '<p>Anova module</p>',
          organization: 'unknown_org',
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

  test('batches repositories correctly', async () => {
    let callCount = 0;

    server.use(
      graphql.operation(({ query }) => {
        if (query.includes('repo0:')) {
          callCount++;
          return HttpResponse.json({
            data: {
              repo0: {
                name: 'jaspAnova',
                nameWithOwner: 'jasp-stats-modules/jaspAnova',
                shortDescriptionHTML: '<p>Anova module</p>',
                parent: {
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
              repo1: {
                name: 'jaspBain',
                nameWithOwner: 'jasp-stats-modules/jaspBain',
                shortDescriptionHTML: '<p>Bain module</p>',
                parent: {
                  owner: {
                    login: 'jasp-stats-modules',
                  },
                },
                releases: {
                  nodes: [
                    {
                      tagName: '0.95.0_xyz789_R-4-5-1',
                      publishedAt: '2025-01-02T00:00:00Z',
                      description: '---\njasp: >=0.95.0\n---\n',
                      isDraft: false,
                      isPrerelease: false,
                      releaseAssets: {
                        nodes: [
                          {
                            downloadUrl:
                              'https://example.com/jaspBain_0.95.0_MacOS_x86_64_R-4-5-1.JASPModule',
                            downloadCount: 80,
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
    const repo2channels = {
      'jasp-stats-modules/jaspAnova': ['jasp-modules'],
      'jasp-stats-modules/jaspBain': ['jasp-modules'],
    };

    const result = await releaseAssetsPaged(repo2channels, 1, octokit);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'jaspAnova',
          releaseSource: 'jasp-stats-modules/jaspAnova',
          channels: ['jasp-modules'],
          shortDescriptionHTML: '<p>Anova module</p>',
          organization: 'jasp-stats-modules',
          releases: expect.arrayContaining([
            expect.objectContaining({
              version: '0.95.0',
              publishedAt: '2025-01-01T00:00:00Z',
            }),
          ]),
          preReleases: [],
        }),
        expect.objectContaining({
          name: 'jaspBain',
          releaseSource: 'jasp-stats-modules/jaspBain',
          channels: ['jasp-modules'],
          shortDescriptionHTML: '<p>Bain module</p>',
          organization: 'jasp-stats-modules',
          releases: expect.arrayContaining([
            expect.objectContaining({
              version: '0.95.0',
              publishedAt: '2025-01-02T00:00:00Z',
            }),
          ]),
          preReleases: [],
        }),
      ]),
    );
    // With pageSize=1, should make at least 2 calls
    expect(callCount).toBeGreaterThanOrEqual(2);
  });
});

describe('logReleaseStatistics', () => {
  test('returns correct counts and integer average', () => {
    const repositories: Repository[] = [
      {
        name: 'repoA',
        shortDescriptionHTML: '<p>A</p>',
        organization: 'org',
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
        name: 'repoB',
        shortDescriptionHTML: '<p>B</p>',
        organization: 'org',
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
        name: 'repoA',
        shortDescriptionHTML: '<p>A</p>',
        organization: 'org',
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
        name: 'repoB',
        shortDescriptionHTML: '<p>B</p>',
        organization: 'org',
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
