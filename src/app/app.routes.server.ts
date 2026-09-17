import { RenderMode, ServerRoute } from '@angular/ssr';

import { inject } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { PrerenderFallback } from '@angular/ssr';
import { ProductCatalog } from './core/data/product-catalog';

export const serverRoutes: ServerRoute[] = [
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  {
    path: 'productos/:slug', renderMode: RenderMode.Prerender, fallback: PrerenderFallback.Client,
    async getPrerenderParams() {
      const catalog = inject(ProductCatalog);
      const result = await firstValueFrom(forkJoin({ categories: catalog.categories(), products: catalog.list() }));
      return [
        ...result.categories.map(category => ({ slug: category.slug })),
        ...result.products.filter(product => product.published).map(product => ({ slug: product.slug }))
      ];
    }
  },
  { path: '**', renderMode: RenderMode.Prerender }
];
