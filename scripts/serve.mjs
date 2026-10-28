#!/usr/bin/env node
// Tiny static file server for local development. No dependencies, so
// `npm run dev` works on any machine that has Node.
//
//   node scripts/serve.mjs            -> http://localhost:5173
//   PORT=8080 node scripts/serve.mjs  -> http://localhost:8080

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT) || 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';

  // Resolve inside the project folder only.
  const file = normalize(join(root, pathname));
  if (!file.startsWith(root + sep) && file !== root) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let stat;
  try {
    stat = statSync(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
    return;
  }
  if (stat.isDirectory()) {
    res.writeHead(301, { Location: pathname + '/' }).end();
    return;
  }

  res.writeHead(200, {
    'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(res);
});

server.listen(port, () => {
  console.log(`potato-me is cooking at http://localhost:${port}/ (Ctrl+C to stop)`);
});
