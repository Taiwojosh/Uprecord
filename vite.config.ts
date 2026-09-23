import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@firebase/firestore': path.resolve(__dirname, './node_modules/@firebase/firestore/dist/lite/index.browser.esm.js'),
        '@babel/runtime/helpers/typeof': path.resolve(__dirname, './src/lib/babelTypeof.ts'),
        '@babel/runtime/helpers/slicedToArray': path.resolve(__dirname, './src/lib/babelSlicedToArray.ts'),
        '@babel/runtime/helpers/asyncToGenerator': path.resolve(__dirname, './src/lib/babelAsyncToGenerator.ts'),
        '@babel/runtime/helpers/defineProperty': path.resolve(__dirname, './src/lib/babelDefineProperty.ts'),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              if (req.headers.host) {
                proxyReq.setHeader('host', req.headers.host);
              }
            });
          },
        },
      },
    },
    preview: {
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              if (req.headers.host) {
                proxyReq.setHeader('host', req.headers.host);
              }
            });
          },
        },
      },
    },
    build: {
      target: ['es2021', 'chrome100', 'safari13']
    },
    envPrefix: ['VITE_', 'TAURI_'],
    test: {
      globals: true,
      environment: 'jsdom',
    },
  };
});
