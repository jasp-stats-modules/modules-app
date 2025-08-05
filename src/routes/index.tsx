import { createFileRoute } from '@tanstack/react-router'
import { channels, assets } from '../index.json'
import type { Releases, Repos, SubModule } from "@/types";

const channels2repos = channels as unknown as Repos
const releaseAssets = assets as unknown as Releases;

export const Route = createFileRoute('/')({
  component: App,
})

function Repo({repo}: {repo: SubModule}) {
  const shortDescriptionHTML = releaseAssets[repo.nameWithOwner]?.shortDescriptionHTML || '';
  const latestRelease = releaseAssets[repo.nameWithOwner]?.releases?.find(r => r.isLatest);

  return (
    <details>
      <summary>{repo.nameWithOwner}</summary>
      <p>{shortDescriptionHTML}</p>
      {latestRelease && (
        <div>
          <h4>Latest Release: {latestRelease.name}</h4>
          <p>Published at: {latestRelease.publishedAt}</p>
          <ul>
            {latestRelease.releaseAssets.nodes.map(asset => (
              <li key={asset.downloadUrl}>
                <a href={asset.downloadUrl} target="_blank" rel="noopener noreferrer">
                  {asset.name} ({asset.downloadCount} downloads)
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <hr />
    </details>
  )
}

function Channel({ channel}: { channel: string }) {
  const repos = channels2repos[channel] || [];
  return (
    <details open>
      <summary>{channel}</summary>
      <ul>
        {repos.map(repo => (
          <li key={repo.nameWithOwner}>
             <Repo repo={repo} />
          </li>
        ))}
      </ul>
    </details>
  )

}

function App() {
  return (
    <div>
      <h1>JASP Modules</h1>
      <ul>
        {Object.keys(channels2repos).map(channel => (
          <li key={channel}>
            <Channel channel={channel} />
          </li>
        ))}
      </ul>
    </div>
  )
}
