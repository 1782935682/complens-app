import { defineConfig } from 'vite';
import uniPluginModule from '@dcloudio/vite-plugin-uni';

const uni = typeof uniPluginModule === 'function' ? uniPluginModule : uniPluginModule.default;
const publicUserApiBaseUrl = String(process.env.USER_API_BASE_URL || '').trim();

export default defineConfig({
  plugins: [uni()],
  define: {
    __COMPLENS_USER_API_BASE_URL__: JSON.stringify(publicUserApiBaseUrl)
  },
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
