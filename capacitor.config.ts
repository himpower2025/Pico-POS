import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Reverse-DNS app ID — must match the Bundle ID (iOS) / Application ID
  // (Android) you register in App Store Connect / Google Play Console.
  // Change this to your own domain before building for real.
  appId: 'com.himpower.picopos',
  appName: 'Pico POS',
  webDir: 'dist', // Vite's production build output
  server: {
    // During local development you can point this at the Vite dev server
    // for live reload on-device:
    // url: 'http://192.168.1.X:5173',
    // cleartext: true
  }
};

export default config;
