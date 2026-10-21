import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Product, ProductCategory } from '../../shared/models/product';
import { CatalogApiService } from './catalog-api.service';

export interface CatalogFilters {
  readonly category?: string; readonly search?: string; readonly featured?: boolean;
  readonly commercialCategory?: string; readonly subcategory?: string;
}
export interface CatalogRequestOptions { readonly fresh?: boolean; }

@Injectable({ providedIn: 'root', useFactory: () => inject(CatalogApiService) })
export abstract class ProductCatalog {
  abstract list(filters?: CatalogFilters, options?: CatalogRequestOptions): Observable<readonly Product[]>;
  abstract findBySlug(slug: string, options?: CatalogRequestOptions): Observable<Product | undefined>;
  abstract categories(options?: CatalogRequestOptions): Observable<readonly ProductCategory[]>;
  /** Optional capability for existing non-commercial catalog adapters. Never falls back on HTTP errors. */
  commercialCategories?(options?: CatalogRequestOptions): Observable<readonly ProductCategory[]>;
}
