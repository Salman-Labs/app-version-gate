import { isVersionGte } from './semver.js';
import type { EvaluationResult, Platform, VersionGatePolicy } from './types.js';

/**
 * Evaluate whether a client version meets the policy requirements.
 *
 * @param policy - The version gate policy containing platform-specific rules
 * @param platform - The client platform ('ios' or 'android')
 * @param version - The client app version
 * @returns 'force' if update is required, 'soft' if recommended, 'ok' otherwise
 */
export function evaluate(
  policy: VersionGatePolicy,
  platform: Platform,
  version: string
): EvaluationResult {
  const platformPolicy = policy[platform];

  if (!platformPolicy) {
    return 'ok';
  }

  if (!isVersionGte(version, platformPolicy.min)) {
    return 'force';
  }

  if (platformPolicy.recommended && !isVersionGte(version, platformPolicy.recommended)) {
    return 'soft';
  }

  return 'ok';
}
