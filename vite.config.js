import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
<<<<<<< Updated upstream
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
=======
    plugins: [plugin()],
    
    build: {
        rollupOptions: {
            input: {
                // Main page compile (not sure why but I'll have to put the whole thing in for now)
                main: 'index.html',
                about: 'about.html',
                services: 'Services.html',
                // Apps for EUC
                eucVisualiser: 'euc-visualiser.html'
            }
        }
    },
    
    server: {
        port: 64853,
>>>>>>> Stashed changes
    }
  }
});
