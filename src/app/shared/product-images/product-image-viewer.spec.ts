import { provideRouter, Router } from '@angular/router';
import { Catalog } from '../../features/products/catalog/catalog';
import { provideTestCatalog } from '../../testing/catalog.fixture';
import { QuoteStore, QUOTE_STORAGE_KEY } from '../../core/quote/quote-store';
import { PRODUCTS } from '../../core/data/products.mock';
import { TestBed } from '@angular/core/testing';
import { ProductImageViewer } from './product-image-viewer';
import { ProductImageGallery } from './product-image-gallery';
import { ProductImage } from '../models/product';

const images:ProductImage[]=Array.from({length:4},(_,i)=>({id:String(i),url:'/images/'+i+'.png',altText:'Vista '+i,primaryImage:i===0,displayOrder:i}));
describe('Reusable product image viewer',()=>{
 let modal:PropertyDescriptor|undefined,close:PropertyDescriptor|undefined;
 let opener:HTMLButtonElement;
 beforeEach(()=>{
  modal=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'showModal');close=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'close');
  Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.open=true;}});
  Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(this:HTMLDialogElement){this.open=false;}});
  opener=document.createElement('button');opener.textContent='Abrir';document.body.append(opener);opener.focus();
 });
 afterEach(()=>{
  TestBed.resetTestingModule();vi.restoreAllMocks();opener.remove();document.body.style.overflow='';
  if(modal)Object.defineProperty(HTMLDialogElement.prototype,'showModal',modal);else Reflect.deleteProperty(HTMLDialogElement.prototype,'showModal');
  if(close)Object.defineProperty(HTMLDialogElement.prototype,'close',close);else Reflect.deleteProperty(HTMLDialogElement.prototype,'close');
 });
 it('shows one image without extra controls and restores scroll and focus on close',async()=>{
  const f=TestBed.createComponent(ProductImageViewer);await f.whenStable();
  expect(f.nativeElement.querySelector('dialog')).toBeNull();
  document.body.style.overflow='auto';f.componentInstance.open({name:'Producto',images:images.slice(0,1)});await f.whenStable();
  expect(f.nativeElement.querySelector('dialog').open).toBe(true);
  expect(f.nativeElement.querySelector('.viewer-controls')).toBeNull();
  expect(document.body.style.overflow).toBe('hidden');
  expect(document.activeElement).toBe(f.nativeElement.querySelector('.close-viewer'));
  f.nativeElement.querySelector('.close-viewer').click();await f.whenStable();
  expect(f.nativeElement.querySelector('dialog')).toBeNull();expect(document.body.style.overflow).toBe('auto');expect(document.activeElement).toBe(opener);
 });
 it('uses every API image, dots and wrapping arrow keys, then cancels with Escape',async()=>{
  const f=TestBed.createComponent(ProductImageViewer);f.componentInstance.open({name:'Producto',images});await f.whenStable();
  expect(f.nativeElement.querySelectorAll('.dots button')).toHaveLength(4);
  const key=(key:string)=>f.nativeElement.querySelector('dialog').dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));
  key('ArrowLeft');await f.whenStable();expect(f.componentInstance.index()).toBe(3);
  key('ArrowRight');await f.whenStable();expect(f.componentInstance.index()).toBe(0);
  f.nativeElement.querySelectorAll('.dots button')[2].click();await f.whenStable();
  expect(f.nativeElement.querySelector('.photo img').getAttribute('src')).toBe('/images/2.png');
  expect(f.nativeElement.querySelectorAll('.dots button')[2].getAttribute('aria-pressed')).toBe('true');
  f.nativeElement.querySelector('dialog').dispatchEvent(new Event('cancel',{cancelable:true}));await f.whenStable();
  expect(document.activeElement).toBe(opener);expect(document.body.style.overflow).toBe('');
 });
 it('opens the catalog image without navigating or changing the quote; name and cart keep their routes',async()=>{
  localStorage.clear();sessionStorage.clear();
  TestBed.configureTestingModule({providers:[provideRouter([]),provideTestCatalog()]});
  const f=TestBed.createComponent(Catalog);await f.whenStable();
  const store=TestBed.inject(QuoteStore);store.addItem(PRODUCTS[2],{quantity:2});await f.whenStable();
  const saved=store.items(),storage=localStorage.getItem(QUOTE_STORAGE_KEY);
  const router=TestBed.inject(Router);const nav=vi.spyOn(router,'navigate').mockResolvedValue(true);
  const link=vi.spyOn(router,'navigateByUrl').mockResolvedValue(true);
  const card=f.nativeElement.querySelector('[data-product="roll-up"]');const image=card.querySelector('.product-image');
  image.focus();image.click();await f.whenStable();
  expect(f.nativeElement.querySelector('app-product-image-viewer dialog').open).toBe(true);
  expect(nav).not.toHaveBeenCalled();expect(link).not.toHaveBeenCalled();
  f.nativeElement.querySelector('.close-viewer').click();await f.whenStable();
  expect(document.activeElement).toBe(image);expect(store.items()).toEqual(saved);
  expect(localStorage.getItem(QUOTE_STORAGE_KEY)).toBe(storage);
  card.querySelector('.product-name-link').click();await f.whenStable();expect(link).toHaveBeenCalledOnce();
  const target=link.mock.calls[0][0];expect(typeof target==='string'?target:router.serializeUrl(target)).toContain('/productos/roll-up?regresar=');
  card.querySelector('.configure').click();await f.whenStable();
  expect(nav).toHaveBeenCalledWith(['/productos','roll-up'],{queryParams:{regresar:'/'}});
  expect(store.items()).toEqual(saved);localStorage.clear();sessionStorage.clear();
 });
 it('keeps Tab and Shift+Tab inside the dialog',async()=>{
  const f=TestBed.createComponent(ProductImageViewer);f.componentInstance.open({name:'Producto',images});await f.whenStable();
  const buttons=f.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
  buttons[0].focus();buttons[0].dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));
  expect(document.activeElement).toBe(buttons[buttons.length-1]);
  buttons[buttons.length-1].dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
  expect(document.activeElement).toBe(buttons[0]);
 });
 it('closes only on outside clicks and releases scroll when destroyed',async()=>{
  const f=TestBed.createComponent(ProductImageViewer);f.componentInstance.open({name:'Producto',images});await f.whenStable();
  const dialog=f.nativeElement.querySelector('dialog') as HTMLDialogElement;
  vi.spyOn(dialog,'getBoundingClientRect').mockReturnValue({left:100,top:100,right:500,bottom:500} as DOMRect);
  dialog.dispatchEvent(new MouseEvent('click',{clientX:200,clientY:200}));expect(f.componentInstance.product()).not.toBeNull();
  dialog.dispatchEvent(new MouseEvent('click',{clientX:20,clientY:20}));await f.whenStable();expect(f.componentInstance.product()).toBeNull();
  f.componentInstance.open({name:'Producto',images});await f.whenStable();f.destroy();expect(document.body.style.overflow).toBe('');
 });
 it('opens the detail selected image without replacing or changing its thumbnails',async()=>{
  const f=TestBed.createComponent(ProductImageGallery);f.componentRef.setInput('product',{name:'Producto',images});await f.whenStable();
  const buttons=f.nativeElement.querySelectorAll('.thumbnails button');buttons[2].click();await f.whenStable();
  f.nativeElement.querySelector('.main-image').focus();f.nativeElement.querySelector('.main-image').click();await f.whenStable();
  expect(f.nativeElement.querySelector('.photo img').getAttribute('src')).toBe('/images/2.png');
  f.nativeElement.querySelector('.close-viewer').click();await f.whenStable();
  expect(f.componentInstance.index()).toBe(2);expect(document.activeElement).toBe(f.nativeElement.querySelector('.main-image'));
 });
});
