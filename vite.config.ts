import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: {
        clientPort: 3000
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.WEBHOOK_URL': JSON.stringify(env.WEBHOOK_URL || env.VITE_WEBHOOK_URL || '')
    },
    resolve: {
      alias: {
        // path.resolve('.') resolves to the current working directory, avoiding usage of process.cwd() which caused type errors
        '@': path.resolve('.'),
      }
    }
  };
});