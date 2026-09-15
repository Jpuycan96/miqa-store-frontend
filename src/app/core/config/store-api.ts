import { InjectionToken } from '@angular/core';

import { environment } from '../../../environments/environment';

export interface StoreApiConfig {
  readonly baseUrl: string;
  /** Empty preserves temporary /images/... references. Future VPS media can use its own base. */
  readonly mediaBaseUrl: string;
}

/** Environment-specific API configuration for MIQA Store. */
export const STORE_API_CONFIG = new InjectionToken<StoreApiConfig>('STORE_API_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    baseUrl: environment.storeApiBaseUrl,
    mediaBaseUrl: ''
  })
});
