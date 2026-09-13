import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Product, ProductCategory } from '../../shared/models/product';
import { CatalogApiService } from './catalog-api.service';

export interface CatalogFilters { readonly category?: string; readonly search?: string; readonly featured?: boolean; }

@Injectable({ providedIn: 'root', useFactory: () => inject(CatalogApiService) })
export abstract class ProductCatalog {
  abstract list(filters?: CatalogFilters): Observable<readonly Product[]>;
  abstract findBySlug(slug: string): Observable<Product | undefined>;
  abstract categories(): Observable<readonly ProductCategory[]>;
}
