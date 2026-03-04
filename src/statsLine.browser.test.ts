import { getIntlayer } from 'react-intlayer';
import { describe, expect, test } from 'vitest';
import type { ReleaseStats } from './releaseStats';
import { statsLine, totalDownloads } from './statsLine';
import type { Release } from './types';

describe('totalDownloads', () => {
  test.for<[string, Release, number]>([
    [
      'single asset',
      {
        version: '1.0.0',
        publishedAt: '2024-01-01',
        assets: [
          {
            downloadUrl: 'https://example.com/download.zip',
            downloadCount: 42,
            architecture: 'x86_64',
          },
        ],
      },
      42,
    ],
    [
      'multiple assets',
      {
        version: '1.0.0',
        publishedAt: '2024-01-01',
        assets: [
          {
            downloadUrl: 'https://example.com/download1.zip',
            downloadCount: 10,
            architecture: 'x86_64',
          },
          {
            downloadUrl: 'https://example.com/download2.zip',
            downloadCount: 25,
            architecture: 'aarch64',
          },
        ],
      },
      35,
    ],
    [
      'no downloads',
      {
        version: '1.0.0',
        publishedAt: '2024-01-01',
        assets: [
          {
            downloadUrl: 'https://example.com/download.zip',
            downloadCount: 0,
            architecture: 'x86_64',
          },
        ],
      },
      0,
    ],
    [
      'undefined download count treated as 0',
      {
        version: '1.0.0',
        publishedAt: '2024-01-01',
        assets: [
          {
            downloadUrl: 'https://example.com/download.zip',
            downloadCount: undefined,
            architecture: 'x86_64',
          },
        ] as unknown as Release['assets'],
      },
      0,
    ],
  ])('totalDownloads: %s', ([, release, expected]) => {
    const result = totalDownloads(release);
    expect(result).toBe(expected);
  });
});

describe('statsLine', () => {
  const createMockRelease = (
    version: string,
    publishedAt: string = '2024-01-15T10:00:00Z',
  ): Release => ({
    version,
    publishedAt,
    assets: [
      {
        downloadUrl: 'https://example.com/download.zip',
        downloadCount: 100,
        architecture: 'x86_64',
      },
    ],
  });

  test.for<
    [
      string,
      {
        installedVersion?: string;
        latestStableRelease?: Release;
        latestPreRelease?: Release;
        latestVersionIs?: ReleaseStats['latestVersionIs'];
      },
      string,
    ]
  >([
    [
      'no releases',
      {
        installedVersion: undefined,
        latestStableRelease: undefined,
        latestPreRelease: undefined,
        latestVersionIs: undefined,
      },
      '',
    ],
    [
      'installed version only',
      {
        installedVersion: '1.5.0-release.0',
        latestStableRelease: undefined,
        latestPreRelease: undefined,
        latestVersionIs: 'installed',
      },
      'Latest installed 1.5.0-release.0 ',
    ],
    [
      'installed version only',
      {
        installedVersion: '1.5.0-beta.3',
        latestStableRelease: undefined,
        latestPreRelease: undefined,
        latestVersionIs: 'installed',
      },
      'Latest installed 1.5.0-beta.3 ',
    ],
    [
      'installed version with newer stable available',
      {
        installedVersion: '1.5.0-release.0',
        latestStableRelease: createMockRelease('2.0.0-release.0'),
        latestPreRelease: undefined,
        latestVersionIs: 'stable',
      },
      'Installed 1.5.0-release.0, Latest 2.0.0-release.0 on 1/15/2024 with 100 downloads',
    ],
    [
      'stable release only',
      {
        installedVersion: undefined,
        latestStableRelease: createMockRelease('2.0.0-release.0'),
        latestPreRelease: undefined,
        latestVersionIs: 'stable',
      },
      'Latest 2.0.0-release.0 on 1/15/2024 with 100 downloads',
    ],
    [
      'pre-release only',
      {
        installedVersion: undefined,
        latestStableRelease: undefined,
        latestPreRelease: createMockRelease('3.0.0-beta.1'),
        latestVersionIs: 'pre-release',
      },
      'Latest beta 3.0.0-beta.1 on 1/15/2024 with 100 downloads',
    ],
    [
      'both stable and pre-release',
      {
        installedVersion: undefined,
        latestStableRelease: createMockRelease('2.0.0-release.0'),
        latestPreRelease: createMockRelease('3.0.0-beta.1'),
        latestVersionIs: 'stable',
      },
      'Latest stable 2.0.0-release.0 on 1/15/2024 with 100 downloads, latest beta 3.0.0-beta.1 on 1/15/2024 with 100 downloads',
    ],
    [
      'latest installed, downgradable beta',
      {
        installedVersion: '0.95.5-release.12',
        latestStableRelease: createMockRelease('0.95.5-release.12'),
        latestPreRelease: createMockRelease('0.95.5-beta.3'),
        latestVersionIs: 'installed',
      },
      'Latest installed 0.95.5-release.12, downgradable beta 0.95.5-beta.3 on 1/15/2024 with 100 downloads',
    ],
    [
      'latest beta installed (newer than stable)',
      {
        installedVersion: '3.0.0-beta.1',
        latestStableRelease: createMockRelease('2.0.0-release.0'),
        latestPreRelease: createMockRelease('3.0.0-beta.1'),
        latestVersionIs: 'installed',
      },
      'Latest installed 3.0.0-beta.1, downgradable stable 2.0.0-release.0 on 1/15/2024 with 100 downloads',
    ],
  ])('statsLine: %s', ([, params, expected]) => {
    // The getIntlayer needs to be run in vitest browser mode, otherwise it returns empty object.
    const translations = getIntlayer<'app'>('app', 'en');
    const result = statsLine({
      ...params,
      translations,
    });
    expect(result).toBe(expected);
  });
});
