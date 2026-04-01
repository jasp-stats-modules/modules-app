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
    downgradable_stable_label,
    version_on_with_downloads,
  } = translations;

  const parts: [string?, string?, string?] = [];

  const formatReleaseLine = ({
    label,
    release,
  }: {
    label: string;
    release: Release;
  }) =>
    version_on_with_downloads({
      label,
      version: release.version,
      publishedAt: new Date(release.publishedAt).toLocaleDateString(),
      downloads: totalDownloads(release),
    }).value;

  const installedHasSamePatchPreRelease =
    !!installedVersion &&
    !!latestPreRelease &&
    isSamePatchVersion(installedVersion, latestPreRelease.version);

  const installedPreReleaseIsDowngradableToStable =
    latestVersionIs === 'installed' &&
    !!installedVersion &&
    isPreRelease(installedVersion) &&
    !!latestStableRelease &&
    isNewerVersion(latestStableRelease.version, installedVersion);

  const shouldShowInstalledVersion =
    latestVersionIs && latestVersionIs !== 'installed' && installedVersion;

  const shouldShowDowngradableStable =
    installedPreReleaseIsDowngradableToStable;

  const shouldShowLatestInstalledOnly =
    latestVersionIs === 'installed' &&
    installedVersion &&
    !(isPreRelease(installedVersion) && installedHasSamePatchPreRelease) &&
    !installedPreReleaseIsDowngradableToStable;

  const shouldShowLatestInstalledPreRelease =
    latestVersionIs === 'installed' &&
    installedVersion &&
    isPreRelease(installedVersion) &&
    installedHasSamePatchPreRelease &&
    !installedPreReleaseIsDowngradableToStable;

  const shouldShowStableOnly =
    latestVersionIs === 'stable' && latestStableRelease && !latestPreRelease;

  const shouldShowStableWithSamePatchBeta =
    latestVersionIs === 'stable' &&
    latestStableRelease &&
    latestPreRelease &&
    isSamePatchVersion(latestStableRelease.version, latestPreRelease.version);

  const shouldShowPreReleaseOnly =
    latestVersionIs === 'pre-release' &&
    !latestStableRelease &&
    latestPreRelease;

  const shouldShowBothStableAndBeta =
    latestStableRelease &&
    latestPreRelease &&
    !(
      latestVersionIs === 'installed' &&
      installedVersion &&
      installedHasSamePatchPreRelease
    ) &&
    !(
      latestVersionIs === 'stable' &&
      isSamePatchVersion(latestStableRelease.version, latestPreRelease.version)
    );

  if (shouldShowInstalledVersion) {
    parts.push(
      installed_version({ version: installedVersion }).value,
    );
  }

  if (shouldShowDowngradableStable) {
    parts.push(latest_installed_version({ version: installedVersion }).value);
    parts.push(
      formatReleaseLine({
        label: downgradable_stable_label.value,
        release: latestStableRelease,
      }),
    );
  }
  else if (shouldShowLatestInstalledOnly) {
    parts.push(
      latest_installed_version({ version: installedVersion }).value,
    );
  }
  else if (shouldShowLatestInstalledPreRelease) {
    parts.push(
      installed_version({ version: installedVersion }).value,
    );
  }
  else if (shouldShowStableOnly) {
    parts.push(
      latest_version_on_with_downloads({
        latestVersion: latestStableRelease.version,
        publishedAt: new Date(
          latestStableRelease.publishedAt,
        ).toLocaleDateString(),
        downloads: totalDownloads(latestStableRelease),
      }).value,
    );
  } else if (shouldShowStableWithSamePatchBeta) {
    parts.push(
      formatReleaseLine({
        label: latest_stable_label.value,
        release: latestStableRelease,
      }),
    );
  } else if (shouldShowPreReleaseOnly) {
    parts.push(
      formatReleaseLine({
        label: latest_beta_label.value,
        release: latestPreRelease,
      }),
    );
  } else if (shouldShowBothStableAndBeta) {
    parts.push(
      formatReleaseLine({
        label: latest_stable_label.value,
        release: latestStableRelease,
      }),
    );
    parts.push(
      formatReleaseLine({
        label: latest_beta_label.value,
        release: latestPreRelease,
      }),
    );
  }

  return parts;
}
