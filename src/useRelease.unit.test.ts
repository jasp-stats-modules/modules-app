import { describe, expect, test } from 'vitest';
import type { Asset, Repository } from './types';
import {
  getReleaseInfo,
  isNewerVersion,
  isPreRelease,
  type ReleaseStats,
} from './useRelease';

describe('isNewerVersion', () => {
  test.for<[string, string, boolean]>([
    // Works for semantic versioning style
    ['1.0.0', '1.0.1', true],
    ['2.0.0', '1.0.0', false],
    ['1.0.0', '1.0.0', false],
    ['1.0.0-alpha', '1.0.0', true],
    ['1.0.0-alpha', '1.0.0-beta', true],
    ['1.0.0-alpha', '1.0.0-alpha', false],
    // Works for JASP versioning style
    ['0.95.5-release.1', '0.95.5-release.0', false], // in semver 0.95.5+1 and 0.95.5+0
    ['0.95.5-release.0', '0.95.5-release.1', true],
    ['0.95.5-beta.0', '0.95.5-beta.1', true], // in semver the same
    ['0.95.5-beta.1', '0.95.5-beta.0', false],
    ['0.95.5-beta.1', '0.95.5-release.0', true], // pre-release is always older than stable
    ['0.95.5-beta.1', '0.95.5-release.2', true], // pre-release is always older than stable
    ['0.95.5-release.1', '0.95.5-beta.1', false], // stable is always newer than pre-release
    ['0.95.5-release.2', '0.95.5-beta.1', false], // stable is always newer than pre-release
    ['0.95.6-beta.1', '0.95.5-release.0', false], // beta on newer stable is newer than older stable
    ['0.95.6-beta.1', '0.95.5-release.2', false], // beta on newer stable is newer than older stable
  ])(
    'isNewerVersion(%s, %s) should be %s',
    ([currentVersion, candidateVersion, expected]) => {
      const result = isNewerVersion(currentVersion, candidateVersion);
      expect(result).toBe(expected);
    },
  );
});

describe('isPreRelease', () => {
  test.for<[string, boolean]>([
    ['1.0.0', false],
    ['1.0.0-beta.0', true],
    ['1.0.0-beta.1', true],
    ['1.0.0-release.1', false],
    ['1.0.0-release.0', false],
  ])('isPreRelease(%s) should be %s', ([version, expected]) => {
    const result = isPreRelease(version);
    expect(result).toBe(expected);
  });
});

describe('getReleaseInfo', () => {
  const stableAsset: Readonly<Asset> = {
    downloadUrl:
      'https://github.com/jasp-stats-modules/jaspAcceptanceSampling/releases/download/0.95.5_ab108567_R-4-5-1_Release/jaspAcceptanceSampling_0.95.5_Flatpak_x86_64_R-4-5-1.JASPModule',
    downloadCount: 3,
    architecture: 'Flatpak_x86_64',
  };
  const preAsset: Readonly<Asset> = {
    downloadUrl:
      'https://github.com/jasp-stats-modules/jaspAcceptanceSampling/releases/download/0.95.5.1_ab108567_R-4-5-1_Beta/jaspAcceptanceSampling_0.95.5.1_Flatpak_x86_64_R-4-5-1.JASPModule',
    downloadCount: 3,
    architecture: 'Flatpak_x86_64',
  };

  function release(
    version: string,
    latestVersionIs: 'stable' | 'pre-release',
    jaspVersionRange = '>=0.95.1',
  ) {
    const publishedAt =
      latestVersionIs === 'stable'
        ? '2026-01-01T00:00:00Z'
        : '2025-12-31T00:00:00Z';
    return {
      publishedAt,
      jaspVersionRange,
      version,
      assets: [latestVersionIs === 'stable' ? stableAsset : preAsset],
    };
  }

  test.for<
    [
      string,
      {
        installed: string | undefined;
        stableRelease: string | undefined;
        preRelease: string | undefined;
        allowPreRelease: boolean;
        removeable: boolean;
      },
      ReleaseStats,
    ]
  >([
    [
      'Installed, no releases',
      {
        installed: '1.0.0-release.0',
        stableRelease: undefined,
        preRelease: undefined,
        allowPreRelease: false,
        removeable: false,
      },
      {
        actions: [],
        latestVersionIs: 'installed',
        installedVersion: '1.0.0-release.0',
        latestPreRelease: undefined,
        latestStableRelease: undefined,
      },
    ],
    [
      'Installed removeable, no releases',
      {
        installed: '1.0.0-release.0',
        stableRelease: undefined,
        preRelease: undefined,
        allowPreRelease: false,
        removeable: true,
      },
      {
        actions: [
          {
            type: 'uninstall',
            from: '1.0.0-release.0',
            moduleId: 'jaspAcceptanceSampling',
          },
        ],
        latestVersionIs: 'installed',
        installedVersion: '1.0.0-release.0',
        latestPreRelease: undefined,
        latestStableRelease: undefined,
      },
    ],
    [
      'Not installed, stable available',
      {
        installed: undefined,
        stableRelease: '1.0.0-release.0',
        preRelease: '1.1.0-release.1',
        allowPreRelease: false,
        removeable: false,
      },
      {
        actions: [
          {
            type: 'install-stable',
            asset: stableAsset,
            to: '1.0.0-release.0',
          },
        ],
        latestVersionIs: 'stable',
        installedVersion: undefined,
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Not installed, pre enabled',
      {
        installed: undefined,
        stableRelease: '1.0.0-release.0',
        preRelease: '1.1.0-beta.1',
        allowPreRelease: true,
        removeable: false,
      },
      {
        actions: [
          {
            type: 'install-stable',
            asset: stableAsset,
            to: '1.0.0-release.0',
          },
          {
            type: 'install-pre-release',
            asset: preAsset,
            to: '1.1.0-beta.1',
          },
        ],
        latestVersionIs: 'pre-release',
        installedVersion: undefined,
        latestPreRelease: release('1.1.0-beta.1', 'pre-release'),
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Latest installed, removeable',
      {
        installed: '1.0.0-release.0',
        stableRelease: '1.0.0-release.0',
        preRelease: undefined,
        allowPreRelease: false,
        removeable: true,
      },
      {
        actions: [
          {
            type: 'uninstall',
            from: '1.0.0-release.0',
            moduleId: 'jaspAcceptanceSampling',
          },
        ],
        latestVersionIs: 'installed',
        installedVersion: '1.0.0-release.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Outdated, update to stable',
      {
        installed: '0.9.0-release.0',
        stableRelease: '1.0.0-release.0',
        preRelease: undefined,
        allowPreRelease: false,
        removeable: false,
      },
      {
        actions: [
          {
            type: 'update-stable',
            asset: stableAsset,
            from: '0.9.0-release.0',
            to: '1.0.0-release.0',
          },
        ],
        latestVersionIs: 'stable',
        installedVersion: '0.9.0-release.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Outdated, update+uninstall stable',
      {
        installed: '0.9.0-release.0',
        stableRelease: '1.0.0-release.0',
        preRelease: '1.1.0-beta.1',
        allowPreRelease: false,
        removeable: true,
      },
      {
        actions: [
          {
            type: 'update-stable',
            asset: stableAsset,
            from: '0.9.0-release.0',
            to: '1.0.0-release.0',
          },
          {
            type: 'uninstall',
            from: '0.9.0-release.0',
            moduleId: 'jaspAcceptanceSampling',
          },
        ],
        latestVersionIs: 'stable',
        installedVersion: '0.9.0-release.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Outdated, both releases, pre enabled',
      {
        installed: '0.9.0-release.0',
        stableRelease: '1.0.0-release.0',
        preRelease: '1.1.0-beta.1',
        allowPreRelease: true,
        removeable: true,
      },
      {
        actions: [
          {
            type: 'update-stable',
            asset: stableAsset,
            from: '0.9.0-release.0',
            to: '1.0.0-release.0',
          },
          {
            type: 'update-pre-release',
            asset: preAsset,
            from: '0.9.0-release.0',
            to: '1.1.0-beta.1',
          },
          {
            type: 'uninstall',
            from: '0.9.0-release.0',
            moduleId: 'jaspAcceptanceSampling',
          },
        ],
        latestVersionIs: 'pre-release',
        installedVersion: '0.9.0-release.0',
        latestPreRelease: release('1.1.0-beta.1', 'pre-release'),
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Pre latest, uninstall',
      {
        installed: '1.1.0-beta.1',
        stableRelease: '1.0.0-release.0',
        preRelease: '1.1.0-beta.1',
        allowPreRelease: true,
        removeable: true,
      },
      {
        actions: [
          {
            type: 'uninstall-pre-release',
            from: '1.1.0-beta.1',
            moduleId: 'jaspAcceptanceSampling',
          },
        ],
        latestVersionIs: 'installed',
        installedVersion: '1.1.0-beta.1',
        latestPreRelease: release('1.1.0-beta.1', 'pre-release'),
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Pre update available, removeable',
      {
        installed: '1.1.0-beta.1',
        stableRelease: '1.0.0-release.0',
        preRelease: '1.1.0-beta.2',
        allowPreRelease: true,
        removeable: true,
      },
      {
        actions: [
          {
            type: 'update-pre-release',
            asset: preAsset,
            from: '1.1.0-beta.1',
            to: '1.1.0-beta.2',
          },
          {
            type: 'uninstall-pre-release',
            from: '1.1.0-beta.1',
            moduleId: 'jaspAcceptanceSampling',
          },
        ],
        latestVersionIs: 'pre-release',
        installedVersion: '1.1.0-beta.1',
        latestPreRelease: release('1.1.0-beta.2', 'pre-release'),
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Pre update, not removeable',
      {
        installed: '1.1.0-beta.1',
        stableRelease: '1.0.0-release.0',
        preRelease: '1.1.0-beta.2',
        allowPreRelease: true,
        removeable: false,
      },
      {
        actions: [
          {
            type: 'update-pre-release',
            asset: preAsset,
            from: '1.1.0-beta.1',
            to: '1.1.0-beta.2',
          },
        ],
        latestVersionIs: 'pre-release',
        installedVersion: '1.1.0-beta.1',
        latestPreRelease: release('1.1.0-beta.2', 'pre-release'),
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Pre→stable, pre disabled',
      {
        installed: '1.0.0-beta.1',
        stableRelease: '1.0.0-release.0',
        preRelease: '1.0.0-beta.2',
        allowPreRelease: false,
        removeable: true,
      },
      {
        actions: [
          {
            type: 'update-stable',
            asset: stableAsset,
            from: '1.0.0-beta.1',
            to: '1.0.0-release.0',
          },
        ],
        latestVersionIs: 'stable',
        installedVersion: '1.0.0-beta.1',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Pre→stable (newer pre available)',
      {
        installed: '1.0.0-beta.1',
        stableRelease: '1.0.0-release.0',
        preRelease: '1.0.0-beta.2',
        allowPreRelease: true,
        removeable: true,
      },
      {
        actions: [
          {
            type: 'update-stable',
            asset: stableAsset,
            from: '1.0.0-beta.1',
            to: '1.0.0-release.0',
          },
          {
            type: 'update-pre-release',
            asset: preAsset,
            from: '1.0.0-beta.1',
            to: '1.0.0-beta.2',
          },
          {
            type: 'uninstall-pre-release',
            from: '1.0.0-beta.1',
            moduleId: 'jaspAcceptanceSampling',
          },
        ],
        latestVersionIs: 'stable',
        installedVersion: '1.0.0-beta.1',
        latestPreRelease: release('1.0.0-beta.2', 'pre-release'),
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Stable latest, no updates',
      {
        installed: '1.0.0-release.0',
        stableRelease: '1.0.0-release.0',
        preRelease: undefined,
        allowPreRelease: false,
        removeable: false,
      },
      {
        actions: [],
        latestVersionIs: 'installed',
        installedVersion: '1.0.0-release.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Only pre, update+uninstall',
      {
        installed: '1.1.0-beta.1',
        stableRelease: undefined,
        preRelease: '1.1.0-beta.2',
        allowPreRelease: true,
        removeable: true,
      },
      {
        actions: [
          {
            type: 'update-pre-release',
            asset: preAsset,
            from: '1.1.0-beta.1',
            to: '1.1.0-beta.2',
          },
          {
            type: 'uninstall-pre-release',
            from: '1.1.0-beta.1',
            moduleId: 'jaspAcceptanceSampling',
          },
        ],
        latestVersionIs: 'pre-release',
        installedVersion: '1.1.0-beta.1',
        latestPreRelease: release('1.1.0-beta.2', 'pre-release'),
        latestStableRelease: undefined,
      },
    ],
    [
      'Only pre, disabled, no action',
      {
        installed: '1.1.0-beta.1',
        stableRelease: undefined,
        preRelease: '1.1.0-beta.2',
        allowPreRelease: false,
        removeable: true,
      },
      {
        actions: [],
        latestVersionIs: 'installed',
        installedVersion: '1.1.0-beta.1',
        latestPreRelease: undefined,
        latestStableRelease: undefined,
      },
    ],
    [
      'Stable latest, pre enabled (none)',
      {
        installed: '1.0.0-release.0',
        stableRelease: '1.0.0-release.0',
        preRelease: undefined,
        allowPreRelease: true,
        removeable: false,
      },
      {
        actions: [],
        latestVersionIs: 'installed',
        installedVersion: '1.0.0-release.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Stable latest, older pre (disabled)',
      {
        installed: '1.0.0-release.0',
        stableRelease: '1.0.0-release.0',
        preRelease: '1.0.0-beta.1',
        allowPreRelease: false,
        removeable: false,
      },
      {
        actions: [],
        latestVersionIs: 'installed',
        installedVersion: '1.0.0-release.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Installed newer, no downgrades',
      {
        installed: '2.0.0-release.0',
        stableRelease: '1.0.0-release.0',
        preRelease: undefined,
        allowPreRelease: false,
        removeable: false,
      },
      {
        actions: [],
        latestVersionIs: 'installed',
        installedVersion: '2.0.0-release.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0-release.0', 'stable'),
      },
    ],
    [
      'Stable update, intermediate pre skip',
      {
        installed: '1.1.0-release.0',
        stableRelease: '1.2.0-release.0',
        preRelease: '1.1.5-beta.1',
        allowPreRelease: true,
        removeable: false,
      },
      {
        actions: [
          {
            type: 'update-stable',
            asset: stableAsset,
            from: '1.1.0-release.0',
            to: '1.2.0-release.0',
          },
          {
            type: 'update-pre-release',
            asset: preAsset,
            from: '1.1.0-release.0',
            to: '1.1.5-beta.1',
          },
        ],
        latestVersionIs: 'stable',
        installedVersion: '1.1.0-release.0',
        latestPreRelease: release('1.1.5-beta.1', 'pre-release'),
        latestStableRelease: release('1.2.0-release.0', 'stable'),
      },
    ],
    [
      'Stable latest, older pre disabled',
      {
        installed: '1.2.0-release.0',
        stableRelease: '1.2.0-release.0',
        preRelease: '1.1.5-beta.1',
        allowPreRelease: false,
        removeable: false,
      },
      {
        actions: [],
        latestVersionIs: 'installed',
        installedVersion: '1.2.0-release.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.2.0-release.0', 'stable'),
      },
    ],
    [
      'Stable latest, newer pre disabled',
      {
        installed: '1.2.0-release.0',
        stableRelease: '1.2.0-release.0',
        preRelease: '1.2.5-beta.1',
        allowPreRelease: false,
        removeable: false,
      },
      {
        actions: [],
        latestVersionIs: 'installed',
        installedVersion: '1.2.0-release.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.2.0-release.0', 'stable'),
      },
    ],
    [
      'Latest stable, older latest pre',
      {
        installed: '1.2.0-release.0',
        stableRelease: '1.2.0-release.0',
        preRelease: '1.1.5-beta.1',
        allowPreRelease: true,
        removeable: false,
      },
      {
        actions: [],
        latestVersionIs: 'installed',
        installedVersion: '1.2.0-release.0',
        latestPreRelease: release('1.1.5-beta.1', 'pre-release'),
        latestStableRelease: release('1.2.0-release.0', 'stable'),
      },
    ],
    [
      'Pre same as stable, pre disallowed',
      {
        installed: '1.2.0-release.0',
        stableRelease: '1.2.0-release.0',
        preRelease: '1.2.0-beta.1',
        allowPreRelease: false,
        removeable: false,
      },
      {
        actions: [],
        latestVersionIs: 'installed',
        installedVersion: '1.2.0-release.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.2.0-release.0', 'stable'),
      },
    ],
    [
      'Pre same as stable, pre allowed',
      {
        installed: '1.2.0-release.0',
        stableRelease: '1.2.0-release.0',
        preRelease: '1.2.0-beta.1',
        allowPreRelease: true,
        removeable: false,
      },
      {
        actions: [
          {
            type: 'downgrade-pre-release',
            asset: preAsset,
            from: '1.2.0-release.0',
            to: '1.2.0-beta.1',
          },
        ],
        latestVersionIs: 'installed',
        installedVersion: '1.2.0-release.0',
        latestPreRelease: release('1.2.0-beta.1', 'pre-release'),
        latestStableRelease: release('1.2.0-release.0', 'stable'),
      },
    ],
  ])('$0', ([_summary, given, expected]) => {
    const repo: Repository = {
      id: 'jaspAcceptanceSampling',
      name: 'jaspAcceptanceSampling',
      description: 'Acceptance Sampling Module for JASP',
      releases: given.stableRelease
        ? [release(given.stableRelease, 'stable')]
        : [],
      preReleases: given.preRelease
        ? [release(given.preRelease, 'pre-release')]
        : [],
      releaseSource: 'jasp-stats-modules/jaspAcceptanceSampling',
      organization: 'jasp-stats',
      translations: {},
      channels: ['jasp-modules'],
    };

    const info = getReleaseInfo(
      repo,
      '0.95.1',
      given.allowPreRelease,
      'Flatpak_x86_64',
      given.installed ? { jaspAcceptanceSampling: given.installed } : {},
      given.removeable ? ['jaspAcceptanceSampling'] : [],
    );

    expect(info).toStrictEqual(expected);
  });
});
