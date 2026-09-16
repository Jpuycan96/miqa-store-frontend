import { RenderMode, ServerRoute } from '@angular/ssr';

import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PrerenderFallback } from '@angular/ssr';
import { ProductCatalog } from './core/data/product-catalog';

export const serverRoutes: ServerRoute[] = [
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  {
    path: 'productos/:slug', renderMode: RenderMode.Prerender, fallback: PrerenderFallback.Client,
    async getPrerenderParams() {
      const catalog = inject(ProductCatalog);
      const products = await firstValueFrom(catalog.list());
      return products.filter(product => product.published).map(product => ({ slug: product.slug }));
    }
  },
  { path: '**', renderMode: RenderMode.Prerender }
];
