# app-version-gate

Server-side minimum app version enforcement for React Native and Expo apps. Stop scraping app stores from the client—let your API tell outdated clients to update.

## Why?

Client-side version checks (e.g., `react-native-version-check`) break when stores redesign their pages. The maintainers of those libraries now recommend building your own API ([issue #93](https://github.com/kimxogus/react-native-version-check/issues/93)). This package does exactly that: clean, reliable server-side version gating with zero runtime dependencies.

## Installation

```bash
npm install app-version-gate
```

## Usage

### Express Middleware

```typescript
import express from 'express';
import { versionGate } from 'app-version-gate';

const app = express();

app.use('/api', versionGate({
  ios: {
    min: '2.3.0',
    recommended: '2.5.0',
    storeUrl: 'https://apps.apple.com/app/id123456',
  },
  android: {
    min: '2.3.0',
    recommended: '2.5.0',
    storeUrl: 'https://play.google.com/store/apps/details?id=com.example.app',
  },
}));

app.get('/api/data', (req, res) => {
  res.json({ message: 'Hello from API' });
});

app.listen(3000);
```

### Standalone Evaluation

```typescript
import { evaluate } from 'app-version-gate';

const policy = {
  ios: {
    min: '2.3.0',
    recommended: '2.5.0',
    storeUrl: 'https://apps.apple.com/app/id123456',
  },
};

const result = evaluate(policy, 'ios', '2.2.9');
// => 'force' (version is below minimum)

const result2 = evaluate(policy, 'ios', '2.4.0');
// => 'soft' (version is below recommended but meets minimum)

const result3 = evaluate(policy, 'ios', '2.5.0');
// => 'ok' (version meets recommended)
```

## How It Works

### Force Updates (426 Response)

When a client's version is below `min`, the middleware responds with HTTP 426 (Upgrade Required):

```json
{
  "error": "APP_UPDATE_REQUIRED",
  "platform": "ios",
  "currentVersion": "2.2.9",
  "minVersion": "2.3.0",
  "storeUrl": "https://apps.apple.com/app/id123456"
}
```

### Soft Updates (Response Header)

When a client's version is below `recommended` but meets `min`, the middleware sets a response header:

```
X-App-Update: recommended
```

The request continues normally, allowing your client to show a dismissible update prompt.

### Pass-Through

Requests pass through without blocking when:
- Headers are missing
- The platform is unknown
- No policy is defined for that platform
- The version is malformed (e.g., `'abc'`, empty, or missing a leading digit)

This ensures web clients, health checks, and clients with version-reporting bugs aren't locked out.

## Client Setup

### Send Required Headers

Your React Native or Expo app must send two headers with every API request:

- `x-app-platform`: `'ios'` or `'android'` (case-insensitive: `'iOS'`, `'Android'` work too)
- `x-app-version`: the app version (e.g., `'2.3.0'`)

```typescript
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const appVersion = Constants.expoConfig?.version || '0.0.0';
const platform = Platform.OS; // 'ios' or 'android'

fetch('https://api.example.com/data', {
  headers: {
    'x-app-platform': platform,
    'x-app-version': appVersion,
  },
});
```

For bare React Native apps, use `react-native-device-info` or similar to get the version.

### Handle Update Responses

```typescript
import * as Linking from 'expo-linking';

async function fetchWithVersionCheck(url: string, options = {}) {
  const response = await fetch(url, options);

  // Force update
  if (response.status === 426) {
    const data = await response.json();
    Alert.alert(
      'Update Required',
      `Please update to version ${data.minVersion} to continue using the app.`,
      [
        {
          text: 'Update',
          onPress: () => Linking.openURL(data.storeUrl),
        },
      ],
      { cancelable: false }
    );
    throw new Error('APP_UPDATE_REQUIRED');
  }

  // Soft update
  const updateHeader = response.headers.get('x-app-update');
  if (updateHeader === 'recommended') {
    Alert.alert(
      'Update Available',
      'A new version is available. Update now for the best experience.',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => {
            // Use your app's store URL from a config or fetch from API
            Linking.openURL('https://apps.apple.com/app/id123456');
          },
        },
      ]
    );
  }

  return response;
}
```

## Configuration Options

### Custom Headers

```typescript
versionGate({
  policy: { /* ... */ },
  platformHeader: 'x-custom-platform',
  versionHeader: 'x-custom-version',
  updateHeader: 'X-Custom-Update',
});
```

### Custom Client Extraction

```typescript
versionGate({
  policy: { /* ... */ },
  getClient: (req) => {
    const userAgent = req.headers['user-agent'] || '';
    const match = userAgent.match(/MyApp\/([\d.]+) (iOS|Android)/);
    if (match) {
      return {
        version: match[1],
        platform: match[2].toLowerCase() as 'ios' | 'android',
      };
    }
    return null;
  },
});
```

## API Reference

### `versionGate(options)`

Express middleware factory.

**Options:**
- `policy` (required): Version gate policy for `ios` and/or `android`
- `platformHeader` (optional): Header name for platform (default: `'x-app-platform'`)
- `versionHeader` (optional): Header name for version (default: `'x-app-version'`)
- `updateHeader` (optional): Response header name for soft updates (default: `'X-App-Update'`)
- `getClient` (optional): Custom function to extract client info from request

**Shorthand:** Pass the policy object directly:

```typescript
app.use(versionGate({
  ios: { min: '2.3.0', storeUrl: '...' },
}));
```

### `evaluate(policy, platform, version)`

Pure function to evaluate version requirements.

**Returns:** `'force'` | `'soft'` | `'ok'`

## License

MIT © Salman Khan
