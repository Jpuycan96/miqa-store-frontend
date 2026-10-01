import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ProductCatalog } from '../../../core/data/product-catalog';
import { STORE_API_CONFIG } from '../../../core/config/store-api';
import { formatPen } from '../../../core/data/public-pricing';
import { QuoteStore } from '../../../core/quote/quote-store';
import { QuoteSubmission } from '../../../core/quote/quote-submission';
import { erpProduct } from '../../../testing/erp.fixture';
import { ErpConfigurator } from './erp-configurator';

const endpoint = 'http://localhost:8081/api/public/pricing/evaluate';
const available = { status: 'PRICE_AVAILABLE', amount: '105.00', currency: 'PEN', includesIgv: true,
  scope: 'TOTAL_LINEA', quoteMode: 'M2', billableBase: { quantity: '3.0', unit: 'M2' } };

describe('ERP public pricing preview', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: ProductCatalog, useValue: { list: () => of([]) } },
      { provide: STORE_API_CONFIG, useValue: { baseUrl: 'http://localhost:8081', mediaBaseUrl: '' } }] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });
  async function setup() {
    const fixture = TestBed.createComponent(ErpConfigurator);
    fixture.componentRef.setInput('product', erpProduct());
    fixture.detectChanges();
    const controls = fixture.componentInstance.form.controls;
    controls.material.setValue('19');
    fixture.detectChanges();
    controls.quantity.setValue(1);
    controls.measures.patchValue({ ancho: 2, alto: 1.5 });
    fixture.detectChanges();
    return fixture;
  }
  async function evaluate() {
    await vi.advanceTimersByTimeAsync(300);
    return http.expectOne(endpoint);
  }
  it('debounces valid selections and sends only the public allowlist', async () => {
    const fixture = await setup();
    await vi.advanceTimersByTimeAsync(299); http.expectNone(endpoint);
    fixture.componentInstance.form.controls.quantity.setValue(2);
    await vi.advanceTimersByTimeAsync(299); http.expectNone(endpoint);
    await vi.advanceTimersByTimeAsync(1);
    const req = http.expectOne(endpoint);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ productId: 'erp-banner', quantity: 2, erpMaterialId: '19', erpModelId: null, measures: { ancho: 2, alto: 1.5 } });
    req.flush(available); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('S/ 105.00');
    expect(fixture.nativeElement.textContent).toContain('Incluye IGV');
    const region: HTMLElement = fixture.nativeElement.querySelector('.price-status');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    expect(region.getAttribute('aria-atomic')).toBe('true');
    for (const hidden of ['pricingRevision', 'catalogRevision', 'configurationVersion', 'erpMaterialId', '/api/', '99999999', 'seis decimales']) expect(region.textContent).not.toContain(hidden);
    fixture.componentInstance.form.controls.notes.setValue('Mi proyecto');
    await vi.advanceTimersByTimeAsync(500); http.expectNone(endpoint);
  });
  it.each([
    ['QUOTE_REQUIRED', 200, 'Precio por cotizar', true],
    ['CONFIGURATION_STALE', 409, 'opciones de este producto cambiaron', false],
    ['CONFIGURATION_INVALID', 422, 'No pudimos validar', false],
    ['TEMPORARILY_UNAVAILABLE', 503, 'Precio no disponible temporalmente', true]
  ] as const)('handles %s without inventing a price', async (status, code, message, canAdd) => {
    const fixture = await setup(); const req = await evaluate();
    req.flush({ status, diagnostic: 'PRIVATE INTERNAL DETAIL' }, { status: code, statusText: 'Result' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(message);
    expect(fixture.nativeElement.textContent).not.toContain('PRIVATE INTERNAL DETAIL');
    expect(fixture.nativeElement.querySelector('.price-amount')).toBeNull();
    expect(fixture.componentInstance.canAdd()).toBe(canAdd);
    fixture.componentInstance.add();
    expect(TestBed.inject(QuoteStore).items().length).toBe(canAdd ? 1 : 0);
    if (status === 'CONFIGURATION_STALE' || status === 'CONFIGURATION_INVALID') {
      const refresh = vi.fn(); fixture.componentInstance.refreshConfiguration.subscribe(refresh);
      fixture.nativeElement.querySelector('button[type=button]').click(); expect(refresh).toHaveBeenCalledOnce();
      await vi.advanceTimersByTimeAsync(2000); http.expectNone(endpoint);
    }
    if (status === 'TEMPORARILY_UNAVAILABLE') {
      fixture.nativeElement.querySelector('button[type=button]').click();
      (await evaluate()).flush(available); fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('S/ 105.00');
    }
  });
  it.each(['material', 'quantity', 'ancho', 'alto', 'model', 'product'] as const)('immediately removes old price on %s changes', async field => {
    const fixture = await setup(); (await evaluate()).flush(available); fixture.detectChanges();
    const component = fixture.componentInstance;
    if (field === 'material') component.form.controls.material.setValue('10');
    else if (field === 'quantity') component.form.controls.quantity.setValue(2);
    else if (field === 'model') component.form.controls.model.setValue('unknown');
    else if (field === 'product') fixture.componentRef.setInput('product', { ...erpProduct(), id: 'another-product' });
    else component.form.controls.measures.controls[field].setValue(3);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.price-amount')).toBeNull();
    fixture.destroy();
  });
  it('cancels an in-flight response immediately, including while the new value is debouncing', async () => {
    const fixture = await setup(); const old = await evaluate();
    fixture.componentInstance.form.controls.quantity.setValue(2);
    expect(old.cancelled).toBe(true);
    const next = await evaluate(); next.flush({ ...available, amount: '210.00' });
    expect(() => old.flush(available)).toThrow();
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('S/ 210.00');
    fixture.componentInstance.form.controls.quantity.setValue(null);
    await vi.advanceTimersByTimeAsync(500); http.expectNone(endpoint);
    fixture.detectChanges(); expect(fixture.nativeElement.querySelector('.price-amount')).toBeNull();
  });
  it.each(['LEGACY', 'UNAVAILABLE'] as const)('does not evaluate %s configurations', async mode => {
    const fixture = await setup();
    fixture.componentRef.setInput('product', { ...erpProduct(), configuration: { ...erpProduct().configuration!, mode } });
    fixture.detectChanges(); await vi.advanceTimersByTimeAsync(500);
    http.expectNone(endpoint); expect(fixture.componentInstance.price().status).toBe('IDLE');
    if (mode === 'UNAVAILABLE') expect(fixture.componentInstance.canAdd()).toBe(false);
  });
  it('keeps preview amount out of the cart and the actual v2 POST', async () => {
    const fixture = await setup(); (await evaluate()).flush(available); fixture.detectChanges();
    fixture.nativeElement.querySelector('button[type=submit]').click();
    const store = TestBed.inject(QuoteStore); expect(store.items()).toHaveLength(1);
    const submission = TestBed.inject(QuoteSubmission);
    vi.spyOn(window, 'open').mockReturnValue(null);
    submission.form.patchValue({ name: 'Cliente', phone: '999999999' }); submission.submit();
    const req = http.expectOne('http://localhost:8081/api/public/quote-requests/v2');
    expect(req.request.body.schemaVersion).toBe(2);
    for (const forbidden of ['amount', '105.00', 'pricingRevision', 'includesIgv']) {
      expect(JSON.stringify(req.request.body)).not.toContain(forbidden);
      expect(JSON.stringify(store.items())).not.toContain(forbidden);
    }
    req.flush({ reference: 'MIQA-000123', receivedAt: '2026-09-30T10:00:00Z', confirmation: 'Solicitud recibida' });
  });
  it.each([400, 404, 500])('handles ordinary HTTP %s safely', async status => {
    const fixture = await setup(); (await evaluate()).flush({ message: 'PRIVATE' }, { status, statusText: 'Error' });
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).not.toContain('PRIVATE');
    expect(fixture.componentInstance.price().status).toBe(status === 500 ? 'TEMPORARILY_UNAVAILABLE' : 'CONFIGURATION_INVALID');
  });
  it('handles network errors, malformed price and timeout without a stale amount', async () => {
    const fixture = await setup(); (await evaluate()).error(new ProgressEvent('error'));
    expect(fixture.componentInstance.price().status).toBe('TEMPORARILY_UNAVAILABLE');
    fixture.componentInstance.retryPrice(); (await evaluate()).flush({ ...available, amount: 105 });
    expect(fixture.componentInstance.price().status).toBe('TEMPORARILY_UNAVAILABLE');
    fixture.componentInstance.retryPrice(); const req = await evaluate();
    await vi.advanceTimersByTimeAsync(8000); expect(req.cancelled).toBe(true);
    expect(fixture.componentInstance.price().status).toBe('TEMPORARILY_UNAVAILABLE');
  });
  it('formats decimal strings without precision loss', () => {
    expect(formatPen('9007199254740993.01')).toBe('S/ 9,007,199,254,740,993.01');
    expect(formatPen('0')).toBe('S/ 0.00');
    expect(formatPen('10.5')).toBe('S/ 10.50');
  });
});

