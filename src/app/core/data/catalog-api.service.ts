import { sortProductsByName } from '../../shared/models/product-order';
﻿import { afterNextRender, inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { BehaviorSubject, catchError, filter, map, Observable, of, switchMap, take, throwError, timeout } from 'rxjs';
import { STORE_API_CONFIG } from '../config/store-api';
import { CategoryDto, mapCategory, mapProduct, ProductDto } from './catalog-mapper';
import type { CatalogFilters, ProductCatalog } from './product-catalog';

@Injectable({ providedIn: 'root' })
export class CatalogApiService implements ProductCatalog {
  private readonly http = inject(HttpClient);
  private readonly config = inject(STORE_API_CONFIG);
  private readonly ready = new BehaviorSubject(false);
  private readonly baseUrl = this.config.baseUrl.replace(/\/+$/, '') + '/api/public';
  private readonly categoryRequest = this.get<readonly CategoryDto[]>('/categories').pipe(
    map(categories => categories.map(mapCategory))
  );
  constructor() {
    // No requests while prerendering or before hydration. Builds never need a running local API.
    afterNextRender(() => this.ready.next(true));
  }
  private get<T>(path: string, params = new HttpParams()): Observable<T> {
    return this.ready.pipe(filter(Boolean), take(1), switchMap(() =>
      this.http.get<T>(this.baseUrl + path, { params }).pipe(timeout(8000))));
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
