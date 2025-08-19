import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { satisfies } from 'semver';
import * as v from 'valibot';
import type {
  Release,
  ReleaseAsset,
  RepoReleaseAssets,
  Repository,
} from '@/types';
import { assets, channels } from '../index.json';

const channels2repos = channels as unknown as Record<string, string[]>;
const releaseAssets = assets as unknown as RepoReleaseAssets;

const defaultArchitecture = 'Windows_x86-64';
const defaultInstalledVersion = '0.95.1';
// const defaultInstalledModules = () => ({})
// TODO remove example once JASP has app integrated
const defaultInstalledModules = () => ({
  jaspEquivalenceTTests: '7aad95f4_R-4-5-1',
  jaspTTests: 'a8098ba98_R-4-4-0',
});
const defaultChannel = 'core-modules';

const SearchSchema = v.object({
  // Architecture of installed JASP
  a: v.optional(
    v.fallback(v.string(), defaultArchitecture),
    defaultArchitecture,
  ),
  // Version of installed JASP
  v: v.optional(
    v.fallback(v.string(), defaultInstalledVersion),
    defaultInstalledVersion,
  ),
  // Installed modules where key is the module name and value is the version
  i: v.optional(
    v.fallback(v.record(v.string(), v.string()), defaultInstalledModules),
    defaultInstalledModules,
  ),
});

export const Route = createFileRoute('/')({
  component: App,
  validateSearch: SearchSchema,
});

function InstallButton({ asset }: { asset?: ReleaseAsset }) {
  if (!asset) {
    return null;
  }
  return (
    <a
      href={asset.downloadUrl}
      className="inline-flex items-center rounded bg-green-600 px-3 py-1.5 font-medium text-white text-xs transition-colors duration-200 hover:bg-green-700"
    >
      Install
    </a>
  );
}

function UpdateButton({ asset }: { asset?: ReleaseAsset }) {
  if (!asset) {
    return null;
  }
  return (
    <a
      href={asset.downloadUrl}
      className="inline-flex items-center rounded bg-blue-600 px-3 py-1.5 font-medium text-white text-xs transition-colors duration-200 hover:bg-blue-700"
    >
      Update
    </a>
  );
}

function findReleaseThatSatisfiesInstalledJaspVersion(
  releases: Release[],
  installed_version: string,
): Release | undefined {
  return releases.find((release) =>
    satisfies(installed_version, release.jaspVersionRange ?? ''),
  );
}

function RepositoryCard({
  repo,
  allowPreRelease,
}: {
  repo: Repository;
  allowPreRelease?: boolean;
}) {
  const {
    i: installedModules,
    a: arch,
    v: installedJaspVersion,
  } = Route.useSearch();
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
  const archAsset = latestAnyRelease?.assets.find(
    (a) => a.architecture === arch,
  );
  const installedVersion = installedModules[repo.name];
  const latestVersionInstalled = installedVersion === latestAnyRelease?.tagName;
  const canInstall = !installedVersion || !latestVersionInstalled;
  // tagName (d5d503cf_R-4-5-1) is not a semantic version, so we cannot
  // tell if it can be updated or downgraded
  // For now assume installed version can be updated
  const canUpdate = installedVersion && !latestVersionInstalled;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{repo.name}</h3>
          {repo.shortDescriptionHTML && (
            <div className="prose prose-sm mb-2 text-gray-600 text-sm">
              {repo.shortDescriptionHTML}
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <div className="flex flex-col">
            {canUpdate && <UpdateButton asset={archAsset} />}
            {canInstall && !canUpdate && <InstallButton asset={archAsset} />}
            {allowPreRelease && latestPreRelease && (
              <span className="text-gray-500 text-xs">Pre release</span>
            )}
            {latestVersionInstalled && (
              <span
                title="Latest version is installed"
                className="px-2 py-1.5 text-gray-500 text-xs"
              >
                Installed
              </span>
            )}
          </div>
        </div>
      </div>
      <div>
        {latestAnyRelease && (
          <div className="text-gray-500 text-xs">
            <span>
              {installedVersion
                ? ` installed: ${installedVersion}, latest`
                : 'latest '}{' '}
              {latestAnyRelease.tagName.replace('v', '')} on{' '}
              {new Date(latestAnyRelease.publishedAt).toLocaleDateString()}
            </span>{' '}
            <span>by {repo.organization}</span>{' '}
            <span>with {archAsset?.downloadCount} downloads</span>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const { a: architecture, v: installedJaspVersion } = Route.useSearch();
  const [channel, setChannel] = useState<string>(defaultChannel);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [allowPreRelease, setAllowPreRelease] = useState<boolean>(false);
  const channels = Object.keys(channels2repos);
  const reposOfChannel = Object.entries(releaseAssets)
    .filter(([repo, _]) => channels2repos[channel].includes(repo))
    .map(([_, repo]) => repo);
  const installableRepos = reposOfChannel.filter((repo) => {
    const latestRelease = findReleaseThatSatisfiesInstalledJaspVersion(
      repo.releases,
      installedJaspVersion,
    );
    if (!latestRelease) {
      // No compatible release found
      return false;
    }
    const hasArch = latestRelease.assets.some(
      (a) => a.architecture === architecture,
    );
    if (!hasArch) {
      // No assets found with compatible architecture
      return false;
    }
    const hasAssets = latestRelease?.assets && latestRelease.assets.length > 0;
    return hasAssets;
  });

  // Filter repositories based on search term
  const filteredRepos = installableRepos.filter((repo) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    const nameMatches = repo.name.toLowerCase().includes(searchLower);

    // Strip HTML tags from description for search
    const plainDescription =
      repo.shortDescriptionHTML?.replace(/<[^>]*>/g, '') || '';
    const descriptionMatches = plainDescription
      .toLowerCase()
      .includes(searchLower);

    return nameMatches || descriptionMatches;
  });

  return (
    <main className="min-h-screen bg-gray-50 py-4">
      <div className="w-full px-2">
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-row gap-3">
              <div>
                <label className="mb-1 block font-medium text-gray-700 text-xs">
                  Select a channel:
                  <select
                    name="channel"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {channels.map((channel) => (
                      <option key={channel} value={channel}>
                        {channel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex items-center">
                <label className="mb-1 flex font-medium text-gray-700 text-xs">
                  <input
                    type="checkbox"
                    name="allowPreReleases"
                    className="ml-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    checked={allowPreRelease}
                    onChange={(e) => setAllowPreRelease(e.target.checked)}
                  />
                  <span className="ml-2">Show pre-releases</span>
                </label>
              </div>
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-700 text-xs">
                Search for a module:
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {filteredRepos.map((repo) => (
            <RepositoryCard
              key={`${repo.organization}/${repo.name}`}
              repo={repo}
              allowPreRelease={allowPreRelease}
            />
          ))}
          {filteredRepos.length === 0 && (
            <div className="text-gray-500">
              No modules found. Please clear search, change channel or upgrade
              JASP.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
