import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import categories from '../src/app/core/seo/public-categories.json' with { type: 'json' };

export const SITE_URL = 'https://store.solucionesmicaela.com';
export const PRODUCTS_URL = 'https://api-store.solucionesmicaela.com/api/public/products';

export function sitemapUrls(products) {
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

export async function generateSitemap({ fetchImpl = fetch, output = new URL('../public/sitemap.xml', import.meta.url) } = {}) {
  let response;
  try { response = await fetchImpl(PRODUCTS_URL, { headers: { Accept: 'application/json' } }); }
  catch (error) { throw new Error(`No se pudo consultar la API pública para generar el sitemap: ${error instanceof Error ? error.message : String(error)}`); }
  if (!response.ok) throw new Error(`La API pública respondió ${response.status} al generar el sitemap.`);
  const products = await response.json();
  if (!Array.isArray(products)) throw new Error('La API pública no devolvió una lista de productos válida para el sitemap.');
  const urls = sitemapUrls(products);
  await writeFile(output, renderSitemap(urls), 'utf8');
  return urls;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const urls = await generateSitemap();
  process.stdout.write(`Sitemap generado con ${urls.length} URLs.\n`);
}
