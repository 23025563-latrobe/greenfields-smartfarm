import { defineConfig, loadEnv } from 'vite';
import process from 'node:process';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5184,
      strictPort: true,
      proxy: {
        '/api': env.API_PROXY_TARGET || 'http://localhost:3101'
      }
    }
  };
});
