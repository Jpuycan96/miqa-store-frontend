import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductResources } from './product-resources';
import { AdminImage, AdminProduct } from './admin.models';
import { STORE_API_CONFIG } from '../../core/config/store-api';

const product:AdminProduct={id:'p1',categoryId:'c1',category:{id:'c1',name:'Cat',slug:'cat',description:'',active:true,displayOrder:0},name:'Producto',slug:'producto',shortDescription:'',description:'',saleType:'QUANTITY',unitLabel:'unidad',packSize:null,packLabel:null,minQuantity:1,quantityStep:1,featured:false,published:false,displayOrder:0,seoTitle:'',seoDescription:'',image:'',materials:[],extras:[],images:[]};
const image:AdminImage={id:'i1',url:'https://media.example/one.png',publicUrl:'https://media.example/one.png',altText:'Frente',primaryImage:true,displayOrder:0};
describe('Product image upload admin',()=>{
 let http:HttpTestingController;
 let base:string;
 beforeEach(()=>{
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
  http=TestBed.inject(HttpTestingController);base=TestBed.inject(STORE_API_CONFIG).baseUrl+'/api/admin/products/p1/images';
  vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:preview');
  vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 });
 afterEach(()=>{http.verify();vi.restoreAllMocks();});
 async function create(images:AdminImage[]=[]){
  const f=TestBed.createComponent(ProductResources);f.componentRef.setInput('product',{...product,images});await f.whenStable();return f;
 }
 function choose(el:HTMLElement,file:File){
  const input=el.querySelector<HTMLInputElement>('input[type=file]')!;
  Object.defineProperty(input,'files',{value:[file],configurable:true});input.dispatchEvent(new Event('change'));
 }
 it.each([['image/jpeg','a.jpg'],['image/png','a.png'],['image/webp','a.webp']])('accepts %s and previews before sending multipart',async(type,name)=>{
  const f=await create();choose(f.nativeElement,new File(['image'],name,{type}));await f.whenStable();
  expect(f.nativeElement.querySelector('img.preview')?.getAttribute('src')).toBe('blob:preview');
  http.expectNone(base+'/upload');
  f.componentInstance.form.patchValue({altText:'Frente',primaryImage:true,displayOrder:2});f.componentInstance.save();
  const req=http.expectOne(base+'/upload');
  expect(req.request.method).toBe('POST');expect(req.request.headers.has('Content-Type')).toBe(false);
  const body:FormData=req.request.body;expect(body).toBeInstanceOf(FormData);
  expect((body.get('file') as File).name).toBe(name);expect(body.get('altText')).toBe('Frente');
  expect(body.get('primaryImage')).toBe('true');expect(body.get('displayOrder')).toBe('2');
  req.flush(image);http.expectOne(base).flush([image]);await f.whenStable();
  expect(f.componentInstance.images()).toEqual([image]);expect(f.componentInstance.file()).toBeNull();
  expect(f.componentInstance.preview()).toBe('');expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  expect(f.nativeElement.textContent).toContain('Imagen subida.');
 });
 it('rejects incorrect type, extension, empty files and sizes over 5 MB before sending',async()=>{
  const f=await create();
  for(const file of [new File(['x'],'a.gif',{type:'image/gif'}),new File(['x'],'a.jpg',{type:'image/png'}),new File([],'a.png',{type:'image/png'}),new File([new Uint8Array(5*1024*1024+1)],'a.png',{type:'image/png'})]){
   choose(f.nativeElement,file);await f.whenStable();f.componentInstance.save();
   expect(f.componentInstance.error()).not.toBe('');expect(f.componentInstance.file()).toBeNull();
   http.expectNone(base+'/upload');
  }
 });
 it('disables selector and upload at three images',async()=>{
  const f=await create([image,{...image,id:'i2'},{...image,id:'i3'}]);
  expect(f.nativeElement.querySelector('input[type=file]').disabled).toBe(true);
  expect(f.nativeElement.textContent).toContain('Este producto ya tiene el máximo de 3 imágenes.');
  expect(f.nativeElement.querySelector('section[aria-labelledby="product-images-title"] button.primary').disabled).toBe(true);
 });
 it('displays backend errors and allows retry without clearing the selected file',async()=>{
  const f=await create();choose(f.nativeElement,new File(['x'],'a.png',{type:'image/png'}));
  f.componentInstance.save();http.expectOne(base+'/upload').flush({message:'Este producto ya tiene el máximo de 3 imágenes.'},{status:409,statusText:'Conflict'});
  await f.whenStable();expect(f.componentInstance.error()).toContain('máximo de 3');expect(f.componentInstance.busy()).toBe(false);expect(f.componentInstance.file()).not.toBeNull();
 });
 it('uses automatic order when omitted and refreshes primary/removal without reloading',async()=>{
  const f=await create([image]);f.componentInstance.primary(image);
  http.expectOne(base+'/i1/primary').flush(image);http.expectOne(base).flush([image]);
  f.componentInstance.remove(image);http.expectOne(base+'/i1/remove').flush(null);http.expectOne(base).flush([]);
  expect(f.componentInstance.images()).toEqual([]);
  choose(f.nativeElement,new File(['x'],'a.png',{type:'image/png'}));f.componentInstance.save();
  const req=http.expectOne(base+'/upload');expect((req.request.body as FormData).has('displayOrder')).toBe(false);
  req.flush(image);http.expectOne(base).flush([image]);
 });
});
