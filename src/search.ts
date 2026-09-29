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
  searchTerm: string,
): ReleaseStats[] {
  const releaseStatsById = new Map(
    releaseStats.map((rs) => [rs.repo.id, rs] as const),
  );
  // Rank name and id matches above matches on other fields such as
  // description, so searching for example "regression" shows the module
  // named Regression before modules that only mention regression in their
  // description. Stable sort keeps the (alphabetical) catalog order as
  // tie-breaker.
  const rankedHits = hits
    .map((doc, index) => ({
      doc,
      index,
      rank: searchRelevance(doc, searchTerm),
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ doc }) => doc);
  return rankedHits
    .map((doc) => releaseStatsById.get(doc.id))
    .filter((rs): rs is ReleaseStats => rs !== undefined);
}

/**
 * Lower rank is more relevant. Field queries (e.g. `date:>20260101`) do not
 * match the raw search term and get the lowest relevance.
 */
function searchRelevance(doc: Doc, searchTerm: string): number {
  const term = searchTerm.trim().toLowerCase();
  if (!term) {
    return 0;
  }
  const name = doc.name.toLowerCase();
  const id = doc.id.toLowerCase();
  if (name === term || id === term) {
    return 0;
  }
  if (name.startsWith(term) || id.startsWith(term)) {
    return 1;
  }
  if (name.includes(term)) {
    return 2;
  }
  if (id.includes(term)) {
    return 3;
  }
  return 4;
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
    releaseStats: hits2filteredReleaseStats(hits, releaseStats, searchTerm),
    parseError,
  };
}
