import { describe, it, expect } from 'vitest';
import { parseVersion, compareVersions, isVersionGte, isValidVersion } from './semver.js';

describe('parseVersion', () => {
  it('should parse full version strings', () => {
    expect(parseVersion('2.3.5')).toEqual([2, 3, 5]);
    expect(parseVersion('1.0.0')).toEqual([1, 0, 0]);
    expect(parseVersion('10.20.30')).toEqual([10, 20, 30]);
  });

  it('should handle missing patch version', () => {
    expect(parseVersion('2.3')).toEqual([2, 3, 0]);
    expect(parseVersion('1.0')).toEqual([1, 0, 0]);
  });

  it('should handle missing minor and patch', () => {
    expect(parseVersion('2')).toEqual([2, 0, 0]);
    expect(parseVersion('5')).toEqual([5, 0, 0]);
  });

  it('should handle versions with pre-release tags', () => {
    expect(parseVersion('2.3.5-beta')).toEqual([2, 3, 5]);
    expect(parseVersion('1.0.0-rc1')).toEqual([1, 0, 0]);
  });

  it('should handle invalid versions gracefully', () => {
    expect(parseVersion('')).toEqual([0, 0, 0]);
    expect(parseVersion('invalid')).toEqual([0, 0, 0]);
  });
});

describe('compareVersions', () => {
  it('should compare major versions', () => {
    expect(compareVersions('3.0.0', '2.0.0')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
  });

  it('should compare minor versions when major is equal', () => {
    expect(compareVersions('2.10.0', '2.9.0')).toBeGreaterThan(0);
    expect(compareVersions('2.5.0', '2.10.0')).toBeLessThan(0);
    expect(compareVersions('2.5.0', '2.5.0')).toBe(0);
  });

  it('should compare patch versions when major and minor are equal', () => {
    expect(compareVersions('2.3.10', '2.3.5')).toBeGreaterThan(0);
    expect(compareVersions('2.3.1', '2.3.9')).toBeLessThan(0);
    expect(compareVersions('2.3.5', '2.3.5')).toBe(0);
  });

  it('should handle the 2.10.0 > 2.9.9 case', () => {
    expect(compareVersions('2.10.0', '2.9.9')).toBeGreaterThan(0);
  });

  it('should handle missing components', () => {
    expect(compareVersions('2.3', '2.3.0')).toBe(0);
    expect(compareVersions('2', '2.0.0')).toBe(0);
    expect(compareVersions('2.3', '2.2.9')).toBeGreaterThan(0);
  });
});

describe('isVersionGte', () => {
  it('should return true when version is greater', () => {
    expect(isVersionGte('3.0.0', '2.0.0')).toBe(true);
    expect(isVersionGte('2.10.0', '2.9.9')).toBe(true);
    expect(isVersionGte('2.3.1', '2.3.0')).toBe(true);
  });

  it('should return true when versions are equal', () => {
    expect(isVersionGte('2.3.5', '2.3.5')).toBe(true);
    expect(isVersionGte('1.0.0', '1.0.0')).toBe(true);
  });

  it('should return false when version is less', () => {
    expect(isVersionGte('2.0.0', '3.0.0')).toBe(false);
    expect(isVersionGte('2.9.9', '2.10.0')).toBe(false);
    expect(isVersionGte('2.3.0', '2.3.1')).toBe(false);
  });
});

describe('isValidVersion', () => {
  it('should return true for valid version strings', () => {
    expect(isValidVersion('2.3.0')).toBe(true);
    expect(isValidVersion('1.0')).toBe(true);
    expect(isValidVersion('5')).toBe(true);
    expect(isValidVersion('2.3.0-beta')).toBe(true);
    expect(isValidVersion('10.20.30')).toBe(true);
  });

  it('should return false for malformed versions', () => {
    expect(isValidVersion('abc')).toBe(false);
    expect(isValidVersion('')).toBe(false);
    expect(isValidVersion('   ')).toBe(false);
    expect(isValidVersion('v2.3.0')).toBe(false);
    expect(isValidVersion('beta-2.3.0')).toBe(false);
  });

  it('should handle versions with leading digits correctly', () => {
    expect(isValidVersion('0.1.0')).toBe(true);
    expect(isValidVersion('0')).toBe(true);
  });
});
