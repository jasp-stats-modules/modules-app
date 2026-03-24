import { describe, expect, test } from 'vitest';
import type { ReleaseStats } from './releaseStats';
import { filterReleaseStatsBySearchTerm } from './search';

function releaseStat(overrides?: {
  id?: string;
  name?: string;
  description?: string;
  translations?: Record<string, { name: string; description: string }>;
}): ReleaseStats {
  return {
    repo: {
      id: overrides?.id ?? 'jaspAnova',
      name: overrides?.name ?? 'ANOVA',
      description:
        overrides?.description ?? 'Analysis of variance for factorial designs.',
      translations: overrides?.translations ?? {},
      releaseSource: 'jasp-stats-modules/jaspAnova',
      channels: ['Official'],
      organization: 'jasp-stats-modules',
      releases: [],
      preReleases: [],
    },
    actions: [],
  };
}

describe('filterReleaseStatsBySearchTerm', () => {
  test.for<
    [
      string,
      {
        stats: ReleaseStats[];
        searchTerm: string;
        language: string;
        expectedIds: string[];
      },
    ]
  >([
    [
      'returns all entries when search term is empty',
      {
        stats: [
          releaseStat({ id: 'jaspAnova' }),
          releaseStat({ id: 'jaspRegression' }),
        ],
        searchTerm: '',
        language: 'en',
        expectedIds: ['jaspAnova', 'jaspRegression'],
      },
    ],
    [
      'returns all entries when search term is whitespace only',
      {
        stats: [
          releaseStat({ id: 'jaspAnova' }),
          releaseStat({ id: 'jaspRegression' }),
        ],
        searchTerm: '   ',
        language: 'en',
        expectedIds: ['jaspAnova', 'jaspRegression'],
      },
    ],
    [
      'matches repository id case-insensitively',
      {
        stats: [
          releaseStat({ id: 'jaspBain' }),
          releaseStat({ id: 'jaspAnova' }),
        ],
        searchTerm: 'BAIN',
        language: 'en',
        expectedIds: ['jaspBain'],
      },
    ],
    [
      'matches repository name case-insensitively',
      {
        stats: [
          releaseStat({ name: 'Bayesian Inference' }),
          releaseStat({ name: 'Descriptives' }),
        ],
        searchTerm: 'infer',
        language: 'en',
        expectedIds: ['jaspAnova'],
      },
    ],
    [
      'matches translated name for the selected language',
      {
        stats: [
          releaseStat({
            name: 'Regression',
            translations: {
              fr: {
                name: 'Regressions lineaires',
                description: 'Modele lineaire',
              },
            },
          }),
          releaseStat({
            name: 'ANOVA',
            translations: {
              fr: {
                name: 'Analyse de variance',
                description: 'Description',
              },
            },
          }),
        ],
        searchTerm: 'lineaires',
        language: 'fr',
        expectedIds: ['jaspAnova'],
      },
    ],
    [
      'does not match translated name when selected language is missing',
      {
        stats: [
          releaseStat({
            name: 'T-Tests',
            translations: {
              de: {
                name: 'T-Tests Deutsch',
                description: 'Beschreibung',
              },
            },
          }),
        ],
        searchTerm: 'deutsch',
        language: 'fr',
        expectedIds: [],
      },
    ],
    [
      'matches description after stripping html tags',
      {
        stats: [
          releaseStat({
            description: 'A <b>robust</b> method for Bayesian testing.',
          }),
          releaseStat({
            description: 'Classical hypothesis testing procedures.',
          }),
        ],
        searchTerm: 'robust',
        language: 'en',
        expectedIds: ['jaspAnova'],
      },
    ],
    [
      'returns no entries when there is no match in any field',
      {
        stats: [
          releaseStat({
            id: 'jaspAnova',
            name: 'ANOVA',
            description: 'Analysis of variance',
          }),
          releaseStat({
            id: 'jaspRegression',
            name: 'Regression',
            description: 'Linear and logistic models',
          }),
        ],
        searchTerm: 'survival',
        language: 'en',
        expectedIds: [],
      },
    ],
  ])('%s', ([, { stats, searchTerm, language, expectedIds }]) => {
    const result = filterReleaseStatsBySearchTerm(stats, searchTerm, language);

    expect(result.map((entry) => entry.repo.id)).toEqual(expectedIds);
  });
});