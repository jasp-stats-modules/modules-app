import type { ReleaseStats } from './releaseStats';


export function filterReleaseStatsBySearchTerm(
  releaseStats: ReleaseStats[],
  searchTerm: string,
  language: string
): ReleaseStats[] {
  return releaseStats.filter(({ repo }) => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    const idMatches = repo.id.toLowerCase().includes(searchLower);
    const translateNameMatches = repo.translations[language]?.name
      ?.toLowerCase()
      .includes(searchLower);

    const nameMatches = repo.name.toLowerCase().includes(searchLower);

    // Strip HTML tags from description for search
    const plainDescription = repo.description?.replace(/<[^>]*>/g, '') || '';
    const descriptionMatches = plainDescription
      .toLowerCase()
      .includes(searchLower);

    return idMatches || translateNameMatches || nameMatches || descriptionMatches;
  });
}
