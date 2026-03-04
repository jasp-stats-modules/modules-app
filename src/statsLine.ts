import type { Release } from '@/types';
import type { ReleaseStats } from './releaseStats';
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
}): string {
  const {
    installed_version,
    latest_installed_version,
    latest_version_on_with_downloads,
    latest_beta_version_on_with_downloads,
    latest_stable_and_beta_with_downloads,
  } = translations;

  const parts: string[] = [];

  // Case 1: installed version present, but there's a newer version available
  if (latestVersionIs && latestVersionIs !== 'installed' && installedVersion) {
    parts.push(installed_version({ version: installedVersion }).value);
    parts.push(', ');
  }

  // Case 2: latest is the installed version
  if (latestVersionIs === 'installed' && installedVersion) {
    parts.push(latest_installed_version({ version: installedVersion }).value);
    parts.push(' ');
  }

  // Case 3: latest stable release only (no pre-release)
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

  // Case 4: latest pre-release only (no stable)
  if (
    latestVersionIs === 'pre-release' &&
    !latestStableRelease &&
    latestPreRelease
  ) {
    parts.push(
      latest_beta_version_on_with_downloads({
        latestVersion: latestPreRelease.version,
        publishedAt: new Date(
          latestPreRelease.publishedAt,
        ).toLocaleDateString(),
        downloads: totalDownloads(latestPreRelease),
      }).value,
    );
  }

  // Case 5: both stable and pre-release available
  if (latestStableRelease && latestPreRelease) {
    parts.push(
      latest_stable_and_beta_with_downloads({
        latestVersion: latestStableRelease.version,
        publishedAt: new Date(
          latestStableRelease.publishedAt,
        ).toLocaleDateString(),
        latestBetaVersion: latestPreRelease.version,
        latestBetaPublishedAt: new Date(
          latestPreRelease.publishedAt,
        ).toLocaleDateString(),
        downloads: totalDownloads(latestStableRelease),
        betaDownloads: totalDownloads(latestPreRelease),
      }).value,
    );
  }

  return parts.join('');
}
