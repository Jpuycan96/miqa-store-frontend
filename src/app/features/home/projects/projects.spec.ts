import { provideTestCatalog } from '../../../testing/catalog.fixture';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { Projects } from './projects';
import { HOME_PROJECTS } from './projects.data';

beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestCatalog()] }));

describe('Home projects', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes)] }));

  it('shows five structural examples with visible captions and no missing photographs', async () => {
    const fixture = TestBed.createComponent(Projects);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(Array.from(element.querySelectorAll('h3'), h => h.textContent)).toEqual([
      'Fachada comercial', 'Señalética corporativa', 'Implementación de local', 'Gráfica de gran formato', 'Letras corpóreas'
    ]);
    expect(element.querySelectorAll('figcaption').length).toBe(5);
    expect(element.querySelectorAll('.project-art[aria-hidden="true"]').length).toBe(5);
    expect(element.querySelector('img')).toBeNull();
  });

  it('replaces the abstract artwork with a photo supplied through data', async () => {
    const fixture = TestBed.createComponent(Projects);
    fixture.componentRef.setInput('projects', [{ ...HOME_PROJECTS[0], image: '/images/hero/senaletica.png', imageAlt: 'Señalética instalada en una oficina' }]);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('img')?.getAttribute('alt')).toBe('Señalética instalada en una oficina');
    expect(element.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    expect(element.querySelector('.project-art')).toBeNull();
  });

  it('follows Services and provides a valid portfolio route', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.querySelector('app-featured-products + app-projects')).toBeTruthy();
    expect(harness.routeNativeElement?.querySelector('.projects-link')?.getAttribute('href')).toBe('/proyectos');
    await harness.navigateByUrl('/proyectos');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Estamos preparando nuestro portafolio completo.');
  });
});
