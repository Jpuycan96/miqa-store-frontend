import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs';
import { STORE_API_CONFIG } from '../../core/config/store-api';
import { AdminCategory, AdminProduct, CategoryInput, ProductInput, AdminOption, OptionInput, AdminImage, ImageInput } from './admin.models';
@Injectable({providedIn:'root'})
export class AdminApi {
 private readonly http=inject(HttpClient);
 private readonly base=inject(STORE_API_CONFIG).baseUrl.replace(/\/+$/,'')+'/api/admin';
 categories(){return this.http.get<AdminCategory[]>(this.base+'/categories').pipe(timeout(10000));}
 saveCategory(id:string|null,input:CategoryInput){return id?this.http.put<AdminCategory>(this.base+'/categories/'+encodeURIComponent(id),input):this.http.post<AdminCategory>(this.base+'/categories',input);}
 activeCategory(id:string,active:boolean){return this.http.patch<AdminCategory>(this.base+'/categories/'+encodeURIComponent(id)+'/active',{active});}
 deleteCategory(id:string){return this.http.delete<void>(this.base+'/categories/'+encodeURIComponent(id));}
 products(filters:Record<string,string>={}){let params=new HttpParams();for(const [key,value] of Object.entries(filters))if(value.trim())params=params.set(key,value.trim());return this.http.get<AdminProduct[]>(this.base+'/products',{params}).pipe(timeout(10000));}
 product(id:string){return this.http.get<AdminProduct>(this.base+'/products/'+encodeURIComponent(id)).pipe(timeout(10000));}
 saveProduct(id:string|null,input:ProductInput){return id?this.http.put<AdminProduct>(this.base+'/products/'+encodeURIComponent(id),input):this.http.post<AdminProduct>(this.base+'/products',input);}
 flag(id:string,flag:'published'|'featured',value:boolean){return this.http.patch<AdminProduct>(this.base+'/products/'+encodeURIComponent(id)+'/'+flag,{[flag]:value});}
 saveOption(pid:string,kind:'materials'|'extras',id:string|null,input:OptionInput){const url=this.base+'/products/'+encodeURIComponent(pid)+'/'+kind;return id?this.http.put<AdminOption>(url+'/'+encodeURIComponent(id),input):this.http.post<AdminOption>(url,input);}
 removeMaterial(pid:string,id:string){return this.http.delete<void>(this.base+'/products/'+encodeURIComponent(pid)+'/materials/'+encodeURIComponent(id));}
 images(pid:string){return this.http.get<AdminImage[]>(this.base+'/products/'+encodeURIComponent(pid)+'/images');}
 uploadImage(pid:string,file:File,altText:string,displayOrder:number|null,primaryImage:boolean){
  const form=new FormData();form.append('file',file);form.append('altText',altText);form.append('primaryImage',String(primaryImage));
  if(displayOrder!==null)form.append('displayOrder',String(displayOrder));
  return this.http.post<AdminImage>(this.base+'/products/'+encodeURIComponent(pid)+'/images/upload',form);
 }
 primaryImage(pid:string,id:string){return this.http.patch<AdminImage>(this.base+'/products/'+encodeURIComponent(pid)+'/images/'+encodeURIComponent(id)+'/primary',{primaryImage:true});}
 removeImage(pid:string,id:string){return this.http.post<void>(this.base+'/products/'+encodeURIComponent(pid)+'/images/'+encodeURIComponent(id)+'/remove',{});}
 saveImage(pid:string,id:string|null,input:ImageInput){const url=this.base+'/products/'+encodeURIComponent(pid)+'/images';return id?this.http.put<AdminImage>(url+'/'+encodeURIComponent(id),input):this.http.post<AdminImage>(url,input);}
}
export function adminError(error:unknown):string {
 if(error instanceof HttpErrorResponse){
  if([400,409,413,429].includes(error.status)&&typeof error.error?.message==='string')return error.error.message;
  if(error.status===401)return 'Usuario o contraseña incorrectos, o sesión vencida.';
  if(error.status===404)return 'El registro ya no está disponible.';
 }
 return 'No pudimos completar la solicitud. Inténtalo nuevamente.';
}
export function suggestSlug(name:string):string{return name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,160);}
