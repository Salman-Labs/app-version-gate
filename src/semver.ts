/**
 * Parse a version string into numeric components.
 * Handles versions like "2.3", "2.3.0", "2.3.0-beta", etc.
 * Returns [major, minor, patch] where missing components default to 0.
 */
export function parseVersion(version: string): [number, number, number] {
  const parts = version.split(/[.-]/);
  const major = parseInt(parts[0], 10) || 0;
  const minor = parseInt(parts[1], 10) || 0;
  const patch = parseInt(parts[2], 10) || 0;
  return [major, minor, patch];
}

/**
 * Compare two version strings.
 * Returns:
 *  - negative if a < b
 *  - 0 if a === b
 *  - positive if a > b
 */
export function compareVersions(a: string, b: string): number {
  const [aMajor, aMinor, aPatch] = parseVersion(a);
  const [bMajor, bMinor, bPatch] = parseVersion(b);

  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

/**
 * Check if version a is greater than or equal to version b.
 */
export function isVersionGte(a: string, b: string): boolean {
  return compareVersions(a, b) >= 0;
}
