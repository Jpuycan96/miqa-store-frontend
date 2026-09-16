import { sortProductsByName } from '../../shared/models/product-order';
﻿import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of, throwError, timeout } from 'rxjs';
import { STORE_API_CONFIG } from '../config/store-api';
import { CategoryDto, mapCategory, mapProduct, ProductDto } from './catalog-mapper';
import type { CatalogFilters, ProductCatalog } from './product-catalog';

@Injectable({ providedIn: 'root' })
export class CatalogApiService implements ProductCatalog {
  private readonly http = inject(HttpClient);
  private readonly config = inject(STORE_API_CONFIG);
  private readonly baseUrl = this.config.baseUrl.replace(/\/+$/, '') + '/api/public';
  private readonly categoryRequest = this.get<readonly CategoryDto[]>('/categories').pipe(
    map(categories => categories.map(mapCategory))
  );
  private get<T>(path: string, params = new HttpParams()): Observable<T> {
    return this.http.get<T>(this.baseUrl + path, { params }).pipe(timeout(10000));
  }
  categories() { return this.categoryRequest; }
  list(filters: CatalogFilters = {}) {
    let params = new HttpParams();
    if (filters.category) params = params.set('category', filters.category);
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.featured !== undefined) params = params.set('featured', filters.featured);
    return this.get<readonly ProductDto[]>('/products', params).pipe(
      map(products => sortProductsByName(products.map(product => mapProduct(product, this.config.mediaBaseUrl)))));
  }
  findBySlug(slug: string) {
    return this.get<ProductDto>('/products/' + encodeURIComponent(slug)).pipe(
      map(product => mapProduct(product, this.config.mediaBaseUrl)),
      catchError((error: unknown) => error instanceof HttpErrorResponse && error.status === 404 ? of(undefined) : throwError(() => error))
    );
  }
}
