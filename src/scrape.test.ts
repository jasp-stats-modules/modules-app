import { describe, expect, test } from 'vitest';
import {
  type GqlRelease,
  jaspVersionRangeFromDescription,
  latestReleasePerJaspVersionRange,
} from './scrape';

describe('jaspVersionRangeFromDescription', () => {
  test('singleqouted', () => {
    const description = "---\njasp: '>=0.95.1'\n---\n";
    const result = jaspVersionRangeFromDescription(description);

    expect(result).toBe('>=0.95.1');
  });

  test('doublequoted', () => {
    const description = '---\njasp: ">=0.95.1"\n---\n';
    const result = jaspVersionRangeFromDescription(description);

    expect(result).toBe('>=0.95.1');
  });

  test('unquoted', () => {
    const description = '---\njasp: >=0.95.1\n---\n';

    const result = jaspVersionRangeFromDescription(description);
    expect(result).toBe('>=0.95.1');
  });
});

describe('latestReleasePerJaspVersionRange', () => {
  test('2 version ranges with each 2 releases', () => {
    const input: GqlRelease[] = [
      {
        // this one should be shown when installed jasp is 0.95.1
        isDraft: false,
        isPrerelease: false,
        publishedAt: '<date>',
        releaseAssets: { nodes: [] },
        tagName: 'v1.1.1',
        description: '---\njasp: >=0.95.1\n---\n',
      },
      {
        // Drop superseeded be above
        isDraft: false,
        isPrerelease: false,
        publishedAt: '<date>',
        releaseAssets: { nodes: [] },
        tagName: 'v1.1.0',
        description: '---\njasp: >=0.95.1\n---\n',
      },
      // versions below do not work in 0.95.1
      {
        // should be shown if installed jasp is 0.95.0
        isDraft: false,
        isPrerelease: false,
        publishedAt: '<date>',
        releaseAssets: { nodes: [] },
        tagName: 'v1.0.1',
        description: '---\njasp: >=0.95.0\n---\n',
      },
      {
        // Drop superseeded be above
        isDraft: false,
        isPrerelease: false,
        publishedAt: '<date>',
        releaseAssets: { nodes: [] },
        tagName: 'v1.0.0',
        description: '---\njasp: >=0.95.0\n---\n',
      },
    ];

    const result = latestReleasePerJaspVersionRange(input);

    const expected = [input[0], input[2]];

    expect(result).toEqual(expected);
  });
});
