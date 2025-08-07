import { createFileRoute } from '@tanstack/react-router'
import { channels, assets } from '../index.json'
import type { ReleaseAsset, RepoReleaseAssets } from "@/types";
import { useState } from 'react';

const channels2repos = channels as unknown as Record<string, string[]>
const releaseAssets = assets as unknown as RepoReleaseAssets;

export const Route = createFileRoute('/')({
  component: App,
})

const arch = 'Windows-x86_64';

function Assets({ assets }: { assets: ReleaseAsset[]  }) {
  const archAsset = assets.find(asset => asset.architecture === arch);
  if (!archAsset) {
    return <></>;
  }
  return (
    <div>
    <a href={archAsset.downloadUrl}>
      Install
    </a>
    ({archAsset.downloadCount} downloads)
    </div>
  )
}

function App() {
  const [channel, setChannel] = useState<string>('beta-modules');
  const channels = Object.keys(channels2repos);
  const reposOfChannel = Object.entries(releaseAssets).filter(([repo, _]) => channels2repos[channel].includes(repo)).map(([_, repo]) => repo);

  return (
    <main>
      <search>
        <form>
          <label>
            Select a channel:
            <select name="channel" value={channel} onChange={(e) => setChannel(e.target.value)} >
              {channels.map(channel => (
                <option key={channel} value={channel}>{channel}</option>
              ))}
            </select>
          </label>
          <label>
            Search for a module:
            <input type="search" name="q" placeholder="TTests" />
          </label>
        </form>
      </search>
      <ul>
        {reposOfChannel.map(repo => (
          <li key={`${repo.organization}/${repo.name}`}>
            {repo.name}
            {repo.shortDescriptionHTML ? <span dangerouslySetInnerHTML={{ __html: repo.shortDescriptionHTML }} /> : ''}
            {repo.latestRelease && (
              <span>
                {repo.latestRelease.tagName} - {new Date(repo.latestRelease.publishedAt).toLocaleDateString()}
                <Assets assets={repo.latestRelease.assets} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </main>

  )
}
