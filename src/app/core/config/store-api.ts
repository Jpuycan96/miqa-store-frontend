import { InjectionToken } from '@angular/core';

export interface StoreApiConfig {
  readonly baseUrl: string;
  /** Empty preserves temporary /images/... references. Future VPS media can use its own base. */
  readonly mediaBaseUrl: string;
}

/** Production API for MIQA Store. */
export const STORE_API_CONFIG = new InjectionToken<StoreApiConfig>('STORE_API_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    baseUrl: 'https://api-store.solucionesmicaela.com',
    mediaBaseUrl: ''
  })
});