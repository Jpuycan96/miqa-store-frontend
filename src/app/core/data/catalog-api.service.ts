import { sortProductsByName } from '../../shared/models/product-order';
import { isPlatformBrowser } from '@angular/common';
import { ApplicationRef, DestroyRef, inject, Injectable, PLATFORM_ID, TransferState } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, concat, defer, map, Observable, of, ReplaySubject, switchMap, take, throwError, timeout } from 'rxjs';
import { STORE_API_CONFIG } from '../config/store-api';
import { CategoryDto, mapCategory, mapProduct, ProductDto } from './catalog-mapper';
import type { CatalogFilters, CatalogRequestOptions, ProductCatalog } from './product-catalog';

@Injectable({ providedIn: 'root' })
export class CatalogApiService implements ProductCatalog {
  private readonly http = inject(HttpClient);
  private readonly config = inject(STORE_API_CONFIG);
  private readonly baseUrl = this.config.baseUrl.replace(/\/+$/, '') + '/api/public';
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly transferState = inject(TransferState);
  private readonly clientReady = new ReplaySubject<void>(1);
  private clientStable = false;

  constructor() {
    const destroy = inject(DestroyRef);
    if (this.browser) void inject(ApplicationRef).whenStable().then(() => {
      if (destroy.destroyed) return;
      this.clientStable = true;
      this.clientReady.next();
      this.clientReady.complete();
    });
  }

  private get<T>(path: string, params = new HttpParams(), options: CatalogRequestOptions = {}): Observable<T> {
    return defer(() => {
      const snapshot = () => this.http.get<T>(this.baseUrl + path, { params }).pipe(timeout(10000));
      const fresh = () => this.http.get<T>(this.baseUrl + path, {
        params, transferCache: false, cache: 'no-store'
      }).pipe(timeout(10000));
      if (!this.browser) return snapshot();
      if (options.fresh || this.clientStable || this.transferState.isEmpty) return fresh();
      // Reuse SSR data only for the first render, then replace it from the API.
      // Unsubscription also cancels revalidation when a page/filter changes.
      return concat(snapshot(), this.clientReady.pipe(take(1), switchMap(fresh)));
    });
  }
  categories(options: CatalogRequestOptions = {}) {
    return this.get<readonly CategoryDto[]>('/categories', new HttpParams(), options).pipe(
      map(categories => categories.map(mapCategory))
    );
  }
  list(filters: CatalogFilters = {}, options: CatalogRequestOptions = {}) {
    let params = new HttpParams();
    if (filters.category) params = params.set('category', filters.category);
    if (filters.search?.trim()) params = params.set('search', filters.search.trim());
    if (filters.featured !== undefined) params = params.set('featured', filters.featured);
    return this.get<readonly ProductDto[]>('/products', params, options).pipe(
      map(products => sortProductsByName(products.filter(product => product.published)
        .map(product => mapProduct(product, this.config.mediaBaseUrl)))));
  }
  findBySlug(slug: string, options: CatalogRequestOptions = {}) {
    return this.get<ProductDto>('/products/' + encodeURIComponent(slug), new HttpParams(), options).pipe(
      map(product => product.published ? mapProduct(product, this.config.mediaBaseUrl) : undefined),
      catchError((error: unknown) => error instanceof HttpErrorResponse && error.status === 404 ? of(undefined) : throwError(() => error))
    );
  }
}
