import { lt, satisfies } from 'semver';
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
  latestStableRelease?: Release;
  latestPreRelease?: Release;
  installedVersion?: string;
  asset?: Asset;
  latestVersionIs?: 'stable' | 'pre-release' | 'installed';
  // The *-pre-release actions are only possible when allowPreRelease=true
  primaryAction?: 'install-stable' | 'update-stable' | 'uninstall-pre-release';
  secondaryAction?: 'install-pre-release' | 'update-pre-release' | 'uninstall';
}

function jaspVersionToSemver(version: string): string {
  // Convert 1.2.3.4 to 1.2.3-beta.4 for semver comparison
  if (isPreRelease(version)) {
    return version.replace(/^(\d+\.\d+\.\d+)\.(\d+)$/, '$1-beta.$2');
  }
  return version;
}

function isPreRelease(version: string): boolean {
  return version.split('.').length === 4;
}

export function isNewerVersion(
  currentVersion: string,
  candidateVersion: string,
): boolean {
  currentVersion = jaspVersionToSemver(currentVersion);
  candidateVersion = jaspVersionToSemver(candidateVersion);
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
  const installedVersion: string | undefined = installedModules[repo.name];
  const latestPreReleaseIsNewerThanStable =
    allowPreRelease &&
    latestPreReleaseVersion !== undefined &&
    (latestStableReleaseVersion === undefined ||
      isNewerVersion(latestStableReleaseVersion, latestPreReleaseVersion));
  const canUpdateToStable =
    installedVersion !== undefined &&
    latestStableReleaseVersion !== undefined &&
    isNewerVersion(installedVersion, latestStableReleaseVersion);
  const canUpdateToPreRelease =
    allowPreRelease &&
    installedVersion !== undefined &&
    latestPreReleaseVersion !== undefined &&
    isNewerVersion(installedVersion, latestPreReleaseVersion);
  const installedIsPreRelease =
    installedVersion && isPreRelease(installedVersion);
  let latestVersionIs: ReleaseStats['latestVersionIs'];
  let asset: Asset | undefined;
  if (installedVersion) {
    latestVersionIs = 'installed';
    if (canUpdateToStable && !latestPreReleaseIsNewerThanStable) {
      latestVersionIs = 'stable';
    } else if (canUpdateToPreRelease) {
      latestVersionIs = 'pre-release';
    }
  } else {
    if (latestPreReleaseIsNewerThanStable) {
      latestVersionIs = 'pre-release';
    } else {
      latestVersionIs = 'stable';
    }
  }
  if (latestVersionIs === 'stable' && stableAsset) {
    asset = stableAsset;
  } else if (latestVersionIs === 'pre-release' && preReleaseAsset) {
    asset = preReleaseAsset;
  }
  let primaryAction: ReleaseStats['primaryAction'];
  if (
    stableAsset &&
    latestStableReleaseVersion &&
    !latestPreReleaseIsNewerThanStable
  ) {
    if (!installedVersion) {
      primaryAction = 'install-stable';
    } else if (canUpdateToStable) {
      primaryAction = 'update-stable';
    }
  }
  let secondaryAction: ReleaseStats['secondaryAction'];
  if (
    allowPreRelease &&
    preReleaseAsset &&
    latestPreReleaseVersion &&
    latestPreReleaseIsNewerThanStable
  ) {
    if (!installedVersion) {
      secondaryAction = 'install-pre-release';
    } else if (canUpdateToPreRelease) {
      secondaryAction = 'update-pre-release';
    }
  }
  if (
    !secondaryAction &&
    installedVersion &&
    uninstallableModules.includes(repo.name) &&
    !installedIsPreRelease
  ) {
    secondaryAction = 'uninstall';
  }
  if (
    !primaryAction &&
    allowPreRelease &&
    installedVersion &&
    uninstallableModules.includes(repo.name) &&
    installedIsPreRelease
  ) {
    primaryAction = 'uninstall-pre-release';
  }
  return {
    latestStableRelease,
    latestPreRelease: allowPreRelease ? latestPreRelease : undefined,
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
