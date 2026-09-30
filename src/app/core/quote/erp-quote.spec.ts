import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { erpProduct, erpSelection } from '../../testing/erp.fixture';
import { PRODUCTS } from '../data/products.mock';
import { ProductCatalog } from '../data/product-catalog';
import { STORE_API_CONFIG } from '../config/store-api';
import { createQuoteItem, describeQuoteItem, getQuoteItemIdentity, mergeQuoteItems } from './quote-utils';
import { QuoteStore, QUOTE_STORAGE_KEY } from './quote-store';
import { QuoteSubmission, SUBMISSION_STORAGE_KEY } from './quote-submission';
import { quoteRequest } from './quote-request';
import { validErpQuantity } from '../../shared/models/erp-configuration';

describe('ERP selections alongside legacy cart', () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: ProductCatalog, useValue: { list: () => of([erpProduct(), ...PRODUCTS]) } },
      { provide: STORE_API_CONFIG, useValue: { baseUrl: 'http://localhost:8081', mediaBaseUrl: '' } }] });
  });
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); });
  it('keeps unbound legacy selection and blocks unavailable products or ERP bypass', () => {
    expect(createQuoteItem(PRODUCTS[2],{quantity: 5},'1')).toBeTruthy();
    expect(createQuoteItem(erpProduct(),{quantity: 5},'1')).toBeNull();
    expect(createQuoteItem({...erpProduct(),configuration: {...erpProduct().configuration!,mode: 'UNAVAILABLE'}}, {quantity: 5},'1')).toBeNull();
  });
  it.each(['ESCALA','M2','METRO_LINEAL'] as const)('interprets required measures for %s', form => {
    const measures: Record<string, number> = form === 'M2' ? {ancho: 2.5,alto: 1.2} : form === 'ESCALA' ? {} : {longitud: 2.5};
    const item = createQuoteItem(erpProduct(form),{quantity: 1.5,erp: erpSelection(measures)},'1')!;
    expect(item).toBeTruthy(); expect(item.quantity).toBe(1.5);
    expect(describeQuoteItem(item)).toContain('Banner 13 Oz');
    if (form !== 'ESCALA') expect(createQuoteItem(erpProduct(form),{quantity: 1.5,erp: erpSelection({})},'1')).toBeNull();
  });
  it('rejects unapproved materials/models, wrong service, stale revision and extra measures', () => {
    for (const erp of [ {...erpSelection(),erpMaterialId: '999'}, {...erpSelection(),erpModelId: '999'},
      {...erpSelection(),erpServiceId: '999'}, {...erpSelection(),catalogRevision: 'old'},
      {...erpSelection(),measures: {ancho: 1,alto: 1,longitud: 1}} ])
      expect(createQuoteItem(erpProduct(),{quantity: 1.5,erp},'1')).toBeNull();
  });
  it('enforces minimum, maximum, mandatory multiple and precision without truncating decimals', () => {
    const rules = erpProduct().configuration!.configuration!.cantidad;
    expect(validErpQuantity(1.5,rules)).toBe(true);
    for (const quantity of [0,0.25,1.25,100.5,1.001,NaN]) expect(validErpQuantity(quantity,rules)).toBe(false);
    expect(validErpQuantity(1.5,{...rules,permiteDecimales: false,precision: 0,multiploObligatorio: null})).toBe(false);
  });
  it('preserves decimal quantities when merging and keeps different ERP options distinct', () => {
    const first = createQuoteItem(erpProduct(),{quantity: 1.5,erp: erpSelection()},'1')!;
    expect(mergeQuoteItems([first,{...first,id: '2'}])[0].quantity).toBe(3);
    expect(getQuoteItemIdentity(first)).not.toBe(getQuoteItemIdentity({...first,erp: {...first.erp!,erpMaterialId: '19'}}));
  });
  it('sends only selection fields, preserves mixed order and uses v2 only when needed', () => {
    const legacy = createQuoteItem(PRODUCTS[2],{quantity: 5},'1')!;
    const erp = createQuoteItem(erpProduct(),{quantity: 1.5,erp: erpSelection()},'2')!;
    expect(quoteRequest([legacy],{name: 'Cliente',phone: '999999999'},'').schemaVersion).toBeUndefined();
    const request = quoteRequest([legacy,erp],{name: 'Cliente',phone: '999999999'},'');
    expect(request.schemaVersion).toBe(2);
    expect(request.items.map(item => item.productId)).toEqual([legacy.productId,erp.productId]);
    expect(request.items[1].saleType).toBeUndefined();
    expect(JSON.stringify(request)).not.toContain('materialName');
    expect(JSON.stringify(request)).not.toContain('quantityRules');
  });
  it('restores ERP cart through current configuration and preserves decimal edits', () => {
    const saved = createQuoteItem(erpProduct(),{quantity: 1.5,erp: erpSelection()},'saved')!;
    localStorage.setItem(QUOTE_STORAGE_KEY,JSON.stringify([saved]));
    const store = TestBed.inject(QuoteStore); store.restore();
    expect(store.items()[0].quantity).toBe(1.5);
    expect(store.updateQuantity(store.items()[0].id,2.5)).toBe(true);
    expect(store.updateQuantity(store.items()[0].id,2.25)).toBe(false);
    expect(JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY)!)[0].quantity).toBe(2.5);
  });
  it('keeps immutable v2 retry and opens WhatsApp only after persistence succeeds', () => {
    const store = TestBed.inject(QuoteStore);
    store.addItem(erpProduct(),{quantity: 1.5,erp: erpSelection()});
    const submission = TestBed.inject(QuoteSubmission);
    const http = TestBed.inject(HttpTestingController);
    vi.spyOn(window,'open').mockImplementation(() => null);
    submission.form.patchValue({name: 'Cliente',phone: '999999999'});
    submission.submit();
    const first = http.expectOne('http://localhost:8081/api/public/quote-requests/v2');
    const key = first.request.headers.get('Idempotency-Key'); const body = first.request.body;
    first.error(new ProgressEvent('error'));
    expect(window.open).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem(SUBMISSION_STORAGE_KEY)!).pending.request.schemaVersion).toBe(2);
    store.updateQuantity(store.items()[0].id,5);
    submission.submit();
    const retry = http.expectOne('http://localhost:8081/api/public/quote-requests/v2');
    expect(retry.request.headers.get('Idempotency-Key')).toBe(key); expect(retry.request.body).toEqual(body);
    retry.flush({reference: 'MIQA-000123',receivedAt: '2026-09-30T10:00:00Z',confirmation: 'Solicitud recibida'});
    expect(window.open).toHaveBeenCalledOnce();
    expect(new URL(submission.confirmed()!.url).searchParams.get('text')).toContain('1.5 unidades');
    expect(new URL(submission.confirmed()!.url).searchParams.get('text')).toContain('Modelo aprobado');
  });
});
