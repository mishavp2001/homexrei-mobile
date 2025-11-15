import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.homexrei.app',
  appName: 'HomeXREI',
  webDir: 'dist',
  server: {
    url: 'https://4b402f23-4f72-4f4f-8d78-cb27ebc1fc95.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
