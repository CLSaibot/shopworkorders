import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const root = path.resolve(import.meta.dirname);
export default defineConfig({
  root,
  envDir: path.resolve(root, '..'),
  plugins: [react()],
  build: { outDir: path.resolve(root, '../dist'), emptyOutDir: true, chunkSizeWarningLimit: 1500 },
  server: { port: 5173, host: true },
});
