import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ProductCatalog } from '../data/product-catalog';
import { PRODUCTS } from '../data/products.mock';
import { Product } from '../../shared/models/product';
import { QuoteStore, QUOTE_STORAGE_KEY } from './quote-store';
import { createQuoteItem } from './quote-utils';

describe('Quote restoration with asynchronous API', () => {
  let response: Subject<readonly Product[]>;
  beforeEach(() => {
    response = new Subject<readonly Product[]>();
    localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify([createQuoteItem(PRODUCTS[0], { quantity: 2 }, 'saved')]));
    TestBed.configureTestingModule({ providers: [{ provide: ProductCatalog, useValue: {
      list: () => response, categories: () => of([]), findBySlug: () => of(undefined)
    } }] });
  });
  afterEach(() => localStorage.removeItem(QUOTE_STORAGE_KEY));
  it('does not restore a late response after clear', () => {
    const store = TestBed.inject(QuoteStore);
    store.restore(); store.clear(); response.next(PRODUCTS);
    expect(store.items()).toEqual([]);
    expect(JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY)!)).toEqual([]);
  });
  it('preserves saved lines during loading and merges new additions once', () => {
    const store = TestBed.inject(QuoteStore);
    store.restore(); store.addItem(PRODUCTS[0], { quantity: 1 });
    expect(JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY)!)).toHaveLength(2);
    response.next(PRODUCTS);
    expect(store.items()).toHaveLength(1);
    expect(store.items()[0].quantity).toBe(3);
    expect(JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY)!)).toHaveLength(1);
  });
  it('does not overwrite saved lines when the API is unavailable', () => {
    const store = TestBed.inject(QuoteStore);
    store.restore(); response.error(new Error('offline')); store.addItem(PRODUCTS[2], { quantity: 1 });
    expect(store.persistenceWarning()).not.toBe('');
    expect(JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY)!)).toHaveLength(2);
  });
});
