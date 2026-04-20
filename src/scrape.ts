import fs from 'node:fs/promises';
import { join as pathJoin, resolve } from 'node:path';
import { Octokit } from '@octokit/core';
import { paginateGraphQL } from '@octokit/plugin-paginate-graphql';
import * as gettextParser from 'gettext-parser';
import matter from 'gray-matter';
import pLimit from 'p-limit';
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
const REGISTRY_DIR = resolve('registry');
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
        // using split expects the clone in jasp-stats-modules was not renamed
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
      '--no-recurse-submodules',
      '--branch',
      branch,
    ]);
  }

  // TODO make pulling faster by
  // 1. doing sparse checkout of inst/Description.qml and po/QML-*.po files only
  // 2. caching on GH workflow
  // 3. Writing submodules var somewhere and download it when creating public/index.json

  console.log('Pulling latest changes of registry');
  const git = gitInstance();
  await git.pull('origin', branch, {
    '--depth': '1',
    '--rebase': null,
    '--no-recurse-submodules': null,
    '--progress': null,
    '--jobs': '10',
  });

  console.log('Updating top-level registry submodules');
  await git.subModule(['update', '--init', '--depth', '1', '--jobs', '10']);

  console.log('Listing submodules in registry');
  const bareSubmodules = await extractBareSubmodules(REGISTRY_DIR);
  console.log('Extracting submodule information');
  const ungroupdedSubmodules =
    await nameAndDescriptionFromSubmodules(bareSubmodules);
  return groupByChannel(ungroupdedSubmodules);
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

/**
 * Parse the content of a .gitmodules file and return array of submodule entries
 */
function parseSubModulesFile(text: string): BareSubmodule[] {
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

async function nameAndDescriptionFromSubmodule(bare_submodule: BareSubmodule) {
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

export async function nameAndDescriptionFromSubmodules(
  bare_submodules: BareSubmodule[],
): Promise<Submodule[]> {
  return Promise.all(
    bare_submodules.map((bare_submodule) =>
      nameAndDescriptionFromSubmodule(bare_submodule),
    ),
  );
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

const ReleaseFrontMatter = v.object({
  jasp: v.optional(v.string()),
  name: v.optional(v.string()),
  description: v.optional(v.string()),
});
type ReleaseFrontMatter = v.InferOutput<typeof ReleaseFrontMatter>;

// TODO remove once all release descriptions fetched have valid yaml in frontmatter
function addQuotesInDescription(input: string): string {
  const regex = /^(.*?): (>.*)$/m;
  return input.replace(regex, (_, p1, p2) => `${p1}: "${p2}"`);
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

interface FetchAllReleasesForRepoOptions {
  firstReleases: number;
  firstAssets: number;
  octokit: InstanceType<typeof MyOctokit>;
  expectedArchitectures: ExpectedArchitectures;
}

interface ReleaseAssetsForRepoOptions {
  expectedArchitectures: ExpectedArchitectures;
  octokit: InstanceType<typeof MyOctokit>;
  firstReleases?: number;
  firstAssets?: number;
}

export interface ReleaseAssetsOptions extends ReleaseAssetsForRepoOptions {
  concurrency?: number;
}

function isGraphqlRequest(options: { method?: string; url?: string }): boolean {
  const method = options.method?.toUpperCase();
  const url = options.url;
  return (
    method === 'POST' && typeof url === 'string' && url.includes('/graphql')
  );
}

function formatRateLimitHeaderLog(
  headers: Record<string, string | number | undefined>,
): string | undefined {
  const rateLimitHeaders = Object.entries(headers)
    .filter(([key]) => key.toLowerCase().startsWith('x-ratelimit-'))
    .sort(([a], [b]) => a.localeCompare(b));

  if (rateLimitHeaders.length === 0) {
    return undefined;
  }

  return rateLimitHeaders
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(', ');
}

function _registerGraphqlRateLimitHeaderLogging(
  octokit: InstanceType<typeof MyOctokit>,
): void {
  octokit.hook.after('request', (response, options) => {
    if (!isGraphqlRequest(options)) {
      return;
    }

    const logLine = formatRateLimitHeaderLog(
      response.headers as Record<string, string | number | undefined>,
    );
    if (!logLine) {
      return;
    }

    console.info(`GraphQL rate limit headers: ${logLine}`);
  });
}

export function extractArchitectureFromUrl(
  url: string,
  expectedArchitectures: ExpectedArchitectures = EXPECTED_ARCHITECTURES,
): ExpectedArchitecture {
  // fallback to all archs when none are provided
  const architectures =
    expectedArchitectures.length === 0
      ? EXPECTED_ARCHITECTURES
      : expectedArchitectures;
  const filename = url.split('/').pop();
  if (!filename) throw new Error(`URL ${url} does not contain a filename`);
  for (const arch of architectures) {
    if (filename.includes(arch)) {
      return arch;
    }
  }
  if (filename.includes('MacOS_x86_64') || filename.includes('MacOS_x86-64')) {
    return 'MacOS_x86_64';
  }
  throw new Error(`Unknown architecture in filename: ${filename}`);
}

function detectPresentArchitectures(
  release: GqlRelease,
  expectedArchitectures: ExpectedArchitectures,
): Set<ExpectedArchitecture> {
  return new Set(
    release.releaseAssets.nodes
      .filter((asset) => asset.downloadUrl.endsWith('.JASPModule'))
      .map((asset) =>
        extractArchitectureFromUrl(asset.downloadUrl, expectedArchitectures),
      ),
  );
}

function checkAllArchitecturesCovered(
  releases: GqlRelease[],
  expectedArchitectures: ExpectedArchitectures,
): boolean {
  if (!releases) {
    // Can not fallback if no releases at all
    return false;
  }
  const architecturesFromAllReleases = new Set<string>();
  for (const release of releases) {
    const presentArchitectures = detectPresentArchitectures(
      release,
      expectedArchitectures,
    );
    for (const arch of presentArchitectures) {
      architecturesFromAllReleases.add(arch);
    }
    if (architecturesFromAllReleases.size === expectedArchitectures.length) {
      // Stop as soon as we have coverage for all architectures, no need to keep checking older releases
      return true;
    }
  }
  return architecturesFromAllReleases.size === expectedArchitectures.length;
}

export function shouldContinuePagination(
  allReleases: GqlRelease[],
  hasNextPage: boolean,
  expectedArchitectures: ExpectedArchitectures,
): boolean {
  if (!hasNextPage || allReleases.length === 0) {
    return false;
  }
  const releasesNonDraftAndWithSomeBinaryAssets = allReleases.filter(
    (release) =>
      !release.isDraft &&
      release.releaseAssets.nodes.some(
        (asset) => asset.downloadUrl.endsWith('.JASPModule'), // ignore source tarbal and zip
      ),
  );
  const stableReleases = releasesNonDraftAndWithSomeBinaryAssets.filter(
    (release) => !release.isPrerelease,
  );
  const preReleases = releasesNonDraftAndWithSomeBinaryAssets.filter(
    (release) => release.isPrerelease,
  );

  if (stableReleases.length === 0) {
    // Always get next page if no stable release in currently fetched pages.
    // Occurs when first page of releases only contains drafts or pre-releases.
    return true;
  }
  const stableCovered = checkAllArchitecturesCovered(
    stableReleases,
    expectedArchitectures,
  );
  if (stableCovered && preReleases.length === 0) {
    // Never get next page if there are stable releases and no pre-releases
    return false;
  }
  const preReleaseCovered = checkAllArchitecturesCovered(
    preReleases,
    expectedArchitectures,
  );

  // Stop as soon as both tracks have enough architecture coverage for their latest release.
  return !(stableCovered && preReleaseCovered);
}

async function fetchAllReleasesForRepo(
  nameWithOwner: string,
  options: FetchAllReleasesForRepoOptions,
): Promise<FetchedRepoReleases> {
  const { firstReleases, firstAssets, octokit, expectedArchitectures } =
    options;
  const [owner, repo] = nameWithOwner.split('/');
  const allReleases: GqlRelease[] = [];
  let hasNextPage = true;
  let endCursor: string | null = null;
  let parentNameWithOwner: string | undefined;
  let parentOwnerLogin: string | undefined;

  while (hasNextPage) {
    const query = `query RepoReleases(
      $owner: String!
      $repo: String!
      $firstReleases: Int!
      $firstAssets: Int!
      $after: String
    ) {
      repository(owner: $owner, name: $repo) {
        name
        parent {
          nameWithOwner
          owner {
            login
          }
        }
        releases(
          first: $firstReleases
          orderBy: { field: CREATED_AT, direction: DESC }
          after: $after
        ) {
          nodes {
            tagName
            publishedAt
            description
            isDraft
            isPrerelease
            releaseAssets(first: $firstAssets) {
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
    }`;

    const variables = {
      owner,
      repo,
      firstReleases,
      firstAssets,
      after: endCursor,
    };

    try {
      const result: GqlRepoReleasesResult =
        await octokit.graphql<GqlRepoReleasesResult>(query, variables);
      if (!result.repository) {
        const message = `Repository ${owner}/${repo} not found`;
        console.log(message);
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
      console.log(
        `Fetching more releases from ${owner}/${repo}, cursor ${endCursor}`,
      );
    } catch (error) {
      const message = `Error fetching releases for ${owner}/${repo}: ${error}`;
      console.error(message);
      break;
    }
  }

  return {
    parentNameWithOwner,
    parentOwnerLogin,
    releases: allReleases,
  };
}

export function selectReleasesForArchitectureCoverage(
  releases: Release[],
  expectedArchitectures: ExpectedArchitectures,
  moduleName?: string,
): Release[] {
  const selectedPerRange: Release[] = [];
  const missingArchitectures: Set<string> = new Set(expectedArchitectures);

  if (releases.length === 0) {
    console.warn(`No releases found for ${moduleName}. Skipping.`);
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
    console.warn(
      `Could not find assets for all architectures in releases for module ${moduleName}, will not be able to install/update on ${[...missingArchitectures].join(', ')}`,
    );
  }
  if (selectedPerRange.length === 0) {
    console.warn(
      `Could not find any set of releases that can be installed everywhere for ${moduleName} module, skipping`,
    );
  }
  if (missingArchitectures.size === 0 && selectedPerRange.length > 1) {
    console.warn(
      `Latest ${selectedPerRange[0].version} release from ${moduleName} does not have all architectures, falling back to older releases.`,
    );
  }
  return selectedPerRange;
}

export function latestReleasePerJaspVersionRange(
  releases: Release[],
  expectedArchitectures: ExpectedArchitectures,
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
  return newRelease;
}

async function releaseAssetsForRepo(
  bareRepo: BareRepository,
  options: ReleaseAssetsForRepoOptions,
): Promise<Repository | undefined> {
  const {
    expectedArchitectures,
    firstReleases = 20,
    firstAssets = 20,
    octokit,
  } = options;
  const nameWithOwner = bareRepo.releaseSource;

  try {
    const fetched = await fetchAllReleasesForRepo(nameWithOwner, {
      firstReleases,
      firstAssets,
      octokit,
      expectedArchitectures,
    });

    const allGqlReleases = fetched.releases;

    if (allGqlReleases.length === 0) {
      const message = `No releases found for ${nameWithOwner}. Skipping.`;
      console.log(message);
      return undefined;
    }

    // Separate into production and pre-releases (maintains order: newest first)
    const productionReleases = allGqlReleases
      .filter((r) => !r.isDraft && !r.isPrerelease)
      .map((r) => transformRelease(r, nameWithOwner));
    const preReleases = allGqlReleases
      .filter((r) => !r.isDraft && r.isPrerelease)
      .map((r) => transformRelease(r, nameWithOwner));

    const selectedProductionReleases = latestReleasePerJaspVersionRange(
      productionReleases,
      expectedArchitectures,
      nameWithOwner,
    );
    const selectedPreReleases = latestReleasePerJaspVersionRange(
      preReleases,
      expectedArchitectures,
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
    console.error(message);
    return undefined;
  }
}

export async function releaseAssets(
  repos: BareRepository[],
  options: ReleaseAssetsOptions,
): Promise<Repository[]> {
  const {
    expectedArchitectures,
    firstReleases = 20,
    firstAssets = 20,
    octokit,
    concurrency = 5,
  } = options;
  const finalResults: Repository[] = [];
  const limit = pLimit(concurrency);
  let dispatched = 0;

  await Promise.all(
    repos.map((bareRepo) =>
      limit(async () => {
        const index = ++dispatched;
        console.log(
          `Fetching releases for ${bareRepo.releaseSource} (${index} of ${repos.length})`,
        );
        const result = await releaseAssetsForRepo(bareRepo, {
          expectedArchitectures,
          firstReleases,
          firstAssets,
          octokit,
        });
        if (
          result &&
          (result.releases.length > 0 || result.preReleases.length > 0)
        ) {
          finalResults.push(result);
        } else {
          const message = `No valid releases found for ${bareRepo.releaseSource}. Skipping.`;
          console.warn(message);
        }
      }),
    ),
  );

  return finalResults.toSorted((a, b) => a.id.localeCompare(b.id, 'en'));
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
        : avgAssetsPerRelease.toFixed(2)
    }`,
  ];
  return lines.join('\n');
}

async function scrape(
  branch: string = 'main',
  owner: string = 'jasp-stats-modules',
  repo: string = 'modules-registry',
  output: string = 'public/index.json',
) {
  const octokit = new MyOctokit({ auth: process.env.GITHUB_TOKEN });
  // Uncomment line below to debug rate limits
  // registerGraphqlRateLimitHeaderLogging(octokit);

  const repoUrl = `https://github.com/${owner}/${repo}.git`;
  console.info('Fetching submodules from', `${repoUrl} (branch ${branch})`);
  const bareRepos = await pullAndScrapeRegistry(repoUrl, branch);
  console.log(logBareRepoStats(bareRepos));
  console.info('Fetching release assets');
  const repositories = await releaseAssets(bareRepos, {
    expectedArchitectures: EXPECTED_ARCHITECTURES,
    firstReleases: 20,
    firstAssets: 20,
    octokit,
  });

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
