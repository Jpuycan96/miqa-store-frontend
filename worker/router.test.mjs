import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorker } from './router.mjs';

const origin = 'https://store.solucionesmicaela.com';
const routes = [
  ['letreros-publicitarios', '/productos/letreros-y-publicidad'],
  ['merchandising', '/productos/merchandising-1'],
  ['impresion-gran-formato', '/productos/impresion-gran-formato-1'],
  ['imprenta-papeleria', '/productos'],
];

for (const [slug, destination] of routes) {
  test(`retired category ${slug} redirects permanently without backend or assets`, async () => {
    const worker = createWorker({ fetchImpl: () => assert.fail('Unexpected backend request') });
    const env = { ASSETS: { fetch: () => assert.fail('Unexpected asset request') } };
    for (const method of ['GET', 'HEAD']) {
      for (const suffix of ['', '/', '?utm_source=google', '/?utm_source=google']) {
        const response = await worker.fetch(new Request(`${origin}/productos/${slug}${suffix}`, { method }), env);
        assert.equal(response.status, 301);
        assert.equal(response.headers.get('Location'), destination + (suffix.includes('?') ? '?utm_source=google' : ''));
        assert.equal(await response.text(), '');
      }
    }
  });
}

test('current ERP category routes still reach the SEO backend without a retired-route redirect', async () => {
  const calls = [];
  const worker = createWorker({ fetchImpl: async url => {
    calls.push(url);
    return new Response(null, { status: 404 });
  } });
  for (const slug of ['letreros-y-publicidad', 'merchandising-1', 'impresion-gran-formato-1']) {
    const response = await worker.fetch(new Request(`${origin}/productos/${slug}`), {
      SEO_PAGES_BACKEND_BASE_URL: 'http://127.0.0.1:8099/api/public/seo/pages',
    });
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('Location'), null);
    assert.equal(calls.at(-1), `http://127.0.0.1:8099/api/public/seo/pages/${slug}`);
  }
});
