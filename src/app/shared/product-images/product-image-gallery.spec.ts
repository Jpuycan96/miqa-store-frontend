import { TestBed } from '@angular/core/testing';
import { ProductImageGallery } from './product-image-gallery';
import { ProductImage } from '../models/product';
import { productImages } from './product-images';

const images: ProductImage[] = [1,2,3].map((n)=>({id:String(n),url:'/images/'+n+'.png',altText:'Imagen '+n,primaryImage:n===1,displayOrder:n-1}));
describe('Product image gallery',()=>{
 beforeEach(()=>{
  Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.open=true;}});
  Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(this:HTMLDialogElement){this.open=false;}});
 });
 afterEach(()=>vi.restoreAllMocks());
 async function create(count=3){
  const fixture=TestBed.createComponent(ProductImageGallery);
  fixture.componentRef.setInput('product',{name:'Producto',images:images.slice(0,count)});
  await fixture.whenStable();return fixture;
 }
 it('shows no dots for one image',async()=>{
  const f=await create(1);expect(f.nativeElement.querySelector('.dots')).toBeNull();
 });
 it('shows three dots with the first active and changes image without bubbling',async()=>{
  const f=await create();const el:HTMLElement=f.nativeElement;
  const dots=el.querySelectorAll<HTMLButtonElement>('.dots button');expect(dots).toHaveLength(3);
  expect(dots[0].getAttribute('aria-pressed')).toBe('true');
  const click=vi.fn();el.addEventListener('click',click);dots[1].click();await f.whenStable();
  expect(el.querySelector('img')?.getAttribute('src')).toBe('/images/2.png');
  expect(dots[1].getAttribute('aria-pressed')).toBe('true');expect(click).not.toHaveBeenCalled();
  expect(el.querySelector('dialog')).toBeNull();
 });
 it('opens the active image, navigates using arrows, dots and keyboard, then closes on Escape',async()=>{
  const f=await create();const el:HTMLElement=f.nativeElement;
  el.querySelectorAll<HTMLButtonElement>('.dots button')[1].click();await f.whenStable();
  el.querySelector<HTMLButtonElement>('.open-image')!.click();await f.whenStable();
  const dialog=el.querySelector('dialog')!;
  expect(dialog.open).toBe(true);expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/images/2.png');
  expect(document.body.style.overflow).toBe('hidden');
  dialog.querySelector<HTMLButtonElement>('[aria-label="Imagen siguiente"]')!.click();await f.whenStable();
  expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/images/3.png');
  dialog.querySelector<HTMLButtonElement>('[aria-label="Imagen anterior"]')!.click();await f.whenStable();
  expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/images/2.png');
  dialog.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));await f.whenStable();
  expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/images/1.png');
  dialog.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await f.whenStable();
  expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/images/2.png');
  dialog.querySelectorAll<HTMLButtonElement>('.dots button')[2].click();await f.whenStable();
  expect(dialog.querySelector('img')?.getAttribute('src')).toBe('/images/3.png');
  dialog.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await f.whenStable();
  expect(el.querySelector('dialog')).toBeNull();expect(document.body.style.overflow).not.toBe('hidden');
 });
 it('closes with X or backdrop but not when clicking the image',async()=>{
  const f=await create();const el:HTMLElement=f.nativeElement;
  for(const close of ['button','backdrop']){
   el.querySelector<HTMLButtonElement>('.open-image')!.click();await f.whenStable();
   const dialog=el.querySelector('dialog')!;dialog.querySelector('img')!.click();await f.whenStable();
   expect(dialog.open).toBe(true);
   if(close==='button')dialog.querySelector<HTMLButtonElement>('[aria-label="Cerrar visor"]')!.click();
   else dialog.click();
   await f.whenStable();expect(el.querySelector('dialog')).toBeNull();
  }
 });
 it('removes a broken img and shows a clean accessible fallback',async()=>{
  const f=await create();const el:HTMLElement=f.nativeElement;
  el.querySelector('img')!.dispatchEvent(new Event('error'));await f.whenStable();
  expect(el.querySelector('img')).toBeNull();expect(el.querySelector('.fallback')?.textContent).toContain('Imagen no disponible');
  el.querySelectorAll<HTMLButtonElement>('.dots button')[1].click();await f.whenStable();
  expect(el.querySelector('img')?.getAttribute('src')).toBe('/images/2.png');
 });
 it('orders metadata primary first, caps at three and supports legacy gallery without duplicates',()=>{
  expect(productImages({name:'p',images:[{...images[2],primaryImage:true},{...images[0],primaryImage:false},images[1]]}).map(i=>i.id)).toEqual(['3','1','2']);
  expect(productImages({name:'p',image:'/images/one.png',gallery:['/images/one.png','/images/two.png','/images/three.png','/images/four.png']})).toHaveLength(3);
 });
});
