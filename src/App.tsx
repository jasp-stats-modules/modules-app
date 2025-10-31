import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { getHTMLTextDir } from 'intlayer';
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
import { useEffect, useState } from 'react';
import { useIntlayer, useLocale } from 'react-intlayer';
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
  language: parseAsString.withDefault('en'),
  font: parseAsString,
};

function useInfoFromSearchParams(): Info {
  const [queryStates, setQueryStates] = useQueryStates(infoSearchParamKeys, {
    urlKeys: {
      version: 'v',
      arch: 'a',
      theme: 't',
      developerMode: 'p',
      installedModules: 'i',
      language: 'l',
      font: 'f',
    },
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: On mount show defaults in address bar
  useEffect(() => {
    setQueryStates(queryStates);
  }, []);
  return queryStates as Info;
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
  const { loading } = useIntlayer('app');
  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center rounded-lg border border-border bg-background p-6 shadow-sm transition-shadow duration-200 hover:shadow-md dark:hover:shadow-lg">
        <div>{loading}</div>
        <div className="mt-3">
          <span className="block h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent"></span>
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
  const { select_channel } = useIntlayer('app');
  return (
    <fieldset
      className={cn('mb-1 block rounded border border-border p-2', className)}
    >
      <legend className="mb-1 block font-medium text-xs">
        {select_channel}:
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
  const { checkmark } = useIntlayer('app');
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
            'peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs outline-none transition-shadow focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:data-[state=checked]:bg-primary dark:aria-invalid:ring-destructive/40',
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
          <title>{checkmark}</title>
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
  const { install } = useIntlayer('app');
  if (!asset) {
    return null;
  }
  return (
    <a
      href={asset.downloadUrl}
      className="inline-flex items-center rounded bg-green-600 px-3 py-1.5 font-medium text-white text-xs transition-colors duration-200 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
    >
      {install}
    </a>
  );
}

function UpdateButton({ asset }: { asset?: Asset }) {
  const { update } = useIntlayer('app');
  if (!asset) {
    return null;
  }
  return (
    <a
      href={asset.downloadUrl}
      className="inline-flex items-center rounded bg-blue-600 px-3 py-1.5 font-medium text-white text-xs transition-colors duration-200 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
    >
      {update}
    </a>
  );
}

function UninstallButton({ moduleName }: { moduleName: string }) {
  const { uninstall, uninstall_this_module } = useIntlayer('app');
  const { data: jasp } = useJaspQtObject();

  async function doUninstall() {
    await jasp?.uninstall(moduleName);
  }

  return (
    <button
      type="button"
      onClick={doUninstall}
      title={uninstall_this_module.value}
      className="mt-3 inline-flex items-center rounded bg-red-500 px-3 py-1.5 font-medium text-white text-xs transition-colors duration-200 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
    >
      {uninstall}
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
  const { pre_release, latest_version_installed, installed } =
    useIntlayer('app');
  return (
    <div className="flex flex-col">
      {canUpdate && <UpdateButton asset={asset} />}
      {canInstall && !canUpdate && <InstallButton asset={asset} />}
      {allowPreRelease && latestPreRelease && (
        <span className="text-muted text-xs">{pre_release}</span>
      )}
      {insideQt && (canUpdate || latestVersionInstalled) && (
        <UninstallButton moduleName={moduleName} />
      )}
      {latestVersionInstalled && (
        <span
          title={latest_version_installed.value}
          className="px-2 py-1.5 text-muted text-xs"
        >
          {installed}
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
  const { release_stats_installed, release_stats_notinstalled, by_maintainer } =
    useIntlayer('app');
  const publishedAt = new Date(latestPublishedAt).toLocaleDateString();
  return (
    <div className="flex flex-row justify-between text-muted-foreground text-xs">
      <div>
        {installedVersion
          ? release_stats_installed({
              installedVersion,
              latestVersion,
              publishedAt,
              downloads,
            })
          : release_stats_notinstalled({
              latestVersion,
              publishedAt,
              downloads,
            })}
      </div>
      <div>{by_maintainer({ maintainer })}</div>
    </div>
  );
}

function RepositoryLinks({ homepageUrl }: { homepageUrl?: string }) {
  const { go_to_home_page_of_module } = useIntlayer('app');
  if (!homepageUrl) {
    return null;
  }
  return (
    <a
      title={go_to_home_page_of_module.value}
      target="_blank"
      rel="noopener noreferrer"
      href={homepageUrl}
    >
      <House size={12} className="text-primary" />
    </a>
  );
}

function RepositoryChannels({ channels }: { channels: string[] }) {
  const { channel: channelText } = useIntlayer('app');
  if (!channels || channels.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-1">
      {channels.map((channel) => (
        <span
          key={channel}
          // className="rounded-md bg-background px-2 py-0.5 text-foreground text-xs"
          className={cn(
            "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
            "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
          )}
          title={channelText.value}
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
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card-background p-3 text-card shadow-sm transition-shadow duration-200 hover:shadow-md dark:hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold text-lg text-primary">{repo.name}</h3>
          {repo.shortDescriptionHTML && (
            <div className="prose prose-sm text-primary text-sm">
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

  const { setLocale } = useLocale();
  useEffect(() => {
    const lang = info?.language || infoFromSearchParams.language;
    setLocale(lang);
    if (document) {
      document.documentElement.lang = lang;
      document.documentElement.dir = getHTMLTextDir(lang);
    }
  }, [info?.language, infoFromSearchParams.language, setLocale]);

  if (!insideQt) {
    return { info: infoFromSearchParams, isInfoFetched: true, error: null };
  }
  if (info === undefined) {
    return { info: infoFromSearchParams, isInfoFetched: true, error: null };
  }
  return { info, isInfoFetched, error: error || infoError };
}

function sanitizeFontName(name: string | null): string | null {
  if (!name) return null;

  const cleaned = name.replace(/["']/g, '').trim();
  if (cleaned.length === 0 || cleaned.length > 60) return null;

  if (!/^[A-Za-z0-9\s\-,]+$/.test(cleaned)) return null;

  try {
    if (typeof document !== 'undefined' && document.fonts?.check) {
      // check whether the browser has the family available
      const checkStr = `12px "${cleaned}"`;
      if (document.fonts.check(checkStr)) {
        return cleaned;
      }
    }
  } catch {
    // ignore detection errors
  }
  console.error(`Font "${cleaned}" is not available, falling back to default.`);
  return null;
}

function useFont() {
  const { info } = useInfo();
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const font = sanitizeFontName(info.font);
    if (!font) {
      root.style.removeProperty('--app-font-family');
      return;
    }
    root.style.setProperty('--app-font-family', font);
    return () => {
      root.style.removeProperty('--app-font-family');
    };
  }, [info.font]);
}

export function App() {
  const {
    show_prereleases,
    allow_prereleases_checkbox_description,
    search_for_a_module,
    no_modules_found,
  } = useIntlayer('app');
  const { info, error, isInfoFetched } = useInfo();
  const [catalogUrl] = useQueryState('c', { defaultValue: defaultCatalog });
  const {
    data: repositories,
    isFetched: isRepositoriesFetched,
    error: repositoriesError,
  } = useQuery(catalogQueryOptions(catalogUrl));
  const isDarkTheme = useDarkTheme();

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    const theme = isDarkTheme ? 'dark' : 'light';
    root.classList.add(theme);
  }, [isDarkTheme]);

  useFont();
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
    return <div>Error fetching environment info: {String(error)}</div>;
  }
  if (repositoriesError) {
    return <div>Error fetching catalog: {String(repositoriesError)}</div>;
  }
  if (!isInfoFetched && !isRepositoriesFetched) {
    return <Loading />;
  }

  return (
    <main className="min-h-screen py-4">
      <div className="w-full px-2">
        <div className="mb-4 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-sm">
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
                label={show_prereleases.value}
                name="allowPreReleases"
                description={allow_prereleases_checkbox_description.value}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-xs">
                {search_for_a_module}:
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
                    'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
                  )}
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
            <div className="text-primary">{no_modules_found}</div>
          )}
        </div>
      </div>
    </main>
  );
}
