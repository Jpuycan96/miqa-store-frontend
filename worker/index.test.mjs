import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createWorker, SITEMAP_TIMEOUT_MS } from './sitemap-proxy.mjs';

const ORIGIN = 'https://store.solucionesmicaela.com';
const BACKEND = 'https://api-store.solucionesmicaela.com/api/public/seo/sitemap.xml';
const XML = '<?xml version="1.0" encoding="UTF-8"?>' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
  `<url><loc>${ORIGIN}/</loc></url>` +
  `<url><loc>${ORIGIN}/productos/bolsas-liner</loc></url></urlset>`;
const env = {
  SITEMAP_BACKEND_URL: BACKEND,
  ASSETS: { fetch() { assert.fail('Sitemap must not fall back to static assets'); } },
};
const request = (method = 'GET', path = '/sitemap.xml', headers) =>
  new Request(ORIGIN + path, { method, headers });
const xmlResponse = (body = XML, extraHeaders = {}) => new Response(body, {
  headers: { 'Content-Type': 'application/xml; charset=UTF-8', ...extraHeaders },
});

test('GET returns validated XML with no-store and no upstream private headers', async () => {
  const worker = createWorker({ fetchImpl: async (url, options) => {
    assert.equal(url, BACKEND);
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.cache, 'no-store');
    assert.deepEqual(options.headers, { Accept: 'application/xml' });
    assert.ok(options.signal instanceof AbortSignal);
    return xmlResponse(XML, {
      'Set-Cookie': 'private=test-only', 'X-Private': 'test-only',
      'Content-Length': '999', 'Cache-Control': 'public, max-age=86400',
    });
  } });
  const response = await worker.fetch(request('GET', '/sitemap.xml?token=test-only', {
    Cookie: 'session=test-only', Authorization: 'Bearer test-only', 'X-Private': 'test-only',
  }), env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), XML);
  assert.deepEqual([...response.headers], [
    ['cache-control', 'no-store'], ['content-type', 'application/xml; charset=utf-8'],
  ]);
});

test('HEAD validates the entire upstream GET and returns no body', async () => {
  let calls = 0;
  const worker = createWorker({ fetchImpl: async (_, options) => {
    calls++;
    assert.equal(options.method, 'GET');
    return xmlResponse();
  } });
  const response = await worker.fetch(request('HEAD'), env);
  assert.equal(calls, 1);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'application/xml; charset=utf-8');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(await response.text(), '');
});

test('GET after catalogue changes uses a new upstream response without caching', async () => {
  let calls = 0;
  const worker = createWorker({ fetchImpl: async () =>
    xmlResponse(XML.replace('bolsas-liner', `producto-${++calls}`)) });
  assert.match(await (await worker.fetch(request(), env)).text(), /producto-1/);
  assert.match(await (await worker.fetch(request(), env)).text(), /producto-2/);
  assert.equal(calls, 2);
});

test('configurable loopback backend works without forwarding incoming query', async () => {
  const localUrl = 'http://127.0.0.1:9099/api/public/seo/sitemap.xml';
  const worker = createWorker({ fetchImpl: async url => {
    assert.equal(url, localUrl);
    return xmlResponse();
  } });
  assert.equal((await worker.fetch(request('GET', '/sitemap.xml?x=1'), {
    ...env, SITEMAP_BACKEND_URL: localUrl,
  })).status, 200);
});

test('POST, PUT, PATCH, DELETE and OPTIONS return 405 without any backend call', async () => {
  const worker = createWorker({ fetchImpl: () => assert.fail('Unexpected fetch') });
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const response = await worker.fetch(request(method), env);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('Allow'), 'GET, HEAD');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
});

for (const status of [500, 502, 503, 504]) {
  test(`upstream ${status} is preserved with a sanitized response`, async () => {
    const worker = createWorker({ fetchImpl: async () => new Response('private error details', {
      status, headers: { 'Content-Type': 'text/html', 'Set-Cookie': 'private=test-only' },
    }) });
    for (const method of ['GET', 'HEAD']) {
      const response = await worker.fetch(request(method), env);
      assert.equal(response.status, status);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal(response.headers.get('Set-Cookie'), null);
      assert.equal(await response.text(), method === 'HEAD' ? '' : 'Sitemap no disponible.\n');
    }
  });
}

test('unexpected 204, redirect, 401 and 404 responses become 502', async () => {
  for (const status of [204, 301, 302, 401, 404]) {
    const worker = createWorker({ fetchImpl: async () => new Response(null, { status }) });
    assert.equal((await worker.fetch(request(), env)).status, 502);
  }
});

test('network failure returns 502, including a bodyless HEAD error', async () => {
  const worker = createWorker({ fetchImpl: async () => { throw new Error('private network details'); } });
  for (const method of ['GET', 'HEAD']) {
    const response = await worker.fetch(request(method), env);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(await response.text(), method === 'HEAD' ? '' : 'Sitemap no disponible.\n');
  }
});

test('missing/invalid configuration returns sanitized 500 without fetching', async () => {
  const worker = createWorker({ fetchImpl: () => assert.fail('Unexpected fetch') });
  for (const url of [undefined, '', 'invalid', 'file:///private',
    'https://user:password@example.test/sitemap.xml', `${BACKEND}?token=private`, `${BACKEND}#fragment`]) {
    const response = await worker.fetch(request(), { ...env, SITEMAP_BACKEND_URL: url });
    assert.equal(response.status, 500);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
});

test('HTML, JSON, missing and invalid XML content-types are rejected', async () => {
  for (const type of ['text/html', 'application/json', '', 'application/xml-invalid']) {
    const worker = createWorker({ fetchImpl: async () =>
      new Response(XML, { headers: type ? { 'Content-Type': type } : {} }) });
    assert.equal((await worker.fetch(request(), env)).status, 502);
  }
});

test('empty, malformed XML, wrong namespace and invalid entities return 502', async () => {
  const bodies = ['', '  \n', '<html>unavailable</html>', '<urlset/>',
    XML.replace('</urlset>', ''), XML.replace('</loc>', '</wrong>'),
    XML.replace('http://www.sitemaps.org/schemas/sitemap/0.9', 'urn:wrong'),
    XML.replace('bolsas-liner', 'bolsas&liner'), XML.replace('bolsas-liner', '&unknown;'),
    XML.replace('bolsas-liner', '&#0;'), XML.replace('bolsas-liner', '&#xD800;'),
    XML.replace('bolsas-liner', '\u0000'), XML.replace('bolsas-liner', '\ufffe'),
    XML.replace('bolsas-liner', ']]>'), XML.replace('<urlset', '<!DOCTYPE urlset><urlset'),
    '\u000b' + XML, '\u00a0' + XML, XML + '\u00a0', XML.replace('<url>', '\u000b<url>'),
    XML.replace(/<url>.*<\/url>/, ''), XML + '<url/>'];
  for (const body of bodies) {
    const worker = createWorker({ fetchImpl: async () => xmlResponse(body) });
    for (const method of ['GET', 'HEAD']) {
      const response = await worker.fetch(request(method), env);
      assert.equal(response.status, 502, body);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      if (method === 'HEAD') assert.equal(await response.text(), '');
    }
  }
});

test('UTF-8 XML, valid escapes, numeric entities and whitespace are accepted unchanged', async () => {
  const body = XML.replace('bolsas-liner', 'niño-😀&amp;lt;&quot;&apos;&#38;&#x26;')
    .replaceAll('<url>', '\n  <url>').replace('</urlset>', '\n</urlset>');
  for (const type of ['application/xml', 'text/xml; charset=utf-8', 'Application/XML; charset=UTF-8']) {
    const worker = createWorker({ fetchImpl: async () => xmlResponse(body, { 'Content-Type': type }) });
    const response = await worker.fetch(request(), env);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), body);
  }
});

test('a failure while reading the upstream body returns 502', async () => {
  const worker = createWorker({ fetchImpl: async () => new Response(new ReadableStream({
    start(controller) { controller.error(new Error('private stream details')); },
  }), { headers: { 'Content-Type': 'application/xml' } }) });
  assert.equal((await worker.fetch(request(), env)).status, 502);
});

test('10-second total deadline covers an upstream that never sends headers', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal;
  const worker = createWorker({ fetchImpl: (_, options) => {
    signal = options.signal;
    return new Promise(() => {});
  } });
  const pending = worker.fetch(request(), env);
  assert.equal(SITEMAP_TIMEOUT_MS, 10_000);
  t.mock.timers.tick(SITEMAP_TIMEOUT_MS);
  const response = await pending;
  assert.equal(response.status, 504);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(signal.aborted, true);
});

test('deadline includes body reading and does not restart after headers or chunks', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal;
  let stream;
  const worker = createWorker({ fetchImpl: (_, options) => {
    signal = options.signal;
    return new Promise(resolve => setTimeout(() => resolve(new Response(new ReadableStream({
      start(controller) {
        stream = controller;
        signal.addEventListener('abort', () => controller.error(new Error('aborted')));
      },
    }), { headers: { 'Content-Type': 'application/xml' } })), 9_000));
  } });
  const pending = worker.fetch(request('HEAD'), env);
  t.mock.timers.tick(9_000);
  await nextTurn();
  stream.enqueue(new TextEncoder().encode(XML.slice(0, 20)));
  t.mock.timers.tick(1_000);
  const response = await pending;
  assert.equal(response.status, 504);
  assert.equal(await response.text(), '');
  assert.equal(signal.aborted, true);
});

test('successful body completion clears the deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal;
  const worker = createWorker({ fetchImpl: async (_, options) => {
    signal = options.signal;
    return xmlResponse();
  } });
  assert.equal((await worker.fetch(request(), env)).status, 200);
  t.mock.timers.tick(20_000);
  assert.equal(signal.aborted, false);
});

test('other routes delegate the original request and response unchanged to ASSETS', async () => {
  const worker = createWorker({ fetchImpl: () => assert.fail('Unexpected backend fetch') });
  for (const [path, method, status] of [
    ['/', 'GET', 200], ['/productos/bolsas-liner', 'GET', 200],
    ['/productos/', 'GET', 307], ['/old-slug', 'GET', 301],
    ['/robots.txt', 'HEAD', 200], ['/main.js?version=1', 'GET', 200],
    ['/unknown', 'GET', 404], ['/admin', 'POST', 405],
    ['/sitemap.xml/', 'GET', 307], ['/Sitemap.xml', 'GET', 200],
  ]) {
    const original = request(method, path, { 'X-Private': 'test-only' });
    const assetResponse = new Response(method === 'HEAD' ? null : 'asset', { status });
    const response = await worker.fetch(original, { ASSETS: {
      fetch(incoming) { assert.equal(incoming, original); return assetResponse; },
    } });
    assert.equal(response, assetResponse);
  }
});

test('Wrangler runs the Worker first for sitemap and catalog pages and preserves asset routing', async () => {
  const entry = await import('./index.mjs');
  assert.deepEqual(Object.keys(entry), ['default']);
  assert.equal(typeof entry.default.fetch, 'function');
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(config.main, './worker/index.mjs');
  assert.equal(config.assets.binding, 'ASSETS');
  assert.deepEqual(config.assets.run_worker_first, ['/sitemap.xml', '/productos/*']);
  assert.equal(config.assets.directory, './dist/miqa-store-frontend/browser');
  assert.equal(config.assets.html_handling, 'drop-trailing-slash');
  assert.equal(config.assets.not_found_handling, 'single-page-application');
  assert.equal(config.vars.SITEMAP_BACKEND_URL, BACKEND);
  assert.equal(config.vars.SEO_PAGES_BACKEND_BASE_URL, 'https://api-store.solucionesmicaela.com/api/public/seo/pages');
});
