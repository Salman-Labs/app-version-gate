import { describe, it, expect } from 'vitest';
import { evaluate } from './evaluate.js';
import type { VersionGatePolicy } from './types.js';

describe('evaluate', () => {
  const policy: VersionGatePolicy = {
    ios: {
      min: '2.3.0',
      recommended: '2.5.0',
      storeUrl: 'https://apps.apple.com/app/id123',
    },
    android: {
      min: '2.3.0',
      storeUrl: 'https://play.google.com/store/apps/details?id=com.x',
    },
  };

  describe('force updates', () => {
    it('should return "force" when version is below minimum', () => {
      expect(evaluate(policy, 'ios', '2.2.9')).toBe('force');
      expect(evaluate(policy, 'ios', '2.0.0')).toBe('force');
      expect(evaluate(policy, 'ios', '1.9.9')).toBe('force');
      expect(evaluate(policy, 'android', '2.2.9')).toBe('force');
    });

    it('should return "force" at the boundary', () => {
      expect(evaluate(policy, 'ios', '2.2.99')).toBe('force');
    });
  });

  describe('soft updates', () => {
    it('should return "soft" when version is >= min but < recommended', () => {
      expect(evaluate(policy, 'ios', '2.3.0')).toBe('soft');
      expect(evaluate(policy, 'ios', '2.4.9')).toBe('soft');
      expect(evaluate(policy, 'ios', '2.4.0')).toBe('soft');
    });

    it('should not return "soft" for platform without recommended version', () => {
      expect(evaluate(policy, 'android', '2.3.0')).toBe('ok');
      expect(evaluate(policy, 'android', '2.4.0')).toBe('ok');
    });
  });

  describe('ok status', () => {
    it('should return "ok" when version meets recommended', () => {
      expect(evaluate(policy, 'ios', '2.5.0')).toBe('ok');
      expect(evaluate(policy, 'ios', '2.6.0')).toBe('ok');
      expect(evaluate(policy, 'ios', '3.0.0')).toBe('ok');
    });

    it('should return "ok" when version meets minimum (no recommended)', () => {
      expect(evaluate(policy, 'android', '2.3.0')).toBe('ok');
      expect(evaluate(policy, 'android', '2.10.0')).toBe('ok');
    });

    it('should return "ok" for unknown platform', () => {
      expect(evaluate(policy, 'ios', '1.0.0')).toBe('force');
      expect(evaluate({}, 'ios', '1.0.0')).toBe('ok');
    });
  });

  describe('edge cases', () => {
    it('should handle missing platform in policy', () => {
      const minimalPolicy: VersionGatePolicy = {
        ios: {
          min: '1.0.0',
          storeUrl: 'https://example.com',
        },
      };
      expect(evaluate(minimalPolicy, 'android', '0.1.0')).toBe('ok');
    });

    it('should handle empty policy', () => {
      expect(evaluate({}, 'ios', '0.1.0')).toBe('ok');
      expect(evaluate({}, 'android', '0.1.0')).toBe('ok');
    });
  });

  describe('malformed versions', () => {
    it('should return "ok" for malformed versions to prevent lockout', () => {
      expect(evaluate(policy, 'ios', 'abc')).toBe('ok');
      expect(evaluate(policy, 'ios', '')).toBe('ok');
      expect(evaluate(policy, 'ios', '   ')).toBe('ok');
      expect(evaluate(policy, 'ios', 'v2.3.0')).toBe('ok');
      expect(evaluate(policy, 'android', 'beta')).toBe('ok');
    });
  });
});
