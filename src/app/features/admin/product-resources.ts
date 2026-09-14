import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminApi, adminError } from './admin-api';
import { AdminProduct, AdminImage } from './admin.models';
import { OptionEditor } from './option-editor';
@Component({selector:'app-product-resources',imports:[ReactiveFormsModule,OptionEditor],styleUrl:'./admin.scss',templateUrl:'./product-resources.html',changeDetection:ChangeDetectionStrategy.OnPush})
export class ProductResources {
 readonly product=input.required<AdminProduct>();readonly images=signal<AdminImage[]>([]);readonly id=signal<string|null>(null);readonly busy=signal(false);readonly error=signal('');readonly message=signal('');private readonly api=inject(AdminApi);
 readonly form=new FormGroup({url:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(2048)]}),altText:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(300)]}),primaryImage:new FormControl(false,{nonNullable:true}),displayOrder:new FormControl(0,{nonNullable:true,validators:[Validators.required,Validators.min(0),Validators.pattern('^[0-9]+$')]})});
 constructor(){effect(()=>this.images.set(this.product().images));}
 edit(i?:AdminImage){this.id.set(i?.id??null);this.form.reset(i??{url:'',altText:'',primaryImage:false,displayOrder:0});this.error.set('');this.message.set('');}
 save(){if(this.form.invalid||this.busy())return;this.busy.set(true);this.error.set('');this.api.saveImage(this.product().id,this.id(),this.form.getRawValue()).pipe(finalize(()=>this.busy.set(false))).subscribe({next:image=>{this.images.update(items=>[...items.filter(i=>i.id!==image.id).map(i=>image.primaryImage?{...i,primaryImage:false}:i),image].sort((a,b)=>a.displayOrder-b.displayOrder||a.id.localeCompare(b.id)));this.edit();this.message.set('Referencia guardada.');},error:e=>this.error.set(adminError(e))});}
}
