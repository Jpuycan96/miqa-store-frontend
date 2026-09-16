import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { AdminApi, adminError, suggestSlug } from './admin-api';
import { AdminCategory, ProductInput, AdminProduct } from './admin.models';
import { ProductResources } from './product-resources';
@Component({selector:'app-admin-product-form',imports:[ReactiveFormsModule,RouterLink,ProductResources],styleUrls:['./admin.scss','./product-form.scss'],templateUrl:'./product-form.html',changeDetection:ChangeDetectionStrategy.OnPush})
export class AdminProductForm {
 private readonly api=inject(AdminApi);private readonly router=inject(Router);readonly id=inject(ActivatedRoute).snapshot.paramMap.get('id');
 readonly categories=signal<AdminCategory[]>([]);readonly product=signal<AdminProduct|null>(null);readonly loading=signal(false);readonly busy=signal(false);readonly error=signal('');readonly message=signal('');readonly type=signal<ProductInput['saleType']>('QUANTITY');readonly generalOpen=signal(!this.id);readonly salesOpen=signal(!this.id);private manualSlug=!!this.id;
 readonly form=new FormGroup({
  name:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(200)]}),slug:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(160),Validators.pattern('^[a-z0-9]+(-[a-z0-9]+)*$')]}),categoryId:new FormControl('',{nonNullable:true,validators:[Validators.required]}),
  description:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(20000)]}),saleType:new FormControl<ProductInput['saleType']>('QUANTITY',{nonNullable:true}),unitLabel:new FormControl('unidad',{nonNullable:true,validators:[Validators.required,Validators.maxLength(40)]}),
  packSize:new FormControl<number|null>(null),packLabel:new FormControl('',{nonNullable:true}),minQuantity:new FormControl<number|null>(1,[Validators.min(1),Validators.pattern('^[0-9]+$')]),quantityStep:new FormControl<number|null>(1,[Validators.min(1),Validators.pattern('^[0-9]+$')]),published:new FormControl(false,{nonNullable:true}),featured:new FormControl(false,{nonNullable:true}),seoTitle:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(200)]}),seoDescription:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(500)]})
 });
 private readonly formValue=toSignal(this.form.valueChanges,{initialValue:this.form.getRawValue()});
 readonly generalSummary=computed(()=>{const value=this.formValue();const category=this.categories().find(item=>item.id===value.categoryId)?.name||'Sin categoría';return `${value.name?.trim()||'Sin nombre'} · ${category}`;});
 readonly salesSummary=computed(()=>{const value=this.formValue();if(value.saleType==='PACK')return `Por ${value.packLabel?.trim()||'presentación'} · ${value.packSize||0} unidades · mínimo ${value.minQuantity||0}`;if(value.saleType==='AREA')return `Por superficie · ${value.unitLabel?.trim()||'m²'}`;return `Por ${value.unitLabel?.trim()||'unidad'} · mínimo ${value.minQuantity||0} · incrementos de ${value.quantityStep||0}`;});
 constructor(){this.load();}
 load(){this.loading.set(true);this.error.set('');const categories=this.api.categories();if(this.id){forkJoin({categories,product:this.api.product(this.id)}).pipe(finalize(()=>this.loading.set(false))).subscribe({next:({categories,product})=>{this.categories.set(categories);this.product.set(product);this.form.patchValue({...product,description:product.description || product.shortDescription,packLabel:product.packLabel??'',seoTitle:product.seoTitle??'',seoDescription:product.seoDescription??''});this.setType();},error:e=>this.error.set(adminError(e))});}else{categories.pipe(finalize(()=>this.loading.set(false))).subscribe({next:c=>this.categories.set(c),error:e=>this.error.set(adminError(e))});}}
 nameChanged(){if(!this.manualSlug)this.form.controls.slug.setValue(suggestSlug(this.form.controls.name.value));}slugChanged(){this.manualSlug=true;}
 setType(){const type=this.form.controls.saleType.value;this.type.set(type);this.form.controls.packSize.setValidators(type==='PACK'?[Validators.required,Validators.min(1),Validators.pattern('^[0-9]+$')]:[]);this.form.controls.packLabel.setValidators(type==='PACK'?[Validators.required,Validators.maxLength(40)]:[]);this.form.controls.packSize.updateValueAndValidity();this.form.controls.packLabel.updateValueAndValidity();}
 changeType(){this.setType();if(this.type()==='AREA'&&this.form.controls.unitLabel.value==='unidad')this.form.controls.unitLabel.setValue('m²');}
 save(){if(this.form.invalid||this.busy())return;this.busy.set(true);this.error.set('');const v=this.form.getRawValue();const input:ProductInput={...v,shortDescription:v.description.trim().slice(0,500),displayOrder:this.product()?.displayOrder??0,packSize:v.saleType==='PACK'?v.packSize:null,packLabel:v.saleType==='PACK'?v.packLabel:null};
 this.api.saveProduct(this.id,input).pipe(finalize(()=>this.busy.set(false))).subscribe({next:p=>{this.product.set(p);if(p.saleType!=='PACK'){this.form.controls.packSize.setValue(null);this.form.controls.packLabel.setValue('');}this.generalOpen.set(false);this.salesOpen.set(false);this.message.set('Producto guardado.');this.form.markAsPristine();if(!this.id)void this.router.navigate(['/admin/productos',p.id,'editar']);},error:e=>this.error.set(adminError(e))});}
}
