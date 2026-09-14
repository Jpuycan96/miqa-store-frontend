import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, OnDestroy, signal, untracked, viewChild } from '@angular/core';
import { finalize, Observable, switchMap, tap } from 'rxjs';
import { AdminApi, adminError } from './admin-api';
import { AdminProduct, AdminImage } from './admin.models';
import { OptionEditor } from './option-editor';
import { ProductImageView } from '../../shared/product-images/product-image';

@Component({
 selector:'app-product-resources', imports:[OptionEditor,ProductImageView],
 styleUrls:['./admin.scss','./product-resources.scss'], templateUrl:'./product-resources.html',
 changeDetection:ChangeDetectionStrategy.OnPush
})
export class ProductResources implements OnDestroy {
 readonly product=input.required<AdminProduct>();
 readonly images=signal<AdminImage[]>([]);
 readonly busy=signal(false);
 readonly error=signal('');
 readonly message=signal('');
 readonly file=signal<File|null>(null);
 readonly preview=signal('');
 readonly full=computed(()=>this.images().length>=3);
 readonly inputFile=viewChild<ElementRef<HTMLInputElement>>('inputFile');
 private readonly api=inject(AdminApi);
 constructor(){effect(()=>{const product=this.product();untracked(()=>{this.images.set(product.images);this.clear();});});}
 selectFile(event:Event){
  this.releasePreview();this.file.set(null);this.error.set('');this.message.set('');
  const control=event.target as HTMLInputElement;
  const file=control.files?.[0];if(!file)return;
  if(this.full()){this.error.set('Este producto ya tiene el máximo de 3 imágenes.');control.value='';return;}
  const allowed:Record<string,RegExp>={'image/jpeg':/\.jpe?g$/i,'image/png':/\.png$/i,'image/webp':/\.webp$/i};
  if(!allowed[file.type]?.test(file.name)){this.error.set('Selecciona una imagen JPG, PNG o WebP.');control.value='';return;}
  if(!file.size||file.size>5*1024*1024){this.error.set(file.size?'La imagen no debe superar 5 MB.':'Selecciona una imagen no vacía.');control.value='';return;}
  this.file.set(file);this.preview.set(URL.createObjectURL(file));
 }
 previewFailed(){this.error.set('No se pudo abrir la imagen seleccionada. Elige otro archivo.');this.releasePreview();this.file.set(null);}
 clear(){
  this.releasePreview();this.file.set(null);
  const control=this.inputFile()?.nativeElement;if(control)control.value='';
 }
 private releasePreview(){const preview=this.preview();if(preview)URL.revokeObjectURL(preview);this.preview.set('');}
 private mutation(request:Observable<AdminImage|void>,confirmation:string){
  if(this.busy())return;
  this.busy.set(true);this.error.set('');this.message.set('');
  let saved=false;
  request.pipe(
   tap(()=>{saved=true;this.clear();this.message.set(confirmation);}),
   switchMap(()=>this.api.images(this.product().id)),
   finalize(()=>this.busy.set(false))
  ).subscribe({
   next:images=>this.images.set(images),
   error:e=>this.error.set(saved?'El cambio se guardó, pero no pudimos actualizar la lista. Pulsa Actualizar imágenes.':adminError(e))
  });
 }
 refresh(){
  if(this.busy())return;this.busy.set(true);this.error.set('');
  this.api.images(this.product().id).pipe(finalize(()=>this.busy.set(false))).subscribe({next:images=>this.images.set(images),error:e=>this.error.set(adminError(e))});
 }
 save(){
  if(this.busy())return;
  const file=this.file();if(!file||this.full())return;
  this.mutation(this.api.uploadImage(this.product().id,file,this.product().name,null,this.images().length===0),'Imagen subida.');
 }
 primary(image:AdminImage){this.mutation(this.api.primaryImage(this.product().id,image.id),'Imagen principal actualizada.');}
 remove(image:AdminImage){this.mutation(this.api.removeImage(this.product().id,image.id),'Imagen quitada.');}
 ngOnDestroy(){this.releasePreview();}
}
