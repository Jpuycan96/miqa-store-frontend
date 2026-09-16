import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminApi, adminError } from './admin-api';
import { AdminOption } from './admin.models';
import { sortProductsByName } from '../../shared/models/product-order';
@Component({selector:'app-option-editor',imports:[ReactiveFormsModule],styleUrls:['./admin.scss','./compact-editor.scss'],templateUrl:'./option-editor.html',changeDetection:ChangeDetectionStrategy.OnPush})
export class OptionEditor {
 readonly productId=input.required<string>();readonly kind=input.required<'materials'|'extras'>();readonly initial=input.required<AdminOption[]>();readonly options=signal<AdminOption[]>([]);readonly id=signal<string|null>(null);readonly editorOpen=signal(false);readonly busy=signal(false);readonly deletingId=signal<string|null>(null);readonly error=signal('');readonly message=signal('');private readonly api=inject(AdminApi);private readonly document=inject(DOCUMENT);
 private displayOrder=0;
 readonly form=new FormGroup({name:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(160),materialNameValidator]}),active:new FormControl(true,{nonNullable:true})});
 constructor(){effect(()=>this.options.set(sortProductsByName(this.initial())));}
 add(){this.id.set(null);this.displayOrder=0;this.form.reset({name:'',active:true});this.form.markAsPristine();this.form.markAsUntouched();this.error.set('');this.message.set('');this.editorOpen.set(true);}
 edit(o:AdminOption){this.id.set(o.id);this.displayOrder=o.displayOrder;this.form.reset({name:o.name,active:o.active});this.form.markAsPristine();this.form.markAsUntouched();this.error.set('');this.message.set('');this.editorOpen.set(true);}
 cancel(){if(this.busy())return;this.closeEditor();this.error.set('');}
 private closeEditor(){this.editorOpen.set(false);this.id.set(null);this.displayOrder=0;this.form.reset({name:'',active:true});this.form.markAsPristine();this.form.markAsUntouched();}
 save(){const name=this.form.controls.name.value.trim();this.form.controls.name.setValue(name);this.form.controls.name.markAsTouched();if(this.form.invalid||this.busy())return;this.busy.set(true);this.error.set('');this.message.set('');this.api.saveOption(this.productId(),this.kind(),this.id(),{...this.form.getRawValue(),name,displayOrder:this.displayOrder}).pipe(finalize(()=>this.busy.set(false))).subscribe({next:o=>{this.options.update(items=>sortProductsByName([...items.filter(x=>x.id!==o.id),o]));this.closeEditor();this.message.set('Opción guardada.');},error:e=>this.error.set(adminError(e))});}
 remove(option:AdminOption){if(this.kind()!=='materials'||this.busy()||this.deletingId())return;const confirmed=this.document.defaultView?.confirm(`¿Eliminar el material “${option.name}”? Esta acción no se puede deshacer.`)??false;if(!confirmed)return;this.deletingId.set(option.id);this.error.set('');this.message.set('');this.api.removeMaterial(this.productId(),option.id).pipe(finalize(()=>this.deletingId.set(null))).subscribe({next:()=>{this.options.update(items=>items.filter(item=>item.id!==option.id));if(this.id()===option.id)this.closeEditor();this.message.set(`Material “${option.name}” eliminado.`);},error:e=>this.error.set(adminError(e))});}
}

export function materialNameValidator(control:AbstractControl<string>):ValidationErrors|null{return /[\p{L}\p{N}]/u.test(control.value.trim())?null:{materialName:true};}
