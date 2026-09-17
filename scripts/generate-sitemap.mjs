import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const SITE_URL = 'https://store.solucionesmicaela.com';
export const PRODUCTS_URL = 'https://api-store.solucionesmicaela.com/api/public/products';
export const CATEGORIES_URL = 'https://api-store.solucionesmicaela.com/api/public/categories';
export const CATEGORY_REDIRECTS_URL = 'https://api-store.solucionesmicaela.com/api/public/category-slug-redirects';

export function sitemapUrls(categories, products) {
  return [
    `${SITE_URL}/`, `${SITE_URL}/productos`,
    ...categories.map(category => `${SITE_URL}/productos/${category.slug}`),
    ...products.filter(product => product?.published === true && typeof product.slug === 'string' && product.slug.trim())
      .map(product => `${SITE_URL}/productos/${encodeURIComponent(product.slug.trim())}`)
  ];
}

export function renderSitemap(urls) {
  const escapeXml = value => value.replace(/[<>&'\"]/g, character => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[character]));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`).join('\n')}\n</urlset>\n`;
}

export function renderRedirects(redirects) {
  return redirects.map(redirect => `/productos/${redirect.oldSlug} /productos/${redirect.currentSlug} 301`).join('\n') + (redirects.length ? '\n' : '');
}

export async function generateSitemap({ fetchImpl = fetch, output = new URL('../public/sitemap.xml', import.meta.url), redirectsOutput = new URL('../public/_redirects', import.meta.url) } = {}) {
  let responses;
  try { responses = await Promise.all([PRODUCTS_URL, CATEGORIES_URL, CATEGORY_REDIRECTS_URL].map(url => fetchImpl(url, { headers: { Accept: 'application/json' } }))); }
  catch (error) { throw new Error(`No se pudo consultar la API pública para generar el sitemap: ${error instanceof Error ? error.message : String(error)}`); }
  const failed = responses.find((response, index) => !response.ok && !(index === 2 && response.status === 404));
  if (failed) throw new Error(`La API pública respondió ${failed.status} al generar los artefactos SEO.`);
  const [products, categories, redirects] = await Promise.all(responses.map((response, index) => index === 2 && response.status === 404 ? [] : response.json()));
  if (!Array.isArray(products) || !Array.isArray(categories) || !Array.isArray(redirects)) throw new Error('La API pública no devolvió listas válidas para los artefactos SEO.');
  const urls = sitemapUrls(categories, products);
  await writeFile(output, renderSitemap(urls), 'utf8');
  await writeFile(redirectsOutput, renderRedirects(redirects), 'utf8');
  return urls;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const urls = await generateSitemap();
  process.stdout.write(`Sitemap generado con ${urls.length} URLs.\n`);
}
