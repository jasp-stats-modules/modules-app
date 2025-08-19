import fs from 'node:fs/promises';
import { Octokit } from '@octokit/core';
import {
  type PageInfoForward,
  paginateGraphQL,
} from '@octokit/plugin-paginate-graphql';
import chalk from 'chalk';
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

export function extractArchitectureFromUrl(url: string): string {
  const filename = url.split('/').pop();
  if (!filename) throw new Error(`URL ${url} does not contain a filename`);
  if (filename.includes('Windows_x86-64')) {
    return 'Windows_x86-64';
  }
  if (filename.includes('MacOS_arm64')) {
    return 'MacOS_arm64';
  }
  if (filename.includes('MacOS_x86_64') || filename.includes('MacOS_x86-64')) {
    return 'MacOS_x86_64';
  }
  if (filename.includes('Windows_arm64')) {
    return 'Windows_arm64';
  }
  if (filename.includes('Linux_x86_64') || filename.includes('Linux_x86-64')) {
    return 'Linux_x86_64';
  }
  if (filename.includes('Linux_arm64')) {
    return 'Linux_arm64';
  }
  throw new Error(`Unknown architecture in filename: ${filename}`);
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

  // TODO remove once a pre release is on GitHub
  console.log('Inserting dummy pre-release for jaspTTests');
  // For now we insert a dummy pre-release
  results['jasp-stats-modules/jaspTTests'].preReleases.push({
    tagName: 'f5516934_R-4-5-1-beta1',
    publishedAt: '2025-08-09T00:58:58Z',
    jaspVersionRange: '>=0.95.1',
    assets: [
      {
        downloadUrl:
          'https://github.com/jasp-stats-modules/jaspTTests/releases/download/f5516934_R-4-5-1-beta1/jaspTTests_0.95.0_Windows_x86-64_R-4-5-1-beta1.JASPModule',
        downloadCount: 0,
        architecture: 'Windows_x86-64',
      },
      {
        downloadUrl:
          'https://github.com/jasp-stats-modules/jaspTTests/releases/download/f5516934_R-4-5-1-beta1/jaspTTests_0.95.0_MacOS_x86_64_R-4-5-1-beta1.JASPModule',
        downloadCount: 0,
        architecture: 'MacOS_x86_64',
      },
      {
        downloadUrl:
          'https://github.com/jasp-stats-modules/jaspTTests/releases/download/f5516934_R-4-5-1-beta1/jaspTTests_0.95.0_MacOS_arm64_R-4-5-1-beta1.JASPModule',
        downloadCount: 0,
        architecture: 'MacOS_arm64',
      },
    ],
  });

  // TODO remove once a release is on GitHub that does not work on installed JASP version
  console.log('Inserting dummy old release for jaspAnova');
  // For now we insert a dummy release,
  // try out with ?v=0.95.0 should show release below and not one with R-4-5-1
  results['jasp-stats-modules/jaspAnova'].releases.push({
    tagName: '2cbd8a3e_R-4-4-1',
    publishedAt: '2025-05-07T21:56:13Z',
    jaspVersionRange: '>=0.94.0',
    assets: [
      {
        downloadUrl:
          'https://github.com/jasp-stats-modules/jaspAnova/releases/download/2cbd8a3e_R-4-4-1/jaspAnova_0.95.0_MacOS_x86_64_R-4-5-1.JASPModule',
        downloadCount: 0,
        architecture: 'MacOS_x86_64',
      },
      {
        downloadUrl:
          'https://github.com/jasp-stats-modules/jaspAnova/releases/download/2cbd8a3e_R-4-4-1/jaspAnova_0.95.0_MacOS_arm64_R-4-5-1.JASPModule',
        downloadCount: 0,
        architecture: 'MacOS_arm64',
      },
      {
        downloadUrl:
          'https://github.com/jasp-stats-modules/jaspAnova/releases/download/2cbd8a3e_R-4-4-1/jaspAnova_0.95.0_Windows_x86-64_R-4-5-1.JASPModule',
        downloadCount: 0,
        architecture: 'Windows_x86-64',
      },
    ],
  });

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
  const {
    releaseAssets,
    description,
    isDraft: _,
    isPrerelease: __,
    ...restRelease
  } = release;
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
          architecture: extractArchitectureFromUrl(a.downloadUrl),
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

  const repositories = Object.fromEntries(
    Object.values(result)
      .filter((repo) => {
        if (repo.releases.nodes.length === 0) {
          console.log(`No releases found for ${repo.nameWithOwner}. Skipping.`);
          return false;
        }
        return true;
      })
      .map((repo) => {
        const { nameWithOwner, parent: _, releases, ...restRepo } = repo;
        const productionReleases = releases.nodes.filter(
          (r) => !r.isDraft && !r.isPrerelease,
        );
        const preReleases = releases.nodes.filter(
          (r) => !r.isDraft && r.isPrerelease,
        );
        const newRepo: Repository = {
          ...restRepo,
          organization: repo.parent?.owner.login ?? 'unknown_org',
          releases: latestReleasePerJaspVersionRange(productionReleases).map(
            (r) => {
              return transformRelease(r, nameWithOwner);
            },
          ),
          preReleases: latestReleasePerJaspVersionRange(preReleases).map(
            (r) => {
              return transformRelease(r, nameWithOwner);
            },
          ),
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

function logReleaseStatistics(assets: RepoReleaseAssets) {
  let totalReleases = 0;
  let totalPreReleases = 0;
  let totalAssets = 0;
  let countedReleases = 0;
  Object.values(assets).forEach((repo) => {
    if (repo.releases) {
      totalReleases += repo.releases.length;
      repo.releases.forEach((release) => {
        if (release.assets) {
          totalAssets += release.assets.length;
          countedReleases++;
        }
      });
    }
    if (repo.preReleases) {
      totalPreReleases += repo.preReleases.length;
    }
  });
  const avgAssetsPerRelease =
    countedReleases > 0 ? totalAssets / countedReleases : 0;
  console.info('Repositories:', Object.keys(assets).length);
  console.info('Total releases:', totalReleases);
  console.info('Total pre-releases:', totalPreReleases);
  // If avgAssetsPerRelease is not an int, then there is a release with not all architectures
  console.info(
    'Average number of assets per release:',
    avgAssetsPerRelease % 1 === 0
      ? avgAssetsPerRelease
      : chalk.red(avgAssetsPerRelease.toFixed(2)),
  );
}

function logChannelStats(channels: Record<string, string[]>) {
  console.info('Found', Object.keys(channels).length, 'channels');
  for (const [channel, repos] of Object.entries(channels)) {
    console.info(' - ', channel, ':', repos.length);
  }
}

async function scrape(
  owner: string = 'jasp-stats-modules',
  repo: string = 'modules-registry',
  output: string = 'src/index.json',
) {
  console.info('Fetching submodules from', `${owner}/${repo}`);
  const submodules = await downloadSubmodules(owner, repo);
  const repoWithOwners = uniqueReposFromSubmodules(submodules);
  const channels = compactChannels(submodules);
  logChannelStats(channels);
  console.info('Fetching release assets');
  const assets = await releaseAssetsPaged(repoWithOwners);

  logReleaseStatistics(assets);

  const body = JSON.stringify({ channels, assets }, null, 2);
  await fs.writeFile(output, body);
  console.log('Wrote', output);
}

// Allow running as a script
if (import.meta.url === `file://${process.argv[1]}`) {
  scrape();
}
