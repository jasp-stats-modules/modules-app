import { satisfies } from 'semver';
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
  latestRelease?: Release;
  latestPreRelease?: Release;
  latestAnyRelease?: Release;
  asset?: Asset;
  installedVersion?: string;
  latestVersionInstalled: boolean;
  canInstall: boolean;
  canUpdate: boolean;
  canUninstall: boolean;
}

export function getReleaseInfo(
  repo: Repository,
  installedJaspVersion: string,
  allowPreRelease: boolean,
  arch: string,
  installedModules: { [x: string]: string },
  uninstallableModules: string[],
): ReleaseStats {
  const latestRelease = findReleaseThatSatisfiesInstalledJaspVersion(
    repo.releases,
    installedJaspVersion,
  );
  const latestPreRelease = findReleaseThatSatisfiesInstalledJaspVersion(
    repo.preReleases,
    installedJaspVersion,
  );
  const latestAnyRelease =
    allowPreRelease && latestPreRelease ? latestPreRelease : latestRelease;
  let asset = latestAnyRelease?.assets.find((a) => a.architecture === arch);
  if (!asset) {
    asset = latestRelease?.assets.find((a) => a.architecture === arch);
  }
  const installedVersion = installedModules[repo.name];
  const latestVersionInstalled =
    installedVersion !== undefined &&
    installedVersion === latestAnyRelease?.version;
  const canInstall = !installedVersion || !latestVersionInstalled;
  // tagName (d5d503cf_R-4-5-1) is not a semantic version, so we cannot
  // tell if it can be updated or downgraded
  // For now assume installed version can be updated
  // TODO once tag name contains semantic version use semver to
  // detect whether installed module can be upgraded/downgraded or is already latest
  const canUpdate = !!installedVersion && !latestVersionInstalled;

  const canUninstall = uninstallableModules.includes(repo.name);
  return {
    latestRelease,
    latestPreRelease,
    latestAnyRelease,
    asset,
    installedVersion,
    latestVersionInstalled,
    canInstall,
    canUpdate,
    canUninstall,
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
