import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminApi, adminError, suggestSlug } from './admin-api';
import { AdminCategory } from './admin.models';
import { sortProductsByName } from '../../shared/models/product-order';
@Component({selector:'app-admin-categories',imports:[ReactiveFormsModule],styleUrls:['./admin.scss','./compact-editor.scss'],templateUrl:'./categories.html',changeDetection:ChangeDetectionStrategy.OnPush})
export class AdminCategories {
 private readonly api=inject(AdminApi);readonly items=signal<AdminCategory[]>([]);readonly loading=signal(false);readonly busy=signal(false);readonly error=signal('');readonly message=signal('');readonly editing=signal(false);readonly id=signal<string|null>(null);readonly savedSlug=signal('');
 readonly form=new FormGroup({name:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(160)]}),description:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(10000)]}),catalogHeadline:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(200),Validators.pattern('^[^<>]*$')]}),catalogDescription:new FormControl('',{nonNullable:true,validators:[Validators.maxLength(500),Validators.pattern('^[^<>]*$')]}),active:new FormControl(true,{nonNullable:true}),displayOrder:new FormControl(0,{nonNullable:true,validators:[Validators.required,Validators.min(0),Validators.pattern('^[0-9]+$')]})});
 constructor(){this.load();}load(){this.loading.set(true);this.error.set('');this.api.categories().pipe(finalize(()=>this.loading.set(false))).subscribe({next:items=>this.items.set(sortProductsByName(items)),error:e=>this.error.set(adminError(e))});}
 edit(c?:AdminCategory){this.id.set(c?.id??null);this.savedSlug.set(c?.slug??'');this.form.reset(c?{name:c.name,description:c.description??'',catalogHeadline:c.catalogHeadline??'',catalogDescription:c.catalogDescription??'',active:c.active,displayOrder:c.displayOrder}:{name:'',description:'',catalogHeadline:'',catalogDescription:'',active:true,displayOrder:0});this.editing.set(true);this.error.set('');this.message.set('');}
 slugPreview(){return suggestSlug(this.form.controls.name.value);}
 save(){if(this.form.invalid||this.busy())return;this.busy.set(true);this.api.saveCategory(this.id(),this.form.getRawValue()).pipe(finalize(()=>this.busy.set(false))).subscribe({next:()=>{this.editing.set(false);this.message.set('Categoría guardada.');this.load();},error:e=>this.error.set(adminError(e))});}
 toggle(c:AdminCategory){if(this.busy())return;this.busy.set(true);this.api.activeCategory(c.id,!c.active).pipe(finalize(()=>this.busy.set(false))).subscribe({next:()=>{this.message.set('Estado actualizado.');this.load();},error:e=>this.error.set(adminError(e))});}
 remove(c:AdminCategory){if(this.busy()||!confirm(`¿Eliminar la categoría ${c.name}? Esta acción no se puede deshacer.`))return;this.busy.set(true);this.error.set('');this.message.set('');this.api.deleteCategory(c.id).pipe(finalize(()=>this.busy.set(false))).subscribe({next:()=>{this.message.set('Categoría eliminada.');this.load();},error:e=>this.error.set(adminError(e))});}
}
