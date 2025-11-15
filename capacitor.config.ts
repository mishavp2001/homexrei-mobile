import type { CapacitorConfig } from '@capacitor/cli';

// Development mode: Set DEV_MODE=true to use live reload from web dev server
// Production mode: Leave DEV_MODE undefined to use built files from dist/
const DEV_MODE = process.env.DEV_MODE === 'true';

const config: CapacitorConfig = {
  appId: 'com.homexrei.app',
  appName: 'HomeXREI',
  webDir: 'dist',

  // In development mode, point to the web app's dev server for live reload
  // Make sure to run "npm run dev:web" in a separate terminal first
  ...(DEV_MODE && {
    server: {
      url: 'http://localhost:8080',
      cleartext: true
    }
  })
};

export default config;
