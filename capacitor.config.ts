import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bbu1.app',
  appName: 'BBU1',
  webDir: 'public',
  server: {
    // POINT THIS to your live production URL where BBU1 is hosted
    url: 'https://www.bbu1.com', 
    cleartext: true
  }
};

export default config;