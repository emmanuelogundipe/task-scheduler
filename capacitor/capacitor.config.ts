import type { CapacitorConfig } from '@capacitor/cli';

// Odyssey Scheduler — Android app wrapper.
//
// The native app loads the live deployed site inside a secure native
// webview (https), so the APK always runs the latest version without
// needing to be rebuilt or redistributed.
//
// Change `server.url` if you deploy to a different domain.
const config: CapacitorConfig = {
  appId: 'com.odyssey.scheduler',
  appName: 'Odyssey Scheduler',
  webDir: 'www',
  server: {
    url: 'https://odyssey-scheduler.onrender.com',
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
