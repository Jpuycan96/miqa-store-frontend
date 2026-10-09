import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, Subject } from 'rxjs';
import { ProductCatalog } from '../data/product-catalog';
import { STORE_API_CONFIG } from '../config/store-api';
import { sumAmounts } from '../data/public-pricing';
import { PRODUCTS } from '../data/products.mock';
import { erpProduct, erpSelection } from '../../testing/erp.fixture';
import { QuoteStore, QUOTE_STORAGE_KEY } from './quote-store';
import { QuotePanel } from './quote-panel/quote-panel';
import { quoteRequest } from './quote-request';
import { createQuoteItem } from './quote-utils';

const endpoint = 'http://localhost:8081/api/public/pricing/evaluate';
const available = (amount = '105.00') => ({ status: 'PRICE_AVAILABLE', amount, currency: 'PEN', scope: 'TOTAL_LINEA', includesIgv: true });

describe('Evaluated quote line prices', () => {
  let store: QuoteStore;
  let http: HttpTestingController;
  const product = erpProduct();
  const source = { list: () => of([product, ...PRODUCTS]), findBySlug: vi.fn(() => of(product)), categories: () => of([]) };
  beforeEach(() => {
    vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear(); source.findBySlug.mockReset().mockReturnValue(of(product));
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ProductCatalog, useValue: source },
      { provide: STORE_API_CONFIG, useValue: { baseUrl: 'http://localhost:8081', mediaBaseUrl: '' } } ] });
    store = TestBed.inject(QuoteStore); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { store.stopPrices(); http.verify(); TestBed.resetTestingModule(); vi.useRealTimers(); localStorage.clear(); sessionStorage.clear(); });
  function add(quantity = 1.5) {
    store.restore(); // Match browser hydration: restore before any customer action.
    expect(store.addItem(product, { quantity, erp: erpSelection(), notes: 'Mi proyecto' })).toBe(true);
    return store.items()[0];
  }
  async function request() { store.refreshPrices(); await vi.advanceTimersByTimeAsync(300); return http.expectOne(endpoint); }

  it('uses the existing public request for the exact saved configuration and renders its subtotal', async () => {
    const item = add();
    const fixture = TestBed.createComponent(QuotePanel); fixture.detectChanges();
    const evaluation = await request();
    expect(evaluation.request.body).toEqual({ productId: item.productId, quantity: 1.5, erpMaterialId: '10', erpModelId: '20', measures: { ancho: 2.5, alto: 1.2 } });
    evaluation.flush(available()); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.line-price')?.textContent).toContain('S/ 105.00');
    expect(fixture.nativeElement.querySelector('.quote-total')?.textContent).toContain('Total de la cotización');
    expect(store.priceSummary().amount).toBe('105.00');
    expect(store.priceSummary().includesIgv).toBe(true);
    expect(JSON.stringify(quoteRequest(store.items(), { name: 'Cliente', phone: '999999999' }, ''))).not.toContain('amount');
    expect(localStorage.getItem(QUOTE_STORAGE_KEY)).not.toContain('amount');
    fixture.destroy();
  });

  it('invalidates immediately, cancels older evaluations and uses nonlinear ERP amounts', async () => {
    const item = add(); (await request()).flush(available('105.00'));
    expect(store.updateQuantity(item.id, 2.5)).toBe(true);
    expect(store.priceFor(store.items()[0]).status).toBe('LOADING');
    expect(store.priceSummary().amount).toBeNull();
    const previous = await request();
    store.updateQuantity(item.id, 3.5); store.refreshPrices();
    expect(previous.cancelled).toBe(true);
    await vi.advanceTimersByTimeAsync(300);
    const newest = http.expectOne(endpoint); expect(newest.request.body.quantity).toBe(3.5);
    newest.flush(available('77.25'));
    expect(store.priceSummary().amount).toBe('77.25');
    expect(store.items()).toHaveLength(1);
  });

  it('rejects invalid quantities without changing a valid evaluated price', async () => {
    const item = add(); (await request()).flush(available());
    expect(store.updateQuantity(item.id, 0.25)).toBe(false); store.refreshPrices();
    await vi.advanceTimersByTimeAsync(300); http.expectNone(endpoint);
    expect(store.priceSummary().amount).toBe('105.00');
  });

  it.each(['QUOTE_REQUIRED', 'CONFIGURATION_STALE', 'CONFIGURATION_INVALID', 'TEMPORARILY_UNAVAILABLE'] as const)('removes previous amounts and displays %s', async status => {
    const item = add(); (await request()).flush(available());
    store.updateQuantity(item.id, 2.5); (await request()).flush({ status });
    const fixture = TestBed.createComponent(QuotePanel); fixture.detectChanges();
    expect(store.priceFor(store.items()[0]).status).toBe(status);
    expect(store.priceSummary().amount).toBeNull();
    expect(store.priceSummary().complete).toBe(false);
    expect(fixture.nativeElement.querySelector('.line-price')?.textContent).not.toContain('S/ 105');
    if (status === 'CONFIGURATION_STALE' || status === 'CONFIGURATION_INVALID')
      expect(fixture.nativeElement.querySelector('.line-price a')?.getAttribute('href')).toContain('/productos/' + product.slug);
    fixture.destroy();
  });

  it('never labels partial amounts as a complete total and marks legacy lines por cotizar', async () => {
    add(); store.addItem(PRODUCTS[2], { quantity: 1 }); (await request()).flush(available());
    expect(store.priceSummary()).toMatchObject({ amount: '105.00', complete: false, pending: 1 });
    expect(store.priceFor(store.items()[1]).status).toBe('QUOTE_REQUIRED');
    const fixture = TestBed.createComponent(QuotePanel); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.quote-total')?.textContent).toContain('Importes disponibles');
    expect(fixture.nativeElement.querySelector('.quote-total')?.textContent).not.toContain('Total de la cotización');
    fixture.destroy();
  });

  it('keeps different materials distinct and sums only evaluated decimal subtotals', async () => {
    add(); store.addItem(product, { quantity: 1.5, erp: { ...erpSelection(), erpMaterialId: '19', erpModelId: undefined } });
    store.refreshPrices(); await vi.advanceTimersByTimeAsync(300);
    const evaluations = http.match(endpoint); expect(evaluations).toHaveLength(2);
    evaluations[0].flush(available('0.10')); evaluations[1].flush(available('0.20'));
    expect(store.priceSummary()).toMatchObject({ amount: '0.30', complete: true });
    expect(store.items()).toHaveLength(2);
    expect(sumAmounts(['99999999999999999999.9999999999', '0.0000000001'])).toBe('100000000000000000000.0000000000');
  });

  it('restores old persisted selections and ignores any saved price before reevaluating', async () => {
    const saved = createQuoteItem(product, { quantity: 1.5, erp: erpSelection(), notes: 'Guardado' }, 'saved')!;
    localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify([{ ...saved, price: available('999999') }]));
    store.restore(); expect(store.items()[0].notes).toBe('Guardado');
    expect(store.priceFor(store.items()[0]).status).toBe('LOADING');
    (await request()).flush(available('22.50')); expect(store.priceSummary().amount).toBe('22.50');
  });

  it('detects changed revisions before pricing a stored selection', async () => {
    add(); const fresh = structuredClone(product); fresh.configuration!.configurationVersion = 'new';
    source.findBySlug.mockReturnValue(of(fresh)); store.refreshPrices(); await vi.advanceTimersByTimeAsync(300);
    http.expectNone(endpoint); expect(store.priceFor(store.items()[0]).status).toBe('CONFIGURATION_STALE');
    expect(store.items()).toHaveLength(1);
  });

  it('cancels prices when removing lines or leaving the panel, and reevaluates on remount', async () => {
    const item = add(); const pending = await request(); store.removeItem(item.id); store.refreshPrices();
    expect(pending.cancelled).toBe(true); expect(store.priceSummary().amount).toBeNull();
    add(); (await request()).flush(available()); store.stopPrices();
    expect(store.priceSummary().amount).toBeNull(); (await request()).flush(available('15'));
    expect(store.priceSummary().amount).toBe('15.00');
  });

  it('handles catalog errors without retaining old prices and allows an explicit retry', async () => {
    const item = add(); (await request()).flush(available());
    const failed = new Subject<typeof product>(); source.findBySlug.mockReturnValue(failed);
    store.updateQuantity(item.id, 2.5); store.refreshPrices(); await vi.advanceTimersByTimeAsync(300);
    failed.error(new Error('offline')); expect(store.priceFor(store.items()[0]).status).toBe('TEMPORARILY_UNAVAILABLE');
    expect(store.priceSummary().amount).toBeNull(); source.findBySlug.mockReturnValue(of(product));
    store.retryPrice(item.id); await vi.advanceTimersByTimeAsync(300); http.expectOne(endpoint).flush(available('25.50'));
    expect(store.priceSummary().amount).toBe('25.50');
  });
});
