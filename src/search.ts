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

function releaseStatsToDocs(releaseStats: ReleaseStats[]): Doc[] {
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
): readonly Doc[] {
  if (!searchTerm) {
    return docs;
  }
  try {
    const q = parse(searchTerm);
    return filter(q, docs);
  } catch (error) {
    if (error instanceof LiqeSyntaxError) {
      console.error(
        `Invalid search term: ${searchTerm}. ${error.message}`,
      );
    } else {
      throw error;
    }
    return [];
  }
}

export function filterReleaseStatsBySearchTerm(
  releaseStats: ReleaseStats[],
  searchTerm: string,
): ReleaseStats[] {
  const docs = releaseStatsToDocs(releaseStats);
  const hits = filterOnDocs(searchTerm, docs);
  return hits2filteredReleaseStats(hits, releaseStats);
}
