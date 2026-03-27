import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [plugin()],
    
    build: {
        rollupOptions: {
            input: {
                // Main page compile (not sure why but I'll have to put the whole thing in for now)
                main: 'index.html',
                about: 'about.html',
                services: 'Services.html',
                projects: 'projects.html',
                projectTemplate: 'project-template.html',
                project1: 'project1.html',
                project2: 'project2.html',
                project3: 'project3.html',
                // Apps for EUC
                eucVisualiser: 'euc-visualiser.html'
            }
        }
    },
    
    server: {
        port: 64853,
    }
})
