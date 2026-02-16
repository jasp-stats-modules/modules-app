import { queryOptions, useQuery } from '@tanstack/react-query';
import { ChevronDownIcon, House } from 'lucide-react';
import { useQueryState } from 'nuqs';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { useIntlayer, useMarkdownRenderer } from 'react-intlayer';
import { useDebounceValue } from 'usehooks-ts';
import { cn } from '@/lib/utils';
import type { Asset, Release, Repository } from '@/types';
import { insideQt, useJaspQtObject } from '@/useJaspQtObject';
import { useInfo } from './useInfo';
import {
  findReleaseThatSatisfiesInstalledJaspVersion,
  isNewerVersion,
  type ReleaseStats,
  useRelease,
  type AnyAction,
} from './useRelease';
import { Menu } from '@base-ui/react/menu';

type AppTranslations = ReturnType<typeof useIntlayer<'app'>>;

const defaultChannel = 'Official';
const defaultCatalog = 'index.json';

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
          <span className="block h-10 w-10 animate-spin rounded-full border-4 border-accent-foreground border-t-transparent"></span>
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
      <legend className="mb-1 block font-medium text-sm">
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
        'flex items-center font-medium text-jasp-muted text-sm',
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

function InstallButton({
  asset,
  translations,
}: {
  asset?: Asset;
  translations: AppTranslations;
}) {
  const { install } = translations;
  if (!asset) {
    return null;
  }
  return (
    <a
      href={asset.downloadUrl}
      className="inline-flex items-center justify-center whitespace-nowrap rounded bg-jasp-green px-3 py-1.5 font-medium text-primary text-sm transition-colors duration-200 hover:bg-green-600 dark:hover:bg-green-800"
    >
      {install}
    </a>
  );
}

function InstallPreReleaseButton({
  asset,
  translations,
}: {
  asset?: Asset;
  translations: AppTranslations;
}) {
  const { install, pre_release } = translations;
  if (!asset) {
    return null;
  }
  return (
    <a
      href={asset.downloadUrl}
      className="inline-flex items-center justify-center whitespace-nowrap rounded bg-jasp-green px-3 py-1.5 font-medium text-primary text-sm transition-colors duration-200 hover:bg-green-600 dark:hover:bg-green-800"
    >
      {install} {pre_release}
    </a>
  );
}

function UpdateButton({
  asset,
  translations,
}: {
  asset?: Asset;
  translations: AppTranslations;
}) {
  const { update } = translations;
  if (!asset) {
    return null;
  }
  return (
    <a
      href={asset.downloadUrl}
      className="inline-flex items-center justify-center whitespace-nowrap rounded bg-jasp-blue px-3 py-1.5 font-medium text-primary text-sm transition-colors duration-200 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
    >
      {update}
    </a>
  );
}

function UpdatePreReleaseButton({
  asset,
  translations,
}: {
  asset?: Asset;
  translations: AppTranslations;
}) {
  const { update, pre_release } = translations;
  if (!asset) {
    return null;
  }
  return (
    <a
      href={asset.downloadUrl}
      className="inline-flex items-center justify-center whitespace-nowrap rounded bg-jasp-blue px-3 py-1.5 font-medium text-primary text-sm transition-colors duration-200 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
    >
      {update} {pre_release}
    </a>
  );
}

function UninstallButton({
  moduleId,
  translations,
}: {
  moduleId: string;
  translations: AppTranslations;
}) {
  const { uninstall, uninstall_this_module } = translations;
  const { data: jasp } = useJaspQtObject();

  async function doUninstall() {
    await jasp?.uninstall(moduleId);
  }

  return (
    <button
      type="button"
      onClick={doUninstall}
      title={uninstall_this_module.value}
      className="mt-3 inline-flex items-center justify-center whitespace-nowrap rounded bg-destructive px-3 py-1.5 font-medium text-primary text-sm transition-colors duration-200 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
    >
      {uninstall}
    </button>
  );
}

function UninstallPreReleaseButton({
  moduleId,
  translations,
}: {
  moduleId: string;
  translations: AppTranslations;
}) {
  const { uninstall, uninstall_this_module, pre_release } = translations;
  const { data: jasp } = useJaspQtObject();

  async function doUninstall() {
    await jasp?.uninstall(moduleId);
  }

  return (
    <button
      type="button"
      onClick={doUninstall}
      title={uninstall_this_module.value}
      className="mt-3 inline-flex items-center justify-center whitespace-nowrap rounded bg-destructive px-3 py-1.5 font-medium text-primary text-sm transition-colors duration-200 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
    >
      {uninstall} {pre_release}
    </button>
  );
}

function ActionsButton({
  actions
}: {actions: AnyAction[]}) {
  if (actions.length === 0) {
    return <div>Latest installed</div>;
  }

  const mainAction = actions[0];
  let menu = <></>;
  if (actions.length > 1) {
    const menuActions = actions.slice(1);
    menu = (
      <Menu.Root>
      <Menu.Trigger className="inline-flex items-center justify-center whitespace-nowrap data-popup-open:rotate-180 rounded-r data-popup-open:rounded-l bg-jasp-blue font-medium text-primary text-sm transition-colors duration-200 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
        <ChevronDownIcon className="" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner>
        <Menu.Popup className="bg-primary-foreground text-primary rounded shadow-md p-1">
          {menuActions.map((action) => (
          <Menu.Item key={action.type}>{action.type}</Menu.Item>
          ))}
        </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
      </Menu.Root>
    )
    return (
      <div className="flex flex-row">
      <button
        type="button"
        className="inline-flex items-center justify-center whitespace-nowrap rounded-l bg-jasp-blue ps-3 py-1.5 font-medium text-primary text-sm transition-colors duration-200 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
      >
        {mainAction.type}
      </button>
      {menu}
      </div>
    )
  }
  return (
    <div>
         <button
          type="button"
          className="inline-flex items-center justify-center whitespace-nowrap rounded bg-jasp-blue px-3 py-1.5 font-medium text-primary text-sm transition-colors duration-200 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
        >
          {mainAction.type}
        </button>
            </div>
  )
}

function ReleaseAction({
  moduleId,
  asset,
  primaryAction,
  secondaryAction,
  translations,
  latestInstalled,
}: {
  moduleId: string;
  asset?: Asset;
  primaryAction?: ReleaseStats['primaryAction'];
  secondaryAction?: ReleaseStats['secondaryAction'];
  translations: AppTranslations;
  latestInstalled: boolean;
}) {
  const { latest_version_installed, installed } = translations;
  // Only show installed text when there is no button
  const showInstalledBadge =
    latestInstalled &&
    !(
      insideQt &&
      (primaryAction === 'uninstall-pre-release' ||
        secondaryAction === 'uninstall')
    );
  const actions: React.ReactNode[] = [];
  if (secondaryAction === 'update-pre-release') {
    actions.push(
      <UpdatePreReleaseButton
        key="update-pre-release"
        asset={asset}
        translations={translations}
      />,
    );
  }
  if (primaryAction === 'install-stable') {
    actions.push(
      <InstallButton
        key="install-stable"
        asset={asset}
        translations={translations}
      />,
    );
  }
  if (primaryAction === 'update-stable') {
    actions.push(
      <UpdateButton
        key="update-stable"
        asset={asset}
        translations={translations}
      />,
    );
  }
  if (secondaryAction === 'install-pre-release') {
    actions.push(
      <InstallPreReleaseButton
        key="install-pre-release"
        asset={asset}
        translations={translations}
      />,
    );
  }
  if (primaryAction === 'uninstall-pre-release' && insideQt) {
    actions.push(
      <UninstallPreReleaseButton
        key="uninstall-pre-release"
        moduleId={moduleId}
        translations={translations}
      />,
    );
  }
  if (secondaryAction === 'uninstall' && insideQt) {
    actions.push(
      <UninstallButton
        key="uninstall"
        moduleId={moduleId}
        translations={translations}
      />,
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {actions}

      {showInstalledBadge && (
        <span
          title={latest_version_installed.value}
          className="px-2 py-1.5 text-muted-foreground text-sm"
        >
          {installed.value}
        </span>
      )}
    </div>
  );
}

export function ReleaseStatsLine({
  installedVersion,
  latestStableRelease,
  latestPreRelease,
  maintainer,
  latestVersionIs,
  downloads,
  translations,
}: {
  installedVersion?: string;
  latestStableRelease?: Release;
  latestPreRelease?: Release;
  maintainer: string;
  latestVersionIs?: ReleaseStats['latestVersionIs'];
  downloads?: number;
  translations: AppTranslations;
}) {
  const {
    by_maintainer,
    installed_version,
    latest_installed_version,
    latest_version_on_with_downloads,
    latest_beta_version_on_with_downloads,
    latest_stable_with_download_and_beta,
    latest_stable_and_beta_with_downloads,
  } = translations;
  return (
    <div className="flex flex-row justify-between text-muted-foreground text-sm">
      <div>
        {latestVersionIs &&
          latestVersionIs !== 'installed' &&
          installedVersion && (
            <span>{installed_version({ version: installedVersion })}, </span>
          )}
        {latestVersionIs === 'installed' && installedVersion && (
          <span>
            {latest_installed_version({ version: installedVersion })}{' '}
          </span>
        )}
        {latestVersionIs === 'stable' &&
          latestStableRelease &&
          !latestPreRelease && (
            <span>
              {latest_version_on_with_downloads({
                latestVersion: latestStableRelease.version,
                publishedAt: new Date(
                  latestStableRelease.publishedAt,
                ).toLocaleDateString(),
                downloads: downloads ?? 0,
              })}
            </span>
          )}
        {latestVersionIs === 'pre-release' &&
          !latestStableRelease &&
          latestPreRelease && (
            <span>
              {latest_beta_version_on_with_downloads({
                latestVersion: latestPreRelease.version,
                publishedAt: new Date(
                  latestPreRelease.publishedAt,
                ).toLocaleDateString(),
                downloads: downloads ?? 0,
              })}
            </span>
          )}
        {latestStableRelease &&
          latestPreRelease &&
          latestVersionIs === 'stable' && (
            <span>
              {latest_stable_with_download_and_beta({
                latestVersion: latestStableRelease.version,
                publishedAt: new Date(
                  latestStableRelease.publishedAt,
                ).toLocaleDateString(),
                downloads: downloads ?? 0,
                latestBetaVersion: latestPreRelease.version,
                latestBetaPublishedAt: new Date(
                  latestPreRelease.publishedAt,
                ).toLocaleDateString(),
              })}
            </span>
          )}
        {latestStableRelease &&
          latestPreRelease &&
          latestVersionIs === 'pre-release' && (
            <span>
              {latest_stable_and_beta_with_downloads({
                latestVersion: latestStableRelease.version,
                publishedAt: new Date(
                  latestStableRelease.publishedAt,
                ).toLocaleDateString(),
                latestBetaVersion: latestPreRelease.version,
                latestBetaPublishedAt: new Date(
                  latestPreRelease.publishedAt,
                ).toLocaleDateString(),
                downloads: downloads ?? 0,
              })}
            </span>
          )}
      </div>
      <div>{by_maintainer({ maintainer })}</div>
    </div>
  );
}

function RepositoryLinks({
  homepageUrl,
  translations,
}: {
  homepageUrl?: string;
  translations: AppTranslations;
}) {
  const { go_to_home_page_of_module } = translations;
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
      <House size={12} className="text-foreground" />
    </a>
  );
}

function RepositoryChannels({
  channels,
  translations,
}: {
  channels: string[];
  translations: AppTranslations;
}) {
  const { channel: channelText } = translations;
  if (!channels || channels.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-1">
      {channels.map((channel) => (
        <span
          key={channel}
          className={cn(
            'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 font-medium text-sm transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3',
            'border-transparent bg-background text-secondary-foreground [a&]:hover:bg-background/90',
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
  translations,
  language,
}: {
  repo: Repository;
  allowPreRelease: boolean;
  translations: AppTranslations;
  language: string;
}) {
  const {
    latestPreRelease,
    latestStableRelease,
    asset,
    installedVersion,
    latestVersionIs,
    primaryAction,
    secondaryAction,
    actions,
  } = useRelease(repo, allowPreRelease);

  const cardId = `repo-card-${repo.name}`;
  const name = repo.translations[language]?.name || repo.name;
  const description =
    repo.translations[language]?.description || repo.description;
  return (
    <li
      aria-labelledby={cardId}
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-sm transition-shadow duration-200 hover:shadow-md dark:hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <h3 id={cardId} className="font-semibold text-xl">
            {name}
          </h3>
          {description && (
            <div className="prose prose-sm text-base">{description}</div>
          )}
          <div className="flex items-center gap-2">
            <RepositoryLinks
              homepageUrl={repo.homepageUrl}
              translations={translations}
            />
            <RepositoryChannels
              channels={repo.channels}
              translations={translations}
            />
          </div>
        </div>
        <ActionsButton actions={actions}/>
        {/* <ReleaseAction
          moduleId={repo.id}
          asset={asset}
          primaryAction={primaryAction}
          secondaryAction={secondaryAction}
          translations={translations}
          latestInstalled={latestVersionIs === 'installed'}
        /> */}
      </div>
      <ReleaseStatsLine
        installedVersion={installedVersion}
        latestPreRelease={latestPreRelease}
        latestStableRelease={latestStableRelease}
        latestVersionIs={latestVersionIs}
        maintainer={repo.organization}
        downloads={asset?.downloadCount}
        translations={translations}
      />
    </li>
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
    if (allowPreRelease) {
      const latestPreRelease = findReleaseThatSatisfiesInstalledJaspVersion(
        repo.preReleases,
        installedJaspVersion,
      );
      if (
        (latestPreRelease &&
          latestRelease &&
          isNewerVersion(latestRelease.version, latestPreRelease.version)) ||
        (!latestRelease && latestPreRelease)
      ) {
        latestRelease = latestPreRelease;
      }
    }
    if (!latestRelease) {
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
    const plainDescription = repo.description?.replace(/<[^>]*>/g, '') || '';
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

function useTheme() {
  const isDarkTheme = useDarkTheme();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    const theme = isDarkTheme ? 'dark' : 'light';
    root.classList.add(theme);
  }, [isDarkTheme]);
}

function uniqueChannels(repositories: Repository[]): string[] {
  const channels = new Set<string>();
  for (const repo of repositories) {
    for (const ch of repo.channels) {
      channels.add(ch);
    }
  }
  const arr = Array.from(channels).sort();
  // Make sure default channel is first
  const idx = arr.indexOf(defaultChannel);
  if (idx > 0) {
    arr.splice(idx, 1);
    arr.unshift(defaultChannel);
  }
  return arr;
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

function JASPScrollBar({ children }: { children: ReactNode }) {
  return (
    <div className="border-jasp-gray-darker border-r-1">
      <div className="scrollbar-thin scrollbar-thumb-ring scrollbar-hover:scrollbar-thumb-thumb-hover scrollbar-track-popover h-screen overflow-y-auto border-popover border-r-1">
        <div className="min-h-screen border-popover border-r-1">
          <div className="min-h-screen border-jasp-gray-darker border-r-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoButton({
  translations,
  channels,
}: {
  translations: AppTranslations;
  channels: string[];
}) {
  const infoMarkdown = translations.information_panel;
  const renderMarkdown = useMarkdownRenderer({
    forceBlock: true,
    components: {
      h1: ({ children }) => (
        <h3 className="font-semibold text-lg">{children}</h3>
      ),
      h3: ({ children }) => (
        <h3 className="font-semibold text-lg">{children}</h3>
      ),
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-jasp-blue hover:underline"
        >
          {children}
        </a>
      ),
      p: ({ children }) => <p className="mt-2">{children}</p>,
      li: ({ children }) => <li className="ml-4 list-disc">{children}</li>,
    },
  });

  const markdownMentionsAllChannels = channels.every((ch) =>
    infoMarkdown.value.includes(ch),
  );
  if (!markdownMentionsAllChannels) {
    console.warn(
      'Not all channels are mentioned in the information panel. Please update text.',
    );
  }

  return (
    <>
      <button
        popoverTarget="infoPopover"
        popoverTargetAction="toggle"
        type="button"
        className="ml-auto h-6 w-6 rounded-full border border-border hover:bg-background"
        title={translations.information.value}
      >
        ?
      </button>
      <div
        popover="auto"
        id="infoPopover"
        className="relative m-8 mx-auto max-w-sm gap-2 self-center rounded-lg border border-border bg-card p-4 text-foreground"
      >
        <button
          popoverTarget="infoPopover"
          popoverTargetAction="hide"
          type="button"
          className="absolute top-2 right-2 h-6 w-6 rounded hover:bg-background"
        >
          ×
        </button>
        {renderMarkdown(infoMarkdown.value)}
      </div>
    </>
  );
}

export function App() {
  const translations = useIntlayer<'app'>('app');
  const {
    show_prereleases,
    allow_prereleases_checkbox_description,
    search_for_a_module,
    no_modules_found,
  } = translations;
  const { info, error, isInfoFetched } = useInfo();
  const [catalogUrl] = useQueryState('c', {
    defaultValue: defaultCatalog,
  });
  const {
    data: repositories,
    isFetched: isRepositoriesFetched,
    error: repositoriesError,
  } = useQuery(catalogQueryOptions(catalogUrl));
  useTheme();
  useFont();
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    defaultChannel,
  ]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm] = useDebounceValue(searchTerm, 100);
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
  const filteredRepos = filterReposBySearchTerm(
    installableRepos,
    debouncedSearchTerm,
  );

  if (error) {
    return <div>Error fetching environment info: {String(error)}</div>;
  }
  if (repositoriesError) {
    return <div>Error fetching catalog: {String(repositoriesError)}</div>;
  }
  if (!isInfoFetched || !isRepositoriesFetched) {
    return <Loading />;
  }

  return (
    <JASPScrollBar>
      <main className="px-2 py-2">
        <header className="mb-4 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-row gap-3">
              <ChannelSelector
                selectedChannels={selectedChannels}
                setSelectedChannels={setSelectedChannels}
                channels={availableChannels}
              />
              <div className="flex items-center pt-5">
                <Checkbox
                  checked={allowPreRelease}
                  onChange={setAllowPreRelease}
                  label={show_prereleases.value}
                  name="allowPreReleases"
                  description={allow_prereleases_checkbox_description.value}
                />
              </div>
              <InfoButton
                translations={translations}
                channels={availableChannels}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-sm">
                {search_for_a_module}:
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    'h-9 w-full min-w-0 rounded-md border border-input bg-popover px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
                    'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
                  )}
                />
              </label>
            </div>
          </div>
        </header>
        <ul className="space-y-3">
          {filteredRepos.map((repo) => (
            <RepositoryCard
              key={`${repo.organization}/${repo.name}`}
              repo={repo}
              allowPreRelease={allowPreRelease}
              translations={translations}
              language={info.language}
            />
          ))}
          {filteredRepos.length === 0 && <div>{no_modules_found}</div>}
        </ul>
      </main>
    </JASPScrollBar>
  );
}
