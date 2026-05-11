import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'au.com.biologicenv.fieldmap',
  appName: 'Fieldmap',
  webDir: 'dist',
  // Default config — works for production builds
  // For local dev with hot reload on a real device, see README "Live reload" section
  ios: {
    contentInset: 'always',
    backgroundColor: '#1C4A50',
  },
  android: {
    backgroundColor: '#1C4A50',
  },
  plugins: {
    Geolocation: {
      // iOS will prompt with this string
    },
  },
};

export default config;
