import { InjectionToken } from '@angular/core';

export interface StoreApiConfig {
  readonly baseUrl: string;
  /** Empty preserves temporary /images/... references. Future VPS media can use its own base. */
  readonly mediaBaseUrl: string;
}

/** Local stage only. A future deployment supplies this token at bootstrap. */
export const STORE_API_CONFIG = new InjectionToken<StoreApiConfig>('STORE_API_CONFIG', {
  providedIn: 'root', factory: () => ({ baseUrl: 'http://127.0.0.1:8081', mediaBaseUrl: '' })
});
