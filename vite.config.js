
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
    return {
        // Keep the existing GitHub Pages path by default. Cloud deployments
        // can set VITE_BASE_PATH=/ without changing local development.
        base: process.env.VITE_BASE_PATH || (process.env.VERCEL ? '/' : command === 'build' ? '/web/' : '/'),

        plugins: [react(), tailwindcss()],

        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },

        server: {
            // Default Vite client port for local development
            port: 5173,

            // Proxy requests to Express backend
            proxy: {
                '/api': {
                    target: 'http://localhost:5000',
                    changeOrigin: true,
                },
            },

            // HMR configuration
            hmr: process.env.DISABLE_HMR !== 'true',

            watch: process.env.DISABLE_HMR === 'true' ? null : {},
        },
    };
});
