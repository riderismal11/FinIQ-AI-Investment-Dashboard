import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { getServerConfig } from './server/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const config = getServerConfig({ ...process.env, ...env });

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: !config.disableHmr,
    },
  };
});
