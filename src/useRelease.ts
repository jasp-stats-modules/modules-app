import {
  compareBuild,
  major,
  minor,
  patch,
  prerelease,
  satisfies,
} from 'semver';
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

interface BaseInstallAction {
  asset: Asset;
  to: string;
}

interface BaseFromAction extends BaseInstallAction {
  from: string;
}

export interface InstallStableAction extends BaseInstallAction {
  type: 'install-stable';
}

export interface UpdateStableAction extends BaseFromAction {
  type: 'update-stable';
}

interface BaseUninstallAction {
  moduleId: string;
  from: string;
}

export interface UninstallPreReleaseAction extends BaseUninstallAction {
  type: 'uninstall-pre-release';
}

export interface InstallPreReleaseAction extends BaseInstallAction {
  type: 'install-pre-release';
}

export interface UpdatePreReleaseAction extends BaseFromAction {
  type: 'update-pre-release';
}

export interface DowngradePreReleaseAction extends BaseFromAction {
  type: 'downgrade-pre-release';
}

export interface UninstallAction extends BaseUninstallAction {
  type: 'uninstall';
}

export type AnyAction =
  | InstallStableAction
  | UpdateStableAction
  | UninstallPreReleaseAction
  | InstallPreReleaseAction
  | UpdatePreReleaseAction
  | DowngradePreReleaseAction
  | UninstallAction;

export interface ReleaseStats {
  latestStableRelease?: Release;
  latestPreRelease?: Release;
  installedVersion?: string;
  latestVersionIs?: 'stable' | 'pre-release' | 'installed';
  actions: AnyAction[];
}

function jaspVersionToSemver(version: string): string {
  if (isJaspStableReleaseVersion(version)) {
    //'0.95.5-release.1 in semver 0.95.5+1
    return version.replace('-release.', '+');
  }
  if (isJaspBetaVersion(version)) {
    return version;
  }
  return version;
}

function isJaspBetaVersion(version: string): boolean {
  // 0.95.5-beta.0
  return /\d+\.\d+\.\d+-beta\.\d+/.test(version);
}

function isJaspStableReleaseVersion(version: string): boolean {
  // 0.95.5-release.1
  return /^\d+\.\d+\.\d+-release\.\d+$/.test(version);
}

export function isPreRelease(version: string): boolean {
  const semver = jaspVersionToSemver(version);
  return prerelease(semver) !== null;
}

/**
 * Whether the candidateVersion is newer than the currentVersion.
 */
export function isNewerVersion(
  currentVersion: string,
  candidateVersion: string,
): boolean {
  const currentSemVersion = jaspVersionToSemver(currentVersion);
  const candidateSemVersion = jaspVersionToSemver(candidateVersion);
  const compareResult = compareBuild(currentSemVersion, candidateSemVersion);
  return compareResult === -1;
}

function isSamePatchVersion(
  installedVersion: string,
  latestPreReleaseVersion: string | undefined,
): boolean {
  const installedSemver = jaspVersionToSemver(installedVersion);
  const preReleaseSemver =
    latestPreReleaseVersion !== undefined
      ? jaspVersionToSemver(latestPreReleaseVersion)
      : undefined;
  return (
    !!installedSemver &&
    !!preReleaseSemver &&
    major(installedSemver) === major(preReleaseSemver) &&
    minor(installedSemver) === minor(preReleaseSemver) &&
    patch(installedSemver) === patch(preReleaseSemver)
  );
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
  const installedVersion: string | undefined = installedModules[repo.id];
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
    } else if (latestStableRelease !== undefined) {
      latestVersionIs = 'stable';
    }
  }
  const actions: AnyAction[] = [];
  if (stableAsset && latestStableReleaseVersion) {
    if (!installedVersion) {
      actions.push({
        type: 'install-stable',
        asset: stableAsset,
        to: latestStableReleaseVersion,
      });
    } else if (canUpdateToStable) {
      actions.push({
        type: 'update-stable',
        asset: stableAsset,
        to: latestStableReleaseVersion,
        from: installedVersion,
      });
    }
  }
  if (allowPreRelease && preReleaseAsset && latestPreReleaseVersion) {
    if (!installedVersion) {
      actions.push({
        type: 'install-pre-release',
        asset: preReleaseAsset,
        to: latestPreReleaseVersion,
      });
    } else if (canUpdateToPreRelease) {
      actions.push({
        type: 'update-pre-release',
        asset: preReleaseAsset,
        to: latestPreReleaseVersion,
        from: installedVersion,
      });
    }
  }
  // Downgrade from stable release to pre-release of same release version
  // for example 0.95.5-release.4 -> 0.95.5-beta.2
  const samePatchVersion = isSamePatchVersion(
    installedVersion,
    latestPreReleaseVersion,
  );
  if (
    allowPreRelease &&
    installedVersion !== undefined &&
    !isPreRelease(installedVersion) &&
    latestPreReleaseVersion !== undefined &&
    preReleaseAsset &&
    samePatchVersion
  ) {
    actions.push({
      type: 'downgrade-pre-release',
      asset: preReleaseAsset,
      to: latestPreReleaseVersion,
      from: installedVersion,
    });
  }
  if (
    installedVersion &&
    uninstallableModules.includes(repo.id) &&
    !installedIsPreRelease
  ) {
    actions.push({
      type: 'uninstall',
      moduleId: repo.id,
      from: installedVersion,
    });
  }
  if (
    allowPreRelease &&
    installedVersion &&
    uninstallableModules.includes(repo.id) &&
    installedIsPreRelease
  ) {
    actions.push({
      type: 'uninstall-pre-release',
      moduleId: repo.id,
      from: installedVersion,
    });
  }

  return {
    latestStableRelease,
    latestPreRelease: allowPreRelease ? latestPreRelease : undefined,
    installedVersion,
    latestVersionIs,
    actions,
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
