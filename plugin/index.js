/** Static route infrastructure adapted from Open Sea Skin v1.2.5 (MIT).
 * Copyright (c) 2026 Open Sea Skin contributors. See THIRD_PARTY_NOTICES.md.
 * All meadow UI, artwork and rendering are independent implementations.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const name = 'dsh-open-meadow';
export const inject = ['webServer'];
const root = new URL('../dist/', import.meta.url);
const assets = new Map([
  ['scene.html', 'text/html; charset=utf-8'],
  ['scene.css', 'text/css; charset=utf-8'],
  ['renderer.js', 'text/javascript; charset=utf-8'],
  ['settings.js', 'text/javascript; charset=utf-8'],
  ['ui.css', 'text/css; charset=utf-8'],
  ['coast.webp', 'image/webp'],
  ['cloud.png', 'image/png'],
]);

export async function serveAsset(req, res) {
  const finish = (status, headers = {}, body) => {
    res.writeHead(status, {'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers});
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  if (!['GET', 'HEAD'].includes(req.method)) return finish(405, {allow: 'GET, HEAD'});
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://local.invalid').pathname); }
  catch { return finish(400); }
  if (path.includes('\0') || path.includes('\\') || path.includes('..')) return finish(403);
  if (path !== '/open-meadow' && !path.startsWith('/open-meadow/')) return finish(404);
  const key = path === '/open-meadow' || path === '/open-meadow/' ? 'scene.html' : path.slice('/open-meadow/'.length);
  if (!assets.has(key)) return finish(404);
  try {
    const body = await readFile(fileURLToPath(new URL(key, root)));
    return finish(200, {'content-type': assets.get(key), 'content-length': String(body.length)}, body);
  } catch (error) {
    if (['ENOENT', 'EISDIR'].includes(error.code)) return finish(404);
    console.warn('[Open Meadow] Local asset unavailable:', key, error.code);
    return finish(500);
  }
}

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({kind: 'prefix', path: '/open-meadow', handler: serveAsset}), 'open-meadow: local assets');
}
