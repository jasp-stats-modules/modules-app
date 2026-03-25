import { describe, expect, test } from 'vitest';
import { type Doc, filterOnDocs } from './search';

const sampleDocs = [
  {
    id: 'jaspAudit',
    name: 'Audit',
    description: 'Statistical methods for auditing',
  },
  {
    id: 'jaspBfpack',
    name: 'BFpack',
    description:
      'A module for computing Bayes factors for equality, inequality, and order constrained hypotheses.',
  },
];

describe('filterOnDocs', () => {
  test.for<{
    testname: string;
    searchTerm: string;
    docs: Doc[];
    expected: string[]; // expected ids of matching docs
  }>([
    {
      testname: 'empty search term returns all docs',
      searchTerm: '',
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
        },
      ],
      expected: ['jaspAudit'],
    },
    { testname: 'matches name field',
      searchTerm: 'name:Audit',
      docs: [
        ...sampleDocs,
        {
          id: 'id3',
          name: 'Audit', // Should be returned
          description: '',
        },
      ],
      expected: ['jaspAudit', 'id3'],
    }, {
        testname: 'or-ed ids',
        searchTerm: 'id:jaspAudit OR id:jaspBfpack',
        docs: [
          ...sampleDocs,
          {
            id: 'id3',
            name: 'jaspAudit', // Should not be returned
            description: '',
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
    { testname: 'quoted phrase',
      searchTerm: '"Bayes factors"',
      docs: [...sampleDocs, {
        id: 'id3',
        name: 'jaspAudit',
        description: 'A module for computing factors of Bayes for auditing', // wrong order
      }],
      expected: ['jaspBfpack'],
    },
  ])('$testname', ({ searchTerm, docs, expected }) => {
    const result = filterOnDocs(searchTerm, docs);
    expect(result.map((doc) => doc.id)).toEqual(expected);
  });
});
