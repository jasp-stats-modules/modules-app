import { filter, parse } from 'liqe';
import type { ReleaseStats } from './releaseStats';

export interface Doc {
  id: string;
  name: string;
  description: string;
  // TODO add latest stable release date
  // TODO add latest stable release download count
  // TODO add maintainer aka repo.organization
}

function releaseStatsToDoc(releaseStats: ReleaseStats): Doc {
  return {
    id: releaseStats.repo.id,
    name: releaseStats.repo.name,
    description: releaseStats.repo.description || '',
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

export function filterOnDocs(searchTerm: string, docs: Doc[]): readonly Doc[] {
  if (!searchTerm) {
    return docs;
  }
  const q = parse(searchTerm);
  return filter(q, docs);
}

export function filterReleaseStatsBySearchTerm(
  releaseStats: ReleaseStats[],
  searchTerm: string,
): ReleaseStats[] {
  const docs = releaseStatsToDocs(releaseStats);
  const hits = filterOnDocs(searchTerm, docs);
  return hits2filteredReleaseStats(hits, releaseStats);
}
