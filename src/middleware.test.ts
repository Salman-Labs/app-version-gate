import { describe, it, expect } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { versionGate } from './middleware.js';
import type { VersionGatePolicy } from './types.js';

function createTestApp(options: Parameters<typeof versionGate>[0]): Express {
  const app = express();
  app.use('/api', versionGate(options));
  app.get('/api/test', (req, res) => {
    res.json({ success: true });
  });
  return app;
}

const testPolicy: VersionGatePolicy = {
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

describe('versionGate middleware', () => {
  describe('force updates (426 response)', () => {
    it('should return 426 when iOS version is below minimum', async () => {
      const app = createTestApp(testPolicy);

      const response = await request(app)
        .get('/api/test')
        .set('x-app-platform', 'ios')
        .set('x-app-version', '2.2.9');

      expect(response.status).toBe(426);
      expect(response.body).toEqual({
        error: 'APP_UPDATE_REQUIRED',
        platform: 'ios',
        currentVersion: '2.2.9',
        minVersion: '2.3.0',
        storeUrl: 'https://apps.apple.com/app/id123',
      });
    });

    it('should return 426 when Android version is below minimum', async () => {
      const app = createTestApp(testPolicy);

      const response = await request(app)
        .get('/api/test')
        .set('x-app-platform', 'android')
        .set('x-app-version', '2.0.0');

      expect(response.status).toBe(426);
      expect(response.body).toEqual({
        error: 'APP_UPDATE_REQUIRED',
        platform: 'android',
        currentVersion: '2.0.0',
        minVersion: '2.3.0',
        storeUrl: 'https://play.google.com/store/apps/details?id=com.x',
      });
    });
  });

  describe('soft updates (X-App-Update header)', () => {
    it('should set X-App-Update header when version is below recommended', async () => {
      const app = createTestApp(testPolicy);

      const response = await request(app)
        .get('/api/test')
        .set('x-app-platform', 'ios')
        .set('x-app-version', '2.4.0');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(response.headers['x-app-update']).toBe('recommended');
    });

    it('should not set header when version meets recommended', async () => {
      const app = createTestApp(testPolicy);

      const response = await request(app)
        .get('/api/test')
        .set('x-app-platform', 'ios')
        .set('x-app-version', '2.5.0');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(response.headers['x-app-update']).toBeUndefined();
    });

    it('should not set header for platforms without recommended version', async () => {
      const app = createTestApp(testPolicy);

      const response = await request(app)
        .get('/api/test')
        .set('x-app-platform', 'android')
        .set('x-app-version', '2.3.0');

      expect(response.status).toBe(200);
      expect(response.headers['x-app-update']).toBeUndefined();
    });
  });

  describe('pass-through scenarios', () => {
    it('should pass through when headers are missing', async () => {
      const app = createTestApp(testPolicy);

      const response = await request(app).get('/api/test');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should pass through when platform header is missing', async () => {
      const app = createTestApp(testPolicy);

      const response = await request(app)
        .get('/api/test')
        .set('x-app-version', '2.0.0');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should pass through when version header is missing', async () => {
      const app = createTestApp(testPolicy);

      const response = await request(app)
        .get('/api/test')
        .set('x-app-platform', 'ios');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should pass through for unknown platforms', async () => {
      const app = createTestApp(testPolicy);

      const response = await request(app)
        .get('/api/test')
        .set('x-app-platform', 'web')
        .set('x-app-version', '1.0.0');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('custom header names', () => {
    it('should use custom platform and version headers', async () => {
      const app = createTestApp({
        policy: testPolicy,
        platformHeader: 'x-custom-platform',
        versionHeader: 'x-custom-version',
      });

      const response = await request(app)
        .get('/api/test')
        .set('x-custom-platform', 'ios')
        .set('x-custom-version', '2.2.0');

      expect(response.status).toBe(426);
      expect(response.body.error).toBe('APP_UPDATE_REQUIRED');
    });

    it('should use custom update header', async () => {
      const app = createTestApp({
        policy: testPolicy,
        updateHeader: 'X-Custom-Update',
      });

      const response = await request(app)
        .get('/api/test')
        .set('x-app-platform', 'ios')
        .set('x-app-version', '2.4.0');

      expect(response.status).toBe(200);
      expect(response.headers['x-custom-update']).toBe('recommended');
    });
  });

  describe('custom getClient function', () => {
    it('should use custom getClient when provided', async () => {
      const app = createTestApp({
        policy: testPolicy,
        getClient: (req) => {
          const userAgent = req.headers['user-agent'] || '';
          if (userAgent.includes('MyApp/2.0.0 iOS')) {
            return { platform: 'ios', version: '2.0.0' };
          }
          return null;
        },
      });

      const response = await request(app)
        .get('/api/test')
        .set('user-agent', 'MyApp/2.0.0 iOS');

      expect(response.status).toBe(426);
      expect(response.body.error).toBe('APP_UPDATE_REQUIRED');
    });

    it('should pass through when custom getClient returns null', async () => {
      const app = createTestApp({
        policy: testPolicy,
        getClient: () => null,
      });

      const response = await request(app)
        .get('/api/test')
        .set('x-app-platform', 'ios')
        .set('x-app-version', '2.0.0');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('shorthand policy format', () => {
    it('should accept policy directly without wrapping in options', async () => {
      const app = express();
      app.use('/api', versionGate(testPolicy));
      app.get('/api/test', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/api/test')
        .set('x-app-platform', 'ios')
        .set('x-app-version', '2.2.0');

      expect(response.status).toBe(426);
    });
  });

  describe('case-insensitive platform matching', () => {
    it('should accept iOS with various casings', async () => {
      const app = createTestApp(testPolicy);

      const testCases = ['ios', 'iOS', 'IOS', 'Ios'];
      for (const platform of testCases) {
        const response = await request(app)
          .get('/api/test')
          .set('x-app-platform', platform)
          .set('x-app-version', '2.2.0');

        expect(response.status).toBe(426);
        expect(response.body.platform).toBe('ios');
      }
    });

    it('should accept Android with various casings', async () => {
      const app = createTestApp(testPolicy);

      const testCases = ['android', 'Android', 'ANDROID'];
      for (const platform of testCases) {
        const response = await request(app)
          .get('/api/test')
          .set('x-app-platform', platform)
          .set('x-app-version', '2.2.0');

        expect(response.status).toBe(426);
        expect(response.body.platform).toBe('android');
      }
    });
  });

  describe('malformed version handling', () => {
    it('should pass through when version is malformed', async () => {
      const app = createTestApp(testPolicy);

      const malformedVersions = ['abc', 'v2.3.0', 'beta', '', '   '];
      for (const version of malformedVersions) {
        const response = await request(app)
          .get('/api/test')
          .set('x-app-platform', 'ios')
          .set('x-app-version', version);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ success: true });
      }
    });

    it('should not set update header for malformed versions', async () => {
      const app = createTestApp(testPolicy);

      const response = await request(app)
        .get('/api/test')
        .set('x-app-platform', 'ios')
        .set('x-app-version', 'abc');

      expect(response.status).toBe(200);
      expect(response.headers['x-app-update']).toBeUndefined();
    });
  });
});
