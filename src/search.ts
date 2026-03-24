import type { ReleaseStats } from './releaseStats';

// Get searchable text fields from a repository
function getSearchableFields(
  repo: ReleaseStats['repo'],
  language: string,
): { id: string; name: string; description: string } {
  let name = repo.name;
  if (repo.translations[language]?.name) {
    name = repo.translations[language]?.name;
  }
  let description = repo.description;
  if (repo.translations[language]?.description) {
    description = repo.translations[language]?.description;
  }
  return { id: repo.id, name, description };
}

// Parse a field-specific term like "id:jaspAnova" or plain text
function parseFieldTerm(term: string): {
  field: string | null;
  value: string;
  isPhrase: boolean;
} {
  // Check if it's a quoted phrase
  if (term.startsWith('"') && term.endsWith('"')) {
    return { field: null, value: term.slice(1, -1), isPhrase: true };
  }

  const fieldMatch = term.match(/^(\w+):(.+)$/);
  if (fieldMatch) {
    return { field: fieldMatch[1], value: fieldMatch[2], isPhrase: false };
  }
  return { field: null, value: term, isPhrase: false };
}

// Tokenize input: handle quoted phrases and field terms
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if ((char === ' ' || char === '&') && !inQuotes) {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
}

// Evaluate a single term against repository fields
function evaluateTerm(
  term: string,
  fields: { id: string; name: string; description: string },
): boolean {
  const { field, value, isPhrase } = parseFieldTerm(term);
  const searchLower = value.toLowerCase();

  if (field === 'id') {
    return fields.id.toLowerCase().includes(searchLower);
  }
  if (field === 'name') {
    return fields.name.toLowerCase().includes(searchLower);
  }
  if (field === 'description') {
    return fields.description.toLowerCase().includes(searchLower);
  }

  // For phrases or plain text: match against all fields (no field-specific filtering)
  const allFieldsText =
    `${fields.id} ${fields.name} ${fields.description}`.toLowerCase();

  if (isPhrase) {
    // Exact phrase matching: contiguous substring
    return allFieldsText.includes(searchLower);
  }

  // Plain text: match on individual fields
  return (
    fields.id.toLowerCase().includes(searchLower) ||
    fields.name.toLowerCase().includes(searchLower) ||
    fields.description.toLowerCase().includes(searchLower)
  );
}

// Evaluate a clause (all terms joined by AND semantics)
function evaluateClause(
  clause: string,
  fields: { id: string; name: string; description: string },
): boolean {
  const terms = tokenize(clause);
  // All terms in a clause must match (AND semantics)
  return terms.every((term) => term && evaluateTerm(term, fields));
}

export function filterReleaseStatsBySearchTerm(
  releaseStats: ReleaseStats[],
  searchTerm: string,
  language: string,
): ReleaseStats[] {
  return releaseStats.filter(({ repo }) => {
    if (!searchTerm.trim()) return true;

    const fields = getSearchableFields(repo, language);

    // Split by | for OR clauses
    const clauses = searchTerm.split('|').map((c) => c.trim());

    // Match if ANY clause matches (OR semantics)
    return clauses.some((clause) => evaluateClause(clause, fields));
  });
}
