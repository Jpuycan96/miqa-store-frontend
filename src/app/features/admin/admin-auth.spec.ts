import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import { AdminAuth, ADMIN_STORAGE_KEY, adminGuard, adminInterceptor } from './admin-auth';
import { AdminLogin } from './login';
const base='https://api-store.solucionesmicaela.com/api/admin';
describe('Admin authentication',()=>{
 let http:HttpTestingController;
 beforeEach(()=>{localStorage.removeItem(ADMIN_STORAGE_KEY);TestBed.configureTestingModule({providers:[provideRouter([]),provideHttpClient(withInterceptors([adminInterceptor])),provideHttpClientTesting()]});http=TestBed.inject(HttpTestingController);});
 afterEach(()=>{http.verify();localStorage.removeItem(ADMIN_STORAGE_KEY);});
 function session(){const auth=TestBed.inject(AdminAuth);auth.login('admin','local-password').subscribe();http.expectOne(base+'/auth/login').flush({token:'test-token',expiresAt:new Date(Date.now()+3600000).toISOString()});return auth;}
 it('logs in from form, persists session and validates me before navigation',()=>{
  const router=TestBed.inject(Router);const navigate=vi.spyOn(router,'navigateByUrl').mockResolvedValue(true);
  const fixture=TestBed.createComponent(AdminLogin);fixture.componentInstance.form.setValue({username:'admin',password:'local-password'});fixture.componentInstance.submit();
  const req=http.expectOne(base+'/auth/login');expect(req.request.body).toEqual({username:'admin',password:'local-password'});expect(req.request.headers.has('Authorization')).toBe(false);
  req.flush({token:'test-token',expiresAt:new Date(Date.now()+3600000).toISOString()});http.expectOne(base+'/auth/me').flush({id:'1',username:'admin'});
  expect(TestBed.inject(AdminAuth).authenticated()).toBe(true);expect(navigate).toHaveBeenCalledWith('/admin');expect(localStorage.getItem(ADMIN_STORAGE_KEY)).toContain('test-token');
 });
 it('does not send credentials to public API or another origin',()=>{
  session();const client=TestBed.inject(HttpClient);
  for(const url of [base+'/products','https://api-store.solucionesmicaela.com/api/public/products','https://external.example/api/admin/products']){client.get(url).subscribe();const req=http.expectOne(url);expect(req.request.headers.get('Authorization')).toBe(url===base+'/products'?'Bearer test-token':null);req.flush([]);}
 });
 it('clears a rejected session and redirects on 401',()=>{
  const auth=session();const nav=vi.spyOn(TestBed.inject(Router),'navigateByUrl').mockResolvedValue(true);
  auth.me().subscribe({error:()=>{}});http.expectOne(base+'/auth/me').flush({}, {status:401,statusText:'Unauthorized'});
  expect(auth.token()).toBeNull();expect(localStorage.getItem(ADMIN_STORAGE_KEY)).toBeNull();expect(nav).toHaveBeenCalledWith('/admin/login');
 });
 it('guard rejects missing sessions and validates existing tokens with backend',async()=>{
  const guard=()=>TestBed.runInInjectionContext(()=>adminGuard({} as ActivatedRouteSnapshot,{} as RouterStateSnapshot));
  expect((guard() as UrlTree).toString()).toBe('/admin/login');session();const result=guard();expect(isObservable(result)).toBe(true);
  if(!isObservable(result))throw new Error('Expected async guard');const pending=firstValueFrom(result);http.expectOne(base+'/auth/me').flush({id:'1',username:'admin'});expect(await pending).toBe(true);
 });
 it('shows login failures and keeps form usable',()=>{
  const fixture=TestBed.createComponent(AdminLogin);fixture.componentInstance.form.setValue({username:'admin',password:'wrong'});fixture.componentInstance.submit();http.expectOne(base+'/auth/login').flush({}, {status:401,statusText:'Unauthorized'});
  expect(fixture.componentInstance.busy()).toBe(false);expect(fixture.componentInstance.error()).toContain('incorrectos');
 });
});
