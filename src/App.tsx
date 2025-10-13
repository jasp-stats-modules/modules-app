import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { House } from 'lucide-react';
import {
  parseAsBoolean,
  parseAsJson,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
  useQueryStates,
} from 'nuqs';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { satisfies } from 'semver';
import * as v from 'valibot';
import { cn } from '@/lib/utils';
import type { Asset, Release, Repository } from '@/types';
import { type Info, insideQt, useJaspQtObject } from '@/useJaspQtObject';

const defaultChannel = 'jasp-modules';
const defaultCatalog = 'index.json';

const defaultArchitecture = 'Windows_x86-64';
const defaultInstalledVersion = '0.95.1';
const defaultInstalledModules = () => ({});
const installedModulesSchema = v.record(v.string(), v.string());
const themeSchema = ['dark', 'light', 'system'] as const;
const infoSearchParamKeys = {
  version: parseAsString.withDefault(defaultInstalledVersion),
  arch: parseAsString.withDefault(defaultArchitecture),
  installedModules: parseAsJson(installedModulesSchema).withDefault(
    defaultInstalledModules(),
  ),
  developerMode: parseAsBoolean.withDefault(false),
  theme: parseAsStringLiteral(themeSchema).withDefault('system'),
};

function useInfoFromSearchParams(): Info {
  const [queryStates, setQueryStates] = useQueryStates(infoSearchParamKeys, {
    urlKeys: {
      version: 'v',
      arch: 'a',
      theme: 't',
      developerMode: 'p',
      installedModules: 'i',
    },
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: On mount show defaults in address bar
  useEffect(() => {
    setQueryStates(queryStates);
  }, []);
  return useMemo<Info>(
    () => ({
      ...queryStates,
      // TODO also expose below via search params
      font: 'SansSerif',
      language: 'en',
    }),
    [queryStates],
  );
}

async function getCatalog(
  catalogUrl: string,
  signal: AbortSignal,
): Promise<Repository[]> {
  return fetch(catalogUrl, {
    signal,
  })
    .then((res) => {
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`Catalog not found at ${catalogUrl}`);
        }
        throw res;
      }
      return res;
    })
    .then((res) => res.json());
}

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:shadow-lg">
        <div className="text-gray-700 dark:text-gray-200">
          Loading list of available modules
        </div>
        <div className="mt-3">
          <span className="block h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></span>
        </div>
      </div>
    </div>
  );
}

const catalogQueryOptions = (catalogUrl: string) =>
  queryOptions({
    queryKey: ['catalog', { catalogUrl }],
    queryFn: ({ signal }) => getCatalog(catalogUrl, signal),
  });

function ChannelSelector({
  selectedChannels,
  setSelectedChannels,
  channels,
  className = '',
}: {
  selectedChannels: string[];
  setSelectedChannels: Dispatch<SetStateAction<string[]>>;
  channels: string[];
  className?: string;
}) {
  return (
    <fieldset
      className={cn(
        'mb-1 block rounded border border-gray-300 p-2 dark:border-gray-600',
        className,
      )}
    >
      <legend className="mb-1 block font-medium text-gray-700 text-xs dark:text-gray-300">
        Select channel:
      </legend>
      <div className="flex flex-wrap gap-3">
        {channels.map((c) => (
          <Checkbox
            key={c}
            checked={selectedChannels.includes(c)}
            onChange={(checked) =>
              setSelectedChannels((prev) => {
                const setPrev = new Set(prev);
                if (checked) {
                  setPrev.add(c);
                } else {
                  setPrev.delete(c);
                }
                return Array.from(setPrev);
              })
            }
            label={c}
            name={`channel-${c}`}
          />
        ))}
      </div>
    </fieldset>
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
        'flex items-center font-medium text-gray-700 text-xs dark:text-gray-300',
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

function InstallButton({ asset }: { asset?: Asset }) {
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

function UpdateButton({ asset }: { asset?: Asset }) {
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
  const { data: jasp } = useJaspQtObject();

  async function uninstall() {
    await jasp?.uninstall(moduleName);
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
  asset?: Asset;
  installedVersion?: string;
  latestVersionInstalled: boolean;
  canInstall: boolean;
  canUpdate: boolean;
}

function useRelease(repo: Repository, allowPreRelease: boolean): ReleaseStats {
  const { info } = useInfo();
  return getReleaseInfo(
    repo,
    info.version,
    allowPreRelease,
    info.arch,
    info.installedModules,
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
  asset: Asset;
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
      {insideQt && (canUpdate || latestVersionInstalled) && (
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

function RepositoryLinks({ homepageUrl }: { homepageUrl?: string }) {
  if (!homepageUrl) {
    return null;
  }
  return (
    <a
      title="Go to home page of module"
      target="_blank"
      rel="noopener noreferrer"
      href={homepageUrl}
    >
      <House size={12} />
    </a>
  );
}

function RepositoryChannels({ channels }: { channels: string[] }) {
  if (!channels || channels.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-1">
      {channels.map((channel) => (
        <span
          key={channel}
          className="rounded-md bg-gray-50 px-2 py-0.5 text-gray-700 text-xs dark:bg-gray-900 dark:text-gray-400"
          title="Channel"
        >
          {channel}
        </span>
      ))}
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
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-gray-900 text-lg dark:text-gray-100">
            {repo.name}
          </h3>
          {repo.shortDescriptionHTML && (
            <div className="prose prose-sm text-gray-600 text-sm dark:text-gray-300">
              {repo.shortDescriptionHTML}
            </div>
          )}
          <div className="flex items-center gap-2">
            <RepositoryLinks homepageUrl={repo.homepageUrl} />
            <RepositoryChannels channels={repo.channels} />
          </div>
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

/**
 * Hook that determines if dark theme should be used.
 *
 * @returns true if dark theme should be used
 */
function useDarkTheme(): boolean {
  const { info } = useInfo();
  const theme = info.theme;
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  if (theme === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }
  return false;
}

function uniqueChannels(repositories: Repository[]): string[] {
  const channels = new Set<string>();
  for (const repo of repositories) {
    for (const ch of repo.channels) {
      channels.add(ch);
    }
  }
  return Array.from(channels).sort();
}

function filterOnChannels(
  repositories: Repository[],
  selectedChannels: string[],
): Repository[] {
  if (selectedChannels.length === 0) return [];
  const selectedChannelsSet = new Set(selectedChannels);
  return repositories.filter((repo) =>
    repo.channels.some((ch) => selectedChannelsSet.has(ch)),
  );
}

function useInfo() {
  // if app is running inside JASP, then
  // info from Qt webchannel is used otherwise
  // info from search params is used.
  const infoFromSearchParams = useInfoFromSearchParams();
  const { data: jasp, isFetched, error } = useJaspQtObject();

  // Subscribe to environmentInfoChanged signal to update info
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!jasp?.environmentInfoChanged) return;
    const callback = (data: Info) => {
      queryClient.setQueryData(['jaspInfo'], data);
    };
    jasp.environmentInfoChanged.connect(callback);
    return () => {
      jasp.environmentInfoChanged.disconnect(callback);
    };
  }, [jasp, queryClient]);

  // Fetch info
  const {
    data: info,
    isFetched: isInfoFetched,
    error: infoError,
  } = useQuery({
    queryKey: ['jaspInfo'],
    queryFn: () => jasp?.info(),
    enabled: insideQt && !!jasp && isFetched,
  });

  if (!insideQt) {
    return { info: infoFromSearchParams, isInfoFetched: true, error: null };
  }
  if (info === undefined) {
    return { info: infoFromSearchParams, isInfoFetched: true, error: null };
  }
  return { info, isInfoFetched, error: error || infoError };
}

export function App() {
  const { info, error, isInfoFetched } = useInfo();
  const [catalogUrl] = useQueryState('c', { defaultValue: defaultCatalog });
  const {
    data: repositories,
    isFetched: isRepositoriesFetched,
    error: repositoriesError,
  } = useQuery(catalogQueryOptions(catalogUrl));
  const isDarkTheme = useDarkTheme();
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    defaultChannel,
  ]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [allowPreRelease, setAllowPreRelease] = useState<boolean>(
    info.developerMode,
  );
  useEffect(() => {
    setAllowPreRelease(info.developerMode);
  }, [info.developerMode]);
  const availableChannels = uniqueChannels(repositories || []);
  const reposOfSelectedChannels = filterOnChannels(
    repositories || [],
    selectedChannels,
  );
  const installableRepos = filterOnInstallableRepositories(
    reposOfSelectedChannels,
    info.version,
    allowPreRelease,
    info.arch,
  );
  const filteredRepos = filterReposBySearchTerm(installableRepos, searchTerm);

  if (error) {
    return <div>Error fetching environment info: {`${error}`}</div>;
  }
  if (repositoriesError) {
    return <div>Error fetching catalog: {`${repositoriesError}`}</div>;
  }
  if (!isInfoFetched && !isRepositoriesFetched) {
    return <Loading />;
  }

  return (
    <main
      className={cn(
        'min-h-screen bg-gray-50 py-4 text-gray-900 dark:bg-gray-900 dark:text-gray-100',
        isDarkTheme && 'dark',
      )}
    >
      <div className="w-full px-2">
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-3">
            <div className="flex flex-row gap-3">
              <ChannelSelector
                selectedChannels={selectedChannels}
                setSelectedChannels={setSelectedChannels}
                channels={availableChannels}
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
