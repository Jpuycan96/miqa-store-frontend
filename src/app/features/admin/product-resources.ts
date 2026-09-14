import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, OnDestroy, signal, untracked, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Observable, switchMap, tap } from 'rxjs';
import { AdminApi, adminError } from './admin-api';
import { AdminProduct, AdminImage } from './admin.models';
import { OptionEditor } from './option-editor';
import { ProductImageView } from '../../shared/product-images/product-image';

@Component({
 selector:'app-product-resources', imports:[ReactiveFormsModule,OptionEditor,ProductImageView],
 styleUrls:['./admin.scss','./product-resources.scss'], templateUrl:'./product-resources.html',
 changeDetection:ChangeDetectionStrategy.OnPush
})
export class ProductResources implements OnDestroy {
 readonly product=input.required<AdminProduct>();
 readonly images=signal<AdminImage[]>([]);
 readonly id=signal<string|null>(null);
 readonly busy=signal(false);
 readonly error=signal('');
 readonly message=signal('');
 readonly file=signal<File|null>(null);
 readonly preview=signal('');
 readonly full=computed(()=>this.images().length>=3);
 readonly inputFile=viewChild<ElementRef<HTMLInputElement>>('inputFile');
 private readonly api=inject(AdminApi);
 readonly form=new FormGroup({
  altText:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(300)]}),
  primaryImage:new FormControl(false,{nonNullable:true}),
  displayOrder:new FormControl<number|null>(null,{validators:[Validators.min(0),Validators.max(2147483647),Validators.pattern('^[0-9]+$')]})
 });
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
 edit(image:AdminImage){this.clear();this.id.set(image.id);this.form.reset(image);this.error.set('');this.message.set('');}
 clear(){
  this.releasePreview();this.file.set(null);this.id.set(null);
  this.form.reset({altText:'',primaryImage:false,displayOrder:null});
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
  if(this.busy()||this.form.invalid)return;
  const values=this.form.getRawValue();
  const existing=this.images().find(image=>image.id===this.id());
  if(existing){this.mutation(this.api.saveImage(this.product().id,existing.id,{...values,url:existing.url,displayOrder:values.displayOrder??existing.displayOrder}),'Imagen actualizada.');return;}
  const file=this.file();if(!file||this.full())return;
  this.mutation(this.api.uploadImage(this.product().id,file,values.altText,values.displayOrder,values.primaryImage),'Imagen subida.');
 }
 primary(image:AdminImage){this.mutation(this.api.primaryImage(this.product().id,image.id),'Imagen principal actualizada.');}
 remove(image:AdminImage){this.mutation(this.api.removeImage(this.product().id,image.id),'Imagen quitada.');}
 ngOnDestroy(){this.releasePreview();}
}
