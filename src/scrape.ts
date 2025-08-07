import matter from 'gray-matter';
import { Octokit } from "@octokit/core";
import { paginateGraphQL, type PageInfoForward } from "@octokit/plugin-paginate-graphql";
import fs from 'fs/promises';
import type { ChanelledSubModule, Release, ReleaseAsset, RepoReleaseAssets, Repository } from "./types";
import dedent from 'dedent';

const MyOctokit = Octokit.plugin(paginateGraphQL);
const octokit = new MyOctokit({ auth: process.env.GITHUB_TOKEN });

async function downloadSubmodules(owner: string = 'jasp-stats-modules', repo: string = 'modules-registry'): Promise<ChanelledSubModule[]> {
  interface GqlSubModule {
    name: string
    gitUrl: string
    path: string
  }

  interface Gql {
    repository: {
      submodules: {
        nodes: GqlSubModule[]
        pageInfo: PageInfoForward
      }
    }
  }
  const result = await octokit.graphql.paginate<Gql>(`
query paginate($owner: String!, $repo: String!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    submodules(first: 100, after: $cursor) {
      nodes {
        gitUrl
        path
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
    `, {
    owner,
    repo,
  })
  //  {
  //         "name": "beta-modules/recapJaspModule",
  //         "gitUrl": "https://github.com/jasp-stats-modules/recapJaspModule.git",
  //         "path": "beta-modules/recapJaspModule"
  //       },
  // To:
  // {
  //     channel: 'beta-modules',
  //     name: 'recapJaspModule',
  //     owner: 'jasp-stats-modules',
  //     repo: 'recapJaspModule'
  // }
  const gitUrlMustStartWith = `https://github.com/${owner}/`;
  const filteredResult = result.repository.submodules.nodes.filter((sm) => sm.gitUrl.startsWith(gitUrlMustStartWith))
  if (filteredResult.length !== result.repository.submodules.nodes.length) {
    console.warn(`Not all submodules in ${owner}/${repo} start with ${gitUrlMustStartWith}. This is unexpected and may lead to issues.`);
  }
  return filteredResult.map((sm) => ({
    channel: sm.path.split('/')[0],
    owner: sm.gitUrl.split('/')[3],
    repo: sm.gitUrl.split('/')[4].replace('.git', ''),
    nameWithOwner: `${sm.gitUrl.split('/')[3]}/${sm.gitUrl.split('/')[4].replace('.git', '')}`,
  }))
}

function uniqueReposFromSubmodules(submodules: ChanelledSubModule[]): Set<string> {
  const repos = new Set<string>();
  for (const channel of submodules) {
    repos.add(channel.nameWithOwner);
  }
  return repos;
}

/**
 * Extracts architecture string (e.g., 'Windows-x86_64') from filenames like 'jaspTTests-0.95-Windows-x86_64.jaspModule'
 */
export function archFromDownloadUrl(url: string): string {
  // Match pattern: <name>-<version>-<arch>.jaspModule
  // Example: jaspTTests-0.95-Windows-x86_64.jaspModule
  const match = url.match(/^[^-]+-[^-]+-([^.]+)\.jaspModule$/);
  if (!match) {
    throw new Error(`URL ${url} does not match expected pattern`);
  }
  return match[1];
}

/**
 * Given description like:
 * ```
 * ---
 * jasp: >=0.95.0
 * ---
 * ```
 * extracts the JASP version range string ('>=0.95.0').
 * 
 * The version range string should be in format that semver package understands.
 * See https://semver.npmjs.com/ for more details.
 * 
 * @param description 
 * @returns 
 */
export function jaspVersionRangeFromDescription(description: string): string {
  const parsed = matter(description);
  if (parsed.data && typeof parsed.data.jasp === 'string') {
    return parsed.data.jasp;
  }
  throw new Error(`Description does not contain a valid JASP version range: ${description}`);
}

async function releaseAssets(repos: Set<string>, firstAssets = 20): Promise<RepoReleaseAssets> {
  const queries = Array.from(repos).map((nameWithOwner, i) => {
    const [owner, repo] = nameWithOwner.split('/');
    return dedent`
        repo${i}: repository(owner: "${owner}", name: "${repo}") {
          name
          nameWithOwner
          shortDescriptionHTML
          parent {
            owner {
              login
            }
          }
          latestRelease {
              tagName
              publishedAt
              description
              releaseAssets(first: ${firstAssets}) {
                nodes {
                  downloadUrl
                  name
                  downloadCount
                }
              }
          }
        }
      `;
  }).join('\n');

  const fullQuery = `query {\n${queries}\n}`;

  interface GqlResult {
    [key: string]: {
      name: string
      nameWithOwner: string
      shortDescriptionHTML: string
      parent?: {
        owner: {
          login: string
        }
      }
      latestRelease?: {
        tagName: string
        publishedAt: string
        description?: string
        releaseAssets: {
          nodes: {
            downloadUrl: string
            downloadCount: number
          }[]
        }
      }
    }
  }

  const result = await octokit.graphql<GqlResult>(fullQuery)

  // Replace repo{i] with the actual nameWithOwner}
  const repositories = Object.fromEntries(
    Object.values(result).map(repo => {
      const { nameWithOwner, parent, latestRelease, ...newRepo } = repo;
      if (parent && parent.owner) {
        (newRepo as Repository).organization = parent.owner.login;
      }
      if (latestRelease) {
        const {releaseAssets, description, ...restRelease} = latestRelease;
        const newRelease: Release = {
            ...restRelease,
            jaspVersionRange: jaspVersionRangeFromDescription(description ?? ''),
            assets: releaseAssets.nodes.filter(asset => asset.downloadUrl.endsWith('.jaspModule')).map((a) => {
              const asset: ReleaseAsset = {
                ...a,
                architecture: archFromDownloadUrl(a.downloadUrl)
              };
              return asset;
          })
        };
        (newRepo as Repository).latestRelease = newRelease;
      }
      return [nameWithOwner, newRepo as Repository];
    })
  );

  // TODO remove dummy examples once a module has a release with assets
  repositories['jasp-stats-modules/jaspTTests'].latestRelease = {
    tagName: 'v0.95.0',
    publishedAt: '2025-08-05T00:00:00Z',
    jaspVersionRange: '>=0.95.0',
    assets: [{
        downloadUrl: 'https://example.com/jaspTTests-0.95-Windows-x86_64.jaspModule',
        downloadCount: 100,
        architecture: 'Windows-x86_64'
      }]
  }
  repositories['jasp-stats-modules/jaspAnova'].latestRelease = {
    tagName: 'v0.95.0',
    publishedAt: '2025-08-06T00:00:00Z',
    jaspVersionRange: '>=0.95.0',
    assets: [{
        downloadUrl: 'https://example.com/jaspAnova-0.95-Windows-x86_64.jaspModule',
        downloadCount: 42,
        architecture: 'Windows-x86_64'
      }]
  }
  return repositories
}

function compactChannels(channels: ChanelledSubModule[]): Record<string, string[]> {
  const compacted: Record<string, string[]> = {};
  for (const channel of channels) {
    if (!compacted[channel.channel]) {
      compacted[channel.channel] = [];
    }
    compacted[channel.channel].push(channel.nameWithOwner);
  }
  return compacted;
}

async function scrape(owner: string = 'jasp-stats-modules', repo: string = 'modules-registry', output: string = 'src/index.json') {
  console.info('Fetching submodules from', `${owner}/${repo}`);
  const submodules = await downloadSubmodules(owner, repo);
  const repoWithOwners = uniqueReposFromSubmodules(submodules)
  console.info('Found', submodules.length, 'submodules');
  console.info('Fetching release assets');
  const assets = await releaseAssets(repoWithOwners);
  console.info('Found', Object.keys(assets).length, 'repositories with release assets');

  const channels = compactChannels(submodules);
  const body = JSON.stringify({ channels, assets }, null, 2)
  await fs.writeFile(output, body);
}

// Allow running as a script
if (import.meta.url === `file://${process.argv[1]}`) {
  scrape();
}

