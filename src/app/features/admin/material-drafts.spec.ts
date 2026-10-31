import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AdminMaterialDrafts } from './material-drafts';
import { AdminProductList } from './product-list';
import { STORE_API_CONFIG } from '../../core/config/store-api';
import type { ErpServiceProjection, MaterialDraft } from './erp-catalog.models';
import type { AdminCategory, AdminProduct } from './admin.models';

const category: AdminCategory = { id:'commercial',name:'Comercial',slug:'comercial',description:null,catalogHeadline:null,catalogDescription:null,active:true,displayOrder:0,erpCategoryId:null };
function service(count=2,id='17'):ErpServiceProjection {
  return {erpServiceId:id,available:true,syncState:'AVAILABLE',lastSyncedAt:null,lastKnownErp:{
    contractVersion:1,sourceSystem:'ERP_GIGANTOGRAFIAS',erpServiceId:id,nombreReferencia:'Impresion UV '+id,
    elegible:true,disponible:true,estadoConfiguracion:'CONFIGURADA',catalogRevision:'a'.repeat(64),configurationVersion:'2',
    configuracion:{cantidad:{unidad:'unidades',minimo:'1',incrementoSugerido:'1',multiploObligatorio:null,permiteDecimales:false,precision:0,maximo:'99999999'},
      modoMaterial:'SELECCION',formaCotizacion:'M2',medidas:{modo:'SUPERFICIE',unidad:'m',camposRequeridos:['ancho','alto','cantidad']},
      materiales:Array.from({length:count},(_,i)=>({erpMaterialId:String(i+10),nombreReferencia:'Material '+(i+1),modoModelos:i===0?'SELECCION':'SIN_MODELO',
        modelos:i===0?[{erpModelId:'201',nombreReferencia:'Modelo A'},{erpModelId:'202',nombreReferencia:'Modelo B'}]:[]}))}
  }};
}
const draft:MaterialDraft={productId:'new-draft',slug:'banner-uv',name:'Banner UV',categoryId:'commercial',published:false,
  binding:{publicationScope:'MATERIAL',erpServiceId:'17',erpMaterialId:'10',erpModelId:'201'}};
const product:AdminProduct={id:'old',catalogMode:'ERP',name:'Servicio existente',slug:'servicio',categoryId:'commercial',category,
  shortDescription:'',description:'',saleType:null,unitLabel:null,packSize:null,packLabel:null,minQuantity:null,quantityStep:null,
  featured:false,published:false,displayOrder:0,seoTitle:null,seoDescription:null,image:'',materials:[],extras:[],images:[]};

describe('material publication admin panel',()=>{
  let http:HttpTestingController;let base:string;
  beforeEach(()=>{TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]});
    http=TestBed.inject(HttpTestingController);base=TestBed.inject(STORE_API_CONFIG).baseUrl+'/api/admin';});
  afterEach(()=>http.verify());
  function panel(services=[service()]){
    const f=TestBed.createComponent(AdminMaterialDrafts);
    http.expectOne(base+'/erp-catalog/services').flush(services);
    http.expectOne(base+'/categories').flush([category,{...category,id:'inactive',active:false}]);
    f.componentInstance.form.controls.serviceId.setValue('17');f.detectChanges();return f;
  }
  function selectFirst(c:AdminMaterialDrafts){c.rows.at(0).controls.selected.setValue(true);c.form.controls.categoryId.setValue(category.id);}
  it('lists only available services, their own approved materials and corresponding models',()=>{
    const f=panel([service(),{...service(2,'18'),available:false},service(1,'19')]);const c=f.componentInstance;
    expect(c.services().map(s=>s.erpServiceId)).toEqual(['17','19']);expect(c.rows.length).toBe(2);
    c.rows.at(0).controls.selected.setValue(true);c.rows.at(1).controls.selected.setValue(true);f.detectChanges();
    expect(f.nativeElement.querySelectorAll('[formControlName=erpModelId]').length).toBe(1);
    expect(f.nativeElement.textContent).toContain('Modelo A');expect(c.categories()).toEqual([category]);
  });
  it('requires active category and at least one selected material',()=>{
    const f=panel();const c=f.componentInstance;
    expect(c.canSubmit()).toBe(false);c.rows.at(0).controls.selected.setValue(true);expect(c.canSubmit()).toBe(false);
    c.form.controls.categoryId.setValue('inactive');expect(c.buildRequest()).toBeNull();
    c.form.controls.categoryId.setValue('commercial');expect(c.canSubmit()).toBe(true);
  });
  it('builds exactly the backend DTO including optional fixed model and trimmed name',()=>{
    const f=panel();const c=f.componentInstance;selectFirst(c);
    c.rows.at(0).controls.erpModelId.setValue('201');c.rows.at(0).controls.name.setValue('  Banner UV  ');
    c.rows.at(1).controls.selected.setValue(true);c.submit();
    const req=http.expectOne(base+'/erp-catalog/services/17/material-drafts');
    expect(req.request.method).toBe('POST');expect(req.request.body).toEqual({categoryId:'commercial',materials:[
      {erpMaterialId:'10',erpModelId:'201',name:'Banner UV'},{erpMaterialId:'11',erpModelId:null,name:null}]});
    expect(JSON.stringify(req.request.body)).not.toContain('catalogRevision');req.flush([draft]);
  });
  it('rejects models from other materials and material IDs outside the service',()=>{
    const f=panel();const c=f.componentInstance;selectFirst(c);c.rows.at(1).controls.selected.setValue(true);
    c.rows.at(1).controls.erpModelId.setValue('201');expect(c.canSubmit()).toBe(false);
    c.rows.at(1).controls.erpModelId.setValue('');c.rows.at(0).controls.erpMaterialId.setValue('999');
    c.submit();expect(c.error()).toContain('modelos válidos');http.expectNone(req=>req.method==='POST');
  });
  it('limits UI to 50 and rejects a manipulated larger batch',()=>{
    const f=panel([service(51)]);const c=f.componentInstance;c.form.controls.categoryId.setValue('commercial');
    for(let i=0;i<50;i++)c.rows.at(i).controls.selected.setValue(true);f.detectChanges();
    expect(c.canSubmit()).toBe(true);expect((f.nativeElement.querySelectorAll('input[type=checkbox]')[50] as HTMLInputElement).disabled).toBe(true);
    c.rows.at(50).controls.selected.setValue(true);expect(c.canSubmit()).toBe(false);c.submit();http.expectNone(req=>req.method==='POST');
  });
  it('prevents duplicate send and closing while the request is pending',()=>{
    const f=panel();const c=f.componentInstance;selectFirst(c);const closed=vi.fn();c.closed.subscribe(closed);
    c.submit();c.submit();c.close();c.load();expect(c.busy()).toBe(true);expect(closed).not.toHaveBeenCalled();
    http.expectOne(base+'/erp-catalog/services/17/material-drafts').flush([draft]);
    c.submit();http.expectNone(req=>req.method==='POST');expect(c.completed()).toBe(true);
  });
  it.each([[409,'DUPLICATE_SELECTION','Ya existe un producto'],[422,'MODEL_NOT_APPROVED','ya no está aprobado'],[404,'missing','categoría ya no está disponible']] as const)
    ('shows actionable backend error %s without inventing success',(status,message,expected)=>{
      const f=panel();const c=f.componentInstance;selectFirst(c);const created=vi.fn();c.created.subscribe(created);c.submit();
      http.expectOne(base+'/erp-catalog/services/17/material-drafts').flush({message},{status,statusText:'Error'});
      f.detectChanges();expect(c.error()).toContain(expected);expect(c.busy()).toBe(false);expect(created).not.toHaveBeenCalled();
      expect(f.nativeElement.querySelector('[role=alert]')).not.toBeNull();
    });
  it('reports an uncertain network outcome and allows inspection before retrying',()=>{
    const f=panel();const c=f.componentInstance;selectFirst(c);c.submit();
    http.expectOne(base+'/erp-catalog/services/17/material-drafts').error(new ProgressEvent('error'));
    expect(c.error()).toContain('Revisa la lista de productos antes de volver a enviar');
  });
  it('resets material and model selections when changing services',()=>{
    const f=panel([service(),service(1,'19')]);const c=f.componentInstance;selectFirst(c);c.rows.at(0).controls.erpModelId.setValue('201');
    c.form.controls.serviceId.setValue('19');expect(c.rows.length).toBe(1);expect(c.selectedRows().length).toBe(0);expect(c.rows.at(0).controls.erpModelId.value).toBe('');
  });
  it('keeps the panel read-only on catalog load failure with retry available',()=>{
    const f=TestBed.createComponent(AdminMaterialDrafts);
    http.expectOne(base+'/erp-catalog/services').flush({}, {status:503,statusText:'Unavailable'});
    http.match(base+'/categories').forEach(req=>expect(req.cancelled).toBe(true));f.detectChanges();
    expect(f.componentInstance.error()).toContain('No se pudo cargar');expect(f.componentInstance.canSubmit()).toBe(false);
  });
  it('refreshes admin products after creation and links each draft to the existing editor',()=>{
    const f=TestBed.createComponent(AdminProductList);
    http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products').flush([product]);
    http.expectOne(base+'/erp-catalog/bindings/old').flush({active:true,state:'AVAILABLE',publicationScope:'SERVICE'});f.detectChanges();
    f.componentInstance.openDrafts();f.detectChanges();
    http.expectOne(base+'/erp-catalog/services').flush([service()]);http.expectOne(base+'/categories').flush([category]);
    const panelDebug=f.debugElement.query(node=>node.componentInstance instanceof AdminMaterialDrafts);
    const c=panelDebug.componentInstance as AdminMaterialDrafts;c.form.controls.serviceId.setValue('17');selectFirst(c);c.submit();
    http.expectOne(base+'/erp-catalog/services/17/material-drafts').flush([draft]);
    http.expectOne(base+'/categories').flush([category]);http.expectOne(base+'/products').flush([product,{...product,id:draft.productId,name:draft.name,slug:draft.slug}]);
    http.expectOne(base+'/erp-catalog/bindings/old').flush({active:true,state:'AVAILABLE',publicationScope:'SERVICE'});
    http.expectOne(base+'/erp-catalog/bindings/new-draft').flush({active:true,state:'AVAILABLE',publicationScope:'MATERIAL'});f.detectChanges();
    expect(f.componentInstance.draftsOpen()).toBe(false);expect(f.componentInstance.visibleProducts().length).toBe(2);
    expect(f.nativeElement.textContent).toContain('Borradores creados');
    const links=Array.from(f.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    const link=links.find(link=>link.textContent?.includes('Editar Banner UV'))!;
    expect(link.getAttribute('href')).toBe('/admin/productos/new-draft/editar');
    const navigate=vi.spyOn(TestBed.inject(Router),'navigateByUrl').mockResolvedValue(true);link.click();expect(navigate).toHaveBeenCalled();
    http.expectNone(req=>req.method==='PATCH'); // Creation and editor links never publish automatically.
    expect(f.componentInstance.visibleProducts().find(p=>p.id==='old')?.published).toBe(false);
  });
});
