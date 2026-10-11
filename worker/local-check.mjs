// Standalone smoke test: existing build + installed Wrangler; all upstream calls stay on loopback.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as pause } from 'node:timers/promises';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const site = 'https://store.solucionesmicaela.com';
const canonical = slug => `${site}/productos/${slug}`;
let mode = 'product'; let version = 1; let calls = 0;
const page = () => ({ type: mode === 'category' ? 'CATEGORY' : 'PRODUCT', name: `Producto local ${version}`,
  slug: 'local-nuevo', seoTitle: `SEO actual ${version} | MIQA`, seoDescription: 'Descripción SEO actual.',
  bodyDescription: 'Contenido público actualizado sin recompilar Angular.',
  image: { url: site + '/images/brand/logo-miqa3.png', altText: 'MIQA' },
  breadcrumbs: [{ name: 'Inicio', url: site + '/' }, { name: 'Productos', url: site + '/productos' }, { name: 'Producto local', url: canonical('local-nuevo') }],
  links: mode === 'category' ? [{ name: 'Producto publicado', url: canonical('producto-publicado') }] : [],
  canonicalUrl: canonical('local-nuevo'),
});
const xml = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + canonical('local-nuevo') + '</loc></url></urlset>';
const backend = createServer((incoming, response) => {
  calls++;
  assert.equal(incoming.method, 'GET');
  for (const header of ['cookie', 'authorization', 'x-private']) assert.equal(incoming.headers[header], undefined);
  assert.ok(['/api/public/seo/pages/local-nuevo', '/api/public/seo/sitemap.xml'].includes(incoming.url));
  if (incoming.url.endsWith('sitemap.xml')) { response.writeHead(200, { 'Content-Type': 'application/xml' }); response.end(xml); return; }
  if (/^error-/.test(mode)) { response.writeHead(Number(mode.slice(6)), { 'Set-Cookie': 'private=local-only' }); response.end('private'); return; }
  if (mode === 'alias' || mode === 'external-alias') {
    response.writeHead(301, { Location: mode === 'alias' ? canonical('destino-publico') : 'https://external.example/productos/x' }); response.end(); return;
  }
  response.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': 'private=local-only' });
  if (mode === 'slow-body') { response.write('{'); return; }
  response.end(mode === 'invalid' ? '{invalid' : JSON.stringify(page()));
});

await readFile('dist/miqa-store-frontend/browser/index.csr.html'); // Never build implicitly.
await mkdir('.tmp/catalog-worker', { recursive: true });
const portProbe = createServer();
portProbe.listen(0, '127.0.0.1');
await once(portProbe, 'listening');
const port = portProbe.address().port;
await new Promise(done => portProbe.close(done));
backend.listen(0, '127.0.0.1');
await once(backend, 'listening');
const backendOrigin = `http://127.0.0.1:${backend.address().port}`;
const childEnv = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false',
  XDG_CONFIG_HOME: resolve('.tmp/catalog-worker/config'), WRANGLER_LOG_PATH: resolve('.tmp/catalog-worker/logs') };
for (const key of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']) delete childEnv[key];
const wrangler = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--local', '--ip', '127.0.0.1',
  '--port', String(port), '--inspector-port', '0',
  '--var', `SEO_PAGES_BACKEND_BASE_URL:${backendOrigin}/api/public/seo/pages`,
  '--var', `SITEMAP_BACKEND_URL:${backendOrigin}/api/public/seo/sitemap.xml`,
], { cwd: process.cwd(), env: childEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
wrangler.stdout.resume(); wrangler.stderr.resume();
const base = `http://127.0.0.1:${port}`;
const get = (path = '/productos/local-nuevo', options = {}) => fetch(base + path, { ...options, redirect: 'manual', signal: AbortSignal.timeout(15_000) });
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (wrangler.exitCode !== null) throw new Error('Wrangler failed to start; review local .tmp/catalog-worker/logs.');
    try { ready = (await get('/robots.txt')).ok; } catch { /* waiting for local runtime */ }
    if (ready) break;
    await pause(200);
  }
  assert.ok(ready, 'Local Wrangler did not become ready.');
  const csr = await get('/index.csr');
  assert.equal(csr.status, 200);
  assert.equal(await csr.text(), await readFile('dist/miqa-store-frontend/browser/index.csr.html', 'utf8'));
  const response = await get('/productos/local-nuevo?secret=visitor', { headers: { Cookie: 'private=visitor', Authorization: 'Bearer local-only', 'X-Private': 'visitor' } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /SEO actual 1/);
  assert.match(html, /<app-root><\/app-root>/);
  assert.match(html, /data-miqa-catalog-seo/);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Set-Cookie'), null);
  await writeFile('.tmp/catalog-worker/product.html', html);
  version++;
  assert.match(await (await get()).text(), /SEO actual 2/);
  const head = await get(undefined, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  mode = 'category';
  const category = await get();
  assert.equal(category.status, 200);
  const categoryHtml = await category.text();
  assert.match(categoryHtml, /Producto publicado/);
  await writeFile('.tmp/catalog-worker/category.html', categoryHtml);
  const before405 = calls;
  assert.equal((await get(undefined, { method: 'POST' })).status, 405);
  assert.equal(calls, before405);
  mode = 'alias';
  const alias = await get();
  assert.equal(alias.status, 301);
  // Wrangler local rewrites same-site Location to its local origin. Native/unit tests assert the production URL.
  assert.equal(new URL(alias.headers.get('Location')).pathname, '/productos/destino-publico');
  assert.ok([site, base].includes(new URL(alias.headers.get('Location')).origin));
  mode = 'external-alias';
  assert.equal((await get()).status, 502);
  mode = 'invalid';
  assert.equal((await get()).status, 502);
  for (const status of [404, 500, 502, 503, 504]) {
    mode = `error-${status}`;
    const error = await get();
    assert.equal(error.status, status);
    assert.doesNotMatch(await error.text(), /private|app-root/);
    assert.equal(error.headers.get('Cache-Control'), 'no-store');
    assert.equal(error.headers.get('Set-Cookie'), null);
  }
  mode = 'slow-body';
  const started = Date.now();
  assert.equal((await get()).status, 504);
  assert.ok(Date.now() - started >= 9800 && Date.now() - started < 13_000);
  mode = 'product';
  const beforeAssets = calls;
  for (const path of ['/robots.txt', '/images/brand/logo-miqa3.png', '/productos', '/']) assert.equal((await get(path)).status, 200);
  const slash = await get('/productos/');
  assert.equal(slash.status, 307);
  assert.equal(new URL(slash.headers.get('Location'), base).pathname, '/productos');
  const newSlash = await get('/productos/local-nuevo/?buscar=vinil');
  assert.equal(newSlash.status, 307);
  assert.equal(newSlash.headers.get('Location'), '/productos/local-nuevo?buscar=vinil');
  assert.equal((await get('/unknown-local-route')).status, 200);
  assert.equal(calls, beforeAssets);
  for (const method of ['GET', 'HEAD']) {
    const sitemap = await get('/sitemap.xml', { method });
    assert.equal(sitemap.status, 200);
    assert.equal(sitemap.headers.get('Cache-Control'), 'no-store');
    assert.equal(await sitemap.text(), method === 'GET' ? xml : '');
  }
  backend.closeAllConnections();
  await new Promise(done => backend.close(done));
  assert.equal((await get()).status, 502);
  console.log('PASS: Wrangler local; real CSR, fresh product/category HTML, GET/HEAD, privacy, 301/307/404/405/500/502/503/504, real 10s body timeout, assets/SPA and sitemap GET/HEAD. Only loopback backend; no build or production requests.');
} finally {
  backend.closeAllConnections(); backend.close();
  wrangler.kill();
  await Promise.race([once(wrangler, 'exit'), pause(4000)]);
}
