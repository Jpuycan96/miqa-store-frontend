import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { AdminApi, adminError } from './admin-api';
import { AdminCategory, ProductInput, AdminProduct } from './admin.models';
import { ProductResources } from './product-resources';
@Component({selector:'app-admin-product-form',imports:[ReactiveFormsModule,RouterLink,ProductResources],styleUrls:['./admin.scss','./product-form.scss'],templateUrl:'./product-form.html',changeDetection:ChangeDetectionStrategy.OnPush})
export class AdminProductForm {
 private readonly api=inject(AdminApi);private readonly router=inject(Router);readonly id=inject(ActivatedRoute).snapshot.paramMap.get('id');
 readonly isMaterial=signal(false);
 readonly isErp=computed(()=>this.product()?.catalogMode==='ERP');
 readonly categories=signal<AdminCategory[]>([]);readonly product=signal<AdminProduct|null>(null);readonly loading=signal(false);readonly busy=signal(false);readonly error=signal('');readonly message=signal('');readonly generalOpen=signal(!this.id);
 readonly form=new FormGroup({
  name:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(200)]}),slug:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(160),Validators.pattern('^[a-z0-9]+(-[a-z0-9]+)*$')]}),categoryId:new FormControl('',{nonNullable:true,validators:[Validators.required]}),
  shortDescription:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(500)]}),displayOrder:new FormControl(0,{nonNullable:true,validators:[Validators.required,Validators.min(0),Validators.pattern('^[0-9]+$')]}),
  description:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(20000)]}),saleType:new FormControl<ProductInput['saleType']>('QUANTITY',{nonNullable:true}),unitLabel:new FormControl('unidad',{nonNullable:true,validators:[Validators.required,Validators.maxLength(40)]}),
  packSize:new FormControl<number|null>(null),packLabel:new FormControl('',{nonNullable:true}),minQuantity:new FormControl<number|null>(1,[Validators.min(1),Validators.pattern('^[0-9]+$')]),quantityStep:new FormControl<number|null>(1,[Validators.min(1),Validators.pattern('^[0-9]+$')]),published:new FormControl(false,{nonNullable:true}),featured:new FormControl(false,{nonNullable:true}),seoTitle:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(200)]}),seoDescription:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(500)]})
 });
 private readonly formValue=toSignal(this.form.valueChanges,{initialValue:this.form.getRawValue()});
 readonly generalSummary=computed(()=>{const value=this.formValue();const category=this.categories().find(item=>item.id===value.categoryId)?.name||'Sin categoría';return `${value.name?.trim()||'Sin nombre'} · ${category}`;});
 constructor(){this.load();}
 load(){
  if(!this.id){void this.router.navigate(['/admin/productos'],{replaceUrl:true});return;}
  this.loading.set(true);this.error.set('');this.product.set(null);this.isMaterial.set(false);
  forkJoin({categories:this.api.categories(),product:this.api.product(this.id)}).pipe(
   switchMap(result=>result.product.catalogMode==='ERP'
    ?this.api.erpBinding(result.product.id).pipe(map(binding=>({...result,binding})))
    :of({...result,binding:null})),
   finalize(()=>this.loading.set(false))).subscribe({
   next:({categories,product,binding})=>{
    if(product.catalogMode!=='ERP'){void this.router.navigate(['/admin/productos'],{replaceUrl:true});return;}
    if(binding?.publicationScope && !['SERVICE','MATERIAL'].includes(binding.publicationScope)){this.error.set('No se pudo verificar el tipo de publicación.');return;}
    this.isMaterial.set(binding?.publicationScope==='MATERIAL');
    this.categories.set(categories.filter(c=>this.isMaterial()?c.active:!!c.erpCategoryId));this.product.set(product);
    this.form.patchValue({...product,unitLabel:'',packLabel:'',seoTitle:product.seoTitle??'',seoDescription:product.seoDescription??''});
    for(const key of ['categoryId','saleType','unitLabel','packSize','packLabel','minQuantity','quantityStep'] as const)this.form.controls[key].disable();
    if(this.isMaterial()){
     this.form.controls.categoryId.enable();
     this.form.controls.published.enable();
    }else{
     this.form.controls.published.enable();
    }
    this.generalOpen.set(true);
   },error:e=>this.error.set(adminError(e))});
 }
 save(){if(!this.id||!this.isErp()||this.form.invalid||this.busy())return;
  this.busy.set(true);this.error.set('');const input:ProductInput={...this.form.getRawValue(),categoryId:this.isMaterial()?this.form.controls.categoryId.value:this.product()!.categoryId,published:this.form.controls.published.value,saleType:null,unitLabel:null,packSize:null,packLabel:null,minQuantity:null,quantityStep:null};
  this.api.saveProduct(this.id,input).pipe(finalize(()=>this.busy.set(false))).subscribe({next:p=>{this.product.set(p);this.generalOpen.set(false);this.message.set('Producto guardado.');this.form.markAsPristine();},error:e=>this.error.set(adminError(e))});
 }
}
