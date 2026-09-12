import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { PRODUCTS } from './core/data/products.mock';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'productos/:slug',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () => PRODUCTS.filter(product => product.published).map(product => ({ slug: product.slug })),
    fallback: PrerenderFallback.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
