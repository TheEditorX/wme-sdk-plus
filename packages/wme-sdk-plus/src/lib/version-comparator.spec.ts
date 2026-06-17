import { describe, it, expect } from 'vitest';
import { compareVersions } from './version-comparator';

describe('compareVersions', () => {
  it('should return 0 when versions are completely equal', () => {
    expect(compareVersions({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 2, patch: 3 })).toBe(0);
  });

  it('should return 0 when partial versions are equal', () => {
    expect(compareVersions({ major: 1, minor: 2 }, { major: 1, minor: 2 })).toBe(0);
  });

  it('should return positive number when a is higher in major version', () => {
    expect(compareVersions({ major: 2, minor: 0, patch: 0 }, { major: 1, minor: 0, patch: 0 })).toBeGreaterThan(0);
  });

  it('should return negative number when b is higher in major version', () => {
    expect(compareVersions({ major: 1, minor: 0, patch: 0 }, { major: 2, minor: 0, patch: 0 })).toBeLessThan(0);
  });

  it('should return positive number when major is equal and a is higher in minor version', () => {
    expect(compareVersions({ major: 1, minor: 3, patch: 0 }, { major: 1, minor: 2, patch: 0 })).toBeGreaterThan(0);
  });

  it('should return negative number when major is equal and b is higher in minor version', () => {
    expect(compareVersions({ major: 1, minor: 2, patch: 0 }, { major: 1, minor: 3, patch: 0 })).toBeLessThan(0);
  });

  it('should return positive number when major and minor are equal and a is higher in patch version', () => {
    expect(compareVersions({ major: 1, minor: 2, patch: 4 }, { major: 1, minor: 2, patch: 3 })).toBeGreaterThan(0);
  });

  it('should return negative number when major and minor are equal and b is higher in patch version', () => {
    expect(compareVersions({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 2, patch: 4 })).toBeLessThan(0);
  });

  it('should return 0 if one version component is missing in one side', () => {
    // If one is missing a field, it doesn't compare them and might return 0 if other compared fields are equal.
    // e.g. a has patch but b does not, according to implementation:
    // `if (a.patch && b.patch && a.patch !== b.patch) return a.patch - b.patch;` -> skip and return 0
    expect(compareVersions({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 2 })).toBe(0);
  });

  it('should return -1 when a is null or undefined', () => {
    expect(compareVersions(null as any, { major: 1 })).toBe(-1);
    expect(compareVersions(undefined as any, { major: 1 })).toBe(-1);
  });

  it('should return 1 when b is null or undefined', () => {
    expect(compareVersions({ major: 1 }, null as any)).toBe(1);
    expect(compareVersions({ major: 1 }, undefined as any)).toBe(1);
  });

  it('should correctly compare zero vs non-zero in major version', () => {
    expect(compareVersions({ major: 0, minor: 1, patch: 0 }, { major: 1, minor: 0, patch: 0 })).toBeLessThan(0);
    expect(compareVersions({ major: 1, minor: 0, patch: 0 }, { major: 0, minor: 1, patch: 0 })).toBeGreaterThan(0);
  });

  it('should correctly compare zero vs non-zero in minor version', () => {
    expect(compareVersions({ major: 1, minor: 0, patch: 5 }, { major: 1, minor: 1, patch: 0 })).toBeLessThan(0);
    expect(compareVersions({ major: 1, minor: 1, patch: 0 }, { major: 1, minor: 0, patch: 5 })).toBeGreaterThan(0);
  });

  it('should correctly compare zero vs non-zero in patch version', () => {
    expect(compareVersions({ major: 1, minor: 2, patch: 0 }, { major: 1, minor: 2, patch: 1 })).toBeLessThan(0);
    expect(compareVersions({ major: 1, minor: 2, patch: 1 }, { major: 1, minor: 2, patch: 0 })).toBeGreaterThan(0);
  });

  it('should return 0 when both versions have zero values at the same level', () => {
    expect(compareVersions({ major: 0, minor: 0, patch: 0 }, { major: 0, minor: 0, patch: 0 })).toBe(0);
    expect(compareVersions({ major: 1, minor: 0, patch: 0 }, { major: 1, minor: 0, patch: 0 })).toBe(0);
  });
});
