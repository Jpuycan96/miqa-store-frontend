import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OptionEditor } from './option-editor';

describe('Compact material editor',()=>{
 let http:HttpTestingController;
 const base='https://api-store.solucionesmicaela.com/api/admin/products/p1/materials';
 const materials=[{id:'m1',name:'Zeta',active:true,displayOrder:7},{id:'m2',name:'Álbum',active:false,displayOrder:2}];
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);});
 afterEach(()=>http.verify());
 async function create(){
  const f=TestBed.createComponent(OptionEditor);
  f.componentRef.setInput('productId','p1');f.componentRef.setInput('kind','materials');f.componentRef.setInput('initial',materials);
  await f.whenStable();return f;
 }
 it('sorts a copy by name and edits without changing internal order',async()=>{
  const f=await create();
  expect(f.componentInstance.options().map(o=>o.name)).toEqual(['Álbum','Zeta']);
  expect(materials.map(o=>o.name)).toEqual(['Zeta','Álbum']);
  expect(f.nativeElement.textContent).not.toContain('Orden');
  expect(f.nativeElement.querySelector('[formControlName=displayOrder]')).toBeNull();
  f.nativeElement.querySelector('[aria-label="Editar Zeta"]').click();
  f.componentInstance.form.patchValue({name:'Abedul',active:false});f.componentInstance.save();
  const req=http.expectOne(base+'/m1');expect(req.request.method).toBe('PUT');
  expect(req.request.body).toEqual({name:'Abedul',active:false,displayOrder:7});
  req.flush({...materials[0],name:'Abedul',active:false});
  expect(f.componentInstance.options().map(o=>o.name)).toEqual(['Abedul','Álbum']);
 });
 it('creates with automatic order and cancels edits without sending a request',async()=>{
  const f=await create();f.componentInstance.form.controls.name.setValue('Banner');f.componentInstance.save();
  const req=http.expectOne(base);expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual({name:'Banner',active:true,displayOrder:0});
  req.flush({id:'m3',...req.request.body});
  expect(f.componentInstance.options().map(o=>o.name)).toEqual(['Álbum','Banner','Zeta']);
  f.componentInstance.edit(materials[0]);await f.whenStable();
  const cancel=Array.from(f.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(b=>b.textContent?.trim()==='Cancelar')!;
  cancel.click();expect(f.componentInstance.id()).toBeNull();expect(f.componentInstance.form.controls.name.value).toBe('');
  http.expectNone(base+'/m1');
 });
});
