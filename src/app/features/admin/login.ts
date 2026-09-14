import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap, finalize } from 'rxjs';
import { AdminAuth } from './admin-auth';
import { adminError } from './admin-api';
import { Seo } from '../../core/seo/seo';
@Component({selector:'app-admin-login',imports:[ReactiveFormsModule,RouterLink],styleUrls:['./admin.scss','./login.scss'],template:
`<main class="login"><a routerLink="/" class="brand">MIQA / Administración</a><p class="eyebrow">TU CATÁLOGO, EN ORDEN</p><h1>Inicia sesión</h1><p class="muted">Acceso exclusivo para administración de MIQA.</p>
<form [formGroup]="form" (ngSubmit)="submit()"><label>Usuario<input formControlName="username" autocomplete="username" maxlength="100" required></label><label>Contraseña<input type="password" formControlName="password" autocomplete="current-password" maxlength="72" required></label>
@if(error()){<p class="feedback error" role="alert">{{error()}}</p>}<button class="primary" [disabled]="busy()||form.invalid">{{busy()?'Ingresando…':'Iniciar sesión'}}</button></form></main>`,changeDetection:ChangeDetectionStrategy.OnPush})
export class AdminLogin {
 private readonly auth=inject(AdminAuth);private readonly router=inject(Router);
 readonly busy=signal(false);readonly error=signal('');
 readonly form=new FormGroup({username:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(100)]}),password:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.maxLength(72)]})});
 constructor(){inject(Seo).applyPage('/admin/login',{title:'Administración | MIQA',description:'Acceso a administración MIQA.',robots:'noindex,nofollow'});}
 submit(){if(this.form.invalid||this.busy())return;this.busy.set(true);this.error.set('');const v=this.form.getRawValue();this.auth.login(v.username,v.password).pipe(switchMap(()=>this.auth.me()),finalize(()=>this.busy.set(false))).subscribe({next:()=>{void this.router.navigateByUrl('/admin');},error:e=>this.error.set(adminError(e))});}
}
