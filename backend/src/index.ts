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
