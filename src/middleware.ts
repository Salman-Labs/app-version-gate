import type { Request, Response, NextFunction } from 'express';
import { evaluate } from './evaluate.js';
import type { ClientInfo, Platform, UpdateRequiredResponse, VersionGatePolicy } from './types.js';

export interface VersionGateOptions {
  /**
   * Version gate policy for iOS and Android platforms.
   */
  policy: VersionGatePolicy;
  /**
   * Name of the header containing the platform (default: 'x-app-platform').
   */
  platformHeader?: string;
  /**
   * Name of the header containing the version (default: 'x-app-version').
   */
  versionHeader?: string;
  /**
   * Custom function to extract client info from the request.
   * If provided, this takes precedence over header-based extraction.
   */
  getClient?: (req: Request) => ClientInfo | null;
  /**
   * Name of the response header to set for soft updates (default: 'X-App-Update').
   */
  updateHeader?: string;
}

function getClientInfo(req: Request, options: VersionGateOptions): ClientInfo | null {
  if (options.getClient) {
    return options.getClient(req);
  }

  const platformHeader = options.platformHeader || 'x-app-platform';
  const versionHeader = options.versionHeader || 'x-app-version';

  const platform = req.headers[platformHeader] as string | undefined;
  const version = req.headers[versionHeader] as string | undefined;

  if (!platform || !version) {
    return null;
  }

  if (platform !== 'ios' && platform !== 'android') {
    return null;
  }

  return { platform, version };
}

/**
 * Express middleware factory for version gating.
 *
 * @param options - Configuration options including the policy and header names
 * @returns Express middleware function
 */
export function versionGate(options: VersionGateOptions | VersionGatePolicy) {
  const opts: VersionGateOptions = 'policy' in options ? options : { policy: options };

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientInfo = getClientInfo(req, opts);

    if (!clientInfo) {
      next();
      return;
    }

    const result = evaluate(opts.policy, clientInfo.platform, clientInfo.version);

    if (result === 'force') {
      const platformPolicy = opts.policy[clientInfo.platform];
      if (!platformPolicy) {
        next();
        return;
      }

      const response: UpdateRequiredResponse = {
        error: 'APP_UPDATE_REQUIRED',
        platform: clientInfo.platform,
        currentVersion: clientInfo.version,
        minVersion: platformPolicy.min,
        storeUrl: platformPolicy.storeUrl,
      };

      res.status(426).json(response);
      return;
    }

    if (result === 'soft') {
      const updateHeader = opts.updateHeader || 'X-App-Update';
      res.setHeader(updateHeader, 'recommended');
    }

    next();
  };
}
