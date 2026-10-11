// Browser integration check against an existing offline build. Every external request is intercepted.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const site = 'https://store.solucionesmicaela.com';
const root = resolve('dist/miqa-store-frontend/browser');
const output = resolve('.tmp/catalog-handoff');
await mkdir(output, { recursive: true });
const template = await readFile(resolve(root, 'index.csr.html'), 'utf8');
const category = { slug: 'categoria-local', name: 'Categoría local', catalogHeadline: 'Categoría actual', catalogDescription: 'Descripción actual de categoría.' };
const product = { id: 'local-only', slug: 'producto-local', name: 'Producto actual',
  category, description: 'Descripción pública actual.', shortDescription: 'Resumen actual.',
  image: null, published: true, featured: false, saleType: 'QUANTITY', unitLabel: 'unidad',
  seoTitle: 'Título actual | MIQA', seoDescription: 'SEO actual personalizado.', minQuantity: 1, step: 1 };
const dto = slug => ({ type: slug === category.slug ? 'CATEGORY' : 'PRODUCT', slug,
  name: slug === category.slug ? category.name : 'Producto inicial',
  seoTitle: 'Título inicial | MIQA', seoDescription: 'SEO inicial.', bodyDescription: 'Contenido del Worker.', image: null,
  canonicalUrl: `${site}/productos/${slug}`,
  breadcrumbs: [{ name: 'Inicio', url: site + '/' }, { name: 'Productos', url: site + '/productos' }, { name: 'Inicial', url: `${site}/productos/${slug}` }],
  links: slug === category.slug ? [{ name: 'Producto inicial', url: `${site}/productos/${product.slug}` }] : [] });
const modules = await Promise.all(['index.mjs', 'router.mjs', 'catalog-pages.mjs', 'sitemap-proxy.mjs'].map(async name => ({
  type: 'ESModule', path: resolve('worker', name), contents: await readFile(resolve('worker', name), 'utf8') })));
const mf = new Miniflare(convertV4MiniflareOptions({ modules, modulesRoot: resolve('worker'), compatibilityDate: '2026-09-11', cf: false,
  bindings: { SEO_PAGES_BACKEND_BASE_URL: 'http://127.0.0.1:8099/api/public/seo/pages' },
  outboundService: async request => new Response(JSON.stringify(dto(new URL(request.url).pathname.split('/').at(-1))), { headers: { 'Content-Type': 'application/json' } }),
  serviceBindings: { ASSETS: async () => new Response(template, { headers: { 'Content-Type': 'text/html' } }) } }));
const html = Object.fromEntries(await Promise.all([product.slug, category.slug].map(async slug => [slug,
  await (await mf.dispatchFetch(`${site}/productos/${slug}`)).text()])));
await mf.dispose();
const server = createServer(async (incoming, response) => {
  const pathname = new URL(incoming.url, 'http://localhost').pathname;
  const slug = pathname.split('/').at(-1);
  if (html[slug] && pathname === `/productos/${slug}`) {
    response.writeHead(200, { 'Content-Type': 'text/html' }); response.end(html[slug]); return;
  }
  const file = resolve(root, pathname === '/productos/vinil-impreso' ? 'productos/vinil-impreso/index.html' : '.' + pathname);
  if (!file.startsWith(root + sep)) { response.writeHead(404); response.end(); return; }
  try {
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon' })[extname(file)] || 'application/octet-stream' });
    response.end(bytes);
  } catch { response.writeHead(404); response.end(); }
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
const port = probe.address().port; await new Promise(done => probe.close(done));
const edge = spawn(process.env.MIQA_EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-background-networking', `--remote-debugging-port=${port}`, '--user-data-dir=' + resolve(output, 'edge'), 'about:blank'],
  { windowsHide: true, stdio: 'ignore' });
const watchdog = setTimeout(() => { edge.kill(); server.closeAllConnections(); server.close(); process.exit(1); }, 55_000);
let ws;
try {
  let tabs;
  for (let attempt = 0; attempt < 80; attempt++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await pause(100); }
  }
  assert.ok(tabs, 'Local Edge CDP unavailable');
  ws = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl); await once(ws, 'open');
  let id = 0; const pending = new Map(); const errors = []; const blocked = []; let mode = 'public'; let held = []; let categoryCalls = 0;
  const call = (method, params = {}) => new Promise((fulfill, reject) => {
    pending.set(++id, { fulfill, reject }); ws.send(JSON.stringify({ id, method, params }));
  });
  const apiResponse = async (requestId, request) => {
    const url = new URL(request.url); assert.equal(request.method, 'GET');
    if (mode === 'network' || (mode === 'category-network' && url.pathname === '/api/public/categories')) {
      await call('Fetch.failRequest', { requestId, errorReason: 'ConnectionFailed' }); return;
    }
    let body; let status = 200;
    if (url.pathname === '/api/public/categories') body = mode === 'category-gone'
      || (mode === 'category-retired-products-error' && categoryCalls++ > 0) ? [] : [category];
    else if (url.pathname === '/api/public/products') {
      if (mode === 'category-retired-products-error') { status = 503; body = {}; } else body = [product];
    }
    else if (url.pathname === `/api/public/products/${product.slug}`) {
      if (mode === 'gone') { status = 404; body = {}; }
      else body = mode === 'unpublished' ? { ...product, published: false } : product;
    } else { status = 404; body = {}; }
    await call('Fetch.fulfillRequest', { requestId, responseCode: status,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: base }],
      body: Buffer.from(JSON.stringify(body)).toString('base64') });
  };
  ws.addEventListener('message', async event => {
    const message = JSON.parse(event.data);
    if (message.id) { const entry = pending.get(message.id); pending.delete(message.id); message.error ? entry.reject(message.error) : entry.fulfill(message.result); return; }
    if (message.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(message.params.exceptionDetails));
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg => arg.value || arg.description).join(' '));
    if (message.method !== 'Fetch.requestPaused') return;
    const { requestId, request } = message.params; const url = new URL(request.url);
    try {
      if (url.origin === base) { await call('Fetch.continueRequest', { requestId }); return; }
      if (url.origin === 'https://api-store.solucionesmicaela.com') {
        if (mode === 'loading' || (mode === 'product-loading' && url.pathname === `/api/public/products/${product.slug}`)
          || (mode === 'category-loading' && url.pathname === '/api/public/products')) {
          held.push([requestId, request]); return;
        }
        await apiResponse(requestId, request); return;
      }
      blocked.push(url.origin); await call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
    } catch (error) { errors.push(String(error)); await call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(() => {}); }
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails)); return result.result.value;
  };
  const until = async expression => {
    for (let attempt = 0; attempt < 120; attempt++) { if (await evaluate(expression)) return; await pause(50); }
    console.error(await evaluate('({focus:document.activeElement?.outerHTML?.slice(0,300),path:location.pathname,headings:[...document.querySelectorAll("app-root h1")].map(e=>e.textContent)})'));
    throw Error('Browser condition not reached: ' + expression);
  };
  await call('Page.enable'); await call('Runtime.enable'); await call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  const results = []; const axe = await readFile(process.env.MIQA_AXE_PATH || '.tmp/axe.min.js', 'utf8');
  async function audit(name) {
    await evaluate(axe);
    const result = await evaluate('axe.run(document).then(r=>({violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),canonical:document.querySelectorAll("link[rel=canonical]").length,description:document.querySelectorAll("meta[name=description]").length,jsonLd:document.querySelectorAll("script[type=\\"application/ld+json\\"]").length}))');
    results.push({ name, ...result }); assert.deepEqual(result.violations, [], name); assert.equal(result.canonical, 1); assert.equal(result.description, 1);
  }
  for (const slug of [product.slug, category.slug]) {
    await call('Emulation.setScriptExecutionDisabled', { value: true });
    await call('Page.navigate', { url: `${base}/productos/${slug}` }); await pause(250);
    await call('Emulation.setScriptExecutionDisabled', { value: false }); // Parsing completed without bootstrap.
    assert.equal(await evaluate('!!document.querySelector("#miqa-catalog-seo")'), true);
    assert.equal(await evaluate('document.querySelector("app-root").childElementCount'), 0);
    await audit('javascript-disabled-' + slug);
  }
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    for (const slug of [product.slug, category.slug]) {
      mode = 'loading'; held = [];
      await call('Page.navigate', { url: `${base}/productos/${slug}` });
      await until('!!document.querySelector("#miqa-catalog-seo") && document.querySelector("app-root").childElementCount > 0');
      assert.equal(await evaluate('document.title'), 'Título inicial | MIQA');
      // Focus survives a confirmed replacement; an unrelated focus must not be moved.
      await evaluate('document.querySelector("#miqa-catalog-seo a").focus()');
      mode = 'public'; for (const entry of held.splice(0)) await apiResponse(...entry);
      await until('!document.querySelector("#miqa-catalog-seo")');
      await until('document.activeElement.id === "catalog-content"');
      assert.equal(await evaluate('document.querySelectorAll("app-root h1").length'), 1);
      await audit(`confirmed-${slug}-${width}`);
      assert.equal(results.at(-1).jsonLd, 1);
    }
  }
  for (const [scenario, slug, selector] of [['product-loading', product.slug, 'app-product-detail'], ['category-loading', category.slug, 'app-catalog']]) {
    mode = scenario; held = [];
    await call('Page.navigate', { url: `${base}/productos/${slug}` });
    await until(`!!document.querySelector('${selector}') && !!document.querySelector('#miqa-catalog-seo')`);
    assert.equal(await evaluate('document.title'), 'Título inicial | MIQA');
    await audit(scenario);
    mode = 'public'; for (const entry of held.splice(0)) await apiResponse(...entry);
    await until('!document.querySelector("#miqa-catalog-seo")');
  }
  for (const scenario of ['network', 'category-network', 'gone', 'unpublished', 'category-gone', 'category-retired-products-error']) {
    mode = scenario; categoryCalls = 0; const slug = scenario.startsWith('category-') && scenario !== 'category-network' ? category.slug : product.slug;
    await call('Page.navigate', { url: `${base}/productos/${slug}` });
    const retain = scenario.includes('network');
    await until(retain ? '!!document.querySelector("#miqa-catalog-seo [data-miqa-catalog-status]")' : '!document.querySelector("#miqa-catalog-seo") && !!document.querySelector("app-root h1")');
    assert.equal(await evaluate('!!document.querySelector("#miqa-catalog-seo")'), retain);
    if (retain) assert.equal(await evaluate('document.title'), 'Título inicial | MIQA');
    else assert.equal(await evaluate('document.querySelector("meta[name=robots]").content'), 'noindex,follow');
    await audit(scenario); if (!retain) assert.equal(results.at(-1).jsonLd, 0);
  }
  mode = 'public';
  await call('Page.navigate', { url: `${base}/productos/${product.slug}` }); await until('!document.querySelector("#miqa-catalog-seo") && document.title === "Título actual | MIQA"');
  await evaluate('document.querySelector("app-header a.category-link").click()'); await until('location.pathname === "/productos/categoria-local" && !!document.querySelector("app-catalog")');
  await evaluate('document.querySelector(".catalog-card a").click()'); await until('location.pathname === "/productos/producto-local" && !!document.querySelector("app-product-detail #product-title")');
  await audit('product-category-product-navigation');
  mode = 'network';
  await call('Page.navigate', { url: `${base}/productos/${product.slug}` });
  await until('!!document.querySelector("#miqa-catalog-seo [data-miqa-catalog-status]")');
  mode = 'public';
  await evaluate('document.querySelector("app-header a.brand").click()');
  await until('location.pathname === "/" && !document.querySelector("#miqa-catalog-seo") && !!document.querySelector("app-home")');
  await audit('leave-fallback-for-home');
  await call('Page.navigate', { url: `${base}/productos/vinil-impreso` });
  await until('location.pathname === "/productos/vinil-impreso" && document.querySelector("#product-title")?.textContent?.includes("no está disponible")');
  assert.equal(await evaluate('!!document.querySelector("#miqa-catalog-seo")'), false);
  await audit('prerender-hydration-with-live-404');
  assert.ok(!errors.some(error => /NG05\d\d|hydration|ExpressionChangedAfterItHasBeenChecked|NG0100/i.test(error)), errors.join('\n'));
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ results, errors, blocked, externalRequests: 'intercepted; never sent' }, null, 2));
  console.log(JSON.stringify({ audits: results.length, axeViolations: 0, hydrationErrors: 0, scenarios: 'confirmed, loading, focus, network, 404, unpublished, category-gone, navigation, JavaScript disabled', externalRequests: 'blocked' }));
  await call('Browser.close');
} finally { clearTimeout(watchdog); ws?.close(); edge.kill(); server.closeAllConnections(); server.close(); }
