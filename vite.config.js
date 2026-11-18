import { defineConfig } from 'vite';
import { adminApi } from './tools/admin-api.mjs';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1200 },
  // The admin panel (admin.html) and its API only run under `npm run dev`. The build ships
  // index.html alone.
  plugins: [adminApi()],
  server: { watch: { ignored: ['**/.admin-backups/**'] } },
});
