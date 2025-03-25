import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 64853
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        Services: resolve(__dirname, 'Services.html'),
        Euc_visualiser: resolve(__dirname, 'euc-visualiser.html')
      }
    }
  }
});
