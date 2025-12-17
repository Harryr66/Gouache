import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'art.gouache.app',
  appName: 'Gouache',
  webDir: 'out',
  server: {
    // Point to your production URL - this allows API routes and dynamic routes to work
    url: process.env.CAPACITOR_SERVER_URL || 'https://gouache.art',
    cleartext: false, // Set to true only for local development with http://
    // For local development, uncomment:
    // url: 'http://localhost:3000',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#999999',
      splashFullScreen: true,
    },
  },
};

export default config;
