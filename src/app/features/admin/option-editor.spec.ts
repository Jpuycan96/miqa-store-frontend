import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OptionEditor } from './option-editor';
import { environment } from '../../../environments/environment';

describe('Compact material editor',()=>{
 let http:HttpTestingController;
 const base=`${environment.storeApiBaseUrl}/api/admin/products/p1/materials`;
 const materials=[{id:'m1',name:'Zeta',active:true,displayOrder:7},{id:'m2',name:'Álbum',active:false,displayOrder:2}];
 beforeEach(()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);});
 afterEach(()=>{http.verify();vi.restoreAllMocks();});
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
  const f=await create();expect(f.componentInstance.editorOpen()).toBe(false);expect(f.nativeElement.querySelector('form')).toBeNull();f.componentInstance.add();expect(f.componentInstance.editorOpen()).toBe(true);f.componentInstance.form.controls.name.setValue('Banner');f.componentInstance.save();
  const req=http.expectOne(base);expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual({name:'Banner',active:true,displayOrder:0});
  req.flush({id:'m3',...req.request.body});
  expect(f.componentInstance.options().map(o=>o.name)).toEqual(['Álbum','Banner','Zeta']);
  f.componentInstance.edit(materials[0]);await f.whenStable();
  const cancel=Array.from(f.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(b=>b.textContent?.trim()==='Cancelar')!;
  cancel.click();expect(f.componentInstance.id()).toBeNull();expect(f.componentInstance.form.controls.name.value).toBe('');
  expect(f.componentInstance.editorOpen()).toBe(false);
  http.expectNone(base+'/m1');
 });
 it('opens a clean add editor, cancels without HTTP and discards edited values',async()=>{
  const f=await create();const c=f.componentInstance;c.edit(materials[0]);expect(c.form.getRawValue()).toEqual({name:'Zeta',active:true});c.form.controls.name.setValue('Temporal');c.cancel();expect(c.editorOpen()).toBe(false);http.expectNone(base+'/m1');
  c.add();expect(c.id()).toBeNull();expect(c.form.getRawValue()).toEqual({name:'',active:true});c.cancel();expect(c.editorOpen()).toBe(false);
 });
 it('trims names, rejects punctuation-only values and accepts commercial material names',async()=>{
  const f=await create();const c=f.componentInstance;c.add();
  for(const invalid of ['', '   ', '.', ',', '-', '_']){c.form.controls.name.setValue(invalid);expect(c.form.controls.name.invalid).toBe(true);}
  for(const valid of ['Banner Grueso (13 Oz)','PVC 5 mm','Acrílico 2 mm','Vinil + PVC','PVC 3 - 5 MM']){c.form.controls.name.setValue(valid);expect(c.form.controls.name.valid).toBe(true);}
  c.form.controls.name.setValue('  PVC 5 mm  ');c.save();const req=http.expectOne(base);expect(req.request.body.name).toBe('PVC 5 mm');req.flush({id:'m3',...req.request.body});expect(c.editorOpen()).toBe(false);
 });
 it('confirms material deletion, blocks duplicates and removes only the local row after 204',async()=>{
  const f=await create();const c=f.componentInstance;const confirm=vi.spyOn(window,'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  c.remove(materials[0]);http.expectNone(base+'/m1');expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Zeta'));
  c.remove(materials[0]);expect(c.deletingId()).toBe('m1');c.remove(materials[0]);const req=http.expectOne(base+'/m1');expect(req.request.method).toBe('DELETE');req.flush(null,{status:204,statusText:'No Content'});
  expect(c.deletingId()).toBeNull();expect(c.options().map(item=>item.id)).toEqual(['m2']);expect(c.message()).toContain('eliminado');
 });
 it('keeps materials and a coherent editor state when deletion fails',async()=>{
  const f=await create();const c=f.componentInstance;vi.spyOn(window,'confirm').mockReturnValue(true);c.edit(materials[0]);c.remove(materials[1]);http.expectOne(base+'/m2').flush({message:'No pertenece al producto'},{status:404,statusText:'Not Found'});
  expect(c.options()).toHaveLength(2);expect(c.editorOpen()).toBe(true);expect(c.id()).toBe('m1');expect(c.deletingId()).toBeNull();expect(c.error()).toContain('disponible');
 });
});
