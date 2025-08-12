import fs from 'node:fs/promises';
import { Octokit } from '@octokit/core';
import {
  type PageInfoForward,
  paginateGraphQL,
} from '@octokit/plugin-paginate-graphql';
import dedent from 'dedent';
import matter from 'gray-matter';
import type {
  ChanelledSubModule,
  Release,
  ReleaseAsset,
  RepoReleaseAssets,
  Repository,
} from './types';

const MyOctokit = Octokit.plugin(paginateGraphQL);
const octokit = new MyOctokit({ auth: process.env.GITHUB_TOKEN });

async function downloadSubmodules(
  owner: string = 'jasp-stats-modules',
  repo: string = 'modules-registry',
): Promise<ChanelledSubModule[]> {
  interface GqlSubModule {
    name: string;
    gitUrl: string;
    path: string;
  }

  interface Gql {
    repository: {
      submodules: {
        nodes: GqlSubModule[];
        pageInfo: PageInfoForward;
      };
    };
  }
  const result = await octokit.graphql.paginate<Gql>(
    `
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
    `,
    {
      owner,
      repo,
    },
  );
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
  const filteredResult = result.repository.submodules.nodes.filter((sm) =>
    sm.gitUrl.startsWith(gitUrlMustStartWith),
  );
  if (filteredResult.length !== result.repository.submodules.nodes.length) {
    console.warn(
      `Not all submodules in ${owner}/${repo} start with ${gitUrlMustStartWith}. This is unexpected and may lead to issues.`,
    );
  }
  return filteredResult.map((sm) => ({
    channel: sm.path.split('/')[0],
    owner: sm.gitUrl.split('/')[3],
    repo: sm.gitUrl.split('/')[4].replace('.git', ''),
    nameWithOwner: `${sm.gitUrl.split('/')[3]}/${sm.gitUrl.split('/')[4].replace('.git', '')}`,
  }));
}

function uniqueReposFromSubmodules(
  submodules: ChanelledSubModule[],
): Set<string> {
  const repos = new Set<string>();
  for (const channel of submodules) {
    repos.add(channel.nameWithOwner);
  }
  return repos;
}

export function archFromDownloadUrl(url: string): string {
  // From https://github.com/jasp-stats-modules/jaspRegression/releases/download/5649cad6_R-4-5-1/jaspRegression_0.95.0_Windows_x86-64_R-4-5-1.JASPModule
  // extracts 'Windows_x86-64'
  // Or https://github.com/jasp-stats-modules/jaspAcceptanceSampling/releases/download/014ad5af_R-4-5-1/jaspAcceptanceSampling_0.95.0_Windows_x86-64_R-4-5-1.JASPModule
  // extracts 'Windows _x86-64'
  // The architecture is the part between the last underscore in the filename and the next underscore (or _R-) before the .JASPModule extension
  const filename = url.split('/').pop();
  if (!filename) throw new Error(`URL ${url} does not contain a filename`);
  // Match the architecture part: ..._<arch>_R-...JASPModule
  const archMatch = filename.match(
    /_([A-Za-z0-9-]+_[A-Za-z0-9-]+)_R-[^_]+\.JASPModule$/,
  );
  if (archMatch) {
    return archMatch[1];
  }
  // Fallback: try to match ..._<arch>_...JASPModule (less strict)
  const fallback = filename.match(
    /_([A-Za-z0-9-]+_[A-Za-z0-9-]+)_.*\.JASPModule$/,
  );
  if (fallback) {
    return fallback[1];
  }
  throw new Error(
    `URL ${url} does not match expected pattern for extracting architecture`,
  );
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
export function jaspVersionRangeFromDescription(
  description: string,
): string | undefined {
  const parsed = matter(addQuotesInDescription(description));
  if (parsed.data && typeof parsed.data.jasp === 'string') {
    return parsed.data.jasp;
  }
  return undefined;
}

// TODO remove once all release descriptions fetched have valid yaml in frontmatter
function addQuotesInDescription(input: string): string {
  const regex = /^(.*?): (>.*)$/m;
  return input.replace(regex, (_, p1, p2) => `${p1}: "${p2}"`);
}

function batchedArray<T>(array: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
}

async function releaseAssetsPaged(
  repos: Set<string>,
  firstAssets = 20,
  pageSize = 100,
): Promise<RepoReleaseAssets> {
  const batches = batchedArray(Array.from(repos), pageSize);
  const results: RepoReleaseAssets = {};
  for (const batch of batches) {
    const batchResults = await releaseAssets(batch, firstAssets);
    Object.assign(results, batchResults);
  }
  return results;
}

export interface GqlRelease {
  tagName: string;
  publishedAt: string;
  description?: string;
  isDraft: boolean;
  isPrerelease: boolean;
  releaseAssets: {
    nodes: {
      downloadUrl: string;
      downloadCount: number;
    }[];
  };
}

interface GqlAssetsResult {
  [key: string]: {
    name: string;
    nameWithOwner: string;
    shortDescriptionHTML: string;
    parent?: {
      owner: {
        login: string;
      };
    };
    releases: {
      nodes: GqlRelease[];
    };
  };
}

export function latestReleasePerJaspVersionRange(
  releases: GqlRelease[],
): GqlRelease[] {
  const latest: GqlRelease[] = [];
  const seen: Set<string> = new Set();

  for (const release of releases) {
    if (!release.description) {
      console.log('Release description is missing');
      continue;
    }
    // TODO do not call jaspVersionRangeFromDescription twice
    // here and in transformRelease()
    const jaspVersionRange = jaspVersionRangeFromDescription(
      release.description,
    );
    if (!jaspVersionRange) {
      console.log(
        'Could not extract JASP version range from release description',
      );
      continue;
    }
    if (!seen.has(jaspVersionRange)) {
      seen.add(jaspVersionRange);
      latest.push(release);
    }
  }

  return latest;
}

function transformRelease(release: GqlRelease, nameWithOwner: string): Release {
  const { releaseAssets, description, isDraft, ...restRelease } = release;
  let jaspVersionRange = jaspVersionRangeFromDescription(description ?? '');
  if (!jaspVersionRange) {
    jaspVersionRange = '>=0.95.0';
    console.warn(
      `Malformed description for ${nameWithOwner}. Falling back to default JASP version range: ${jaspVersionRange}`,
    );
  }
  const newRelease: Release = {
    ...restRelease,
    jaspVersionRange,
    assets: releaseAssets.nodes
      .filter((asset) => asset.downloadUrl.endsWith('.JASPModule'))
      .map((a) => {
        const asset: ReleaseAsset = {
          ...a,
          architecture: archFromDownloadUrl(a.downloadUrl),
        };
        return asset;
      }),
  };
  return newRelease;
}

async function releaseAssets(
  repos: Iterable<string>,
  firstReleases = 20,
  firstAssets = 20,
): Promise<RepoReleaseAssets> {
  const queries = Array.from(repos)
    .map((nameWithOwner, i) => {
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
          releases(first: ${firstReleases}) {
            nodes {
              tagName
              publishedAt
              description
              isDraft
              isPrerelease
              releaseAssets(first: ${firstAssets}) {
                nodes {
                  downloadUrl
                  name
                  downloadCount
                }
              }
            }
          }
        }
      `;
    })
    .join('\n');

  const fullQuery = `query {\n${queries}\n}`;

  const result = await octokit.graphql<GqlAssetsResult>(fullQuery);

  // Replace repo{i] with the actual nameWithOwner}
  const repositories = Object.fromEntries(
    Object.values(result).map((repo) => {
      const { nameWithOwner, parent, releases, ...restRepo } = repo;
      const productionReleases = releases.nodes.filter(
        (r) => !r.isDraft && !r.isPrerelease,
      );
      const preReleases = releases.nodes.filter(
        (r) => !r.isDraft && r.isPrerelease,
      );
      const newRepo: Repository = {
        ...restRepo,
        organization: repo.parent?.owner.login ?? 'unknown_org',
        latest: latestReleasePerJaspVersionRange(productionReleases).map(
          (r) => {
            return transformRelease(r, nameWithOwner);
          },
        ),
        preRelease: latestReleasePerJaspVersionRange(preReleases).map((r) => {
          return transformRelease(r, nameWithOwner);
        }),
      };
      return [nameWithOwner, newRepo];
    }),
  );

  return repositories;
}

function compactChannels(
  channels: ChanelledSubModule[],
): Record<string, string[]> {
  const compacted: Record<string, string[]> = {};
  for (const channel of channels) {
    if (!compacted[channel.channel]) {
      compacted[channel.channel] = [];
    }
    compacted[channel.channel].push(channel.nameWithOwner);
  }
  return compacted;
}

async function scrape(
  owner: string = 'jasp-stats-modules',
  repo: string = 'modules-registry',
  output: string = 'src/index.json',
) {
  console.info('Fetching submodules from', `${owner}/${repo}`);
  const submodules = await downloadSubmodules(owner, repo);
  const repoWithOwners = uniqueReposFromSubmodules(submodules);
  console.info('Found', submodules.length, 'submodules');
  console.info('Fetching release assets');
  const assets = await releaseAssetsPaged(repoWithOwners);
  console.info(
    'Found',
    Object.keys(assets).length,
    'repositories with release assets',
  );

  const channels = compactChannels(submodules);
  const body = JSON.stringify({ channels, assets }, null, 2);
  await fs.writeFile(output, body);
}

// Allow running as a script
if (import.meta.url === `file://${process.argv[1]}`) {
  scrape();
}
