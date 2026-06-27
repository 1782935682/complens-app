import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const port = Number.parseInt(getArg('--port') || process.env.PORT || '5180', 10);
const dir = resolve(getArg('--dir') || 'user-uniapp/dist/build/h5');
const host = getArg('--host') || process.env.HOST || '127.0.0.1';
const apiOrigin = normalizeOrigin(getArg('--api-origin') || process.env.API_ORIGIN || '');
const ignoreSigterm = process.argv.includes('--ignore-sigterm') || process.env.H5_IGNORE_SIGTERM === '1';

if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid --port: ${port}`);
}
if (!existsSync(join(dir, 'index.html'))) {
  throw new Error(`H5 build not found at ${dir}. Run npm run user:build:h5 first.`);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);
    if (apiOrigin && url.pathname.startsWith('/api/')) {
      await proxyApi(request, response, url);
      return;
    }
    const filePath = resolveFile(url.pathname);
    if (!filePath) {
      sendStatus(response, 403, 'Forbidden');
      return;
    }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      sendFile(response, join(dir, 'index.html'));
      return;
    }
    sendFile(response, filePath);
  } catch (error) {
    if (!response.headersSent) sendStatus(response, 500, `H5 server failed: ${error.message}`);
    else response.end();
  }
});

server.listen(port, host, () => {
  console.log(`Product review H5 server listening at http://${host}:${port}/`);
  console.log(`Serving ${dir}`);
  if (apiOrigin) console.log(`Proxying /api/* to ${apiOrigin}`);
});

server.on('error', (error) => {
  console.error(`h5-server error: ${error.message}`);
  process.exitCode = 1;
});

server.on('clientError', (error, socket) => {
  console.error(`h5-server client error: ${error.message}`);
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

if (ignoreSigterm) {
  process.on('SIGTERM', () => {
    console.error('h5-server ignored SIGTERM because --ignore-sigterm is enabled.');
  });
}

setInterval(() => {
  console.log(`h5-server heartbeat ${new Date().toISOString()} http://${host}:${port}/`);
}, 30_000).unref();

function getArg(name) {
  const prefix = `${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

function normalizeOrigin(value) {
  const text = String(value || '').trim().replace(/\/+$/, '');
  if (!text) return '';
  const url = new URL(text);
  return url.origin;
}

function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname.split('?')[0] || '/');
  const relative = normalize(decoded).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]/, '');
  const filePath = resolve(dir, relative || 'index.html');
  if (filePath !== dir && !filePath.startsWith(`${dir}${sep}`)) return '';
  if (existsSync(filePath) && statSync(filePath).isDirectory()) return join(filePath, 'index.html');
  return filePath;
}

function sendFile(response, filePath) {
  response.writeHead(200, {
    'Content-Type': contentType(filePath),
    'Cache-Control': 'no-store'
  });
  const stream = createReadStream(filePath);
  stream.on('error', (error) => {
    console.error(`h5-server file stream error: ${error.message}`);
    if (!response.headersSent) sendStatus(response, 500, 'Unable to read file');
    else response.end();
  });
  stream.pipe(response);
}

function sendStatus(response, status, message) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(message);
}

async function proxyApi(request, response, url) {
  const target = `${apiOrigin}${url.pathname}${url.search}`;
  try {
    const headers = { ...request.headers };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];
    const body = ['GET', 'HEAD'].includes(request.method || 'GET') ? undefined : await readRequestBody(request);
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body
    });
    const responseHeaders = {};
    upstream.headers.forEach((value, key) => {
      if (!['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });
    responseHeaders['Cache-Control'] = 'no-store';
    response.writeHead(upstream.status, responseHeaders);
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    response.writeHead(502, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    response.end(JSON.stringify({
      error: 'api_proxy_unavailable',
      message: `API proxy failed: ${error.message}`
    }));
  }
}

function readRequestBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolveBody(Buffer.concat(chunks)));
    request.on('error', rejectBody);
  });
}

function contentType(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}
