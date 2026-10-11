import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { JSDOM } from 'jsdom';
import { catalogSlug, createCatalogPages, MAX_PAGE_BYTES, MAX_TEMPLATE_BYTES, SITE_ORIGIN, validatePage } from './catalog-pages.mjs';
import { createWorker } from './router.mjs';

const BASE = 'http://127.0.0.1:8099/api/public/seo/pages';
const canonical = slug => `${SITE_ORIGIN}/productos/${slug}`;
const request = (slug = 'banner', method = 'GET', suffix = '', headers) => new Request(`${SITE_ORIGIN}/productos/${slug}${suffix}`, { method, headers });
export function fixture(overrides = {}) {
  return {
    type: 'PRODUCT', name: 'Banner', slug: 'banner', seoTitle: 'Banner | MIQA',
    seoDescription: 'Banner a medida.', bodyDescription: 'Descripción pública actual.',
    image: { url: `${SITE_ORIGIN}/images/products/banner.png`, altText: 'Banner de MIQA' },
    breadcrumbs: [{ name: 'Inicio', url: `${SITE_ORIGIN}/` }, { name: 'Productos', url: `${SITE_ORIGIN}/productos` }, { name: 'Banner', url: canonical('banner') }],
    links: [], canonicalUrl: canonical('banner'), ...overrides,
  };
}
const json = (data = fixture(), headers = {}) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', ...headers } });
const env = { SEO_PAGES_BACKEND_BASE_URL: BASE, ASSETS: { fetch: async () => new Response('<template>', { headers: { 'Content-Type': 'text/html' } }) } };
const handler = fetchImpl => createCatalogPages({ fetchImpl, renderImpl: async (_, page) => page.seoTitle });

test('route matcher selects one canonical catalog slug only', () => {
  for (const path of ['/productos/banner', '/productos/nuevo-producto']) {
    assert.equal(catalogSlug(new Request(SITE_ORIGIN + path)), path.split('/').at(-1));
  }
  assert.equal(catalogSlug(new Request(SITE_ORIGIN + '/productos/banner/')), 'banner');
  for (const path of ['/', '/productos', '/productos/', '/productos/banner/image.png', '/productos/index.html', '/productos/%2Fbanner', '/Productos/banner', '/sitemap.xml']) {
    assert.equal(catalogSlug(new Request(SITE_ORIGIN + path)), null);
  }
});

test('trailing slash keeps 307 normalization for new slugs without requesting the backend', async () => {
  for (const method of ['GET', 'HEAD']) {
    const response = await handler(() => assert.fail('Unexpected fetch')).fetch(request('nuevo-producto', method, '/?buscar=vinil'), env);
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('Location'), '/productos/nuevo-producto?buscar=vinil');
    assert.equal(await response.text(), '');
  }
});

test('upstream request is fresh GET, including HEAD, without visitor headers or parameters', async () => {
  let calls = 0;
  const worker = handler(async (target, options) => {
    calls++;
    assert.equal(target, BASE + '/banner');
    assert.equal(options.method, 'GET');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.cache, 'no-store');
    assert.deepEqual(options.headers, { Accept: 'application/json' });
    return json(fixture(), { 'Set-Cookie': 'private', 'X-Internal': 'private', ETag: 'private' });
  });
  for (const method of ['GET', 'HEAD']) {
    const response = await worker.fetch(request('banner', method, '?secret=visitor', { Cookie: 'private', Authorization: 'Bearer private', 'X-Private': 'private' }), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.get('Set-Cookie'), null);
    assert.equal(response.headers.get('X-Internal'), null);
    assert.equal(response.headers.get('ETag'), null);
    assert.equal(await response.text(), method === 'HEAD' ? '' : 'Banner | MIQA');
  }
  assert.equal(calls, 2);
});

test('invalid configuration fails safely before any fetch', async () => {
  for (const base of [undefined, 'garbage', 'http://external.example/api/public/seo/pages', 'https://user:secret@example.com/api/public/seo/pages', BASE + '?token=secret', BASE + '#part', BASE + '/wrong']) {
    const response = await handler(() => assert.fail('Unexpected request')).fetch(request(), { ...env, SEO_PAGES_BACKEND_BASE_URL: base });
    assert.equal(response.status, 500);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.doesNotMatch(await response.text(), /secret|garbage/);
  }
});

test('unsupported methods return 405 before accessing backend or assets', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const response = await handler(() => assert.fail('Unexpected request')).fetch(request('banner', method), env);
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('Allow'), 'GET, HEAD');
  }
});

for (const status of [404, 500, 502, 503, 504]) {
  test(`backend ${status} preserves HTTP status and discards private body and headers`, async () => {
    for (const method of ['GET', 'HEAD']) {
      const response = await handler(async () => new Response('private ERP details', { status, headers: { 'Set-Cookie': 'secret' } })).fetch(request('banner', method), env);
      assert.equal(response.status, status);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
      assert.equal(response.headers.get('Set-Cookie'), null);
      const body = await response.text();
      assert.doesNotMatch(body, /ERP|private|app-root/);
      if (method === 'HEAD') assert.equal(body, '');
    }
  });
}

test('unexpected HTTP responses and JSON media types become 502', async () => {
  for (const status of [201, 204, 302, 307, 400, 401, 403]) {
    assert.equal((await handler(async () => new Response(null, { status })).fetch(request(), env)).status, 502);
  }
  for (const type of ['', 'text/html', 'text/plain', 'application/xml', 'application/json-patch+json']) {
    assert.equal((await handler(async () => new Response('{}', { headers: { 'Content-Type': type } })).fetch(request(), env)).status, 502);
  }
});

test('301 accepts only canonical catalog destinations with no cookies, body or follow', async () => {
  for (const method of ['GET', 'HEAD']) {
    const response = await handler(async () => new Response('private', { status: 301, headers: { Location: canonical('nuevo-banner'), 'Set-Cookie': 'secret' } })).fetch(request('banner', method), env);
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('Location'), canonical('nuevo-banner'));
    assert.equal(response.headers.get('Set-Cookie'), null);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(await response.text(), '');
  }
});

test('301 rejects external, relative, malformed, private, query, fragment, noncatalog and self destinations', async () => {
  for (const location of [null, '//evil.example/productos/banner', '/productos/banner', 'https://evil.example/productos/banner', 'http://store.solucionesmicaela.com/productos/banner', `${SITE_ORIGIN}/admin`, canonical('banner'), canonical('nuevo') + '?token=secret', canonical('nuevo') + '#x', canonical('nuevo') + '/', 'https://secret@store.solucionesmicaela.com/productos/nuevo']) {
    const response = await handler(async () => new Response(null, { status: 301, headers: location ? { Location: location } : {} })).fetch(request(), env);
    assert.equal(response.status, 502, String(location));
    assert.equal(response.headers.get('Location'), null);
  }
});

test('JSON rejects empty, malformed, nonobjects, unexpected field types and missing SEO', async () => {
  for (const body of ['', '   ', '{bad', 'null', '[]', '"text"', JSON.stringify(fixture({ type: 'ADMIN' })), JSON.stringify(fixture({ seoTitle: '' })), JSON.stringify(fixture({ name: {} })), JSON.stringify(fixture({ links: {} })), JSON.stringify(fixture({ breadcrumbs: [] })), JSON.stringify(fixture({ image: { url: 'javascript:alert(1)', altText: 'x' } }))]) {
    const response = await handler(async () => new Response(body, { headers: { 'Content-Type': 'application/json' } })).fetch(request(), env);
    assert.equal(response.status, 502, body.slice(0, 80));
  }
});

test('public contract validates canonical, image and link URLs and bounded fields', () => {
  for (const changes of [
    { canonicalUrl: 'https://evil.example/productos/banner' }, { canonicalUrl: canonical('otro') }, { slug: 'otro' },
    { canonicalUrl: canonical('banner') + '?private=1' }, { name: 'x'.repeat(513) },
    { image: { url: 'https://127.0.0.1/image.png', altText: 'x' } },
    { image: { url: 'https://host.local/image.png', altText: 'x' } },
    { image: { url: 'https://user:password@example.com/image.png', altText: 'x' } },
    { type: 'CATEGORY', links: [{ name: 'x', url: 'javascript:alert(1)' }] },
    { type: 'CATEGORY', links: [{ name: 'x', url: 'https://external.example/productos/x' }] },
  ]) assert.throws(() => validatePage(fixture(changes), 'banner'), error => error.status === 502);
  assert.equal(validatePage(fixture({ image: null, admin: 'private', erpServiceId: 'private' }), 'banner').image, null);
  assert.equal('admin' in validatePage(fixture({ admin: 'private' }), 'banner'), false);
});

test('oversized upstream declared and streamed bodies are rejected without buffering everything', async () => {
  for (const response of [json(fixture(), { 'Content-Length': String(MAX_PAGE_BYTES + 1) }), new Response(' '.repeat(MAX_PAGE_BYTES + 1), { headers: { 'Content-Type': 'application/json' } })]) {
    assert.equal((await handler(async () => response).fetch(request(), env)).status, 502);
  }
});

test('network and body stream errors return temporary 502, including HEAD', async () => {
  for (const method of ['GET', 'HEAD']) {
    for (const fetchImpl of [async () => { throw new Error('private network details'); }, async () => new Response(new ReadableStream({ start(stream) { stream.error(new Error('private stream')); } }), { headers: { 'Content-Type': 'application/json' } })]) {
      const response = await handler(fetchImpl).fetch(request('banner', method), env);
      assert.equal(response.status, 502);
      assert.doesNotMatch(await response.text(), /private/);
    }
  }
});

for (const phase of ['headers', 'body', 'template', 'render']) {
  test(`10-second total timeout includes ${phase} and returns 504 without a stale page`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let signal;
    const never = () => new Promise(() => {});
    const worker = createCatalogPages({
      fetchImpl: async (_, options) => {
        signal = options.signal;
        if (phase === 'headers') return never();
        if (phase === 'body') return new Response(new ReadableStream({ start(stream) { stream.enqueue(new TextEncoder().encode('{')); } }), { headers: { 'Content-Type': 'application/json' } });
        return json();
      },
      renderImpl: phase === 'render' ? never : async () => 'rendered',
    });
    const pending = worker.fetch(request('banner', 'HEAD'), phase === 'template' ? { ...env, ASSETS: { fetch: never } } : env);
    await nextTurn();
    t.mock.timers.tick(9000);
    await nextTurn();
    t.mock.timers.tick(1000);
    const response = await pending;
    assert.equal(response.status, 504);
    assert.equal(await response.text(), '');
    assert.equal(signal.aborted, true);
  });
}

test('template size, media type and status fail safely with no prerender fallback', async () => {
  for (const response of [new Response(null, { status: 404 }), new Response('{}', { headers: { 'Content-Type': 'application/json' } }), new Response('<html>', { headers: { 'Content-Type': 'text/html', 'Content-Length': String(MAX_TEMPLATE_BYTES + 1) } })]) {
    const result = await handler(async () => json()).fetch(request(), { ...env, ASSETS: { fetch: async () => response } });
    assert.ok([500, 502].includes(result.status));
    assert.doesNotMatch(await result.text(), /app-root/);
  }
});

test('composed router delegates original requests unchanged outside catalog and sitemap', async () => {
  const worker = createWorker({ fetchImpl: () => assert.fail('Unexpected fetch') });
  for (const path of ['/', '/productos', '/productos/', '/productos/banner/photo.png', '/robots.txt', '/admin', '/sitemap.xml/']) {
    const original = new Request(SITE_ORIGIN + path, { headers: { Cookie: 'unchanged' } });
    const asset = new Response('original');
    assert.equal(await worker.fetch(original, { ASSETS: { fetch: incoming => { assert.equal(incoming, original); return asset; } } }), asset);
  }
});

test('composed router preserves dynamic sitemap GET and HEAD', async () => {
  const xml = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://store.solucionesmicaela.com/productos/banner</loc></url></urlset>';
  const worker = createWorker({ fetchImpl: async (target, options) => {
    assert.equal(target, 'http://127.0.0.1:8099/api/public/seo/sitemap.xml');
    assert.equal(options.method, 'GET');
    return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
  } });
  for (const method of ['GET', 'HEAD']) {
    const response = await worker.fetch(new Request(SITE_ORIGIN + '/sitemap.xml', { method }), { SITEMAP_BACKEND_URL: 'http://127.0.0.1:8099/api/public/seo/sitemap.xml' });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), method === 'GET' ? xml : '');
  }
});

test('native workerd HTMLRewriter renders and validates CSR templates with mocked services only', async t => {
  const template = '<!doctype html><html lang="es"><head><base href="/"><title>OLD</title><meta name="description" content="OLD"><meta name="robots" content="OLD"><meta property="og:title" content="OLD"><meta name="twitter:card" content="OLD"><link rel="canonical" href="https://old.example"><script type="application/ld+json">{"old":true}</script><link rel="stylesheet" href="/styles.css"></head><body><app-root></app-root><script src="/main.js" type="module"></script></body></html>';
  let currentTemplate = template;
  let data = fixture();
  const modules = await Promise.all(['index.mjs', 'router.mjs', 'catalog-pages.mjs', 'sitemap-proxy.mjs'].map(async name => ({
    type: 'ESModule', path: resolve('worker', name), contents: await readFile(new URL(name, import.meta.url), 'utf8'),
  })));
  const mf = new Miniflare(convertV4MiniflareOptions({ modules, modulesRoot: resolve('worker'), compatibilityDate: '2026-09-11', cf: false,
    bindings: { SEO_PAGES_BACKEND_BASE_URL: BASE },
    outboundService: async incoming => {
      assert.equal(incoming.url, BASE + '/banner');
      assert.equal(incoming.headers.get('Cookie'), null);
      return json(data);
    },
    serviceBindings: { ASSETS: async incoming => {
      assert.equal(new URL(incoming.url).pathname, '/index.csr');
      assert.equal(new URL(incoming.url).search, '');
      assert.equal(incoming.headers.get('Cookie'), null);
      return new Response(currentTemplate, { headers: { 'Content-Type': 'text/html', 'Set-Cookie': 'private' } });
    } },
  }));
  t.after(() => mf.dispose());
  const rendered = async (method = 'GET') => {
    const response = await mf.dispatchFetch(request('banner', method, '?private=visitor').url, { method, headers: { Cookie: 'private', Authorization: 'Bearer private' } });
    const html = await response.text();
    assert.equal(response.status, 200, html);
    assert.equal(response.headers.get('Set-Cookie'), null);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    return html;
  };
  await t.test('product custom metadata, visible body, assets and one JSON-LD outside Angular', async () => {
    data = fixture({ seoTitle: 'Título personalizado', seoDescription: 'SEO personalizado', admin: 'private' });
    const html = await rendered();
    const document = new JSDOM(html).window.document;
    assert.equal(document.title, data.seoTitle);
    assert.equal(document.querySelector('meta[name=description]').content, data.seoDescription);
    assert.equal(document.querySelectorAll('title').length, 1);
    assert.equal(document.querySelectorAll('link[rel=canonical]').length, 1);
    assert.equal(document.querySelector('link[rel=canonical]').href, canonical('banner'));
    for (const selector of ['meta[name=description]', 'meta[name=robots]', 'meta[property="og:title"]', 'meta[property="og:url"]', 'meta[name="twitter:card"]', 'script[type="application/ld+json"]']) assert.equal(document.querySelectorAll(selector).length, 1, selector);
    assert.equal(document.querySelector('app-root').innerHTML, '');
    assert.equal(document.querySelector('#miqa-catalog-seo').parentElement.tagName, 'BODY');
    assert.equal(document.querySelector('h1').textContent, data.name);
    assert.equal(document.querySelector('#miqa-catalog-seo p').textContent, data.bodyDescription);
    assert.equal(document.querySelector('img').alt, data.image.altText);
    assert.equal(document.querySelector('script[type=module]').getAttribute('src'), '/main.js');
    assert.ok(document.querySelector('link[rel=stylesheet]'));
    assert.equal(JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@type'], 'BreadcrumbList');
    assert.doesNotMatch(html, /OLD|private|old.example/);
  });
  await t.test('backend SEO fallbacks pass through unchanged and no-image page is valid', async () => {
    data = fixture({ image: null });
    const document = new JSDOM(await rendered()).window.document;
    assert.equal(document.title, 'Banner | MIQA');
    assert.equal(document.querySelector('meta[name=description]').content, 'Banner a medida.');
    assert.equal(document.querySelector('img'), null);
    assert.equal(document.querySelector('meta[name="twitter:card"]').content, 'summary');
  });
  await t.test('category shows current public product links', async () => {
    data = fixture({ type: 'CATEGORY', links: [{ name: 'Producto nuevo', url: canonical('producto-nuevo') }] });
    const document = new JSDOM(await rendered()).window.document;
    assert.equal(document.querySelector('section a').textContent, 'Producto nuevo');
    assert.equal(document.querySelector('section a').href, canonical('producto-nuevo'));
    assert.equal(document.querySelector('meta[property="og:type"]').content, 'website');
    assert.equal(document.querySelector('meta[name=robots]').content, 'noindex,follow');
  });
  await t.test('text, attribute and JSON-LD injection are escaped without executing markup', async () => {
    const attack = '\"\'><img src=x onerror=alert(1)><script>alert(1)</script>&</script>';
    data = fixture({ name: attack, seoTitle: attack, seoDescription: attack, bodyDescription: attack,
      image: { url: `${SITE_ORIGIN}/images/banner.png?q=%22`, altText: attack },
      breadcrumbs: fixture().breadcrumbs.map(item => ({ ...item, name: attack })) });
    const document = new JSDOM(await rendered()).window.document;
    assert.equal(document.title, attack);
    assert.equal(document.querySelector('h1').textContent, attack);
    assert.equal(document.querySelector('img').alt, attack);
    assert.equal(document.querySelectorAll('img').length, 1);
    assert.equal(document.querySelector('[onerror]'), null);
    assert.equal(document.querySelectorAll('script').length, 2);
    assert.equal(JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent).itemListElement[0].name, attack);
  });
  await t.test('HEAD validates and transforms CSR but has no body', async () => {
    data = fixture();
    assert.equal(await rendered('HEAD'), '');
  });
  await t.test('actual existing Angular CSR template is compatible without rebuilding', async () => {
    currentTemplate = await readFile('dist/miqa-store-frontend/browser/index.csr.html', 'utf8');
    assert.match(await rendered(), /data-miqa-catalog-seo/);
  });
  await t.test('rejects prerender, transfer state, missing root, base, script, doctype and malformed template', async () => {
    for (const bad of [template.replace('<app-root>', '<app-root ngh="0">'), template.replace('<app-root></app-root>', '<app-root><h1>OLD PRODUCT</h1></app-root>'), template.replace('<app-root></app-root>', '<app-root>OLD PRODUCT</app-root>'), template.replace('<base href="/">', ''), template.replace('<base href="/">', '<base href="https://evil.example/">'), template.replace('<app-root></app-root>', ''), template.replace('<!doctype html>', ''), template.replace('<script src="/main.js" type="module"></script>', ''), template.replace('</body>', '<script id="ng-state">{}</script></body>'), '<html>broken</html>']) {
      currentTemplate = bad;
      const response = await mf.dispatchFetch(request().url);
      assert.equal(response.status, 500, bad);
      assert.doesNotMatch(await response.text(), /OLD PRODUCT|app-root/);
    }
  });
});
