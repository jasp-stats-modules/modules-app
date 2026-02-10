import fs from 'node:fs/promises';
import { join as pathJoin, resolve } from 'node:path';
import { Octokit } from '@octokit/core';
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql';
import chalk from 'chalk';
import dedent from 'dedent';
import * as gettextParser from 'gettext-parser';
import matter from 'gray-matter';
import ProgressBar from 'progress';
import { type SimpleGitProgressEvent, simpleGit } from 'simple-git';
import * as v from 'valibot';
import type {
  Asset,
  BareRepository,
  Lang,
  Release,
  Repository,
  Submodule,
  Translation,
  Translations,
} from './types';

// Directory where the modules-registry repo will be cloned/updated
export const REGISTRY_DIR = resolve('registry');
const MyOctokit = Octokit.plugin(paginateGraphQL);
const DEFAULT_REQUIRED_NUMBER_OF_ASSETS_PER_RELEASE = 4;

// Helper: get a simple-git instance pointing at the registry directory
function gitInstance() {
  const progress = ({ method, stage, progress }: SimpleGitProgressEvent) => {
    console.log(`git.${method} ${stage} stage ${progress}% complete`);
  };
  return simpleGit({ baseDir: REGISTRY_DIR, progress });
}

/**
 * Ensure the registry directory contains a shallow clone of the given repo at the requested branch.
 * If the directory does not exist, it will be cloned. If it exists, it will be fetched & fast‑forwarded.
 * Additionally, top‑level submodules defined in .gitmodules are initialised/updated shallowly.
 */
async function pullAndScrapeRegistry(
  repoUrl: string,
  branch: string,
): Promise<BareRepository[]> {
  const exists = await fs
    .access(REGISTRY_DIR)
    .then(() => true)
    .catch(() => false);

  if (exists) {
    const git = gitInstance();
    await git.fetch(['origin', branch, '--depth', '1']);
    await git.checkout(branch);
  } else {
    await simpleGit().clone(repoUrl, REGISTRY_DIR, [
      '--depth',
      '1',
      '--recurse-submodules',
      '--branch',
      branch,
    ]);
  }

  // TODO make pulling faster by
  // 1. doing sparse checkout of inst/Description.qml and po/QML-*.po files only
  // 2. caching on GH workflow
  // 3. Writing submodules var somewhere and download it when creating public/index.json

  console.log('Pulling latest changes of registry and its submodules');
  // Pull latest (fast‑forward only)
  const git = gitInstance();
  await git.pull('origin', branch, {
    '--depth': '1',
    '--ff-only': null,
    '--recurse-submodules': null,
    '--progress': null,
    '--jobs': '10',
  });

  console.log('Listing submodules in registry');
  const bareSubmodules = await extractBareSubmodules(REGISTRY_DIR);
  console.log('Extracting submodule information');
  const ungroupdedSubmodules =
    await nameAndDescriptionFromSubmodules(bareSubmodules);
  return groupByChannel(ungroupdedSubmodules);
}

/**
 * The same JASP module/submodule can be in multiple channels/directory.
 */
export function groupByChannel(submodules: Submodule[]): BareRepository[] {
  const repositories: BareRepository[] = [];
  for (const submodule of submodules) {
    const channel = path2channel(submodule.path);
    const nameWithOwner = url2nameWithOwner(submodule.gitUrl);
    const existingRepo = repositories.find((r) => r.id === nameWithOwner);
    if (existingRepo) {
      existingRepo.channels.push(channel);
    } else {
      repositories.push({
        // this expects the clone in jasp-stats-modules was note renamed
        id: nameWithOwner.split('/')[1],
        name: submodule.name,
        description: submodule.description,
        translations: submodule.translations,
        releaseSource: nameWithOwner,
        channels: [channel],
      });
    }
  }
  return repositories;
}

export function logBareRepoStats(submodules: BareRepository[]): string {
  const total = submodules.length;
  const translationCounts = submodules.map(
    (s) => Object.keys(s.translations).length,
  );
  const reduced = translationCounts.reduce((acc, count) => acc + count, 0);
  const avgTranslations = total > 0 ? reduced / total : 0;
  const lines = [
    `Found ${total} submodules`,
    `Average number of translations per submodule: ${avgTranslations}`,
  ];
  return lines.join('\n');
}

export async function extractBareSubmodules(registry_dir: string) {
  const gitmodulesPath = pathJoin(registry_dir, '.gitmodules');
  const gitmodulesContent = await fs.readFile(gitmodulesPath, 'utf8');

  const bare_submodules = parseSubModulesFile(gitmodulesContent);

  return bare_submodules.map((bare) => {
    return {
      path: pathJoin(registry_dir, bare.path),
      gitUrl: bare.gitUrl,
    };
  });
}

export async function nameAndDescriptionFromSubmodules(
  bare_submodules: BareSubmodule[],
): Promise<Submodule[]> {
  return Promise.all(
    bare_submodules.map((bare_submodule) =>
      nameAndDescriptionFromSubmodule(bare_submodule),
    ),
  );
}

export async function nameAndDescriptionFromSubmodule(
  bare_submodule: BareSubmodule,
) {
  const { path, gitUrl } = bare_submodule;
  const qmlDescriptionPath = pathJoin(path, 'inst', 'Description.qml');
  const qmlDescriptionContent = await fs.readFile(qmlDescriptionPath, 'utf8');
  const { title, description } = parseDescriptionQml(qmlDescriptionContent);

  const translations = await extractTranslationsFromPoFiles(
    path,
    title,
    description,
  );

  const submoduleDetails: Submodule = {
    gitUrl,
    path,
    name: title,
    description,
    translations,
  };
  return submoduleDetails;
}

export function url2nameWithOwner(url: string): string {
  // For example
  // "https://github.com/jasp-stats-modules/jaspBain.git" -> "jasp-stats-modules/jaspBain"
  const match = url.match(/github\.com\/([^/]+\/[^/]+)\.git/);
  if (!match) throw new Error(`Invalid GitHub URL: ${url}`);
  return match[1];
}

export function path2channel(path: string): string {
  // For example
  // ".../Official/jaspAnova" -> "Official"
  return path.split('/').reverse()[1];
}

interface BareSubmodule {
  gitUrl: string;
  path: string;
}

/**
 * Parse the content of a .gitmodules file and return array of submodule entries
 */
export function parseSubModulesFile(text: string): BareSubmodule[] {
  const result: BareSubmodule[] = [];

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
  title: string;
  description: string;
} {
  const titleMatch = /title\s*:\s*[^q]*?qsTr\("([^"]+)"\)/s.exec(content);
  const descriptionMatch = /description\s*:\s*[^q]*?qsTr\("([^"]+)"\)/s.exec(
    content,
  );
  if (!titleMatch || !descriptionMatch) {
    throw new Error(
      'Failed to parse name and description from Description.qml content',
    );
  }
  return {
    title: titleMatch[1],
    description: descriptionMatch[1],
  };
}

async function extractNameAndDescriptionFromPoFile(
  poPath: string,
  title: string,
  description: string,
  context: string = 'Description|',
): Promise<[Lang, Translation] | undefined> {
  const match = poPath.match(/QML-([a-z]{2})\.po$/i);
  if (!match) return undefined;
  const lang = match[1];
  try {
    const raw = await fs.readFile(poPath);
    const parsed = gettextParser.po.parse(raw);
    const nameTrans = parsed.translations[context]?.[title]?.msgstr?.[0];
    const descTrans = parsed.translations[context]?.[description]?.msgstr?.[0];
    if (!(nameTrans && descTrans)) {
      // TODO use log package to only log with --verbose flag, otherwise keep it silent
      // console.debug(`Missing translation for "${title}" and/or "${description}" in ${poPath} with context "${context}". Skipping this translation.`);
      return undefined;
    }
    return [lang, { name: nameTrans, description: descTrans }];
  } catch (e) {
    // If parsing fails, skip this file
    console.warn(`Failed to parse PO file ${poPath}:`, e);
  }
  return undefined;
}

export async function extractTranslationsFromPoFiles(
  repoDir: string,
  title: string,
  description: string,
): Promise<Translations> {
  const poDir = pathJoin(repoDir, 'po');
  let poFiles: string[] = [];
  try {
    poFiles = await fs.readdir(poDir);
  } catch (_e) {
    // No po directory – keep translations empty
    return {};
  }
  const translationEntries = await Promise.all(
    poFiles.map((poFile) => {
      const poPath = pathJoin(poDir, poFile);
      return extractNameAndDescriptionFromPoFile(poPath, title, description);
    }),
  );
  return Object.fromEntries(
    translationEntries.filter((entry) => entry !== undefined),
  );
}

export function batchedArray<T>(array: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size));
  }
  return batches;
}

export async function releaseAssetsPaged(
  submodules: BareRepository[],
  requiredNrAssets: number = DEFAULT_REQUIRED_NUMBER_OF_ASSETS_PER_RELEASE,
  pageSize = 10,
  octokit: InstanceType<typeof MyOctokit>,
): Promise<Repository[]> {
  const batches = batchedArray(submodules, pageSize);
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
    const batchResults = await releaseAssets(
      batch,
      requiredNrAssets,
      20,
      20,
      octokit,
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

export function latestReleasePerJaspVersionRange(
  releases: GqlRelease[],
  requiredNrAssets: number,
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
    const nrOfModuleAssets = release.releaseAssets.nodes.filter((asset) =>
      asset.downloadUrl.endsWith('.JASPModule'),
    ).length;
    if (nrOfModuleAssets < requiredNrAssets) {
      // TODO use log package to only log with --verbose flag, otherwise keep it silent
      // console.debug(
      //   `Release ${release.tagName} does not have ${requiredNrAssets} or more assets, it has ${nrOfModuleAssets} . Skipping.`,
      // );
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
  repos: BareRepository[],
  requiredNrAssets: number,
  firstReleases = 20,
  firstAssets = 20,
  octokit: InstanceType<typeof MyOctokit>,
): Promise<Repository[]> {
  const allRepos = Array.from(repos);
  const CHUNK_SIZE = 3;
  const finalResults: Repository[] = [];

  // Loop through repositories in chunks
  for (let i = 0; i < allRepos.length; i += CHUNK_SIZE) {
    const chunk = allRepos.slice(i, i + CHUNK_SIZE);

    const queries = chunk
      .map((submodule, index) => {
        const nameWithOwner = submodule.releaseSource;
        const [owner, repo] = nameWithOwner.split('/');
        return dedent`
        repo${index}: repository(owner: "${owner}", name: "${repo}") {
          name,
          nameWithOwner
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
      const processedChunk: Repository[] = [];
      // Process each repo individually to allow async name extraction
      for (const rawRepo of Object.values(result)) {
        // Filter out nulls (if a repo wasn't found)
        if (rawRepo === null) continue;
        const repo = rawRepo;
        if (repo.releases.nodes.length === 0) {
          console.log(`No releases found for ${repo.nameWithOwner}. Skipping.`);
          continue;
        }
        const { nameWithOwner, parent, releases, homepageUrl } = repo;
        const bareRepo = chunk.find((s) => s.releaseSource === nameWithOwner);
        if (!bareRepo) {
          throw new Error(
            `Received data for repo ${repo.nameWithOwner} which was not in the original query batch`,
          );
        }

        const productionReleases = releases.nodes.filter(
          (r) => !r.isDraft && !r.isPrerelease,
        );
        const preReleases = releases.nodes.filter(
          (r) => !r.isDraft && r.isPrerelease,
        );
        const newReleases = latestReleasePerJaspVersionRange(
          productionReleases,
          requiredNrAssets,
        ).map((r) => transformRelease(r, nameWithOwner));
        const newPreReleases = latestReleasePerJaspVersionRange(
          preReleases,
          requiredNrAssets,
        ).map((r) => transformRelease(r, nameWithOwner));

        const newRepo: Repository = {
          ...bareRepo,
          releases: newReleases.map(([release, _]) => release),
          preReleases: newPreReleases.map(([release, _]) => release),
          organization: parent?.owner.login ?? 'unknown_org',
        };
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

  const repoUrl = `https://github.com/${owner}/${repo}.git`;
  console.info('Fetching submodules from', `${repoUrl} (branch ${branch})`);
  const bareRepos = await pullAndScrapeRegistry(repoUrl, branch);
  console.log(logBareRepoStats(bareRepos));
  console.info('Fetching release assets');
  const repositories = await releaseAssetsPaged(
    bareRepos,
    DEFAULT_REQUIRED_NUMBER_OF_ASSETS_PER_RELEASE,
    10,
    octokit,
  );

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
