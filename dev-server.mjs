/**
 * Dev server: static files, no caching, correct MIME types.
 * Fixes python http.server's missing Cache-Control, which made the browser
 * serve stale .js/.css after edits.
 *
 * Usage: node dev-server.mjs [port]
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(process.argv[3] || '.');
const ROOT_REAL = fs.realpathSync(ROOT);
const PORT = Number(process.argv[2] || 8000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export function isAllowedRelativePath(relativePath) {
  const parts = relativePath.split(/[\\/]+/).filter(Boolean).map(part => part.toLowerCase());
  if (!parts.length || parts.some(part => part === '..' || part.startsWith('.'))) return false;
  if (parts.length === 1) return parts[0] === 'index.html';
  if (!['assets', 'css', 'js'].includes(parts[0])) return false;
  return !(parts[0] === 'assets' && parts[1] === 'user-media');
}

export function resolveStaticPath(root, urlPath) {
  const rootPath = path.resolve(root);
  const filePath = path.resolve(rootPath, `.${urlPath}`);
  const relativePath = path.relative(rootPath, filePath);
  if (!relativePath || relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    return null;
  }
  return isAllowedRelativePath(relativePath) ? filePath : null;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
    return;
  }

  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }

  if (urlPath.includes('\0')) {
    res.writeHead(400).end('Bad request');
    return;
  }

  const filePath = resolveStaticPath(ROOT_REAL, urlPath === '/' ? '/index.html' : urlPath);
  if (!filePath) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.realpath(filePath, (realPathError, realPath) => {
    if (realPathError) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }

    const relativePath = path.relative(ROOT_REAL, realPath);
    if (!isAllowedRelativePath(relativePath)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    fs.readFile(realPath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(realPath).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`dev server → http://127.0.0.1:${PORT}  (root: ${ROOT_REAL}, no-cache)`);
  });
}
