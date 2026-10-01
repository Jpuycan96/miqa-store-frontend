import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, of, timeout } from 'rxjs';
import { STORE_API_CONFIG } from '../config/store-api';

export interface PricingRequest {
  productId: string;
  quantity: number;
  erpMaterialId: string;
  erpModelId: string | null;
  measures: Readonly<Record<string, number>>;
}
export type PricingStatus = 'PRICE_AVAILABLE' | 'QUOTE_REQUIRED' | 'CONFIGURATION_STALE'
  | 'CONFIGURATION_INVALID' | 'TEMPORARILY_UNAVAILABLE';
export type PricingResult = { status: Exclude<PricingStatus, 'PRICE_AVAILABLE'> }
  | { status: 'PRICE_AVAILABLE'; amount: string; includesIgv: boolean };

/** Format the decimal text without converting the amount to floating point. */
export function formatPen(amount: string): string {
  const [whole, fraction = ''] = amount.split('.');
  return `S/ ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction.padEnd(2, '0')}`;
}

function publicResult(value: unknown): PricingResult {
  if (value && typeof value === 'object' && 'status' in value) {
    if (value.status === 'PRICE_AVAILABLE' && 'amount' in value && typeof value.amount === 'string'
        && /^(0|[1-9]\d*)(\.\d+)?$/.test(value.amount)
        && 'currency' in value && value.currency === 'PEN'
        && 'scope' in value && value.scope === 'TOTAL_LINEA'
        && 'includesIgv' in value && typeof value.includesIgv === 'boolean') {
      return { status: value.status, amount: value.amount, includesIgv: value.includesIgv };
    }
    if (value.status === 'QUOTE_REQUIRED' || value.status === 'CONFIGURATION_STALE'
        || value.status === 'CONFIGURATION_INVALID' || value.status === 'TEMPORARILY_UNAVAILABLE') {
      return { status: value.status };
    }
  }
  return { status: 'TEMPORARILY_UNAVAILABLE' };
}

@Injectable({ providedIn: 'root' })
export class PublicPricing {
  private readonly http = inject(HttpClient);
  private readonly config = inject(STORE_API_CONFIG);

  evaluate(request: PricingRequest) {
    // Explicit allowlist: never forward a binding, quote item or preview price.
    const body: PricingRequest = { productId: request.productId, quantity: request.quantity,
      erpMaterialId: request.erpMaterialId, erpModelId: request.erpModelId, measures: { ...request.measures } };
    return this.http.post<unknown>(`${this.config.baseUrl}/api/public/pricing/evaluate`, body).pipe(
      timeout(8000), map(publicResult),
      catchError((error: unknown) => {
        const status = error instanceof HttpErrorResponse ? error.status : 0;
        const result: PricingResult = { status: status === 409 ? 'CONFIGURATION_STALE'
          : status === 400 || status === 404 || status === 422 ? 'CONFIGURATION_INVALID'
          : 'TEMPORARILY_UNAVAILABLE' };
        return of(result);
      })
    );
  }
}
