import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminApi, adminError, suggestSlug } from './admin-api';
import { AdminCategory } from './admin.models';
@Component({selector:'app-admin-categories',imports:[ReactiveFormsModule],styleUrl:'./admin.scss',templateUrl:'./categories.html',changeDetection:ChangeDetectionStrategy.OnPush})
export class AdminCategories {
 private readonly api=inject(AdminApi);readonly items=signal<AdminCategory[]>([]);readonly loading=signal(false);readonly busy=signal(false);readonly error=signal('');readonly message=signal('');readonly editing=signal(false);readonly id=signal<string|null>(null);private manualSlug=false;
 readonly form=new FormGroup({name:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(160)]}),slug:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(160),Validators.pattern('^[a-z0-9]+(-[a-z0-9]+)*$')]}),description:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(10000)]}),active:new FormControl(true,{nonNullable:true}),displayOrder:new FormControl(0,{nonNullable:true,validators:[Validators.required,Validators.min(0),Validators.pattern('^[0-9]+$')]})});
 constructor(){this.load();}load(){this.loading.set(true);this.error.set('');this.api.categories().pipe(finalize(()=>this.loading.set(false))).subscribe({next:items=>this.items.set(items),error:e=>this.error.set(adminError(e))});}
 edit(c?:AdminCategory){this.id.set(c?.id??null);this.manualSlug=!!c;this.form.reset(c?{...c,description:c.description??''}:{name:'',slug:'',description:'',active:true,displayOrder:0});this.editing.set(true);this.error.set('');this.message.set('');}
 nameChanged(){if(!this.manualSlug)this.form.controls.slug.setValue(suggestSlug(this.form.controls.name.value));}slugChanged(){this.manualSlug=true;}
 save(){if(this.form.invalid||this.busy())return;this.busy.set(true);this.api.saveCategory(this.id(),this.form.getRawValue()).pipe(finalize(()=>this.busy.set(false))).subscribe({next:()=>{this.editing.set(false);this.message.set('Categoría guardada.');this.load();},error:e=>this.error.set(adminError(e))});}
 toggle(c:AdminCategory){if(this.busy())return;this.busy.set(true);this.api.activeCategory(c.id,!c.active).pipe(finalize(()=>this.busy.set(false))).subscribe({next:()=>{this.message.set('Estado actualizado.');this.load();},error:e=>this.error.set(adminError(e))});}
}
