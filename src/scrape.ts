import fs from 'node:fs/promises';
import path from 'node:path';
import { Octokit } from '@octokit/core';
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql';
import chalk from 'chalk';
import dedent from 'dedent';
import matter from 'gray-matter';
import ProgressBar from 'progress';
import { type SimpleGit, simpleGit } from 'simple-git';
import * as v from 'valibot';
import type { Asset, Release, Repository } from './types';

// Directory where the modules-registry repo will be cloned/updated
export const REGISTRY_DIR = path.resolve('registry');

// Helper: get a simple-git instance pointing at the registry directory
function gitInstance() {
  return simpleGit({ baseDir: REGISTRY_DIR });
}

async function updateSubmodules(git: SimpleGit) {
  // Determine which submodule paths are defined in the top‑level .gitmodules file
  let submodulePaths: string[] = [];
  try {
    const gitmodulesPath = path.join(REGISTRY_DIR, '.gitmodules');
    const gitmodulesContent = await fs.readFile(gitmodulesPath, 'utf8');
    const submodules = parseSubModulesFile(gitmodulesContent);
    submodulePaths = submodules.map((s) => s.path);
  } catch (_e) {
    // If the file does not exist or cannot be read, we simply have no submodules to handle
    submodulePaths = [];
  }

  if (submodulePaths.length === 0) {
    // No submodules defined – nothing to initialise or update
    return;
  }

  try {
    // Initialise the listed submodules shallowly (depth 1)
    await git.submoduleUpdate([
      '--init',
      '--depth',
      '1',
      '--',
      ...submodulePaths,
    ]);
  } catch (e) {
    console.warn('Failed to init submodules (might be none or path issue):', e);
  }

  try {
    // Update the submodules to the latest commit on their remote, still shallow
    await git.submoduleUpdate([
      '--remote',
      '--depth',
      '1',
      '--',
      ...submodulePaths,
    ]);
  } catch (e) {
    console.warn('Failed to update submodules to remote:', e);
  }
}

/**
 * Ensure the registry directory contains a shallow clone of the given repo at the requested branch.
 * If the directory does not exist, it will be cloned. If it exists, it will be fetched & fast‑forwarded.
 * Additionally, top‑level submodules defined in .gitmodules are initialised/updated shallowly.
 */
async function ensureRegistry(repoUrl: string, branch: string): Promise<void> {
  const exists = await fs
    .access(REGISTRY_DIR)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    console.info(`Cloning ${repoUrl} (branch ${branch}) into ${REGISTRY_DIR}`);
    await simpleGit().clone(repoUrl, REGISTRY_DIR, [
      '--depth',
      '1',
      '--branch',
      branch,
    ]);
    // Initialise submodules after fresh clone
    await updateSubmodules(gitInstance());
    return;
  }

  const git = gitInstance();
  console.info(`Fetching latest ${branch} in existing registry`);
  await git.fetch(['origin', branch, '--depth', '1']);

  // Checkout the branch (creates it if needed)
  try {
    await git.checkout(branch);
  } catch {
    await git.checkout(['-b', branch, `origin/${branch}`]);
  }

  // Pull latest (fast‑forward only)
  await git.pull('origin', branch, { '--ff-only': null });

  // Update submodules after pulling latest changes
  await updateSubmodules(git);
}

/**
 * Load and parse .gitmodules from the cloned registry.
 */
async function loadSubmodules(): Promise<Repo2Channels> {
  const gitmodulesPath = path.join(REGISTRY_DIR, '.gitmodules');
  const text = await fs.readFile(gitmodulesPath, 'utf8');
  const submodules = parseSubModulesFile(text);
  return submodulesToRepo2Channels(submodules);
}

const MyOctokit = Octokit.plugin(paginateGraphQL);

export function url2nameWithOwner(url: string): string {
  // For example
  // "https://github.com/jasp-stats-modules/jaspBain.git" -> "jasp-stats-modules/jaspBain"
  const match = url.match(/github\.com\/([^/]+\/[^/]+)\.git/);
  if (!match) throw new Error(`Invalid GitHub URL: ${url}`);
  return match[1];
}

export function path2channel(path: string): string {
  // For example
  // "jasp-modules/jaspAnova" -> "jasp-modules"
  return path.split('/')[0];
}

interface GqlSubModule {
  gitUrl: string;
  path: string;
}

/**
 * Parse the content of a .gitmodules file and return array of submodule entries
 */
export function parseSubModulesFile(text: string): GqlSubModule[] {
  const result: GqlSubModule[] = [];

  let currentPath = '';
  let currentUrl = '';

  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // start of a new submodule block
    if (line.startsWith('[submodule')) {
      currentPath = '';
      currentUrl = '';
      continue;
    }

    const pathMatch = line.match(/^path\s*=\s*(.*)$/);
    if (pathMatch) {
      currentPath = pathMatch[1].trim();
    }

    const urlMatch = line.match(/^url\s*=\s*(.*)$/);
    if (urlMatch) {
      currentUrl = urlMatch[1].trim();
    }

    if (currentPath && currentUrl) {
      // Only accept URLs in the form: https://github.com/<owner>/<repo>.git
      const githubPattern = /^https:\/\/github\.com\/[^/]+\/[^^/]+\.git$/;
      if (!githubPattern.test(currentUrl)) {
        console.warn(
          `Skipping submodule ${currentPath} with unsupported gitUrl: ${currentUrl}`,
        );
        currentPath = '';
        currentUrl = '';
        continue;
      }

      result.push({ path: currentPath, gitUrl: currentUrl });
      currentPath = '';
      currentUrl = '';
    }
  }

  return result;
}

function submodulesToRepo2Channels(submodules: GqlSubModule[]): Repo2Channels {
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

/**
 * Key is repository name with owner, value is array of channels
 */
export type Repo2Channels = Record<string, string[]>;

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

const ReleaseFrontMatter = v.object({
  jasp: v.optional(v.string()),
  name: v.optional(v.string()),
  description: v.optional(v.string()),
});
type ReleaseFrontMatter = v.InferOutput<typeof ReleaseFrontMatter>;

/**
 * Given description like:
 * ```
 * ---
 * jasp: >=0.95.0
 * name: My Module
 * description: This is my module.
 * ---
 * ```
 * extracts the frontmatter as an object
 * where jasp is the version range that is supported by this release.
 *
 * The version range string should be in format that semver package understands.
 * See https://semver.npmjs.com/ for more details.
 *
 * @param description
 * @returns
 */
export function parseReleaseFrontMatter(
  description: string,
): ReleaseFrontMatter {
  const raw = matter(addQuotesInDescription(description));
  return v.parse(ReleaseFrontMatter, raw.data);
}

// TODO remove once all release descriptions fetched have valid yaml in frontmatter
export function addQuotesInDescription(input: string): string {
  const regex = /^(.*?): (>.*)$/m;
  return input.replace(regex, (_, p1, p2) => `${p1}: "${p2}"`);
}

/**
 * The name of a repo is the GitHub repo name by default,
 * a release frontmatter can override this.
 * The shortDescriptionHTML aka the text on GH page in about sidebar
 * can also be overridden by release frontmatter.
 *
 * @param repo
 * @param releasesFrontMatters
 * @param preReleasesFrontMatters
 * @returns
 */
// New function: read name and description from Description.qml in the submodule
// The QML file looks like:
// Description { title: qsTr("ANOVA") description: qsTr("Evaluate the difference between multiple means") }
// This function extracts the first qsTr strings for title and description.

/**
 * Parse the raw content of Description.qml and return the extracted title and description.
 * Returns undefined for missing fields.
 */
export function parseDescriptionQml(content: string): {
  title?: string;
  description?: string;
} {
  const titleMatch = /title\s*:\s*[^q]*?qsTr\("([^"]+)"\)/s.exec(content);
  const descriptionMatch = /description\s*:\s*[^q]*?qsTr\("([^"]+)"\)/s.exec(
    content,
  );
  return {
    title: titleMatch?.[1],
    description: descriptionMatch?.[1],
  };
}

/**
 * Populate the repository object's name and shortDescriptionHTML from its Description.qml file.
 * If the file cannot be read or the fields are missing, the properties are left unchanged.
 */
export async function nameAndDescriptionFromSubmodule(
  repo: Omit<Repository, 'channels'>,
  channel: string,
): Promise<void> {
  const qmlPath = path.join(
    'registry',
    channel,
    repo.id,
    'inst',
    'Description.qml',
  );
  let content: string;
  try {
    content = await fs.readFile(qmlPath, 'utf8');
  } catch (_e) {
    // File missing – do nothing per fallback rule "b"
    return;
  }
  const { title, description } = parseDescriptionQml(content);
  console.log([qmlPath, title, description]);
  if (title) {
    repo.name = title;
  }
  if (description) {
    repo.description = description;
  }
}

export function batchedArray<T>(array: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
}

export async function releaseAssetsPaged(
  repo2channels: Repo2Channels,
  pageSize = 10,
  octokit: InstanceType<typeof MyOctokit>,
): Promise<Repository[]> {
  const repositoriesWithOwners = Object.keys(repo2channels);
  const batches = batchedArray(repositoriesWithOwners, pageSize);
  const results: Repository[] = [];

  const totalBatches = batches.length;
  const bar = new ProgressBar(
    `${chalk.cyan('Progress:')} [:bar] :current/:total batches :etas`,
    {
      total: totalBatches,
      width: 20,
      complete: chalk.green('█'),
      incomplete: chalk.gray('░'),
    },
  );
  for (let i = 0; i < totalBatches; i++) {
    const batch = batches[i];
    const rawBatchResults = await releaseAssets(
      batch,
      20,
      20,
      octokit,
      repo2channels,
    );
    const batchResults = associateChannelsWithRepositories(
      rawBatchResults,
      repo2channels,
    );
    results.push(...batchResults);
    bar.tick();
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
  const sortedReleases = [...releases].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  const latest: GqlRelease[] = [];
  const seen: Set<string> = new Set();

  for (const release of sortedReleases) {
    if (!release.description) {
      console.log('Release description is missing');
      continue;
    }
    const jaspVersionRange = parseReleaseFrontMatter(release.description).jasp;
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

export function versionFromTagName(tagName: string): string {
  // Expects the tagName to be in following format `<version>_<last-commit-of-tag>_R-<r-version-seperated-by-minus>`
  // For example for `0.95.0_2cbd8a6d_R-4-5-1_Release` the version is `0.95.0`
  return tagName.slice(0, tagName.indexOf('_'));
}

export function transformRelease(
  release: GqlRelease,
  nameWithOwner: string,
): [Release, ReleaseFrontMatter] {
  const {
    tagName,
    releaseAssets,
    description,
    isDraft: _,
    isPrerelease: __,
    ...restRelease
  } = release;
  const frontmatter = parseReleaseFrontMatter(description ?? '');
  let jaspVersionRange = frontmatter.jasp;
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
      })
      .sort((a, b) => a.architecture.localeCompare(b.architecture, 'en')),
  };
  return [newRelease, frontmatter];
}

async function releaseAssets(
  repos: Iterable<string>,
  firstReleases = 20,
  firstAssets = 20,
  octokit: InstanceType<typeof MyOctokit>,
  repo2channels: Repo2Channels,
): Promise<Omit<Repository, 'channels'>[]> {
  const allRepos = Array.from(repos);
  const CHUNK_SIZE = 3;
  const finalResults: Omit<Repository, 'channels'>[] = [];

  // Loop through repositories in chunks
  for (let i = 0; i < allRepos.length; i += CHUNK_SIZE) {
    const chunk = allRepos.slice(i, i + CHUNK_SIZE);

    const queries = chunk
      .map((nameWithOwner, index) => {
        const [owner, repo] = nameWithOwner.split('/');
        return dedent`
        repo${index}: repository(owner: "${owner}", name: "${repo}") {
          name
          nameWithOwner
          shortDescriptionHTML
          homepageUrl
          parent {
            owner {
              login
            }
          }
          releases(first: ${firstReleases}, orderBy: { field: CREATED_AT, direction: DESC }) {
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

    try {
      const result = await octokit.graphql<GqlAssetsResult>(fullQuery);
      const processedChunk: Omit<Repository, 'channels'>[] = [];
      // Process each repo individually to allow async name extraction
      for (const rawRepo of Object.values(result)) {
        // Filter out nulls (if a repo wasn't found)
        if (rawRepo === null) continue;
        const repo = rawRepo;
        if (repo.releases.nodes.length === 0) {
          console.log(`No releases found for ${repo.nameWithOwner}. Skipping.`);
          continue;
        }
        const {
          nameWithOwner,
          parent: _,
          releases,
          homepageUrl,
          shortDescriptionHTML: description,
          ...restRepo
        } = repo;

        const productionReleases = releases.nodes.filter(
          (r) => !r.isDraft && !r.isPrerelease,
        );
        const preReleases = releases.nodes.filter(
          (r) => !r.isDraft && r.isPrerelease,
        );

        const newReleases = latestReleasePerJaspVersionRange(
          productionReleases,
        ).map((r) => transformRelease(r, nameWithOwner));
        const newPreReleases = latestReleasePerJaspVersionRange(
          preReleases,
        ).map((r) => transformRelease(r, nameWithOwner));

        const newRepo: Omit<Repository, 'channels'> = {
          ...restRepo,
          id: restRepo.name,
          description,
          releaseSource: nameWithOwner,
          organization: repo.parent?.owner.login ?? 'unknown_org',
          releases: newReleases.map(([release, _]) => release),
          preReleases: newPreReleases.map(([release, _]) => release),
          // TODO put channels here
        };

        // Determine the channel for this repo (pick first if multiple)
        const channels = repo2channels[nameWithOwner] ?? [];
        const channel = channels[0] ?? '';
        await nameAndDescriptionFromSubmodule(newRepo, channel);

        if (homepageUrl) {
          newRepo.homepageUrl = homepageUrl;
        }
        processedChunk.push(newRepo);
      }

      finalResults.push(...processedChunk);
    } catch (error) {
      console.error(`Error fetching chunk starting at index ${i}:`, error);
      // Optional: throw error here if you want the whole process to fail
      // otherwise, it logs and continues to the next chunk.
    }
  }

  return finalResults;
}

export function logReleaseStatistics(repositories: Repository[]): string {
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
  const lines = [
    `Repositories: ${repositories.length}`,
    `Total releases: ${totalReleases}`,
    `Total pre-releases: ${totalPreReleases}`,
    `Average number of assets per release: ${
      avgAssetsPerRelease % 1 === 0
        ? avgAssetsPerRelease
        : chalk.red(avgAssetsPerRelease.toFixed(2))
    }`,
  ];
  return lines.join('\n');
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

export function logChannelStats(repo2channels: Repo2Channels): string {
  const channel2repos = invertRepoToChannels(repo2channels);
  const lines: string[] = [];
  lines.push(`Found ${Object.keys(channel2repos).length} channels`);
  for (const [channel, repos] of Object.entries(channel2repos)) {
    lines.push(` - ${channel}: ${repos.length}`);
  }
  return lines.join('\n');
}

async function scrape(
  branch: string = 'main',
  owner: string = 'jasp-stats-modules',
  repo: string = 'modules-registry',
  output: string = 'public/index.json',
) {
  const octokit = new MyOctokit({ auth: process.env.GITHUB_TOKEN });

  console.info('Fetching submodules from', `${owner}/${repo}`);
  const repoUrl = `https://github.com/${owner}/${repo}.git`;
  await ensureRegistry(repoUrl, branch);
  const repo2channels = await loadSubmodules();
  console.info(logChannelStats(repo2channels));
  console.info('Fetching release assets');
  const repositories = await releaseAssetsPaged(repo2channels, 10, octokit);

  console.info(logReleaseStatistics(repositories));

  const body = JSON.stringify(repositories, null, 2);
  await fs.writeFile(output, body);
  console.log('Wrote', output);
}

// Allow running as a script
if (import.meta.url === `file://${process.argv[1]}`) {
  const branch = process.argv[2] || 'main';
  const output = process.argv[3] || 'public/index.json';
  scrape(branch, 'jasp-stats-modules', 'modules-registry', output);
}
