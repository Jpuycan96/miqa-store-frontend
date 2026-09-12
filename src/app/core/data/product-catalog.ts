import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Product, ProductCategory } from '../../shared/models/product';
import { PRODUCTS, PRODUCT_CATEGORIES } from './products.mock';

/** Replace this provider with an HTTP implementation when the Store API is available. */
@Injectable({ providedIn: 'root', useFactory: () => inject(LocalProductCatalog) })
export abstract class ProductCatalog {
  abstract list(): Observable<readonly Product[]>;
  abstract findBySlug(slug: string): Observable<Product | undefined>;
  abstract categories(): Observable<readonly ProductCategory[]>;
}

@Injectable({ providedIn: 'root' })
export class LocalProductCatalog implements ProductCatalog {
  list() { return of(PRODUCTS.filter(product => product.published)); }
  findBySlug(slug: string) { return of(PRODUCTS.find(product => product.published && product.slug === slug)); }
  categories() { return of(PRODUCT_CATEGORIES); }
}
