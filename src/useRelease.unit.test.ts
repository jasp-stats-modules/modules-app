import { describe, expect, test } from 'vitest';
import type { Repository } from './types';
import { getReleaseInfo } from './useRelease';

describe('getReleaseInfo', () => {
  test('should be uninstallable', () => {
    const repo: Repository = {
      name: 'jaspAcceptanceSampling',
      shortDescriptionHTML: 'Acceptance Sampling Module for JASP',
      releases: [
        {
          publishedAt: '2025-10-22T15:17:05Z',
          jaspVersionRange: '>=0.95.1',
          version: '0.95.5',
          assets: [
            {
              downloadUrl:
                'https://github.com/jasp-stats-modules/jaspAcceptanceSampling/releases/download/0.95.5_ab108567_R-4-5-1_Release/jaspAcceptanceSampling_0.95.5_Flatpak_x86_64_R-4-5-1.JASPModule',
              downloadCount: 3,
              architecture: 'Flatpak_x86_64',
            },
            {
              downloadUrl:
                'https://github.com/jasp-stats-modules/jaspAcceptanceSampling/releases/download/0.95.5_ab108567_R-4-5-1_Release/jaspAcceptanceSampling_0.95.5_MacOS_arm64_R-4-5-1.JASPModule',
              downloadCount: 11,
              architecture: 'MacOS_arm64',
            },
            {
              downloadUrl:
                'https://github.com/jasp-stats-modules/jaspAcceptanceSampling/releases/download/0.95.5_ab108567_R-4-5-1_Release/jaspAcceptanceSampling_0.95.5_MacOS_x86_64_R-4-5-1.JASPModule',
              downloadCount: 2,
              architecture: 'MacOS_x86_64',
            },
            {
              downloadUrl:
                'https://github.com/jasp-stats-modules/jaspAcceptanceSampling/releases/download/0.95.5_ab108567_R-4-5-1_Release/jaspAcceptanceSampling_0.95.5_Windows_x86-64_R-4-5-1.JASPModule',
              downloadCount: 6,
              architecture: 'Windows_x86-64',
            },
          ],
        },
      ],
      preReleases: [],
      releaseSource: 'jasp-stats-modules/jaspAcceptanceSampling',
      organization: 'jasp-stats',
      channels: ['jasp-modules'],
    };

    const info = getReleaseInfo(
      repo,
      '0.95.5',
      false,
      'Windows_x86-64',
      { jaspAcceptanceSampling: '0.95.5' },
      ['jaspAcceptanceSampling'],
    );
    const expected = {
      asset: repo.releases[0].assets[3],
      canInstall: false,
      canUninstall: true,
      canUpdate: false,
      installedVersion: '0.95.5',
      latestAnyRelease: repo.releases[0],
      latestRelease: repo.releases[0],
      latestVersionInstalled: true,
    };

    expect(info).toStrictEqual(expected);
  });
});
