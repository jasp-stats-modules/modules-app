import fs from 'node:fs/promises';
import { Octokit } from '@octokit/core';
import {
  type PageInfoForward,
  paginateGraphQL,
} from '@octokit/plugin-paginate-graphql';
import chalk from 'chalk';
import dedent from 'dedent';
import matter from 'gray-matter';
import type { Asset, Release, Repository } from './types';

const MyOctokit = Octokit.plugin(paginateGraphQL);
const octokit = new MyOctokit({ auth: process.env.GITHUB_TOKEN });

function url2nameWithOwner(url: string): string {
  // For example
  // "https://github.com/jasp-stats-modules/jaspBain.git" -> "jasp-stats-modules/jaspBain"
  const match = url.match(/github\.com\/([^/]+\/[^/]+)\.git/);
  if (!match) throw new Error(`Invalid GitHub URL: ${url}`);
  return match[1];
}

function path2channel(path: string): string {
  // For example
  // "jasp-modules/jaspAnova" -> "jasp-modules"
  return path.split('/')[0];
}

/**
 * Key is repository name with owner, value is array of channels
 */
type Repo2Channels = Record<string, string[]>;

async function downloadSubmodules(
  owner: string = 'jasp-stats-modules',
  repo: string = 'modules-registry',
): Promise<Repo2Channels> {
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
  const query = dedent`
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
  `;
  const result = await octokit.graphql.paginate<Gql>(query, {
    owner,
    repo,
  });
  const submodules = result.repository.submodules.nodes;
  const repo2channels: Repo2Channels = {};
  for (const submodule of submodules) {
    const channel = path2channel(submodule.path);
    const nameWithOwner = url2nameWithOwner(submodule.gitUrl);
    if (!repo2channels[nameWithOwner]) {
      repo2channels[nameWithOwner] = [];
    }
    repo2channels[nameWithOwner].push(channel);
  }
  return repo2channels;
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
  if (filename.includes('Flatpak_x86_64')) {
    return 'Flatpak_x86_64';
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
  repo2channels: Repo2Channels,
  firstAssets = 20,
  pageSize = 100,
): Promise<Repository[]> {
  const repositoriesWithOwners = Object.keys(repo2channels);
  const batches = batchedArray(repositoriesWithOwners, pageSize);
  const results: Repository[] = [];
  for (const batch of batches) {
    const rawBatchResults = await releaseAssets(batch, firstAssets);
    const batchResults = associateChannelsWithRepositories(
      rawBatchResults,
      repo2channels,
    );
    results.push(...batchResults);
  }

  // TODO remove once a release is on GitHub that does not work on installed JASP version
  console.log('Inserting dummy old release for jaspAnova');
  // For now we insert a dummy release,
  // try out with ?v=0.95.0 should show release below and not one with 2cbd8a6d as version
  results
    .find((repo) => repo.releaseSource === 'jasp-stats-modules/jaspAnova')
    ?.releases.push({
      version: '0.94.0',
      publishedAt: '2025-05-07T21:56:13Z',
      jaspVersionRange: '>=0.94.0',
      assets: [
        {
          downloadUrl:
            'https://github.com/jasp-stats-modules/jaspAnova/releases/download/2cbd8a3e_R-4-4-1/jaspAnova_0.95.0_Flatpak_x86_64_R-4-5-1.JASPModule',
          downloadCount: 0,
          architecture: 'Flatpak_x86_64',
        },
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
    homepageUrl?: string;
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

function associateChannelsWithRepositories(
  batchResults: Omit<Repository, 'channels'>[],
  repo2channels: Repo2Channels,
): Repository[] {
  return batchResults.map((repo) => {
    const channels = repo2channels[repo.releaseSource];
    return { ...repo, channels };
  });
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

function versionFromTagName(tagName: string): string {
  // Expects the tagName to be in following format `<version>_<last-commit-of-tag>_R-<r-version-seperated-by-minus>`
  // For example for `0.95.0_2cbd8a6d_R-4-5-1` the version is `0.95.0`
  return tagName.slice(0, tagName.indexOf('_'));
}

function transformRelease(release: GqlRelease, nameWithOwner: string): Release {
  const {
    tagName,
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
  const version = versionFromTagName(tagName);
  const newRelease: Release = {
    ...restRelease,
    jaspVersionRange,
    version,
    assets: releaseAssets.nodes
      .filter((asset) => asset.downloadUrl.endsWith('.JASPModule'))
      .map((a) => {
        const asset: Asset = {
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
): Promise<Omit<Repository, 'channels'>[]> {
  const queries = Array.from(repos)
    .map((nameWithOwner, i) => {
      const [owner, repo] = nameWithOwner.split('/');
      // Any change to query also needs to be reflected in GqlAssetsResult interface
      return dedent`
        repo${i}: repository(owner: "${owner}", name: "${repo}") {
          name
          nameWithOwner
          shortDescriptionHTML
          homepageUrl
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

  return Object.values(result)
    .filter((repo) => {
      if (repo.releases.nodes.length === 0) {
        console.log(`No releases found for ${repo.nameWithOwner}. Skipping.`);
        return false;
      }
      return true;
    })
    .map((repo) => {
      const {
        nameWithOwner,
        parent: _,
        releases,
        homepageUrl,
        ...restRepo
      } = repo;
      const productionReleases = releases.nodes.filter(
        (r) => !r.isDraft && !r.isPrerelease,
      );
      const preReleases = releases.nodes.filter(
        (r) => !r.isDraft && r.isPrerelease,
      );
      const newRepo: Omit<Repository, 'channels'> = {
        ...restRepo,
        releaseSource: nameWithOwner,
        organization: repo.parent?.owner.login ?? 'unknown_org',
        releases: latestReleasePerJaspVersionRange(productionReleases).map(
          (r) => {
            return transformRelease(r, nameWithOwner);
          },
        ),
        preReleases: latestReleasePerJaspVersionRange(preReleases).map((r) => {
          return transformRelease(r, nameWithOwner);
        }),
      };
      if (homepageUrl) {
        newRepo.homepageUrl = homepageUrl;
      }
      return newRepo;
    });
}

function logReleaseStatistics(repositories: Repository[]) {
  let totalReleases = 0;
  let totalPreReleases = 0;
  let totalAssets = 0;
  let countedReleases = 0;
  repositories.forEach((repo) => {
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
  console.info('Repositories:', repositories.length);
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

function invertRepoToChannels(
  repo2channels: Repo2Channels,
): Record<string, string[]> {
  const channel2repos: Record<string, string[]> = {};
  for (const [repo, channels] of Object.entries(repo2channels)) {
    if (channels.length > 1) {
      console.info(
        `Repository ${repo} is in multiple channels: ${channels.join(', ')}`,
      );
    }
    for (const channel of channels) {
      if (!channel2repos[channel]) {
        channel2repos[channel] = [];
      }
      channel2repos[channel].push(repo);
    }
  }
  return channel2repos;
}

function logChannelStats(repo2channels: Repo2Channels) {
  const channel2repos = invertRepoToChannels(repo2channels);
  console.info('Found', Object.keys(channel2repos).length, 'channels');
  for (const [channel, repos] of Object.entries(channel2repos)) {
    console.info(' - ', channel, ':', repos.length);
  }
}

async function scrape(
  owner: string = 'jasp-stats-modules',
  repo: string = 'modules-registry',
  output: string = 'public/index.json',
) {
  console.info('Fetching submodules from', `${owner}/${repo}`);
  const repo2channels = await downloadSubmodules(owner, repo);
  logChannelStats(repo2channels);
  console.info('Fetching release assets');
  const repositories = await releaseAssetsPaged(repo2channels);

  logReleaseStatistics(repositories);

  const body = JSON.stringify(repositories, null, 2);
  await fs.writeFile(output, body);
  console.log('Wrote', output);
}

// Allow running as a script
if (import.meta.url === `file://${process.argv[1]}`) {
  scrape();
}
