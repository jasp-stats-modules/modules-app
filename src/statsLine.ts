import type { Release } from '@/types';
import type { ReleaseStats } from './releaseStats';
import {
  isNewerVersion,
  isPreRelease,
  isSamePatchVersion,
} from './releaseStats';
import type { AppTranslations } from './translations';

export function totalDownloads(release: Release): number {
  return release.assets.reduce(
    (sum, asset) => sum + (asset.downloadCount ?? 0),
    0,
  );
}

export function statsLine({
  installedVersion,
  latestStableRelease,
  latestPreRelease,
  latestVersionIs,
  translations,
}: {
  installedVersion?: string;
  latestStableRelease?: Release;
  latestPreRelease?: Release;
  latestVersionIs?: ReleaseStats['latestVersionIs'];
  translations: AppTranslations;
}): [string?, string?, string?] {
  const {
    installed_version,
    latest_installed_version,
    latest_version_on_with_downloads,
    latest_beta_label,
    latest_stable_label,
    downgradable_beta_label,
    downgradable_stable_label,
    version_on_with_downloads,
  } = translations;

  const parts: [string?, string?, string?] = [];
  const releaseLine = ({
    label,
    version,
    publishedAt,
    downloads,
  }: {
    label: string;
    version: string;
    publishedAt: string;
    downloads: number;
  }) =>
    version_on_with_downloads({
      label,
      version,
      publishedAt,
      downloads,
    }).value;

  // Case 1: installed version present, but there's a newer version available
  if (latestVersionIs && latestVersionIs !== 'installed' && installedVersion) {
    parts.push(installed_version({ version: installedVersion }).value);
  }

  // Case 2: latest is the installed version, with both stable and pre-release available
  // Check if beta has same patch version as installed (downgradable scenario)
  // Only applies when installed is a stable release (not pre-release)
  if (
    latestVersionIs === 'installed' &&
    installedVersion &&
    !isPreRelease(installedVersion) &&
    latestStableRelease &&
    latestPreRelease &&
    isSamePatchVersion(installedVersion, latestPreRelease.version)
  ) {
    parts.push(latest_installed_version({ version: installedVersion }).value);
    parts.push(
      releaseLine({
        label: downgradable_beta_label.value,
        version: latestPreRelease.version,
        publishedAt: new Date(
          latestPreRelease.publishedAt,
        ).toLocaleDateString(),
        downloads: totalDownloads(latestPreRelease),
      }),
    );
  }

  // Case 2.5: latest is the installed version (pre-release), downgradable to stable
  // Check if installed is a pre-release that is newer than available stable
  if (
    latestVersionIs === 'installed' &&
    installedVersion &&
    isPreRelease(installedVersion) &&
    latestStableRelease &&
    isNewerVersion(latestStableRelease.version, installedVersion)
  ) {
    parts.push(latest_installed_version({ version: installedVersion }).value);
    parts.push(
      releaseLine({
        label: downgradable_stable_label.value,
        version: latestStableRelease.version,
        publishedAt: new Date(
          latestStableRelease.publishedAt,
        ).toLocaleDateString(),
        downloads: totalDownloads(latestStableRelease),
      }),
    );
  }

  // Case 3: latest is the installed version (no downgradable scenario)
  if (
    latestVersionIs === 'installed' &&
    installedVersion &&
    !(
      latestStableRelease &&
      latestPreRelease &&
      isSamePatchVersion(installedVersion, latestPreRelease.version)
    ) &&
    !(
      isPreRelease(installedVersion) &&
      latestStableRelease &&
      isNewerVersion(latestStableRelease.version, installedVersion)
    )
  ) {
    parts.push(latest_installed_version({ version: installedVersion }).value);
  }

  // Case 4: latest stable release only (no pre-release)
  if (
    latestVersionIs === 'stable' &&
    latestStableRelease &&
    !latestPreRelease
  ) {
    parts.push(
      latest_version_on_with_downloads({
        latestVersion: latestStableRelease.version,
        publishedAt: new Date(
          latestStableRelease.publishedAt,
        ).toLocaleDateString(),
        downloads: totalDownloads(latestStableRelease),
      }).value,
    );
  }

  // Case 5: latest pre-release only (no stable)
  if (
    latestVersionIs === 'pre-release' &&
    !latestStableRelease &&
    latestPreRelease
  ) {
    parts.push(
      releaseLine({
        label: latest_beta_label.value,
        version: latestPreRelease.version,
        publishedAt: new Date(
          latestPreRelease.publishedAt,
        ).toLocaleDateString(),
        downloads: totalDownloads(latestPreRelease),
      }),
    );
  }

  // Case 6: both stable and pre-release available (but not downgradable scenario)
  if (
    latestStableRelease &&
    latestPreRelease &&
    !(
      latestVersionIs === 'installed' &&
      installedVersion &&
      isSamePatchVersion(installedVersion, latestPreRelease.version)
    )
  ) {
    parts.push(
      releaseLine({
        label: latest_stable_label.value,
        version: latestStableRelease.version,
        publishedAt: new Date(
          latestStableRelease.publishedAt,
        ).toLocaleDateString(),
        downloads: totalDownloads(latestStableRelease),
      }),
    );
    parts.push(
      releaseLine({
        label: latest_beta_label.value,
        version: latestPreRelease.version,
        publishedAt: new Date(
          latestPreRelease.publishedAt,
        ).toLocaleDateString(),
        downloads: totalDownloads(latestPreRelease),
      }),
    );
  }

  return parts;
}
