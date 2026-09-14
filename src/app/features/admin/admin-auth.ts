import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, tap, throwError, timeout } from 'rxjs';
import { STORE_API_CONFIG } from '../../core/config/store-api';
export const ADMIN_STORAGE_KEY = 'miqa.admin.session.v1';
interface Session { token: string; expiresAt: string; }
interface Me { id: string; username: string; }
@Injectable({providedIn:'root'})
export class AdminAuth {
 private readonly http=inject(HttpClient);
 private readonly browser=isPlatformBrowser(inject(PLATFORM_ID));
 private readonly document=inject(DOCUMENT);
 private readonly base=inject(STORE_API_CONFIG).baseUrl.replace(/\/+$/,'')+'/api/admin/auth';
 private readonly session=signal<Session|null>(null);
 readonly user=signal<Me|null>(null);
 readonly token=computed(()=>this.session()?.token??null);
 readonly authenticated=computed(()=>!!this.user() && !!this.token());
 constructor(){
  if(this.browser)try {const raw=this.document.defaultView?.localStorage.getItem(ADMIN_STORAGE_KEY);if(raw){const s:unknown=JSON.parse(raw);if(s&&typeof s==='object'&&'token' in s&&typeof s.token==='string'&&'expiresAt' in s&&typeof s.expiresAt==='string'&&Date.parse(s.expiresAt)>Date.now())this.session.set({token:s.token,expiresAt:s.expiresAt});}}catch{/* Storage may be unavailable. */}
 }
 login(username:string,password:string){return this.http.post<Session>(this.base+'/login',{username,password}).pipe(timeout(10000),tap(session=>{this.session.set(session);if(this.browser)try{this.document.defaultView?.localStorage.setItem(ADMIN_STORAGE_KEY,JSON.stringify(session));}catch{/* In-memory session remains available. */}}));}
 me(){return this.http.get<Me>(this.base+'/me').pipe(timeout(10000),tap(user=>this.user.set(user)));}
 logout(){this.session.set(null);this.user.set(null);if(this.browser)try{this.document.defaultView?.localStorage.removeItem(ADMIN_STORAGE_KEY);}catch{/* No persistent storage. */}}
}
export const adminGuard:CanActivateFn=()=>{
 const auth=inject(AdminAuth),router=inject(Router);
 if(!auth.token())return router.createUrlTree(['/admin/login']);
 return auth.me().pipe(map(()=>true),catchError(()=>of(router.createUrlTree(['/admin/login']))));
};
export const adminInterceptor:HttpInterceptorFn=(req,next)=>{
 const base=inject(STORE_API_CONFIG).baseUrl.replace(/\/+$/,'')+'/api/admin/';
 // Exact configured API boundary: never attach admin credentials to another host or public API.
 if(!req.url.startsWith(base))return next(req);
 const auth=inject(AdminAuth),router=inject(Router);
 const login=req.url===base+'auth/login';
 const outgoing=!login&&auth.token()?req.clone({setHeaders:{Authorization:'Bearer '+auth.token()}}):req;
 return next(outgoing).pipe(catchError((error:unknown)=>{
  if(error instanceof HttpErrorResponse&&error.status===401&&!login){auth.logout();void router.navigateByUrl('/admin/login');}
  return throwError(()=>error);
 }));
};
