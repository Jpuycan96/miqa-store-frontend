// Mock public catalog responses during local prerender validation; deny other external fetches.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function fixture(file, overrides = {}) {
  const path = resolve(__dirname, '..', file);
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText;
  const loaded = new Module(path, module);
  loaded.require = name => overrides[name] ?? require(name);
  loaded._compile(compiled, path);
  return loaded.exports;
}
const data = fixture('src/app/core/data/products.mock.ts');
const categories = data.PRODUCT_CATEGORIES.map(category => ({ ...category, id: category.slug }));
const erp = fixture('src/app/testing/erp.fixture.ts', { '../core/data/products.mock': data }).erpProduct('ESCALA');
const products = [...data.PRODUCTS, erp].map(product => ({ ...product,
  category: categories.find(category => category.slug === product.categorySlug) }));
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  const method = init?.method ?? (typeof input === 'object' ? input.method : undefined) ?? 'GET';
  if (url.origin === 'https://api-store.solucionesmicaela.com') {
    let body;
    if (url.pathname === '/api/public/pricing/evaluate' && method === 'POST') body = { status: 'QUOTE_REQUIRED' };
    else if (method !== 'GET') throw Error('Offline validation forbids API writes');
    else if (url.pathname === '/api/public/categories') body = categories;
    else if (url.pathname === '/api/public/category-slug-redirects') body = [];
    else if (url.pathname === '/api/public/products') body = products.filter(product =>
      (!url.searchParams.has('category') || product.categorySlug === url.searchParams.get('category'))
      && (!url.searchParams.has('featured') || String(product.featured) === url.searchParams.get('featured')));
    else if (url.pathname.startsWith('/api/public/products/')) body = products.find(product => product.slug === decodeURIComponent(url.pathname.split('/').at(-1)));
    else throw Error('Unexpected mocked catalog path');
    return new Response(JSON.stringify(body ?? {}), { status: body ? 200 : 404,
      headers: { 'Content-Type': 'application/json' } });
  }
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw Error('External fetch blocked during offline build');
  return realFetch(input, init);
};
