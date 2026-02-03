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
    const expected: ReturnType<typeof getReleaseInfo> = {
      asset: repo.releases[0].assets[3],
      installedVersion: '0.95.5',
      latestStableReleaseVersion: '0.95.5',
      latestPreReleaseVersion: undefined,
      latestVersionIs: 'installed',
      primaryAction: undefined,
      secondaryAction: 'uninstall',
    };

    expect(info).toStrictEqual(expected);
  });

  describe('actions', () => {
    test.for<[
      string | undefined,
      string | undefined,
      string | undefined,
      boolean,
      boolean,
      {
        primaryAction: ReturnType<typeof getReleaseInfo>['primaryAction'];
        secondaryAction: ReturnType<typeof getReleaseInfo>['secondaryAction'];
        latestVersionIs: ReturnType<typeof getReleaseInfo>['latestVersionIs'];
      },
    ]>([
      [
        undefined,
        '1.0.0',
        '1.1.0-beta.1',
        false,
        false,
        {
          primaryAction: 'install-stable',
          secondaryAction: undefined,
          latestVersionIs: 'stable',
        },
      ],
      [
        undefined,
        '1.0.0',
        '1.1.0-beta.1',
        true,
        false,
        {
          primaryAction: 'install-stable',
          secondaryAction: 'install-pre-release',
          latestVersionIs: 'pre-release',
        },
      ],
      [
        '1.0.0',
        '1.0.0',
        undefined,
        false,
        true,
        {
          primaryAction: undefined,
          secondaryAction: 'uninstall',
          latestVersionIs: 'installed',
        },
      ],
      [
        '0.9.0',
        '1.0.0',
        undefined,
        false,
        false,
        {
          primaryAction: 'update-stable',
          secondaryAction: undefined,
          latestVersionIs: 'stable',
        },
      ],
      [
        '0.9.0',
        '1.0.0',
        '1.1.0-beta.1',
        true,
        true,
        {
          primaryAction: 'update-stable',
          secondaryAction: 'update-pre-release',
          latestVersionIs: 'pre-release',
        },
      ],
      [
        '1.1.0-beta.1',
        '1.0.0',
        '1.1.0-beta.1',
        true,
        true,
        {
          primaryAction: undefined,
          secondaryAction: 'uninstall',
          latestVersionIs: 'installed',
        },
      ],
    ])('installed is %s, stable release is %s, pre-release is %s, allowPreRelease=%s, removeable=%s => %s', ([
      installedVersion,
      stableVersion,
      preReleaseVersion,
      allowPreRelease,
      removeable,
      expected,
    ]) => {
      const repo: Repository = {
        name: 'jaspAcceptanceSampling',
        shortDescriptionHTML: 'Acceptance Sampling Module for JASP',
        releases: stableVersion ? [
          {
            publishedAt: '2025-10-22T15:17:05Z',
            jaspVersionRange: '>=0.95.1',
            version: stableVersion,
            assets: [
              {
                downloadUrl:
                  'https://github.com/jasp-stats-modules/jaspAcceptanceSampling/releases/download/0.95.5_ab108567_R-4-5-1_Release/jaspAcceptanceSampling_0.95.5_Flatpak_x86_64_R-4-5-1.JASPModule',
                downloadCount: 3,
                architecture: 'Flatpak_x86_64',
              },
            ],
          },
        ] : [],
        preReleases: preReleaseVersion ? [{
          publishedAt: '2025-10-22T15:17:05Z',
          jaspVersionRange: '>=0.95.1',
          version: preReleaseVersion, // The pre-release has an older version than stable release
          assets: [
            {
              downloadUrl:
                'https://github.com/jasp-stats-modules/jaspAcceptanceSampling/releases/download/0.95.5_ab108567_R-4-5-1_Release/jaspAcceptanceSampling_0.95.5_Flatpak_x86_64_R-4-5-1.JASPModule',
              downloadCount: 3,
              architecture: 'Flatpak_x86_64',
            },
          ],
        }] : [],
        releaseSource: 'jasp-stats-modules/jaspAcceptanceSampling',
        organization: 'jasp-stats',
        channels: ['jasp-modules'],
      };

      const info = getReleaseInfo(
        repo,
        '0.95.1',
        allowPreRelease,
        'Flatpak_x86_64',
        installedVersion ? { jaspAcceptanceSampling: installedVersion } : {},
        removeable ? ['jaspAcceptanceSampling'] : [],
      );

      expect({
        primaryAction: info.primaryAction,
        secondaryAction: info.secondaryAction,
        latestVersionIs: info.latestVersionIs,
      }).toStrictEqual(expected);
    });
  })
});
