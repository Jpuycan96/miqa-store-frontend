import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTestCatalog } from '../../testing/catalog.fixture';
import { STORE_API_CONFIG } from '../config/store-api';
import { PRODUCTS } from '../data/products.mock';
import { QuoteStore, QUOTE_STORAGE_KEY } from './quote-store';
import { QuoteSubmission, SUBMISSION_STORAGE_KEY } from './quote-submission';
import { QuoteSubmit } from './quote-submit';
import { quoteRequest, requestLimitError } from './quote-request';
import { erpProduct, erpSelection } from '../../testing/erp.fixture';
import { createQuoteItem } from './quote-utils';

const endpoint = 'https://store-api.example.test/api/public/quote-requests';
const receipt = { reference: 'MIQA-000123', receivedAt: '2026-09-28T15:00:00Z', confirmation: 'Solicitud recibida' };
describe('Persistent quote submission', () => {
  let submission: QuoteSubmission;
  let store: QuoteStore;
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.removeItem(QUOTE_STORAGE_KEY); sessionStorage.removeItem(SUBMISSION_STORAGE_KEY);
    TestBed.configureTestingModule({ providers: [provideTestCatalog(), provideHttpClient(), provideHttpClientTesting(),
      { provide: STORE_API_CONFIG, useValue: { baseUrl: 'https://store-api.example.test', mediaBaseUrl: '' } }] });
    submission = TestBed.inject(QuoteSubmission); store = TestBed.inject(QuoteStore); http = TestBed.inject(HttpTestingController);
    store.addItem({ ...PRODUCTS[2], minQuantity: 12, step: 12 }, { quantity: 50 });
    submission.form.patchValue({ name: ' Cliente ', phone: '+51 (999) 999-999', email: 'cliente@example.test', notes: ' Nota ' });
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });
  afterEach(() => { http.verify(); vi.restoreAllMocks(); localStorage.removeItem(QUOTE_STORAGE_KEY); sessionStorage.removeItem(SUBMISSION_STORAGE_KEY); });

  it('keeps all six ERP configurations in the request message and freezes the registered reference', async () => {
    store.clear();
    const product = erpProduct();
    product.configuration!.configuration!.cantidad.unidad = 'unidades';
    for (let index = 0; index < 6; index++) {
      expect(store.addItem(product, { quantity: index === 0 ? 2 : 1,
        erp: erpSelection({ ancho: 2, alto: 1 + index * 0.1 }), notes: 'Detalle ' + index })).toBe(true);
    }
    expect(store.items()).toHaveLength(6);
    submission.submit();
    const request = http.expectOne(endpoint + '/v2');
    expect(request.request.body.items).toHaveLength(6);
    store.addItem(product, { quantity: 1, erp: erpSelection({ ancho: 1, alto: 1 }), notes: 'Posterior' });
    request.flush(receipt);
    const url = submission.confirmed()!.url;
    const message = new URL(url).searchParams.get('text')!;
    expect(message.split('\n').filter(line => line.startsWith('\u2022 '))).toHaveLength(6);
    for (let index = 0; index < 6; index++) expect(message).toContain('Detalle ' + index);
    expect(message).toContain('2 unidades'); expect(message).toContain('1 unidad');
    expect(message).toContain('Material: Banner 13 Oz'); expect(message).toContain('Modelo: Modelo aprobado');
    expect(message).toContain('Ancho: 2 m'); expect(message).not.toContain('unidadess');
    expect(message).not.toContain('Posterior');
    submission.submit(); http.expectNone(endpoint + '/v2');
    expect(submission.confirmed()!.url).toBe(url);
    const fixture = TestBed.createComponent(QuoteSubmit); await fixture.whenStable();
    expect(fixture.componentInstance.confirmedMessage()).toBe(message);
    expect(fixture.nativeElement.textContent).toContain('Para enviar el carrito actual');
    expect(fixture.nativeElement.querySelector('a').textContent).toContain(receipt.reference);
    submission.startNew(); submission.form.patchValue({ name: 'Cliente', phone: '999999999' });
    submission.submit(); const next = http.expectOne(endpoint + '/v2');
    expect(next.request.body.items).toHaveLength(7);
    next.flush({ ...receipt, reference: 'MIQA-000124' });
    const nextMessage = new URL(submission.confirmed()!.url).searchParams.get('text')!;
    expect(nextMessage).toContain('MIQA-000124'); expect(nextMessage).toContain('Posterior');
    expect(nextMessage.split('\n').filter(line => line.startsWith('\u2022 '))).toHaveLength(7);
  });

  it('restores a one-item registered message without mixing in five later cart configurations', () => {
    submission.submit(); http.expectOne(endpoint).flush(receipt);
    const originalUrl = submission.confirmed()!.url;
    for (let index = 0; index < 5; index++) {
      store.addItem(erpProduct(), { quantity: 1, erp: erpSelection({ ancho: 2, alto: 1 + index * 0.1 }) });
    }
    expect(store.items()).toHaveLength(6);
    const restored = TestBed.runInInjectionContext(() => new QuoteSubmission());
    restored.restore();
    expect(restored.confirmed()!.url).toBe(originalUrl);
    expect(new URL(restored.confirmed()!.url).searchParams.get('text')!.split('\n')
      .filter(line => line.startsWith('\u2022 '))).toHaveLength(1);
    restored.submit(); http.expectNone(endpoint);
  });

  it('serializes QUANTITY, PACK, AREA, options and notes without labels, computed area or prices', () => {
    const items = [store.items()[0], createQuoteItem(PRODUCTS[0], { quantity: 3 }, 'pack')!,
      createQuoteItem(PRODUCTS[3], { quantity: 2, widthMeters: 2.5, heightMeters: 1.2, materialId: 'blanco', extraIds: ['laminado'], notes: 'Acabado' }, 'area')!];
    const request = quoteRequest(items, { name: ' Cliente ', phone: '999999999' }, ' Nota ');
    expect(request.contact).toEqual({ name: 'Cliente', phone: '999999999' });
    expect(request.notes).toBe('Nota');
    expect(request.items).toEqual([
      { productId: 'roll-up', saleType: 'QUANTITY', quantity: 50, extraIds: [] },
      { productId: 'tarjetas-personales', saleType: 'PACK', quantity: 3, packSize: 1000, extraIds: [] },
      { productId: 'vinil-impreso', saleType: 'AREA', quantity: 2, widthMeters: 2.5, heightMeters: 1.2, materialId: 'blanco', extraIds: ['laminado'], notes: 'Acabado' }
    ]);
    expect(requestLimitError(request)).toBe('');
  });
  it('sends UUID and exact quantity, prevents double submit and opens WhatsApp only after success', () => {
    submission.submit(); submission.submit();
    expect(window.open).not.toHaveBeenCalled();
    const req = http.expectOne(endpoint);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(req.request.body.items[0].quantity).toBe(50);
    expect(req.request.body.contact).toEqual({ name: 'Cliente', phone: '+51 (999) 999-999', email: 'cliente@example.test' });
    req.flush(receipt);
    expect(submission.state()).toBe('success');
    expect(window.open).toHaveBeenCalledOnce();
    const message = new URL(submission.confirmed()!.url).searchParams.get('text');
    expect(message).toContain('Solicitud MIQA-000123'); expect(message).toContain('50 unidades'); expect(message).toContain('Notas generales: Nota');
    expect(store.items()[0].quantity).toBe(50);
    submission.submit(); http.expectNone(endpoint);
    expect(sessionStorage.getItem(SUBMISSION_STORAGE_KEY)).not.toContain('cliente@example.test');
  });
  it('retries an uncertain failure with identical key and payload even after editing the cart', () => {
    submission.submit(); const first = http.expectOne(endpoint); const body = first.request.body; const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('error'));
    expect(window.open).not.toHaveBeenCalled(); expect(store.items()[0].quantity).toBe(50);
    expect(JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY)!)[0].quantity).toBe(50);
    store.changeQuantity(store.items()[0], 12);
    submission.submit(); const retry = http.expectOne(endpoint);
    expect(retry.request.body).toEqual(body); expect(retry.request.headers.get('Idempotency-Key')).toBe(key);
    retry.flush(receipt); expect(store.items()[0].quantity).toBe(62);
    const message = new URL(submission.confirmed()!.url).searchParams.get('text')!;
    expect(message).toContain('50 unidades'); expect(message).not.toContain('62 unidades');
  });
  it('restores the immutable attempt after reload without catalog reinterpretation', () => {
    submission.submit(); const first = http.expectOne(endpoint); const key = first.request.headers.get('Idempotency-Key');
    first.error(new ProgressEvent('error'));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideTestCatalog(), provideHttpClient(), provideHttpClientTesting(),
      { provide: STORE_API_CONFIG, useValue: { baseUrl: 'https://store-api.example.test' } }] });
    submission = TestBed.inject(QuoteSubmission); http = TestBed.inject(HttpTestingController);
    submission.restore(); expect(submission.pending()?.request.items[0].quantity).toBe(50);
    submission.submit(); const retry = http.expectOne(endpoint); expect(retry.request.headers.get('Idempotency-Key')).toBe(key); retry.flush(receipt);
  });
  it.each([400, 409, 413, 429, 500])('keeps selection and retry data on HTTP %s', status => {
    submission.submit(); http.expectOne(endpoint).flush({}, { status, statusText: 'Error' });
    expect(submission.state()).toBe('error'); expect(submission.error()).not.toBe('');
    expect(submission.pending()).not.toBeNull(); expect(store.items()).toHaveLength(1); expect(window.open).not.toHaveBeenCalled();
  });
  it('uses a new key only after explicitly preparing another submission', () => {
    submission.submit(); const first = http.expectOne(endpoint); const key = first.request.headers.get('Idempotency-Key'); first.flush(receipt);
    submission.startNew(); submission.form.patchValue({ name: 'Cliente', phone: '999999999' }); submission.submit();
    const next = http.expectOne(endpoint); expect(next.request.headers.get('Idempotency-Key')).not.toBe(key); next.flush(receipt);
  });
  it('requires explicit confirmation to replace an unconfirmed attempt', () => {
    submission.submit(); http.expectOne(endpoint).error(new ProgressEvent('error'));
    const original = submission.pending(); vi.spyOn(window, 'confirm').mockReturnValue(false);
    submission.startNew(); expect(submission.pending()).toBe(original);
    vi.mocked(window.confirm).mockReturnValue(true); submission.startNew(); expect(submission.pending()).toBeNull();
  });
  it('rejects invalid contact and limits without HTTP or losing the selection', () => {
    submission.form.patchValue({ name: ' ', phone: '12' }); submission.submit(); http.expectNone(endpoint);
    expect(submission.form.invalid).toBe(true); expect(store.items()).toHaveLength(1);
    submission.form.patchValue({ name: 'Cliente', phone: '999999999' }); store.updateQuantity(store.items()[0].id, 1_000_000_001);
    submission.submit(); http.expectNone(endpoint); expect(submission.error()).toBe('Revisa la cantidad de los productos. Usa cantidades enteras y respeta el mínimo indicado.');
  });
  it('keeps the retry available if the response cannot be trusted', () => {
    submission.submit(); http.expectOne(endpoint).flush({ reference: 'fake' });
    expect(submission.state()).toBe('error'); expect(submission.pending()).not.toBeNull(); expect(window.open).not.toHaveBeenCalled();
  });
  it('renders contact errors and a confirmed fallback link when popups are blocked', async () => {
    const fixture = TestBed.createComponent(QuoteSubmit); await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('input')).toHaveLength(3);
    expect(element.querySelector('.contact-toggle')?.textContent).toContain('Datos de contacto');
    expect(element.textContent).toContain('Registraremos tu solicitud en MIQA. Después podrás continuar por WhatsApp.');
    expect(element.querySelector('button[type=submit]')?.textContent).toContain('Enviar solicitud de cotización');
    expect(element.querySelector('a')).toBeNull();
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    http.expectOne(endpoint).flush(receipt); await fixture.whenStable();
    expect(element.textContent).toContain('MIQA-000123');
    expect(element.querySelector('a')?.href).toBe(submission.confirmed()!.url);
    expect(element.querySelector('a')?.rel).toBe('noopener noreferrer');
  });
  it('synchronizes contact when moving between the panel and drawer forms', async () => {
    const panel = TestBed.createComponent(QuoteSubmit); const drawer = TestBed.createComponent(QuoteSubmit);
    await panel.whenStable(); await drawer.whenStable();
    const first: HTMLInputElement = panel.nativeElement.querySelector('[formcontrolname=name]');
    first.value = 'Nombre actualizado'; first.dispatchEvent(new Event('input', { bubbles: true }));
    await panel.whenStable(); await drawer.whenStable();
    expect(drawer.nativeElement.querySelector('[formcontrolname=name]').value).toBe('Nombre actualizado');
    expect(submission.form.controls.name.value).toBe('Nombre actualizado');
  });
});
