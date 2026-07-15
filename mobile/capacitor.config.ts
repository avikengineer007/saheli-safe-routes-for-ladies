import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saheli.saferoutes',
  appName: 'SAHELI Safe Routes',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
