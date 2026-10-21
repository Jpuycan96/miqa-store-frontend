import { ApplicationConfig } from '@angular/core';
import { HttpInterceptorFn, HttpResponse, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { map } from 'rxjs';
import { adminInterceptor } from '../app/features/admin/admin-auth';

/** TEST contains restored absolute media references. Never load those from PROD. */
export function testMediaReferences(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/^https?:\/\/api-store\.solucionesmicaela\.com\/media\//i, '/media/');
  }
  if (Array.isArray(value)) return value.map(testMediaReferences);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, testMediaReferences(entry)]));
  }
  return value;
}

export const testMediaInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/') || request.responseType !== 'json') return next(request);
  return next(request).pipe(map(event => event instanceof HttpResponse
    ? event.clone({ body: testMediaReferences(event.body) }) : event));
};

/** Imported exclusively by the development browser/server entry points. */
export const testHttpConfig: ApplicationConfig = {
  providers: [provideHttpClient(withFetch(), withInterceptors([adminInterceptor, testMediaInterceptor]))]
};
