import { createWorker as createSitemapWorker } from './sitemap-proxy.mjs';
import { catalogSlug, createCatalogPages } from './catalog-pages.mjs';

export function createWorker(options = {}) {
  const sitemap = createSitemapWorker(options);
  const catalog = createCatalogPages(options);
  return {
    fetch(request, env) {
      if (new URL(request.url).pathname === '/sitemap.xml') {
        return sitemap.fetch(request, env);
      }
      const slug = catalogSlug(request);
      return slug === null ? env.ASSETS.fetch(request) : catalog.fetch(request, env, slug);
    },
  };
}
