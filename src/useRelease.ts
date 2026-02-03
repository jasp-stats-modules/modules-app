import { satisfies, lt } from 'semver';
import type { Asset, Release, Repository } from '@/types';
import { useInfo } from './useInfo';

export function findReleaseThatSatisfiesInstalledJaspVersion(
  releases: Release[],
  installed_version: string,
): Release | undefined {
  return releases.find((release) =>
    satisfies(installed_version, release.jaspVersionRange ?? ''),
  );
}

export interface ReleaseStats {
  latestStableReleaseVersion?: string;
  latestPreReleaseVersion?: string;
  installedVersion?: string;
  asset?: Asset;
  latestVersionIs: 'stable' | 'pre-release' | 'installed';
  // The *-pre-release actions are only possible when allowPreRelease=true
  primaryAction?: 'install-stable' | 'update-stable';
  secondaryAction?: 'install-pre-release' | 'update-pre-release' | 'uninstall';
}
function isNewerVersion(currentVersion: string, candidateVersion: string): boolean {
  try {
    return lt(currentVersion, candidateVersion);
  } catch {
    return currentVersion !== candidateVersion;
  }
}

export function getReleaseInfo(
  repo: Repository,
  installedJaspVersion: string,
  allowPreRelease: boolean,
  arch: string,
  installedModules: { [x: string]: string },
  uninstallableModules: string[],
): ReleaseStats {
  const latestStableRelease = findReleaseThatSatisfiesInstalledJaspVersion(
    repo.releases,
    installedJaspVersion,
  );
  const latestPreRelease = findReleaseThatSatisfiesInstalledJaspVersion(
    repo.preReleases,
    installedJaspVersion,
  );
  const latestStableReleaseVersion = latestStableRelease?.version;
  const latestPreReleaseVersion = latestPreRelease?.version;
  const stableAsset = latestStableRelease?.assets.find(
    (a) => a.architecture === arch,
  );
  const preReleaseAsset = latestPreRelease?.assets.find(
    (a) => a.architecture === arch,
  );
  const asset = stableAsset ?? preReleaseAsset;
  const installedVersion: string | undefined = installedModules[repo.name];
  const latestPreReleaseIsNewerThanStable =
    allowPreRelease &&
    latestPreReleaseVersion !== undefined &&
    (latestStableReleaseVersion === undefined ||
      isNewerVersion(latestStableReleaseVersion, latestPreReleaseVersion));
  const latestVersionType: ReleaseStats['latestVersionIs'] =
    latestPreReleaseIsNewerThanStable ? 'pre-release' : 'stable';
  const latestVersionIs: ReleaseStats['latestVersionIs'] =
    installedVersion &&
    ((latestVersionType === 'stable' &&
      installedVersion === latestStableReleaseVersion) ||
      (latestVersionType === 'pre-release' &&
        installedVersion === latestPreReleaseVersion))
      ? 'installed'
      : latestVersionType;
  const canUpdateToStable =
    installedVersion !== undefined &&
    latestStableReleaseVersion !== undefined &&
    isNewerVersion(installedVersion, latestStableReleaseVersion);
  const canUpdateToPreRelease =
    installedVersion !== undefined &&
    latestPreReleaseVersion !== undefined &&
    isNewerVersion(installedVersion, latestPreReleaseVersion);
  let primaryAction: ReleaseStats['primaryAction'];
  if (stableAsset && latestStableReleaseVersion) {
    if (!installedVersion) {
      primaryAction = 'install-stable';
    } else if (canUpdateToStable) {
      primaryAction = 'update-stable';
    }
  }
  let secondaryAction: ReleaseStats['secondaryAction'];
  if (allowPreRelease && preReleaseAsset && latestPreReleaseVersion) {
    if (!installedVersion) {
      secondaryAction = 'install-pre-release';
    } else if (canUpdateToPreRelease) {
      secondaryAction = 'update-pre-release';
    }
  }
  if (
    !secondaryAction &&
    installedVersion &&
    uninstallableModules.includes(repo.name)
  ) {
    secondaryAction = 'uninstall';
  }
  return {
    latestStableReleaseVersion,
    latestPreReleaseVersion,
    asset,
    installedVersion,
    latestVersionIs,
    primaryAction,
    secondaryAction,
  };
}

export function useRelease(
  repo: Repository,
  allowPreRelease: boolean,
): ReleaseStats {
  const { info } = useInfo();
  return getReleaseInfo(
    repo,
    info.version,
    allowPreRelease,
    info.arch,
    info.installedModules,
    info.uninstallableModules,
  );
}
