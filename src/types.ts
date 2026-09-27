export type Platform = 'ios' | 'android';

export type EvaluationResult = 'ok' | 'soft' | 'force';

export interface PlatformPolicy {
  /**
   * Minimum required version. Versions below this will trigger a force update (426 response).
   */
  min: string;
  /**
   * Recommended version (optional). Versions below this but >= min will trigger a soft update prompt.
   */
  recommended?: string;
  /**
   * Store URL where users can download the update.
   */
  storeUrl: string;
}

export interface VersionGatePolicy {
  ios?: PlatformPolicy;
  android?: PlatformPolicy;
}

export interface ClientInfo {
  platform: Platform;
  version: string;
}

export interface UpdateRequiredResponse {
  error: 'APP_UPDATE_REQUIRED';
  platform: Platform;
  currentVersion: string;
  minVersion: string;
  storeUrl: string;
}
