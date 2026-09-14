import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminApi, adminError } from './admin-api';
import { AdminOption } from './admin.models';
import { sortProductsByName } from '../../shared/models/product-order';
@Component({selector:'app-option-editor',imports:[ReactiveFormsModule],styleUrls:['./admin.scss','./compact-editor.scss'],templateUrl:'./option-editor.html',changeDetection:ChangeDetectionStrategy.OnPush})
export class OptionEditor {
 readonly productId=input.required<string>();readonly kind=input.required<'materials'|'extras'>();readonly initial=input.required<AdminOption[]>();readonly options=signal<AdminOption[]>([]);readonly id=signal<string|null>(null);readonly busy=signal(false);readonly error=signal('');readonly message=signal('');private readonly api=inject(AdminApi);
 private displayOrder=0;
 readonly form=new FormGroup({name:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(160)]}),active:new FormControl(true,{nonNullable:true})});
 constructor(){effect(()=>this.options.set(sortProductsByName(this.initial())));}
 edit(o?:AdminOption){this.id.set(o?.id??null);this.displayOrder=o?.displayOrder??0;this.form.reset(o??{name:'',active:true});this.error.set('');this.message.set('');}
 save(){if(this.form.invalid||this.busy())return;this.busy.set(true);this.error.set('');this.api.saveOption(this.productId(),this.kind(),this.id(),{...this.form.getRawValue(),displayOrder:this.displayOrder}).pipe(finalize(()=>this.busy.set(false))).subscribe({next:o=>{this.options.update(items=>sortProductsByName([...items.filter(x=>x.id!==o.id),o]));this.edit();this.message.set('Opción guardada.');},error:e=>this.error.set(adminError(e))});}
}
