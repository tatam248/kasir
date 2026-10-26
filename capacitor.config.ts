import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'id.kasirpro.app',
  appName: 'KasirPro POS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true, // Izinkan koneksi HTTP ke IP PC lokal (contoh: http://192.168.1.100:3000)
  },
};

export default config;
