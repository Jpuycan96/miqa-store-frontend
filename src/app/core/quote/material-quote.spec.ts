import { provideRouter } from '@angular/router';
import { Catalog } from '../../features/products/catalog/catalog';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProductCatalog } from '../data/product-catalog';
import { Product } from '../../shared/models/product';
import { erpProduct, erpSelection, materialProduct } from '../../testing/erp.fixture';
import { createQuoteItem } from './quote-utils';
import { quoteRequest } from './quote-request';
import { QuoteStore, QUOTE_STORAGE_KEY } from './quote-store';

describe('MATERIAL selection and cart recovery', () => {
  let products: readonly Product[];
  beforeEach(() => {
    localStorage.clear(); products = [materialProduct()];
    TestBed.configureTestingModule({ providers: [{ provide: ProductCatalog, useValue: { list: () => of(products), categories: () => of([]), findBySlug: () => of(undefined) } }] });
  });
  afterEach(() => localStorage.clear());
  const selection = (model = '20') => ({ quantity: 1.5, erp: { ...erpSelection({}), erpModelId: model || undefined } });
  it('preserves commercial product and original technical IDs in V2 without new contract fields', () => {
    const product=materialProduct('21');
    const item=createQuoteItem(product,selection('21'),'saved')!;
    const request=quoteRequest([item],{name:'Cliente',phone:'999999999'},'');
    expect(request.schemaVersion).toBe(2);
    expect(request.items[0]).toMatchObject({productId:'material-banner',quantity:1.5,
      erp:{erpServiceId:'1',erpMaterialId:'10',erpModelId:'21',catalogRevision:'a'.repeat(64),configurationVersion:'4'}});
    expect(JSON.stringify(request)).not.toContain('publicationScope');
    expect(JSON.stringify(request)).not.toContain('fixedErp');
  });
  it('rejects material and model manipulation even if a broader configuration contains those options', () => {
    const product=materialProduct('20');
    product.configuration!.configuration=erpProduct('ESCALA').configuration!.configuration;
    expect(createQuoteItem(product,{quantity:1.5,erp:{...erpSelection({}),erpMaterialId:'19',erpModelId:undefined}},'x')).toBeNull();
    expect(createQuoteItem(product,selection('21'),'x')).toBeNull();
    expect(createQuoteItem(product,selection(''),'x')).toBeNull();
    expect(createQuoteItem(product,selection('20'),'x')).toBeTruthy();
    product.configuration!.fixedErpMaterialId=null;
    expect(createQuoteItem(product,selection('20'),'x')).toBeNull();
  });
  it('allows approved selectable models and respects SIN_MODELO', () => {
    for (const model of ['20','21']) expect(createQuoteItem(materialProduct(),selection(model),'x')).toBeTruthy();
    expect(createQuoteItem(materialProduct(),selection('999'),'x')).toBeNull();
    expect(createQuoteItem(materialProduct(),selection(''),'x')).toBeNull();
    const noModel=materialProduct(null,'19');
    expect(createQuoteItem(noModel,{quantity:1.5,erp:{...erpSelection({}),erpMaterialId:'19',erpModelId:undefined}},'x')).toBeTruthy();
    expect(createQuoteItem(noModel,{quantity:1.5,erp:{...erpSelection({}),erpMaterialId:'19'}},'x')).toBeNull();
  });
  it('retains SERVICE compatibility without metadata and rejects stale MATERIAL revisions', () => {
    expect(createQuoteItem(erpProduct('ESCALA'),selection(),'x')).toBeTruthy();
    const product=materialProduct(); product.configuration!.catalogRevision='new';
    expect(createQuoteItem(product,selection(),'x')).toBeNull();
  });
  it('restores a valid MATERIAL cart and preserves identity and quantity through reload', () => {
    const saved=createQuoteItem(materialProduct(),selection('21'),'saved')!;
    localStorage.setItem(QUOTE_STORAGE_KEY,JSON.stringify([saved]));
    const store=TestBed.inject(QuoteStore); store.restore();
    expect(store.items()).toHaveLength(1);
    expect(store.items()[0]).toMatchObject({productId:'material-banner',quantity:1.5,erp:{erpMaterialId:'10',erpModelId:'21'}});
    expect(store.persistenceWarning()).toBe('');
    expect(store.updateQuantity(store.items()[0].id,2.5)).toBe(true);
    const reloaded=TestBed.runInInjectionContext(() => new QuoteStore()); reloaded.restore();
    expect(reloaded.items()[0].quantity).toBe(2.5);
  });
  it.each(['missing','unpublished','material','model','revision'] as const)('warns and preserves unresolved saved data for %s', reason => {
    const saved=createQuoteItem(materialProduct(),selection('21'),'saved')!;
    localStorage.setItem(QUOTE_STORAGE_KEY,JSON.stringify([saved]));
    let current=materialProduct();
    if(reason==='missing') products=[];
    else {
      if(reason==='unpublished') current={...current,published:false};
      if(reason==='material') current.configuration!.fixedErpMaterialId='19';
      if(reason==='model') current.configuration!.configuration!.materiales[0].modelos=[{erpModelId:'20',nombreReferencia:'Modelo'}];
      if(reason==='revision') current.configuration!.configurationVersion='next';
      products=[current];
    }
    const store=TestBed.inject(QuoteStore); store.restore();
    expect(store.items()).toEqual([]);
    expect(store.persistenceWarning()).toContain('1 producto(s)');
    expect(JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY)!)).toEqual([saved]);
    products=[materialProduct()];
    const reloaded=TestBed.runInInjectionContext(() => new QuoteStore()); reloaded.restore();
    expect(reloaded.items()).toHaveLength(1);
    expect(reloaded.items()[0].erp?.erpModelId).toBe('21');
  });
  it('shows the recovery warning on the catalog even when every saved line was removed', async () => {
    const saved=createQuoteItem(materialProduct(),selection(),'saved')!;
    localStorage.setItem(QUOTE_STORAGE_KEY,JSON.stringify([saved])); products=[];
    TestBed.configureTestingModule({providers:[provideRouter([])]});
    const fixture=TestBed.createComponent(Catalog); await fixture.whenStable();
    expect(TestBed.inject(QuoteStore).items()).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.cart-recovery-warning')?.textContent).toContain('1 producto(s)');
    expect(JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY)!)).toEqual([saved]);
  });
});
