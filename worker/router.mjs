import { createWorker as createSitemapWorker } from './sitemap-proxy.mjs';
import { catalogSlug, createCatalogPages } from './catalog-pages.mjs';

const retiredCategoryRoutes = new Map([
  ['/productos/letreros-publicitarios', '/productos/letreros-y-publicidad'],
  ['/productos/merchandising', '/productos/merchandising-1'],
  ['/productos/impresion-gran-formato', '/productos/impresion-gran-formato-1'],
  ['/productos/imprenta-papeleria', '/productos'],
]);

export function createWorker(options = {}) {
  const sitemap = createSitemapWorker(options);
  const catalog = createCatalogPages(options);
  return {
    fetch(request, env) {
      const url = new URL(request.url);
      const destination = retiredCategoryRoutes.get(url.pathname.replace(/\/$/, ''));
      if (destination && ['GET', 'HEAD'].includes(request.method)) {
        return new Response(null, {
          status: 301,
          headers: { Location: destination + url.search },
        });
      }
      if (new URL(request.url).pathname === '/sitemap.xml') {
        return sitemap.fetch(request, env);
      }
      const slug = catalogSlug(request);
      return slug === null ? env.ASSETS.fetch(request) : catalog.fetch(request, env, slug);
    },
  };
}
