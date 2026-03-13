import fs from 'node:fs/promises';
import { join as pathJoin, resolve } from 'node:path';
import { Octokit } from '@octokit/core';
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql';
import chalk from 'chalk';
import dedent from 'dedent';
import * as gettextParser from 'gettext-parser';
import matter from 'gray-matter';
import ProgressBar from 'progress';
import sharp from 'sharp';
import { type SimpleGitProgressEvent, simpleGit } from 'simple-git';
import { optimize } from 'svgo';
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
const MAX_PNG_ICON_DIMENSION = 96;
export const EXPECTED_ARCHITECTURES = [
  'Windows_x86-64',
  'MacOS_x86_64',
  'MacOS_arm64',
  'Flatpak_x86_64',
] as const;
type ExpectedArchitecture = (typeof EXPECTED_ARCHITECTURES)[number];
export type ExpectedArchitectures = Readonly<Array<ExpectedArchitecture>>;

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
  const git = gitInstance();
  await git.pull('origin', branch, {
    '--depth': '1',
    '--rebase': null,
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
    const existingRepo = repositories.find(
      (r) => r.releaseSource === nameWithOwner,
    );
    if (existingRepo) {
      existingRepo.channels.push(channel);
    } else {
      repositories.push({
        // this expects the clone in jasp-stats-modules was note renamed
        id: nameWithOwner.split('/')[1],
        name: submodule.name,
        description: submodule.description,
        translations: submodule.translations,
        homepageUrl: submodule.homepageUrl,
        iconUrl: submodule.iconUrl,
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
  const descriptionFilePath = pathJoin(path, 'DESCRIPTION');
  const [qmlDescriptionContent, descriptionFileContent] = await Promise.all([
    fs.readFile(qmlDescriptionPath, 'utf8'),
    fs.readFile(descriptionFilePath, 'utf8'),
  ]);
  const { title, description, icon } = parseDescriptionQml(
    qmlDescriptionContent,
  );
  const website = parseDescriptionFile(descriptionFileContent).Website;
  const homepageUrl = resolveHomepageUrl(website);
  const [iconUrl, translations] = await Promise.all([
    resolveModuleIconDataUrl(path, icon),
    extractTranslationsFromPoFiles(path, title, description),
  ]);

  const submoduleDetails: Submodule = {
    gitUrl,
    path,
    name: title,
    description,
    homepageUrl,
    iconUrl,
    translations,
  };
  return submoduleDetails;
}
/**
 * Parse R DESCRIPTION file content and return an object with key‑value pairs.
 * It is in a Debian Control Format.
 * @param descriptionContent
 * @returns
 */
export function parseDescriptionFile(
  descriptionContent: string,
): Record<string, string | undefined> {
  const parsed: Record<string, string> = {};
  let currentKey: string | undefined;

  const lines = descriptionContent.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line) {
      currentKey = undefined;
      continue;
    }

    if (/^\s/.test(line)) {
      if (currentKey) {
        parsed[currentKey] = parsed[currentKey]
          ? `${parsed[currentKey]} ${line.trim()}`
          : line.trim();
      }
      continue;
    }

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      currentKey = undefined;
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key) {
      currentKey = undefined;
      continue;
    }

    parsed[key] = value;
    currentKey = key;
  }

  return parsed;
}

function normalizeWebsiteUrl(rawWebsite: string): string | undefined {
  const trimmedWebsite = rawWebsite.trim();
  if (!trimmedWebsite) {
    return undefined;
  }

  const withScheme = /^https?:\/\//i.test(trimmedWebsite)
    ? trimmedWebsite
    : `https://${trimmedWebsite}`;

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }
    if (parsed.pathname.endsWith('.git')) {
      parsed.pathname = parsed.pathname.slice(0, -4);
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function isPlaceholderWebsite(urlString: string): boolean {
  try {
    const hostname = new URL(urlString).hostname.toLowerCase();
    return (
      hostname === 'jasp-stats.org' || hostname.endsWith('.jasp-stats.org')
    );
  } catch {
    return false;
  }
}

function githubRepoUrl(nameWithOwner: string): string {
  return `https://github.com/${nameWithOwner}`;
}

function iconFileName2mimeType(iconFileName: string): string | undefined {
  const lowerCaseIconFileName = iconFileName.toLowerCase();
  if (lowerCaseIconFileName.endsWith('.svg')) {
    return 'image/svg+xml';
  }
  if (lowerCaseIconFileName.endsWith('.png')) {
    return 'image/png';
  }
  return undefined;
}

function optimizeSvgForDataUrl(svgContent: string): string {
  try {
    const optimizedSvg = optimize(svgContent, {
      multipass: true,
      js2svg: {
        pretty: false,
      },
      plugins: [
        {
          name: 'preset-default',
        },
        {
          name: 'removeEditorsNSData',
        },
        {
          name: 'removeMetadata',
        },
        {
          name: 'cleanupNumericValues',
          params: {
            floatPrecision: 1,
          },
        },
        {
          name: 'convertPathData',
          params: {
            floatPrecision: 1,
            transformPrecision: 1,
          },
        },
        {
          name: 'convertTransform',
          params: {
            floatPrecision: 1,
          },
        },
        {
          name: 'mergePaths',
          params: {
            force: true,
          },
        },
        {
          name: 'sortAttrs',
        },
        {
          name: 'sortDefsChildren',
        },
      ],
    });
    return optimizedSvg.data;
  } catch (e) {
    console.warn('Failed to optimize SVG, using original version. Error:', e);
    return svgContent;
  }
}

function svgToDataUrl(svgContent: string): string {
  const optimizedSvg = optimizeSvgForDataUrl(svgContent);
  return `data:image/svg+xml,${encodeURIComponent(optimizedSvg)}`;
}

function embeddedPngDataUrlFromSvg(svgContent: string): string | undefined {
  const embeddedPngMatch =
    /(?:xlink:)?href\s*=\s*["'](data:image\/png;base64,[^"']+)["']/i.exec(
      svgContent,
    );
  if (!embeddedPngMatch?.[1]) {
    return undefined;
  }
  return embeddedPngMatch[1];
}

async function extractEmbeddedPngFromSvg(
  svgContent: string,
): Promise<Buffer | undefined> {
  const embeddedPngDataUrl = embeddedPngDataUrlFromSvg(svgContent);
  if (!embeddedPngDataUrl) {
    return undefined;
  }

  const base64Prefix = 'data:image/png;base64,';
  const base64Content = embeddedPngDataUrl
    .slice(base64Prefix.length)
    .replace(/\s+/g, '');
  if (!base64Content) {
    return undefined;
  }

  try {
    const pngContent = Buffer.from(base64Content, 'base64');
    if (pngContent.length === 0) {
      return undefined;
    }
    const pngMetadata = await sharp(pngContent).metadata();
    if (pngMetadata.format !== 'png') {
      return undefined;
    }
    return pngContent;
  } catch {
    return undefined;
  }
}

async function optimizePngForDataUrl(pngContent: Buffer): Promise<Buffer> {
  try {
    return await sharp(pngContent)
      .resize({
        width: MAX_PNG_ICON_DIMENSION,
        height: MAX_PNG_ICON_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png({
        palette: true,
        compressionLevel: 9,
        quality: 85,
        effort: 10,
      })
      .toBuffer();
  } catch (e) {
    console.warn('Failed to optimize PNG, using original version. Error:', e);
    return pngContent;
  }
}

function pngToDataUrl(pngContent: Buffer): string {
  return `data:image/png;base64,${pngContent.toString('base64')}`;
}

async function resolveModuleIconDataUrl(
  repoPath: string,
  icon: string | undefined,
): Promise<string | undefined> {
  const iconFileName = await resolveModuleIconFileName(repoPath, icon);
  if (!iconFileName) {
    return undefined;
  }

  const mimeType = iconFileName2mimeType(iconFileName);
  if (!mimeType) {
    return undefined;
  }

  const iconPath = pathJoin(repoPath, 'inst', 'icons', iconFileName);
  try {
    if (mimeType === 'image/svg+xml') {
      const svgContent = await fs.readFile(iconPath, 'utf8');
      const embeddedPngContent = await extractEmbeddedPngFromSvg(svgContent);
      if (embeddedPngContent) {
        const optimizedPngContent =
          await optimizePngForDataUrl(embeddedPngContent);
        return pngToDataUrl(optimizedPngContent);
      }
      return svgToDataUrl(svgContent);
    }
    const pngContent = await fs.readFile(iconPath);
    const optimizedPngContent = await optimizePngForDataUrl(pngContent);
    return pngToDataUrl(optimizedPngContent);
  } catch (e) {
    console.log(
      `Failed to read or process icon file at ${iconPath}. Skipping icon. Error: ${e}`,
    );
    return undefined;
  }
}

async function resolveModuleIconFileName(
  repoPath: string,
  icon: string | undefined,
): Promise<string | undefined> {
  if (!icon) {
    return undefined;
  }
  const iconsDir = pathJoin(repoPath, 'inst', 'icons');
  const exactIconPath = pathJoin(iconsDir, icon);
  const hasExactIcon = await fs
    .access(exactIconPath)
    .then(() => true)
    .catch(() => false);
  if (hasExactIcon) {
    return icon;
  }

  // Handle icon === "bain-module" case -> bain-module.svg
  let iconFiles: string[] = [];
  try {
    iconFiles = await fs.readdir(iconsDir);
  } catch {
    return undefined;
  }

  const matchingFiles = iconFiles
    .filter((fileName) => fileName.startsWith(`${icon}.`))
    .sort();

  return matchingFiles[0];
}

export function resolveHomepageUrl(
  website: string | undefined,
): string | undefined {
  if (!website) {
    return undefined;
  }

  const normalizedWebsite = normalizeWebsiteUrl(website);
  if (!normalizedWebsite) {
    return undefined;
  }
  if (isPlaceholderWebsite(normalizedWebsite)) {
    return undefined;
  }
  return normalizedWebsite;
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
  if (!path.includes('/')) {
    throw new Error(`Invalid path: ${path}`);
  }
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
 */
export function parseDescriptionQml(content: string): {
  title: string;
  description: string;
  icon?: string;
} {
  const titleMatch = /title\s*:\s*[^q]*?qsTr\("([^"]+)"\)/s.exec(content);
  const descriptionMatch = /description\s*:\s*[^q]*?qsTr\("([^"]+)"\)/s.exec(
    content,
  );
  const icon = parseTopLevelDescriptionIcon(content);
  if (!titleMatch || !descriptionMatch) {
    throw new Error(
      'Failed to parse name and description from Description.qml content',
    );
  }
  return {
    title: titleMatch[1],
    description: descriptionMatch[1],
    icon,
  };
}

function parseTopLevelDescriptionIcon(content: string): string | undefined {
  const lines = content.split(/\r?\n/);
  let sawDescription = false;
  let inDescriptionBlock = false;
  let depth = 0;

  for (const line of lines) {
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    if (!inDescriptionBlock) {
      if (!sawDescription && /\bDescription\b/.test(line)) {
        sawDescription = true;
      }
      if (sawDescription && openBraces > 0) {
        inDescriptionBlock = true;
        depth = openBraces - closeBraces;
      }
      continue;
    }

    if (depth === 1) {
      const iconMatch = /^\s*icon\s*:\s*"([^"]+)"/.exec(line);
      if (iconMatch?.[1]) {
        return iconMatch[1].trim();
      }
    }

    depth += openBraces - closeBraces;
    if (depth <= 0) {
      return undefined;
    }
  }

  return undefined;
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

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface GqlReleasesPage {
  nodes: GqlRelease[];
  pageInfo: PageInfo;
}

interface GqlRepoReleasesResult {
  repository: {
    name: string;
    nameWithOwner: string;
    parent?: {
      nameWithOwner: string;
      owner: {
        login: string;
      };
    };
    releases?: GqlReleasesPage;
  } | null;
}

interface FetchedRepoReleases {
  parentNameWithOwner?: string;
  parentOwnerLogin?: string;
  releases: GqlRelease[];
}

/**
 * Log a message either via progress bar interrupt (if available) or fallback console method.
 * This ensures messages don't disrupt the progress bar rendering.
 */
function logWithBar(
  message: string,
  bar: InstanceType<typeof ProgressBar> | undefined,
  logFn: (msg: string) => void,
): void {
  if (bar) {
    bar.interrupt(message);
  } else {
    logFn(message);
  }
}

function latestReleaseNeedsFallback(
  releases: GqlRelease[],
  expectedArchitectures: ExpectedArchitectures,
): boolean {
  if (releases.length === 0) {
    return false;
  }

  const latestWithSomeAssets = releases.find((release) => {
    const nrOfModuleAssets = release.releaseAssets.nodes.filter((asset) =>
      asset.downloadUrl.endsWith('.JASPModule'),
    ).length;
    return nrOfModuleAssets > 0;
  });

  if (!latestWithSomeAssets) {
    return true;
  }

  return (
    detectMissingArchitecturesInGqlRelease(
      latestWithSomeAssets,
      expectedArchitectures,
    ).length > 0
  );
}

function hasFallbackCoverage(
  releases: GqlRelease[],
  expectedArchitectures: ExpectedArchitectures,
): boolean {
  const latestWithSomeAssets = releases.find((release) => {
    const nrOfModuleAssets = release.releaseAssets.nodes.filter((asset) =>
      asset.downloadUrl.endsWith('.JASPModule'),
    ).length;
    return nrOfModuleAssets > 0;
  });

  if (!latestWithSomeAssets) {
    return false;
  }

  const missingArchitectures = detectMissingArchitecturesInGqlRelease(
    latestWithSomeAssets,
    expectedArchitectures,
  );

  if (missingArchitectures.length === 0) {
    return true;
  }

  return missingArchitectures.every((architecture) =>
    releases.some((release) =>
      release.releaseAssets.nodes.some(
        (asset) =>
          extractArchitectureFromUrl(asset.downloadUrl) === architecture,
      ),
    ),
  );
}

export function shouldContinuePagination(
  allReleases: GqlRelease[],
  hasNextPage: boolean,
  expectedArchitectures: ExpectedArchitectures,
): boolean {
  if (!hasNextPage) {
    return false;
  }

  const productionReleases = allReleases.filter(
    (release) => !release.isDraft && !release.isPrerelease,
  );
  const preReleases = allReleases.filter(
    (release) => !release.isDraft && release.isPrerelease,
  );

  const productionNeedsFallback = latestReleaseNeedsFallback(
    productionReleases,
    expectedArchitectures,
  );
  const preReleaseNeedsFallback = latestReleaseNeedsFallback(
    preReleases,
    expectedArchitectures,
  );

  const productionCovered =
    !productionNeedsFallback ||
    hasFallbackCoverage(productionReleases, expectedArchitectures);
  const preReleaseCovered =
    !preReleaseNeedsFallback ||
    hasFallbackCoverage(preReleases, expectedArchitectures);

  // Stop as soon as both tracks have enough architecture coverage for their latest release.
  return !(productionCovered && preReleaseCovered);
}

async function fetchAllReleasesForRepo(
  nameWithOwner: string,
  firstReleases: number,
  firstAssets: number,
  octokit: InstanceType<typeof MyOctokit>,
  expectedArchitectures: ExpectedArchitectures,
  bar?: InstanceType<typeof ProgressBar>,
): Promise<FetchedRepoReleases> {
  const [owner, repo] = nameWithOwner.split('/');
  const allReleases: GqlRelease[] = [];
  let hasNextPage = true;
  let endCursor: string | null = null;
  let parentNameWithOwner: string | undefined;
  let parentOwnerLogin: string | undefined;

  while (hasNextPage) {
    const afterClause: string = endCursor ? `, after: "${endCursor}"` : '';
    const query: string = dedent`
      query {
        repository(owner: "${owner}", name: "${repo}") {
          name
          parent {
            nameWithOwner
            owner {
              login
            }
          }
          releases(first: ${firstReleases}, orderBy: { field: CREATED_AT, direction: DESC }${afterClause}) {
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
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `;

    try {
      const result: GqlRepoReleasesResult =
        await octokit.graphql<GqlRepoReleasesResult>(query);
      if (!result.repository) {
        const message = `Repository ${owner}/${repo} not found`;
        logWithBar(message, bar, console.log);
        break;
      }

      parentNameWithOwner = result.repository.parent?.nameWithOwner;
      parentOwnerLogin = result.repository.parent?.owner?.login;

      const releaseNodes = result.repository.releases?.nodes ?? [];
      allReleases.push(...releaseNodes);

      const pageInfo = result.repository.releases?.pageInfo;
      hasNextPage = pageInfo?.hasNextPage ?? false;
      endCursor = pageInfo?.endCursor ?? null;

      if (
        !shouldContinuePagination(
          allReleases,
          hasNextPage,
          expectedArchitectures,
        )
      ) {
        break;
      }
    } catch (error) {
      const message = `Error fetching releases for ${owner}/${repo}: ${error}`;
      logWithBar(message, bar, console.error);
      break;
    }
  }

  return {
    parentNameWithOwner,
    parentOwnerLogin,
    releases: allReleases,
  };
}

export function detectMissingArchitecturesInGqlRelease(
  release: GqlRelease,
  expectedArchitectures: ExpectedArchitectures,
): string[] {
  const presentArchitectures = new Set(
    release.releaseAssets.nodes.map((asset) =>
      extractArchitectureFromUrl(asset.downloadUrl),
    ),
  );
  return expectedArchitectures.filter(
    (arch) => !presentArchitectures.has(arch),
  );
}

/**
 * Detects which expected architectures are missing from a release.
 */
export function detectMissingArchitecturesinRelease(
  release: Release,
  expectedArchitectures: ExpectedArchitectures,
): ExpectedArchitectures {
  const presentArchitectures = new Set(
    release.assets.map((asset) => asset.architecture),
  );
  return expectedArchitectures.filter(
    (arch) => !presentArchitectures.has(arch),
  );
}

/**
 * Finds the oldest release (earliest published) in the same JASP version range
 * that contains a specific architecture.
 */
export function findOlderReleaseWithArchitecture(
  jaspVersionRange: string | undefined,
  architecture: string,
  allReleases: Release[],
): Release | undefined {
  // Filter releases to same JASP version range
  const sameVersionRangeReleases = allReleases.filter(
    (r) => r.jaspVersionRange === jaspVersionRange,
  );

  // Find releases that have this architecture
  return sameVersionRangeReleases.find((release) =>
    release.assets.some((asset) => asset.architecture === architecture),
  );
}

export function selectReleasesForArchitectureCoverage(
  releases: Release[],
  expectedArchitectures: ExpectedArchitectures,
  bar?: InstanceType<typeof ProgressBar>,
  moduleName?: string,
): Release[] {
  const selectedPerRange: Release[] = [];
  const missingArchitectures: Set<string> = new Set(expectedArchitectures);

  if (releases.length === 0) {
    logWithBar(
      `No releases found for ${moduleName}. Skipping.`,
      bar,
      console.warn,
    );
    return [];
  }

  for (const release of releases) {
    const contributes = release.assets.some((asset) =>
      missingArchitectures.has(asset.architecture),
    );

    if (!contributes) {
      continue;
    }

    selectedPerRange.push({
      ...release,
      assets: release.assets.filter((asset) =>
        missingArchitectures.has(asset.architecture),
      ),
    });

    for (const asset of release.assets) {
      missingArchitectures.delete(asset.architecture);
    }

    if (missingArchitectures.size === 0) {
      break;
    }
  }
  if (missingArchitectures.size > 0 && selectedPerRange.length > 0) {
    logWithBar(
      `Could not find assets for all architectures in releases for module ${moduleName}, will not be able to install/update on ${[...missingArchitectures].join(', ')}`,
      bar,
      console.warn,
    );
  }
  if (selectedPerRange.length === 0) {
    logWithBar(
      `Could not find any set of releases that can be installed everywhere for ${moduleName} module, skipping`,
      bar,
      console.warn,
    );
  }
  if (missingArchitectures.size === 0 && selectedPerRange.length > 1) {
    logWithBar(
      `Latest ${selectedPerRange[0].version} release from ${moduleName} does not have all architectures, falling back to older releases.`,
      bar,
      console.warn,
    );
  }
  return selectedPerRange;
}

export function latestReleasePerJaspVersionRange(
  releases: Release[],
  expectedArchitectures: ExpectedArchitectures,
  bar?: InstanceType<typeof ProgressBar>,
  moduleName?: string,
): Release[] {
  const releasesByRange = new Map<string, Release[]>();

  for (const release of releases) {
    if (!release.jaspVersionRange) {
      continue;
    }
    const jaspVersionRange = release.jaspVersionRange;

    const existing = releasesByRange.get(jaspVersionRange) ?? [];
    existing.push(release);
    releasesByRange.set(jaspVersionRange, existing);
  }

  const selected: Release[] = [];
  for (const releasesForRange of releasesByRange.values()) {
    const selectedPerRange = selectReleasesForArchitectureCoverage(
      releasesForRange,
      expectedArchitectures,
      bar,
      moduleName,
    );
    selected.push(...selectedPerRange);
  }

  return selected;
}

export function versionFromTagName(tagName: string): string {
  // Expects the tagName to be in following format `<version>_<last-commit-of-tag>_R-<r-version-seperated-by-minus>`
  // For example for `0.95.0_2cbd8a6d_R-4-5-1_Release` the version is `0.95.0`
  return tagName.slice(0, tagName.indexOf('_'));
}

export function transformRelease(
  release: GqlRelease,
  nameWithOwner: string,
  bar?: InstanceType<typeof ProgressBar>,
): Release {
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
    logWithBar(
      `Malformed description for ${nameWithOwner}. Falling back to default JASP version range: ${jaspVersionRange}`,
      bar,
      console.warn,
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
  return newRelease;
}

async function releaseAssetsForRepo(
  bareRepo: BareRepository,
  expectedArchitectures: ExpectedArchitectures,
  firstReleases = 20,
  firstAssets = 20,
  octokit: InstanceType<typeof MyOctokit>,
  bar?: InstanceType<typeof ProgressBar>,
): Promise<Repository | undefined> {
  const nameWithOwner = bareRepo.releaseSource;

  try {
    const fetched = await fetchAllReleasesForRepo(
      nameWithOwner,
      firstReleases,
      firstAssets,
      octokit,
      expectedArchitectures,
      bar,
    );

    const allGqlReleases = fetched.releases;

    if (allGqlReleases.length === 0) {
      const message = `No releases found for ${nameWithOwner}. Skipping.`;
      logWithBar(message, bar, console.log);
      return undefined;
    }

    // Separate into production and pre-releases (maintains order: newest first)
    const productionReleases = allGqlReleases
      .filter((r) => !r.isDraft && !r.isPrerelease)
      .map((r) => transformRelease(r, nameWithOwner, bar));
    const preReleases = allGqlReleases
      .filter((r) => !r.isDraft && r.isPrerelease)
      .map((r) => transformRelease(r, nameWithOwner, bar));

    const selectedProductionReleases = latestReleasePerJaspVersionRange(
      productionReleases,
      expectedArchitectures,
      bar,
      nameWithOwner,
    );
    const selectedPreReleases = latestReleasePerJaspVersionRange(
      preReleases,
      expectedArchitectures,
      bar,
      nameWithOwner,
    );

    const homepageFallback = fetched.parentNameWithOwner
      ? githubRepoUrl(fetched.parentNameWithOwner)
      : githubRepoUrl(nameWithOwner);

    const organization = fetched.parentOwnerLogin ?? 'unknown_org';

    const newRepo: Repository = {
      ...bareRepo,
      homepageUrl: bareRepo.homepageUrl ?? homepageFallback,
      releases: selectedProductionReleases,
      preReleases: selectedPreReleases,
      organization,
    };
    if (newRepo.releases.length > 0 || newRepo.preReleases.length > 0) {
      return newRepo;
    }
    return undefined;
  } catch (error) {
    const message = `Error processing releases for ${nameWithOwner}: ${error}`;
    logWithBar(message, bar, console.error);
    return undefined;
  }
}

export async function releaseAssets(
  repos: BareRepository[],
  expectedArchitectures: ExpectedArchitectures,
  firstReleases = 20,
  firstAssets = 20,
  octokit: InstanceType<typeof MyOctokit>,
): Promise<Repository[]> {
  const finalResults: Repository[] = [];

  const totalRepos = repos.length;
  // Only create progress bar if stdout is a TTY (not in tests or CI)
  const bar = process.stdout.isTTY
    ? new ProgressBar(
        `${chalk.cyan('Progress:')} [:bar] :current/:total repositories :etas`,
        {
          total: totalRepos,
          width: 20,
          complete: chalk.green('█'),
          incomplete: chalk.gray('░'),
        },
      )
    : undefined;

  for (const bareRepo of repos) {
    const result = await releaseAssetsForRepo(
      bareRepo,
      expectedArchitectures,
      firstReleases,
      firstAssets,
      octokit,
      bar,
    );
    if (
      result &&
      (result.releases.length > 0 || result.preReleases.length > 0)
    ) {
      finalResults.push(result);
    } else {
      const message = `No valid releases found for ${bareRepo.releaseSource}. Skipping.`;
      logWithBar(message, bar, console.warn);
    }
    bar?.tick();
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
  const repositories = await releaseAssets(
    bareRepos,
    EXPECTED_ARCHITECTURES,
    20,
    20,
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
