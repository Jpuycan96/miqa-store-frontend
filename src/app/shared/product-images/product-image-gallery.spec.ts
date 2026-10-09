import { TestBed } from '@angular/core/testing';
import { ProductImageGallery } from './product-image-gallery';
import { ProductImage } from '../models/product';
import { productImages } from './product-images';

const images: ProductImage[] = [1,2,3].map((n)=>({id:String(n),url:'/images/'+n+'.png',altText:'Imagen '+n,primaryImage:n===1,displayOrder:n-1}));
describe('Product image gallery',()=>{
 let showModal:PropertyDescriptor|undefined;
 let close:PropertyDescriptor|undefined;
 beforeEach(()=>{
  showModal=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'showModal');
  close=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'close');
  Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,writable:true,value:function(this:HTMLDialogElement){this.open=true;}});
  Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,writable:true,value:function(this:HTMLDialogElement){this.open=false;}});
 });
 afterEach(()=>{
  vi.restoreAllMocks();
  if(showModal)Object.defineProperty(HTMLDialogElement.prototype,'showModal',showModal);
  else Reflect.deleteProperty(HTMLDialogElement.prototype,'showModal');
  if(close)Object.defineProperty(HTMLDialogElement.prototype,'close',close);
  else Reflect.deleteProperty(HTMLDialogElement.prototype,'close');
 });
 async function create(count=3){
  const fixture=TestBed.createComponent(ProductImageGallery);
  fixture.componentRef.setInput('product',{name:'Producto',images:images.slice(0,count)});
  await fixture.whenStable();return fixture;
 }
 it('omits thumbnails with one image or no image',async()=>{
  for(const count of [0,1]) { const f=await create(count); expect(f.nativeElement.querySelector('.thumbnails')).toBeNull();
    if(count === 0) expect(f.nativeElement.querySelector('.fallback')?.textContent).toContain('Imagen no disponible');
    else expect(f.nativeElement.querySelector('.main-image img')?.getAttribute('src')).toBe('/images/1.png');
    f.destroy(); }
 });
 it('selects thumbnails using clicks and keyboard without a lightbox',async()=>{
  const f=await create(); const el:HTMLElement=f.nativeElement;
  const buttons=el.querySelectorAll<HTMLButtonElement>('.thumbnails button');
  expect(buttons).toHaveLength(3);expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
  buttons[1].click();await f.whenStable();
  expect(el.querySelector('.main-image img')?.getAttribute('src')).toBe('/images/2.png');
  buttons[1].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));await f.whenStable();
  expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
  expect(document.activeElement).toBe(buttons[2]);
  buttons[2].dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));await f.whenStable();
  expect(buttons[0].getAttribute('aria-pressed')).toBe('true');expect(el.querySelector('dialog')).toBeNull();
 });
 it('resets selection for another product and displays broken-image fallback',async()=>{
  const f=await create();f.componentInstance.selected.set(2);await f.whenStable();
  f.componentRef.setInput('product',{name:'Otro',images:images});await f.whenStable();
  expect(f.componentInstance.index()).toBe(0);
  f.nativeElement.querySelector('.main-image img').dispatchEvent(new Event('error'));await f.whenStable();
  expect(f.nativeElement.querySelector('.main-image .fallback')?.textContent).toContain('Imagen no disponible');
 });
 it('orders metadata primary first, caps at three and supports legacy gallery without duplicates',()=>{
  expect(productImages({name:'p',images:[{...images[2],primaryImage:true},{...images[0],primaryImage:false},images[1]]}).map(i=>i.id)).toEqual(['3','1','2']);
  expect(productImages({name:'p',image:'/images/one.png',gallery:['/images/one.png','/images/two.png','/images/three.png','/images/four.png']})).toHaveLength(3);
 });
});
