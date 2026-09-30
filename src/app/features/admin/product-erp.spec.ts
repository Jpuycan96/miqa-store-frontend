import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminAuth, ADMIN_STORAGE_KEY, adminInterceptor } from './admin-auth';
import { ProductErp } from './product-erp';
import { ErpServiceProjection, ProductErpBinding } from './erp-catalog.models';
import { environment } from '../../../environments/environment';

const base = environment.storeApiBaseUrl + '/api/admin';
const url = base + '/erp-catalog';
const service: ErpServiceProjection = {
  erpServiceId: '17', available: true, syncState: 'AVAILABLE', lastSyncedAt: '2026-09-29T00:00:00Z',
  lastKnownErp: { nombreReferencia: 'Impresión ERP', categoria: { erpCategoryId: '3', nombreReferencia: 'Gráfica' },
    configuracion: { formaCotizacion: 'POR_CANTIDAD' } },
};
const binding: ProductErpBinding = {
  productId: 'p1', erpServiceId: '17', active: true, state: 'AVAILABLE',
  createdAt: service.lastSyncedAt, updatedAt: service.lastSyncedAt, lastSyncedAt: service.lastSyncedAt,
};

describe('Product ERP configuration', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<ProductErp>;
  beforeEach(() => {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), provideHttpClient(withInterceptors([adminInterceptor])), provideHttpClientTesting(),
    ] });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AdminAuth).login('admin', 'test-only').subscribe();
    http.expectOne(base + '/auth/login').flush({ token: 'test-token', expiresAt: new Date(Date.now() + 3600000).toISOString() });
    fixture = TestBed.createComponent(ProductErp);
    fixture.componentRef.setInput('productId', 'p1');
    fixture.detectChanges();
  });
  afterEach(() => { http.verify(); localStorage.removeItem(ADMIN_STORAGE_KEY); });

  function load(current: ProductErpBinding | null = null, services = [service]) {
    const list = http.expectOne(url + '/services');
    expect(list.request.headers.get('Authorization')).toBe('Bearer test-token');
    list.flush(services);
    const get = http.expectOne(url + '/bindings/p1');
    expect(get.request.headers.get('Authorization')).toBe('Bearer test-token');
    if (current) get.flush(current);
    else get.flush({ message: 'Vinculo no encontrado' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
  }
  function select(id: string) {
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = id;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }
  function submit() {
    (fixture.nativeElement.querySelector('button[type=submit]') as HTMLButtonElement).click();
  }

  it('treats binding 404 as unlinked and saves only the selected ERP ID with existing auth', () => {
    load();
    expect(fixture.nativeElement.textContent).toContain('Sin vincular');
    select('17');
    expect(fixture.nativeElement.textContent).toContain('Gráfica');
    expect(fixture.nativeElement.textContent).toContain('POR_CANTIDAD');
    submit();
    fixture.componentInstance.save();
    const put = http.expectOne(url + '/bindings/p1');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ erpServiceId: '17', active: true });
    expect(put.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(put.request.headers.has('X-ERP-Service-Key')).toBe(false);
    put.flush(binding);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Vinculado');
    expect(fixture.componentInstance.canSave()).toBe(false);
  });

  it('changes a binding by ID even when services have the same name', () => {
    load(binding, [service, { ...service, erpServiceId: '18' }]);
    select('18');
    submit();
    const put = http.expectOne(url + '/bindings/p1');
    expect(put.request.body).toEqual({ erpServiceId: '18', active: true });
    put.flush({ ...binding, erpServiceId: '18' });
    expect(fixture.componentInstance.binding()?.erpServiceId).toBe('18');
  });

  it('unlinks through active false while preserving the reference and allows reactivation', () => {
    load(binding);
    const unlink = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.trim() === 'Desvincular');
    unlink!.click();
    const put = http.expectOne(url + '/bindings/p1');
    expect(put.request.body).toEqual({ erpServiceId: '17', active: false });
    put.flush({ ...binding, active: false, state: 'DISABLED' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin vincular');
    expect(fixture.nativeElement.textContent).toContain('conservada');
    expect(fixture.nativeElement.textContent).toContain('Impresión ERP');
    select('17');
    submit();
    const reactivate = http.expectOne(url + '/bindings/p1');
    expect(reactivate.request.body).toEqual({ erpServiceId: '17', active: true });
    reactivate.flush(binding);
  });

  it.each([
    { available: false, syncState: 'PENDING_REVALIDATION' },
    { available: false, syncState: 'AVAILABLE' },
    { available: true, syncState: 'PENDING_REVALIDATION' },
  ])('keeps an unavailable binding without automatic writes: %j', unavailable => {
    load({ ...binding, state: unavailable.syncState }, [{ ...service, ...unavailable }]);
    expect(fixture.nativeElement.textContent).toContain('Vinculado');
    expect(fixture.nativeElement.textContent).toContain('Impresión ERP');
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Se conserva el vínculo');
    expect(fixture.nativeElement.querySelectorAll('option').length).toBe(1);
    fixture.componentInstance.selection.setValue('17');
    fixture.componentInstance.save();
    http.expectNone(request => request.method === 'PUT');
    expect(fixture.componentInstance.binding()?.erpServiceId).toBe('17');
  });

  it('keeps a binding whose projection is absent and permits an explicit replacement', () => {
    load(binding, [{ ...service, erpServiceId: '18' }]);
    expect(fixture.componentInstance.warning()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('ERP 17');
    select('18');
    submit();
    http.expectOne(url + '/bindings/p1').flush({ ...binding, erpServiceId: '18' });
  });

  it('does not confuse service 404 or binding failure with an unlinked product and supports retry', () => {
    http.expectOne(url + '/bindings/p1').flush(binding);
    http.expectOne(url + '/services').flush({}, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Sin vincular');
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    fixture.componentInstance.load();
    http.expectOne(url + '/services').flush([service]);
    http.expectOne(url + '/bindings/p1').flush({}, { status: 500, statusText: 'Error' });
    expect(fixture.componentInstance.loaded()).toBe(false);
    fixture.componentInstance.load();
    load();
    expect(fixture.nativeElement.textContent).toContain('Sin vincular');
  });

  it('preserves binding and selection after a failed write and permits retry', () => {
    load(binding, [service, { ...service, erpServiceId: '18' }]);
    select('18');
    submit();
    http.expectOne(url + '/bindings/p1').flush({}, { status: 500, statusText: 'Error' });
    expect(fixture.componentInstance.binding()).toEqual(binding);
    expect(fixture.componentInstance.selection.value).toBe('18');
    expect(fixture.componentInstance.selection.enabled).toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    submit();
    http.expectOne(url + '/bindings/p1').flush({ ...binding, erpServiceId: '18' });
  });

  it('handles an empty catalog without enabling save', () => {
    load(null, []);
    expect(fixture.nativeElement.textContent).toContain('No hay servicios ERP disponibles');
    expect(fixture.componentInstance.canSave()).toBe(false);
  });
});