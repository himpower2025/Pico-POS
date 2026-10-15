import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Must match the Bundle ID (iOS) / Application ID (Android) registered in
  // App Store Connect and Google Play Console. Changing it after release
  // means a different app, so lock it down now.
  appId: 'com.himpower.picopos',
  appName: 'Pico POS',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      // CRITICAL: with skipNativeAuth the plugin only fetches the provider
      // credential and does NOT create a native Firebase session. We then
      // feed that credential into the Firebase JS SDK ourselves.
      //
      // This has to be true, because Firestore and Cloud Functions in this
      // app run through the JS SDK — they read the JS SDK's auth state. If
      // the plugin signed in natively instead, the user would appear logged
      // in while every Firestore read failed with permission-denied.
      skipNativeAuth: true,
      providers: ['google.com', 'apple.com']
    }
  },
  server: {
    // For on-device live reload during development, point this at your Mac's
    // LAN address and re-run `npx cap sync`:
    //   url: 'http://192.168.1.X:5173',
    //   cleartext: true
    // MUST be removed (or commented out) before any release build.
  }
};

export default config;