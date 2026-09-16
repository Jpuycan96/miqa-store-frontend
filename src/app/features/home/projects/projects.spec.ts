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

  it('shows the five definitive projects with their real photographs', async () => {
    const fixture = TestBed.createComponent(Projects);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(Array.from(element.querySelectorAll('h3'), h => h.textContent)).toEqual([
      'Letreros Publicitarios', 'Señaléticas', 'Implementación de local', 'Impresión de gran formato', 'Merchandising'
    ]);
    expect(element.querySelectorAll('figcaption').length).toBe(5);
    expect(element.querySelector('.project-category')).toBeNull();
    expect(element.querySelectorAll('figure.project')).toHaveLength(5);
    expect(element.querySelectorAll('figure.project--lead')).toHaveLength(1);
    expect(element.querySelector('figure.project--lead h3')?.textContent).toBe('Letreros Publicitarios');
    expect(element.querySelectorAll('img')).toHaveLength(5);
    expect(Array.from(element.querySelectorAll('img'), image => image.getAttribute('src'))).toEqual(HOME_PROJECTS.map(project => project.image));
    expect(Array.from(element.querySelectorAll('img'), image => image.getAttribute('alt'))).toEqual(HOME_PROJECTS.map(project => project.imageAlt));
    expect(element.querySelectorAll('img[loading="lazy"]')).toHaveLength(5);
    expect(element.querySelector('.project-art')).toBeNull();
  });

  it('renders a supplied project photograph without an illustrated fallback', async () => {
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
