import { createFileRoute } from '@tanstack/react-router'
import { channels, assets } from '../index.json'
import type { ReleaseAsset, RepoReleaseAssets, Repository } from "@/types";
import { useState } from 'react';
import * as v from 'valibot';
import { satisfies, gt } from 'semver';

const channels2repos = channels as unknown as Record<string, string[]>
const releaseAssets = assets as unknown as RepoReleaseAssets;

const defaultArchitecture = 'Windows-x86_64';
const defaultInstalledVersion = '0.95.0';
// const defaultInstalledModules = () => ({})
// TODO remove example once JASP has app integrated
const defaultInstalledModules = () => ({ 'jaspEquivalenceTTests': '0.95.0', 'jaspTTests': '0.94.0' });

const SearchSchema = v.object({
  // Architecture of installed JASP
  a: v.optional(v.fallback(v.string(), defaultArchitecture), defaultArchitecture),
  // Version of installed JASP
  v: v.optional(v.fallback(v.string(), defaultInstalledVersion), defaultInstalledVersion),
  // Installed modules where key is the module name and value is the version
  i: v.optional(v.fallback(v.record(v.string(), v.string()), defaultInstalledModules), defaultInstalledModules),
})
type SearchSchema = v.InferOutput<typeof SearchSchema>;

export const Route = createFileRoute('/')({
  component: App,
  validateSearch: SearchSchema
})

const arch = 'Windows-x86_64';

function InstallButton({ asset }: { asset?: ReleaseAsset }) {
  if (!asset) {
    return <></>;
  }
  return (
    <a
      href={asset.downloadUrl}
      className="inline-flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors duration-200"
    >
      Install
    </a>
  )
}

function UpdateButton({ asset }: { asset?: ReleaseAsset }) {
  if (!asset) {
    return <></>;
  }
  return (
    <a
      href={asset.downloadUrl}
      className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors duration-200"
    >
      Update
    </a>
  )
}

function RepositoryCard({ repo }: { repo: Repository }) {
  const archAsset = repo.latestRelease?.assets.find(a => a.architecture === arch);
  const { i } = Route.useSearch();
  const installedVersion = i[repo.name];
  const canInstall = !installedVersion;
  const canUpdate = installedVersion && gt(repo.latestRelease?.tagName.replace('v', '') ?? defaultInstalledVersion, installedVersion);
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start gap-2 mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{repo.name}</h3>
        <div className="flex-shrink-0">
          {canInstall && <InstallButton asset={archAsset} />}
          {canUpdate && <UpdateButton asset={archAsset} />}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {repo.shortDescriptionHTML && (
          <div
            className="text-gray-600 text-sm mb-2 prose prose-sm"
            dangerouslySetInnerHTML={{ __html: repo.shortDescriptionHTML }}
          />
        )}
        {repo.latestRelease && (
          <div className="flex flex-row gap-1 text-xs text-gray-500">
            <span className="inline-flex items-center w-fit">
              {installedVersion ? ` installed: ${installedVersion}, latest` : 'latest '}{' '}
              {repo.latestRelease.tagName.replace('v','')} on {new Date(repo.latestRelease.publishedAt).toLocaleDateString()}
            </span>
            <span>by {repo.organization}</span>
            <span>with {archAsset?.downloadCount} downloads</span>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const { a: architecture, i: installedModules, v: installedJaspVersion } = Route.useSearch()
  const [channel, setChannel] = useState<string>('beta-modules');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const channels = Object.keys(channels2repos);
  const reposOfChannel = Object.entries(releaseAssets).filter(([repo, _]) => channels2repos[channel].includes(repo)).map(([_, repo]) => repo);
  // TODO allow to see installed modules by ticking checkbox and be able to uninstall a module
  const installableRepos = reposOfChannel.filter(repo => {
    const hasArch = !repo.latestRelease || repo.latestRelease?.assets.some(a => a.architecture === architecture)
    const satisfiesJaspVersion = !repo.latestRelease?.jaspVersionRange || satisfies(installedJaspVersion, repo.latestRelease?.jaspVersionRange);
    // TODO allow to update module when installed version is lower than latest release
    const latestVersionInstalled = repo.name in installedModules && installedModules[repo.name] === repo.latestRelease?.tagName.replace('v', '');
    if (repo.name === 'jaspTTests') {
      // debugger
    }
    return hasArch && satisfiesJaspVersion && !latestVersionInstalled;
  });

  // Filter repositories based on search term
  const filteredRepos = installableRepos.filter(repo => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    const nameMatches = repo.name.toLowerCase().includes(searchLower);

    // Strip HTML tags from description for search
    const plainDescription = repo.shortDescriptionHTML?.replace(/<[^>]*>/g, '') || '';
    const descriptionMatches = plainDescription.toLowerCase().includes(searchLower);

    return nameMatches || descriptionMatches;
  });

  return (
    <main className="min-h-screen bg-gray-50 py-4">
      <div className="w-full px-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
          <form className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Select a channel:
              </label>
              <select
                name="channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                {channels.map(channel => (
                  <option key={channel} value={channel}>{channel}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Search for a module:
              </label>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </form>
        </div>

        <div className="space-y-3">
          {filteredRepos.map(repo => (
            <RepositoryCard key={`${repo.organization}/${repo.name}`} repo={repo} />
          ))}
        </div>
      </div>
    </main>
  )
}
