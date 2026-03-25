import { filter, SyntaxError as LiqeSyntaxError, parse } from 'liqe';
import type { ReleaseStats } from './releaseStats';
import { totalDownloads } from './statsLine';

export interface Doc {
  id: string;
  name: string;
  description: string;
  maintainer: string;
  // date and downloads are optional
  // as module can have zero stable releases only beta releases
  date?: number;
  downloads?: number;
}

export interface SearchParseError {
  column: number;
}

export interface FilterOnDocsResult {
  hits: readonly Doc[];
  parseError?: SearchParseError;
}

export interface FilterReleaseStatsResult {
  releaseStats: ReleaseStats[];
  parseError?: SearchParseError;
}

function normalizeSearchParseError(
  error: unknown,
  searchTerm: string,
): SearchParseError | undefined {
  if (error instanceof LiqeSyntaxError) {
    return {
      column: error.column,
    };
  }
  if (error instanceof Error && error.message === 'Found no parsings.') {
    return {
      column: Math.max(searchTerm.length, 1),
    };
  }
  return undefined;
}

function releaseStatsToDoc(releaseStats: ReleaseStats): Doc {
  const latestStableRelase = releaseStats.repo.releases[0];
  let date: number | undefined;
  let downloads: number | undefined;
  if (latestStableRelase) {
    // 2026-02-28T09:52:00Z -> 20260228
    date = parseInt(
      latestStableRelase.publishedAt.slice(0, 10).replace(/-/g, ''),
      10,
    );
    downloads = totalDownloads(latestStableRelase);
  }
  return {
    id: releaseStats.repo.id,
    name: releaseStats.repo.name,
    description: releaseStats.repo.description,
    maintainer: releaseStats.repo.organization,
    date,
    downloads,
  };
}

export function releaseStatsToDocs(releaseStats: ReleaseStats[]): Doc[] {
  return releaseStats.map(releaseStatsToDoc);
}

function hits2filteredReleaseStats(
  hits: readonly Doc[],
  releaseStats: ReleaseStats[],
): ReleaseStats[] {
  const hitIds = new Set(hits.map((hit) => hit.id));
  return releaseStats.filter(({ repo }) => hitIds.has(repo.id));
}

export function filterOnDocs(
  searchTerm: string,
  docs: readonly Doc[],
): FilterOnDocsResult {
  if (!searchTerm.trim()) {
    return { hits: docs };
  }
  try {
    const q = parse(searchTerm);
    return { hits: filter(q, docs) };
  } catch (error) {
    const parseError = normalizeSearchParseError(error, searchTerm);
    if (parseError) {
      return {
        hits: docs,
        parseError,
      };
    }
    throw error;
  }
}

export function filterReleaseStats(
  docs: Doc[],
  releaseStats: ReleaseStats[],
  searchTerm: string,
): FilterReleaseStatsResult {
  const { hits, parseError } = filterOnDocs(searchTerm, docs);
  return {
    releaseStats: hits2filteredReleaseStats(hits, releaseStats),
    parseError,
  };
}
