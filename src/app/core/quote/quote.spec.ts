import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PRODUCTS } from '../data/products.mock';
import { WHATSAPP_NUMBER } from '../config/whatsapp';
import { QuoteStore, QUOTE_STORAGE_KEY } from './quote-store';
import { buildQuoteMessage, calculateArea, createQuoteItem, getQuoteItemIdentity } from './quote-utils';

describe('Quote calculations and message', () => {
  it('calculates area and rejects invalid dimensions', () => {
    expect(calculateArea(2.5, 1.2)).toBe(3);
    for (const value of [0, -1, NaN, Infinity]) expect(calculateArea(value, 2)).toBe(0);
    expect(calculateArea(1e308, 1e308)).toBe(0);
  });
  it('validates quantity rules, materials and extras independently of the form', () => {
    const product = PRODUCTS[3];
    const config = { quantity: 1, widthMeters: 2.5, heightMeters: 1.2 };
    expect(createQuoteItem(product, config, '1')).toBeNull();
    expect(createQuoteItem(product, { ...config, materialId: 'blanco', extraIds: ['unknown'] }, '1')).toBeNull();
    expect(createQuoteItem(product, { ...config, materialId: 'blanco', widthMeters: 0 }, '1')).toBeNull();
    expect(createQuoteItem(PRODUCTS[0], { quantity: 1.5 }, '1')).toBeNull();
    expect(createQuoteItem({ ...PRODUCTS[2], minQuantity: 5, step: 5 }, { quantity: 6 }, '1')).toBeNull();
    expect(createQuoteItem({ ...PRODUCTS[2], minQuantity: 5, step: 5 }, { quantity: 10 }, '1')).toBeTruthy();
  });
  it('formats packs, units, measures, material, extras and notes without prices', () => {
    const items = [
      createQuoteItem(PRODUCTS[0], { quantity: 2 }, '1')!,
      createQuoteItem(PRODUCTS[1], { quantity: 5 }, '2')!,
      createQuoteItem(PRODUCTS[2], { quantity: 1 }, '3')!,
      createQuoteItem(PRODUCTS[3], { quantity: 1, widthMeters: 2.5, heightMeters: 1.2, materialId: 'blanco', extraIds: ['laminado'], notes: 'Diseño & impresión' }, '4')!
    ];
    expect(buildQuoteMessage(items)).toBe('Hola, estoy cotizando desde la web de MIQA.\n\n'
      + '• Tarjetas personales — 2 millares\n• Volantes A5 — 5 millares\n• Roll Up — 1 unidad\n'
      + '• Vinil impreso — 2.50 m x 1.20 m = 3.00 m² — Material: Vinil blanco — Extras: Laminado — Notas: Diseño & impresión'
      + '\n\nQuisiera recibir una cotización.');
  });
});

describe('QuoteStore', () => {
  beforeEach(() => localStorage.removeItem(QUOTE_STORAGE_KEY));
  afterEach(() => { vi.restoreAllMocks(); localStorage.removeItem(QUOTE_STORAGE_KEY); });

  it.each([0, 2])('accumulates identical PACK/QUANTITY rows and keeps their id and line count (%i)', index => {
    const store = TestBed.inject(QuoteStore);
    store.addItem(PRODUCTS[index], { quantity: 1 });
    const id = store.items()[0].id;
    store.addItem(PRODUCTS[index], { quantity: 1 });
    store.addItem(PRODUCTS[index], { quantity: 1 });
    expect(store.items()).toHaveLength(1);
    expect(store.items()[0]).toMatchObject({ id, quantity: 3 });
    expect(store.totalItems()).toBe(1);
    expect(store.highlightedItemId()).toBe(id);
    expect(store.confirmation()).toContain('actualizado en');
    expect(store.isOpen()).toBe(false);
    expect(new URL(store.whatsappUrl()).searchParams.get('text')).toContain(index === 0 ? '3 millares' : '3 unidades');
    expect(store.updateQuantity(id, 4)).toBe(true);
    store.removeItem(id);
    expect(store.totalItems()).toBe(0);
  });

  it('matches AREA options irrespective of extra order while preserving configuration differences', () => {
    const store = TestBed.inject(QuoteStore);
    const base = { quantity: 1, widthMeters: 2, heightMeters: 1, materialId: 'blanco', extraIds: ['laminado', 'corte-especial'], notes: 'Diseño A' };
    store.addItem(PRODUCTS[3], base);
    store.addItem(PRODUCTS[3], { ...base, extraIds: ['corte-especial', 'laminado'], notes: ' Diseño A ' });
    expect(store.items()).toHaveLength(1);
    expect(store.items()[0].quantity).toBe(2);
    for (const different of [{ widthMeters: 3 }, { heightMeters: 2 }, { materialId: 'transparente' }, { extraIds: ['laminado'] }, { notes: 'Diseño B' }]) {
      store.addItem(PRODUCTS[3], { ...base, ...different });
    }
    expect(store.items()).toHaveLength(6);
    expect(store.totalItems()).toBe(6);
    expect(new URL(store.whatsappUrl()).searchParams.get('text')).toContain('2.00 m x 1.00 m = 2.00 m² — 2 piezas');
    const item = store.items()[0];
    expect(getQuoteItemIdentity(item)).not.toBe(getQuoteItemIdentity({ ...item, saleType: 'QUANTITY' }));
  });

  it('consolidates old persisted duplicates without changing unrelated configurations', () => {
    const saved = createQuoteItem(PRODUCTS[0], { quantity: 2 }, 'old')!;
    localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify([saved, { ...saved, id: 'other' }, { ...saved, notes: 'Otro diseño' }]));
    const store = TestBed.inject(QuoteStore);
    store.restore();
    expect(store.items().map(item => item.quantity)).toEqual([4, 2]);
    expect(JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY)!)).toHaveLength(2);
  });

  it('clears the temporary row highlight and rejects overflowing accumulated quantities', () => {
    vi.useFakeTimers();
    try {
      const store = TestBed.inject(QuoteStore);
      store.addItem(PRODUCTS[2], { quantity: Number.MAX_SAFE_INTEGER });
      expect(store.addItem(PRODUCTS[2], { quantity: 1 })).toBe(false);
      store.clear();
      store.addItem(PRODUCTS[2], { quantity: 1 });
      store.addItem(PRODUCTS[2], { quantity: 1 });
      expect(store.highlightedItemId()).toBe(store.items()[0].id);
      vi.advanceTimersByTime(1000);
      expect(store.highlightedItemId()).toBeNull();
      vi.advanceTimersByTime(2500);
      expect(store.confirmation()).toBe('');
    } finally { vi.useRealTimers(); }
  });

  it('adds separate configurations, updates quantity, removes and clears', () => {
    const store = TestBed.inject(QuoteStore);
    expect(store.addItem(PRODUCTS[0], { quantity: 2 })).toBe(true);
    expect(store.addItem(PRODUCTS[0], { quantity: 1, notes: 'Otro diseño' })).toBe(true);
    expect(store.totalItems()).toBe(2);
    expect(store.isOpen()).toBe(false);
    const id = store.items()[0].id;
    expect(store.updateQuantity(id, 0)).toBe(false);
    expect(store.updateQuantity(id, 4)).toBe(true);
    expect(store.items()[0].quantity).toBe(4);
    const url = new URL(store.whatsappUrl());
    expect(url.pathname).toBe('/' + WHATSAPP_NUMBER);
    expect(url.searchParams.get('text')).toContain('4 millares');
    store.removeItem(id);
    expect(store.totalItems()).toBe(1);
    store.clear();
    expect(store.totalItems()).toBe(0);
    expect(JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY)!)).toEqual([]);
  });

  it('restores a saved quote and rebuilds trusted fields from product data', () => {
    const saved = createQuoteItem(PRODUCTS[3], { quantity: 1, widthMeters: 2.5, heightMeters: 1.2, materialId: 'blanco' }, 'saved')!;
    localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify([{ ...saved, productName: 'Alterado', areaSquareMeters: 999 }, { productId: 'unknown', quantity: 1 }]));
    const store = TestBed.inject(QuoteStore);
    store.restore();
    store.restore();
    expect(store.items()).toHaveLength(1);
    expect(store.items()[0].productName).toBe('Vinil impreso');
    expect(store.items()[0].areaSquareMeters).toBe(3);
    expect(store.isOpen()).toBe(false);
  });

  it('survives malformed storage and unavailable persistence', () => {
    localStorage.setItem(QUOTE_STORAGE_KEY, '{bad');
    const store = TestBed.inject(QuoteStore);
    expect(() => store.restore()).not.toThrow();
    expect(store.items()).toEqual([]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(store.addItem(PRODUCTS[2], { quantity: 1 })).toBe(true);
    expect(store.persistenceWarning()).toBeTruthy();
    expect(store.totalItems()).toBe(1);
  });

  it('never touches localStorage on the server', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const get = vi.spyOn(Storage.prototype, 'getItem');
    const set = vi.spyOn(Storage.prototype, 'setItem');
    const store = TestBed.inject(QuoteStore);
    store.restore();
    store.addItem(PRODUCTS[2], { quantity: 1 });
    store.clear();
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });
});
