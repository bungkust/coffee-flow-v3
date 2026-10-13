import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coffeeflow.app',
  appName: 'CoffeeFlow',
  webDir: 'dist',
  plugins: {
    // Every connection uses 'no-encryption'; the plugin otherwise defaults to encryption
    // on Android and fails to initialise when it cannot build a Keystore master key.
    CapacitorSQLite: {
      androidIsEncryption: false
    }
  }
};

export default config;
