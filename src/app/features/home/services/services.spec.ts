import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { Services } from './services';
import { HOME_SERVICES } from './services.data';

describe('Home services', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes)] }));

  it('shows the four capabilities without implying steps or unavailable links', async () => {
    const fixture = TestBed.createComponent(Services);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(Array.from(element.querySelectorAll('h3'), h => h.textContent))
      .toEqual(['Corte y grabado láser', 'Corte CNC', 'Impresión en gran formato', 'Instalaciones']);
    expect(element.querySelectorAll('article').length).toBe(4);
    expect(element.querySelectorAll('a, img, ol').length).toBe(0);
    expect(element.textContent).toContain('PVC desde 2 mm hasta 20 mm');
  });

  it('supports a future photograph and service route supplied through data', async () => {
    const fixture = TestBed.createComponent(Services);
    fixture.componentRef.setInput('services', [{ ...HOME_SERVICES[0], image: { src: '/images/hero/rollo-up.png', alt: 'Trabajo de muestra' }, link: '/servicios/laser' }]);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('img')?.alt).toBe('Trabajo de muestra');
    expect(element.querySelector('svg')).toBeNull();
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/servicios/laser');
  });

  it('places services after the selection and opens the prepared catalog route', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.querySelector('app-featured-products + app-services')).toBeTruthy();
    expect(harness.routeNativeElement?.querySelector('.catalog-link')?.getAttribute('href')).toBe('/productos');
    await harness.navigateByUrl('/productos');
    expect(harness.routeNativeElement?.querySelector('#catalog-title')?.textContent).toContain('Encuentra lo que necesitas');
  });
});
