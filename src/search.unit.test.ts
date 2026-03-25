import { describe, expect, test } from 'vitest';
import type { ReleaseStats } from './releaseStats';
import {
  type Doc,
  filterOnDocs,
  filterReleaseStats,
  releaseStatsToDocs,
} from './search';
import type { Release } from './types';

const sampleDocs: readonly Doc[] = [
  {
    id: 'jaspAudit',
    name: 'Audit',
    description: 'Statistical methods for auditing',
    maintainer: 'jasp-stats',
  },
  {
    id: 'jaspBfpack',
    name: 'BFpack',
    description:
      'A module for computing Bayes factors for equality, inequality, and order constrained hypotheses.',
    maintainer: 'jasp-stats',
  },
];

describe('filterOnDocs', () => {
  test.for<{
    testname: string;
    searchTerm: string;
    docs: readonly Doc[];
    expected: string[]; // expected ids of matching docs
  }>([
    {
      testname: 'empty search term returns all docs',
      searchTerm: '',
      docs: sampleDocs,
      expected: ['jaspAudit', 'jaspBfpack'],
    },
    {
      testname: 'whitespace search term returns all docs',
      searchTerm: '   ',
      docs: sampleDocs,
      expected: ['jaspAudit', 'jaspBfpack'],
    },
    {
      testname: 'matches name',
      searchTerm: 'Audit',
      docs: sampleDocs,
      expected: ['jaspAudit'],
    },
    {
      testname: 'matches id',
      searchTerm: 'jaspAudit',
      docs: sampleDocs,
      expected: ['jaspAudit'],
    },
    {
      testname: 'matches maintainer',
      searchTerm: 'jasp-stats',
      docs: sampleDocs,
      expected: ['jaspAudit', 'jaspBfpack'],
    },
    {
      testname: 'case insensitive',
      searchTerm: 'bfpack',
      docs: sampleDocs,
      expected: ['jaspBfpack'],
    },
    {
      testname: 'matches description',
      searchTerm: 'bayes',
      docs: sampleDocs,
      expected: ['jaspBfpack'],
    },
    {
      testname: 'partial word',
      searchTerm: 'meth', // Matches 'methods' in jaspAudit description
      docs: sampleDocs,
      expected: ['jaspAudit'],
    },
    {
      testname: 'bad term matches nothing',
      searchTerm: 'Nonexistent',
      docs: sampleDocs,
      expected: [],
    },
    {
      testname: 'matches id field',
      searchTerm: 'id:jaspAudit',
      docs: [
        ...sampleDocs,
        {
          id: 'id3',
          name: 'jaspAudit', // Should not be returned
          description: '',
          maintainer: '',
        },
      ],
      expected: ['jaspAudit'],
    },
    {
      testname: 'matches name field',
      searchTerm: 'name:Audit',
      docs: [
        ...sampleDocs,
        {
          id: 'id3',
          name: 'Audit', // Should be returned
          description: '',
          maintainer: '',
        },
      ],
      expected: ['jaspAudit', 'id3'],
    },
    {
      testname: 'matches date field',
      searchTerm: 'date:20260228',
      docs: [
        {
          id: 'jaspAnova',
          name: 'Anova',
          description: 'A module for computing ANOVA',
          maintainer: 'jasp-stats',
          date: 20260228,
        },
      ],
      expected: ['jaspAnova'],
    },
    {
      testname: 'matches downloads field',
      searchTerm: 'downloads:100',
      docs: [
        {
          id: 'jaspAnova',
          name: 'Anova',
          description: 'A module for computing ANOVA',
          maintainer: 'jasp-stats',
          downloads: 100,
        },
      ],
      expected: ['jaspAnova'],
    },
    {
      testname: 'or-ed ids',
      searchTerm: 'id:jaspAudit OR id:jaspBfpack',
      docs: [
        ...sampleDocs,
        {
          id: 'id3',
          name: 'jaspAudit', // Should not be returned
          description: '',
          maintainer: '',
        },
      ],
      expected: ['jaspAudit', 'jaspBfpack'],
    },
    {
      testname: 'terms are AND-ed',
      searchTerm: 'for equality',
      docs: sampleDocs,
      expected: ['jaspBfpack'],
    },
    {
      testname: 'swapped order',
      searchTerm: 'constrained for',
      docs: sampleDocs,
      expected: ['jaspBfpack'],
    },
    {
      testname: 'quoted phrase',
      searchTerm: '"Bayes factors"',
      docs: [
        ...sampleDocs,
        {
          id: 'id3',
          name: 'jaspAudit',
          description: 'A module for computing factors of Bayes for auditing', // wrong order
          maintainer: '',
        },
      ],
      expected: ['jaspBfpack'],
    },
    {
      testname: 'matches newer than',
      searchTerm: 'date:>=20260101',
      docs: [
        {
          id: 'jaspAnova',
          name: 'Anova',
          description: 'A module for computing ANOVA',
          maintainer: 'jasp-stats',
          date: 20260228,
        },
      ],
      expected: ['jaspAnova'],
    },
    {
      testname: 'matches a lot of downloads',
      searchTerm: 'downloads:>=100',
      docs: [
        {
          id: 'jaspAnova',
          name: 'Anova',
          description: 'A module for computing ANOVA',
          maintainer: 'jasp-stats',
          downloads: 100000,
        },
        {
          id: 'jaspBfpack',
          name: 'Bfpack',
          description: 'A module for computing Bayes factors',
          maintainer: 'jasp-stats',
          downloads: 50,
        },
      ],
      expected: ['jaspAnova'],
    },
    {
      testname: 'complex query',
      searchTerm: '("constrained hypotheses" OR method) OR downloads:>=50',
      docs: [
        ...sampleDocs,
        {
          id: 'id3',
          name: 'some module',
          description: '',
          maintainer: '',
          downloads: 60,
        },
      ],
      // First matches 'constrained hypotheses' in jaspBfpack description,
      // second matches 'method' in jaspAudit description,
      // third matches downloads:>=50
      expected: ['jaspBfpack', 'jaspAudit', 'id3'],
    },
  ])('$testname', ({ searchTerm, docs, expected }) => {
    const result = filterOnDocs(searchTerm, docs);
    expect(result.hits.map((doc) => doc.id)).toEqual(expected);
  });

  test('returns parse metadata for invalid query', () => {
    const result = filterOnDocs('fo*"', sampleDocs);

    expect(result.hits.map((doc) => doc.id)).toEqual([
      'jaspAudit',
      'jaspBfpack',
    ]);
    expect(result.parseError).toMatchObject({
      column: 4,
    });
  });

  test('treats quote-only query as invalid', () => {
    const result = filterOnDocs('"', sampleDocs);

    expect(result.hits.map((doc) => doc.id)).toEqual([
      'jaspAudit',
      'jaspBfpack',
    ]);
    expect(result.parseError).toEqual({ column: 1 });
  });
});

function makeRS(doc: Omit<Doc, 'date'>, publishedAt?: string): ReleaseStats {
  const releases: Release[] = [];
  if (publishedAt && doc.downloads) {
    releases.push({
      version: '1.0.0',
      publishedAt,
      assets: [
        {
          downloadUrl: 'https://example.com/download.zip',
          downloadCount: doc.downloads,
          architecture: 'x86_64',
        },
      ],
    });
  }
  return {
    repo: {
      id: doc.id || '',
      name: doc.name || '',
      description: doc.description || '',
      organization: doc.maintainer || '',
      releases,
      preReleases: [],
      releaseSource: '',
      channels: [],
      translations: {},
      homepageUrl: '',
      iconUrl: '',
    },
    actions: [],
  };
}

describe('filterReleaseStats', () => {
  test.for<[string, string[]]>([
    ['', ['jaspAudit', 'jaspBfpack']],
    ['jaspAudit', ['jaspAudit']], // id
    ['Audit', ['jaspAudit']], // name
    ['factors', ['jaspBfpack']], // description
    ['jasp-stats', ['jaspAudit', 'jaspBfpack']], // maintainer
    ['date:>=20230101', ['jaspAudit']], // date
    ['downloads:>42', ['jaspAudit']], // downloads
  ])("'%s' -> %j", ([searchTerm, expected]) => {
    const releaseStats: ReleaseStats[] = [
      makeRS(
        {
          id: 'jaspAudit',
          name: 'Audit',
          description: 'Statistical methods for auditing',
          maintainer: 'jasp-stats',
          downloads: 100,
        },
        '2024-01-01T00:00:00Z',
      ),
      makeRS({
        id: 'jaspBfpack',
        name: 'BFpack',
        description:
          'A module for computing Bayes factors for equality, inequality, and order constrained hypotheses.',
        maintainer: 'jasp-stats',
      }),
    ];

    const result = filterReleaseStats(
      releaseStatsToDocs(releaseStats),
      releaseStats,
      searchTerm,
    );
    const hits = result.releaseStats;

    const hitIds = hits.map((rs) => rs.repo.id);
    expect(hitIds).toEqual(expected);
  });
});
