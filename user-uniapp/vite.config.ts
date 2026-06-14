import { defineConfig } from 'vite';
import uniPluginModule from '@dcloudio/vite-plugin-uni';

const uni = typeof uniPluginModule === 'function' ? uniPluginModule : uniPluginModule.default;

export default defineConfig({
  plugins: [uni()],
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true
      }
    }
  }
});
