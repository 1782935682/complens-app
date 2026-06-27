import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { getConfig } from './config.js';

const config = getConfig();
const app = createApp(config);

serve({
  fetch: app.fetch,
  hostname: config.host,
  port: config.port
});

console.log(`CompCheck API listening on http://${config.host}:${config.port}`);

if (process.env.API_IGNORE_SIGTERM === '1') {
  process.on('SIGTERM', () => {
    console.error('CompCheck API ignored SIGTERM because API_IGNORE_SIGTERM=1.');
  });
}

if (process.env.API_HEARTBEAT === '1') {
  setInterval(() => {
    console.log(`api heartbeat ${new Date().toISOString()} http://${config.host}:${config.port}/health`);
  }, 30_000).unref();
}
