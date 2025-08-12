import { describe, expect, test } from 'vitest';
import { jaspVersionRangeFromDescription } from './scrape';

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
