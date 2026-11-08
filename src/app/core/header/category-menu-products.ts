import { inject, Injectable } from '@angular/core';
import { catchError, defer, from, map, mergeMap, Observable, of, tap } from 'rxjs';
import { ProductCatalog } from '../data/product-catalog';
import { Product, ProductCategory } from '../../shared/models/product';

export interface MenuProductGroup {
  readonly slug: string;
  readonly products: readonly Product[];
  readonly error: boolean;
}

/** Scoped to the drawer. Only the public commercial filter determines membership. */
@Injectable()
export class CategoryMenuProducts {
  private readonly catalog = inject(ProductCatalog);
  private readonly cache = new Map<string, MenuProductGroup>();

  clear() { this.cache.clear(); }

  load(category: ProductCategory): Observable<MenuProductGroup> {
    return from(category.subcategories ?? []).pipe(mergeMap(sub => {
      const key = JSON.stringify([category.slug, sub.slug]);
      const cached = this.cache.get(key);
      if (cached) return of(cached);
      return defer(() => this.catalog.list({
        commercialCategory: category.slug, subcategory: sub.slug
      }, { fresh: true })).pipe(
        map(products => ({
          slug: sub.slug,
          // Preserve public featured/commercial order; defensive deduplication only.
          products: products.filter((p, i, all) => p.published &&
            all.findIndex(other => other.id === p.id) === i).slice(0, 6),
          error: false
        })),
        tap(group => this.cache.set(key, group)),
        catchError(() => of({ slug: sub.slug, products: [], error: true }))
      );
    }, 3));
  }
}
