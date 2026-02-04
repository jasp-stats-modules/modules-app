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
    ['1.0.0', '1.0.1', true],
    ['1.0.1', '1.0.0', false],
    ['1.0.0', '1.0.0', false],
    ['1.0.0', '1.0.0.1', false],
    ['1.0.0.1', '1.0.0', true],
    ['1.0.0.1', '1.0.0.2', true],
    ['1.0.0.2', '1.0.0.1', false],
    ['1.0.0.0', '1.0.0.2', true],
    ['1.0.0.2', '1.0.0.0', false],
    ['2.0.0', '10.0.0', true],
    ['10.0.0', '2.0.0', false],
    ['1.0.0-alpha', '1.0.0', true],
    ['1.0.0-alpha', '1.0.0-beta', true],
    ['1.0.0-alpha', '1.0.0-alpha', false],
    ['1.0', '1.0.0', true],
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
    ['1.0.0-beta.1', true],
    ['1.0.0.1', true],
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
      {
        installed: '1.0.0',
        stableRelease: undefined,
        preRelease: undefined,
        allowPreRelease: false,
        removeable: false,
      },
      {
        primaryAction: undefined,
        secondaryAction: undefined,
        latestVersionIs: 'installed',
        asset: undefined,
        installedVersion: '1.0.0',
        latestPreRelease: undefined,
        latestStableRelease: undefined,
      },
    ],
    [
      {
        installed: undefined,
        stableRelease: '1.0.0',
        preRelease: '1.1.0.1',
        allowPreRelease: false,
        removeable: false,
      },
      {
        primaryAction: 'install-stable',
        secondaryAction: undefined,
        latestVersionIs: 'stable',
        asset: stableAsset,
        installedVersion: undefined,
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: undefined,
        stableRelease: '1.0.0',
        preRelease: '1.1.0.1',
        allowPreRelease: true,
        removeable: false,
      },
      {
        primaryAction: undefined,
        secondaryAction: 'install-pre-release',
        latestVersionIs: 'pre-release',
        asset: preAsset,
        installedVersion: undefined,
        latestPreRelease: release('1.1.0.1', 'pre-release'),
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '1.0.0',
        stableRelease: '1.0.0',
        preRelease: undefined,
        allowPreRelease: false,
        removeable: true,
      },
      {
        primaryAction: undefined,
        secondaryAction: 'uninstall',
        latestVersionIs: 'installed',
        asset: undefined,
        installedVersion: '1.0.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '0.9.0',
        stableRelease: '1.0.0',
        preRelease: undefined,
        allowPreRelease: false,
        removeable: false,
      },
      {
        primaryAction: 'update-stable',
        secondaryAction: undefined,
        latestVersionIs: 'stable',
        asset: stableAsset,
        installedVersion: '0.9.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '0.9.0',
        stableRelease: '1.0.0',
        preRelease: '1.1.0.1',
        allowPreRelease: false,
        removeable: true,
      },
      {
        primaryAction: 'update-stable',
        secondaryAction: 'uninstall',
        latestVersionIs: 'stable',
        asset: stableAsset,
        installedVersion: '0.9.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '0.9.0',
        stableRelease: '1.0.0',
        preRelease: '1.1.0.1',
        allowPreRelease: true,
        removeable: true,
      },
      {
        primaryAction: undefined,
        secondaryAction: 'update-pre-release',
        latestVersionIs: 'pre-release',
        asset: preAsset,
        installedVersion: '0.9.0',
        latestPreRelease: release('1.1.0.1', 'pre-release'),
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '1.1.0.1',
        stableRelease: '1.0.0',
        preRelease: '1.1.0.1',
        allowPreRelease: true,
        removeable: true,
      },
      {
        primaryAction: 'uninstall-pre-release',
        secondaryAction: undefined,
        latestVersionIs: 'installed',
        asset: undefined,
        installedVersion: '1.1.0.1',
        latestPreRelease: release('1.1.0.1', 'pre-release'),
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '1.1.0.1',
        stableRelease: '1.0.0',
        preRelease: '1.1.0.2',
        allowPreRelease: true,
        removeable: true,
      },
      {
        primaryAction: 'uninstall-pre-release',
        secondaryAction: 'update-pre-release',
        latestVersionIs: 'pre-release',
        asset: preAsset,
        installedVersion: '1.1.0.1',
        latestPreRelease: release('1.1.0.2', 'pre-release'),
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '1.1.0.1',
        stableRelease: '1.0.0',
        preRelease: '1.1.0.2',
        allowPreRelease: true,
        removeable: false,
      },
      {
        primaryAction: undefined,
        secondaryAction: 'update-pre-release',
        latestVersionIs: 'pre-release',
        asset: preAsset,
        installedVersion: '1.1.0.1',
        latestPreRelease: release('1.1.0.2', 'pre-release'),
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '1.0.0.1',
        stableRelease: '1.0.0',
        preRelease: '1.0.0.2',
        allowPreRelease: false,
        removeable: true,
      },
      {
        primaryAction: 'update-stable',
        secondaryAction: undefined,
        latestVersionIs: 'stable',
        asset: stableAsset,
        installedVersion: '1.0.0.1',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '1.0.0.1',
        stableRelease: '1.0.0',
        preRelease: '1.0.0.2',
        allowPreRelease: true,
        removeable: true,
      },
      {
        primaryAction: 'update-stable',
        secondaryAction: undefined,
        latestVersionIs: 'stable',
        asset: stableAsset,
        installedVersion: '1.0.0.1',
        latestPreRelease: release('1.0.0.2', 'pre-release'),
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '1.0.0',
        stableRelease: '1.0.0',
        preRelease: undefined,
        allowPreRelease: false,
        removeable: false,
      },
      {
        primaryAction: undefined,
        secondaryAction: undefined,
        latestVersionIs: 'installed',
        asset: undefined,
        installedVersion: '1.0.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '1.1.0.1',
        stableRelease: undefined,
        preRelease: '1.1.0.2',
        allowPreRelease: true,
        removeable: true,
      },
      {
        primaryAction: 'uninstall-pre-release',
        secondaryAction: 'update-pre-release',
        latestVersionIs: 'pre-release',
        asset: preAsset,
        installedVersion: '1.1.0.1',
        latestPreRelease: release('1.1.0.2', 'pre-release'),
        latestStableRelease: undefined,
      },
    ],
    [
      {
        installed: '1.1.0.1',
        stableRelease: undefined,
        preRelease: '1.1.0.2',
        allowPreRelease: false,
        removeable: true,
      },
      {
        primaryAction: undefined,
        secondaryAction: undefined,
        latestVersionIs: 'installed',
        asset: undefined,
        installedVersion: '1.1.0.1',
        latestPreRelease: undefined,
        latestStableRelease: undefined,
      },
    ],
    [
      {
        installed: '1.0.0',
        stableRelease: '1.0.0',
        preRelease: undefined,
        allowPreRelease: true,
        removeable: false,
      },
      {
        primaryAction: undefined,
        secondaryAction: undefined,
        latestVersionIs: 'installed',
        asset: undefined,
        installedVersion: '1.0.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '1.0.0',
        stableRelease: '1.0.0',
        preRelease: '1.0.0.1',
        allowPreRelease: true,
        removeable: false,
      },
      {
        primaryAction: undefined,
        secondaryAction: undefined,
        latestVersionIs: 'installed',
        asset: undefined,
        installedVersion: '1.0.0',
        latestPreRelease: release('1.0.0.1', 'pre-release'),
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '1.0.0',
        stableRelease: '1.0.0',
        preRelease: '1.0.0.1',
        allowPreRelease: false,
        removeable: false,
      },
      {
        primaryAction: undefined,
        secondaryAction: undefined,
        latestVersionIs: 'installed',
        asset: undefined,
        installedVersion: '1.0.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '2.0.0',
        stableRelease: '1.0.0',
        preRelease: undefined,
        allowPreRelease: false,
        removeable: false,
      },
      {
        primaryAction: undefined,
        secondaryAction: undefined,
        latestVersionIs: 'installed',
        asset: undefined,
        installedVersion: '2.0.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.0.0', 'stable'),
      },
    ],
    [
      {
        installed: '1.1.0',
        stableRelease: '1.2.0',
        preRelease: '1.1.5.1',
        allowPreRelease: true,
        removeable: false,
      },
      {
        primaryAction: 'update-stable',
        secondaryAction: undefined,
        latestVersionIs: 'stable',
        asset: stableAsset,
        installedVersion: '1.1.0',
        latestPreRelease: release('1.1.5.1', 'pre-release'),
        latestStableRelease: release('1.2.0', 'stable'),
      },
    ],
    [
      {
        installed: '1.2.0',
        stableRelease: '1.2.0',
        preRelease: '1.1.5.1',
        allowPreRelease: false,
        removeable: false,
      },
      {
        primaryAction: undefined,
        secondaryAction: undefined,
        latestVersionIs: 'installed',
        asset: undefined,
        installedVersion: '1.2.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.2.0', 'stable'),
      },
    ],
    [
      {
        installed: '1.2.0',
        stableRelease: '1.2.0',
        preRelease: '1.2.5.1',
        allowPreRelease: false,
        removeable: false,
      },
      {
        primaryAction: undefined,
        secondaryAction: undefined,
        latestVersionIs: 'installed',
        asset: undefined,
        installedVersion: '1.2.0',
        latestPreRelease: undefined,
        latestStableRelease: release('1.2.0', 'stable'),
      },
    ],
  ])('given %o => %o', ([given, expected]) => {
    const repo: Repository = {
      name: 'jaspAcceptanceSampling',
      shortDescriptionHTML: 'Acceptance Sampling Module for JASP',
      releases: given.stableRelease
        ? [release(given.stableRelease, 'stable')]
        : [],
      preReleases: given.preRelease
        ? [release(given.preRelease, 'pre-release')]
        : [],
      releaseSource: 'jasp-stats-modules/jaspAcceptanceSampling',
      organization: 'jasp-stats',
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
