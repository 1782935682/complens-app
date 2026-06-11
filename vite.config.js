import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: './',
  publicDir: '../public',
  define: { __APP_NAME__: JSON.stringify(process.env.APP_NAME || '成分小查') },
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5173, open: false }
});
