import { useQuery } from '@tanstack/react-query';

import { useState } from 'react';
import { satisfies } from 'semver';
import * as v from 'valibot';
import { cn } from '@/lib/utils';
import type {
  Release,
  ReleaseAsset,
  RepoReleaseAssets,
  Repository,
} from '@/types';
import { jaspQtObject, useJaspQtObject } from '@/useJaspQtObject';

const defaultArchitecture = 'Windows_x86-64';
const defaultInstalledVersion = '0.95.1';
// const defaultInstalledModules = () => ({})
// TODO remove example once JASP has app integrated
const defaultInstalledModules = () => ({
  jaspEquivalenceTTests: '7aad95f4',
  jaspTTests: 'a8098ba98',
  jaspAnova: '2cbd8a6d',
});
const defaultChannel = 'core-modules';
const defaultCatalog = 'index.json';
// Cannot fetch catalog from qrc: scheme
// const defaultCatalog = 'https://jasp-stats-modules.github.io/modules-app/index.json'

const _SearchSchema = v.object({
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
  // Initial value for allow pre-release
  p: v.optional(v.picklist([0, 1]), 0),
  // The URL for the catalog of modules
  c: v.optional(v.fallback(v.string(), defaultCatalog), defaultCatalog),
});

function ChannelSelector({
  channel,
  setChannel,
  channels,
  className = '',
}: {
  channel: string;
  setChannel: (channel: string) => void;
  channels: string[];
  className?: string;
}) {
  return (
    <label
      className={cn(
        'mb-1 block font-medium text-gray-700 text-xs dark:text-gray-300',
        className,
      )}
    >
      Select a channel:
      <select
        name="channel"
        value={channel}
        onChange={(e) => setChannel(e.target.value)}
        className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-blue-400"
      >
        {channels.map((channel) => (
          <option key={channel} value={channel}>
            {channel}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  name,
  description,
  className = '',
  inputClassName = '',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  name?: string;
  description?: string;
  className?: string;
  inputClassName?: string;
}) {
  return (
    <label
      className={cn(
        'mb-1 flex items-center font-medium text-gray-700 text-xs dark:text-gray-300',
        className,
      )}
      title={description}
    >
      <div className="relative ml-2">
        <input
          type="checkbox"
          name={name}
          className={cn(
            'peer h-4 w-4 appearance-none rounded border-2 border-gray-300 bg-white checked:border-blue-600 checked:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-400 dark:checked:border-blue-500 dark:checked:bg-blue-500',
            inputClassName,
          )}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <svg
          className="pointer-events-none absolute top-0 left-0 hidden h-4 w-4 text-white peer-checked:block"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <title>Checkmark</title>
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <span className="ml-2">{label}</span>
    </label>
  );
}

function InstallButton({ asset }: { asset?: ReleaseAsset }) {
  if (!asset) {
    return null;
  }
  return (
    <a
      href={asset.downloadUrl}
      className="inline-flex items-center rounded bg-green-600 px-3 py-1.5 font-medium text-white text-xs transition-colors duration-200 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
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
      className="inline-flex items-center rounded bg-blue-600 px-3 py-1.5 font-medium text-white text-xs transition-colors duration-200 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
    >
      Update
    </a>
  );
}

function UninstallButton({ moduleName }: { moduleName: string }) {
  // const jasp = useJaspQtObject();
  const {
    data: jasp,
    isPending,
    isFetched,
  } = useJaspQtObject();

  if (moduleName === 'jaspAnova') {
    console.log({
      moduleName,
      jasp,
      isFetched,
      isPending,
    });
  }

  if (isPending) return 'Connecting...';

  // Only able to uninstall when running within qt webengine
  if (isFetched && !jasp) {
    return null;
  }

  function uninstall() {
    console.log('Uninstalling', moduleName, jasp);
    jasp?.uninstall(moduleName);
  }

  return (
    <button
      type="button"
      onClick={uninstall}
      title="Uninstall this module"
      className="mt-3 inline-flex items-center rounded bg-red-500 px-3 py-1.5 font-medium text-white text-xs transition-colors duration-200 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
    >
      Uninstall
    </button>
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

interface ReleaseStats {
  latestRelease?: Release;
  latestPreRelease?: Release;
  latestAnyRelease?: Release;
  asset?: ReleaseAsset;
  installedVersion?: string;
  latestVersionInstalled: boolean;
  canInstall: boolean;
  canUpdate: boolean;
}

function useRelease(repo: Repository, allowPreRelease: boolean): ReleaseStats {
  const {
    i: installedModules,
    a: arch,
    v: installedJaspVersion,
  } = Route.useSearch();

  return getReleaseInfo(
    repo,
    installedJaspVersion,
    allowPreRelease,
    arch,
    installedModules,
  );
}

function getReleaseInfo(
  repo: Repository,
  installedJaspVersion: string,
  allowPreRelease: boolean,
  arch: string,
  installedModules: { [x: string]: string },
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
  const asset = latestAnyRelease?.assets.find((a) => a.architecture === arch);
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

  return {
    latestRelease,
    latestPreRelease,
    latestAnyRelease,
    asset,
    installedVersion,
    latestVersionInstalled,
    canInstall,
    canUpdate,
  };
}

function ReleaseAction({
  moduleName,
  asset,
  canUpdate,
  canInstall,
  allowPreRelease,
  latestPreRelease,
  latestVersionInstalled,
}: {
  moduleName: string;
  asset: ReleaseAsset;
  canUpdate: boolean;
  canInstall: boolean;
  allowPreRelease: boolean;
  latestPreRelease?: Release;
  latestVersionInstalled: boolean;
}) {
  return (
    <div className="flex flex-col">
      {canUpdate && <UpdateButton asset={asset} />}
      {canInstall && !canUpdate && <InstallButton asset={asset} />}
      {allowPreRelease && latestPreRelease && (
        <span className="text-gray-500 text-xs dark:text-gray-400">
          Pre release
        </span>
      )}
      {(canUpdate || latestVersionInstalled) && (
        <UninstallButton moduleName={moduleName} />
      )}
      {latestVersionInstalled && (
        <span
          title="Latest version is installed"
          className="px-2 py-1.5 text-gray-500 text-xs dark:text-gray-400"
        >
          Installed
        </span>
      )}
    </div>
  );
}

function ReleaseStats({
  installedVersion,
  latestVersion,
  latestPublishedAt,
  maintainer,
  downloads,
}: {
  installedVersion?: string;
  latestVersion: string;
  latestPublishedAt: string;
  maintainer: string;
  downloads: number;
}) {
  const publishedAt = new Date(latestPublishedAt).toLocaleDateString();
  return (
    <div className="flex flex-row justify-between text-gray-500 text-xs dark:text-gray-400">
      <div>
        {installedVersion
          ? ` installed: ${installedVersion}, latest`
          : 'latest '}{' '}
        {latestVersion} on {publishedAt} with {downloads} downloads
      </div>
      <div>by {maintainer}</div>
    </div>
  );
}

function RepositoryCard({
  repo,
  allowPreRelease,
}: {
  repo: Repository;
  allowPreRelease: boolean;
}) {
  const {
    latestPreRelease,
    latestAnyRelease,
    asset,
    installedVersion,
    latestVersionInstalled,
    canInstall,
    canUpdate,
  } = useRelease(repo, allowPreRelease);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:shadow-lg">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg dark:text-gray-100">
            {repo.name}
          </h3>
          {repo.shortDescriptionHTML && (
            <div className="prose prose-sm mb-2 text-gray-600 text-sm dark:text-gray-300">
              {repo.shortDescriptionHTML}
            </div>
          )}
        </div>
        {asset && (
          <ReleaseAction
            moduleName={repo.name}
            asset={asset}
            canUpdate={canUpdate}
            canInstall={canInstall}
            allowPreRelease={allowPreRelease}
            latestPreRelease={latestPreRelease}
            latestVersionInstalled={latestVersionInstalled}
          />
        )}
      </div>
      {latestAnyRelease && asset && (
        <ReleaseStats
          installedVersion={installedVersion}
          latestVersion={latestAnyRelease.version}
          latestPublishedAt={latestAnyRelease.publishedAt}
          maintainer={repo.organization}
          downloads={asset.downloadCount}
        />
      )}
    </div>
  );
}

function getReposForChannel(
  releaseAssets: Record<string, Repository>,
  channelMembers: string[],
): Repository[] {
  return Object.entries(releaseAssets)
    .filter(([repo, _]) => channelMembers.includes(repo))
    .map(([_, repo]) => repo);
}

function filterOnInstallableRepositories(
  reposOfChannel: Repository[],
  installedJaspVersion: string,
  allowPreRelease: boolean,
  architecture: string,
): Repository[] {
  return reposOfChannel.filter((repo) => {
    let latestRelease = findReleaseThatSatisfiesInstalledJaspVersion(
      repo.releases,
      installedJaspVersion,
    );
    if (!latestRelease) {
      // No compatible release found, trying pre-release
      latestRelease = findReleaseThatSatisfiesInstalledJaspVersion(
        repo.preReleases,
        installedJaspVersion,
      );
      if (!allowPreRelease || !latestRelease) {
        return false;
      }
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
}

function filterReposBySearchTerm(
  installableRepos: Repository[],
  searchTerm: string,
): Repository[] {
  return installableRepos.filter((repo) => {
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
}

export function App() {
  // TODO get params from qt webchannel
  const {
    a: architecture,
    v: installedJaspVersion,
    p: initialAllowPreRelease,
  } = {
    a: defaultArchitecture,
    v: defaultInstalledVersion,
    p: 0,
  };
  // TODO get assets and channels using react query
  const releaseAssets: RepoReleaseAssets = {};
  const channels2repos: Record<string, string[]> = {};
  const [channel, setChannel] = useState<string>(defaultChannel);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [allowPreRelease, setAllowPreRelease] = useState<boolean>(
    initialAllowPreRelease === 1,
  );
  const channels = Object.keys(channels2repos);
  const channelMembers = channels2repos[channel] || [];
  const reposOfChannel = getReposForChannel(releaseAssets, channelMembers);
  const installableRepos = filterOnInstallableRepositories(
    reposOfChannel,
    installedJaspVersion,
    allowPreRelease,
    architecture,
  );

  const filteredRepos = filterReposBySearchTerm(installableRepos, searchTerm);

  const { data: jasp, isFetched } = useJaspQtObject();
  const {data: info, isFetched: isInfoFetched} = useQuery({
    queryKey: ['jaspInfo'],
    queryFn: async () => {
      console.log('Fetching jasp info', jasp);
      const result = await jasp!.info()
      console.log('Fetched jasp info', result);
      return result
    },
    enabled: !!jasp && isFetched,
  })

  console.log(jasp, isFetched, info, isInfoFetched);
  if (jasp) {
    return (
      <div>
        <pre>
          {JSON.stringify(info, null, 2)}
        </pre>
        <button type="button" onClick={() => jasp.uninstall('jaspAnova')}>
          Uninstall jaspAnova
        </button>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 py-4 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <div className="w-full px-2">
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-3">
            <div className="flex flex-row gap-3">
              <ChannelSelector
                channel={channel}
                setChannel={setChannel}
                channels={channels}
              />
              <Checkbox
                checked={allowPreRelease}
                onChange={setAllowPreRelease}
                label="Show pre-releases"
                name="allowPreReleases"
                description="When checked shows pre-releases. Pre-releases are releases that a module developer has not yet marked as stable."
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-gray-700 text-xs dark:text-gray-300">
                Search for a module:
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-blue-400"
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
            <div className="text-gray-500 dark:text-gray-400">
              No modules found. Please clear search, change channel or upgrade
              JASP.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
