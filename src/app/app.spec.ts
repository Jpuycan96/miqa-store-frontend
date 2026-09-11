import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Title, Meta } from '@angular/platform-browser';
import { routes } from './app.routes';
import { Header } from './core/header/header';
import { Categories } from './features/home/categories/categories';
describe('MIQA Home', () => {
 it('renders the home route and SEO metadata', async () => {
  TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  const harness = await RouterTestingHarness.create('/');
  expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Hacemos');
  expect(harness.routeNativeElement?.querySelectorAll('.category').length).toBe(4);
  expect(TestBed.inject(Title).getTitle()).toBe('MIQA Soluciones Gráficas | Impresión y Publicidad');
  expect(TestBed.inject(Meta).getTag('name="description"')?.content).toContain('Soluciones gráficas');
 });
 it('opens and closes the mobile navigation using Escape', async () => {
  const fixture = TestBed.createComponent(Header);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const toggle = element.querySelector<HTMLButtonElement>('.mobile-toggle')!;
  toggle.click();
  await fixture.whenStable();
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  const nav = element.querySelector<HTMLElement>('#mobile-nav')!;
  expect(nav.hidden).toBe(false);
  nav.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await fixture.whenStable();
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(nav.hidden).toBe(true);
 });
 it('filters accents and shows an empty state for unknown categories', async () => {
  const fixture = TestBed.createComponent(Categories);
  fixture.componentRef.setInput('query', 'senal');
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  expect(element.querySelectorAll('.category').length).toBe(1);
  expect(element.querySelector('h3')?.textContent).toBe('Señalética');
  fixture.componentRef.setInput('query', 'xyz');
  await fixture.whenStable();
  expect(element.querySelectorAll('.category').length).toBe(0);
  expect(element.querySelector('.empty-message')).toBeTruthy();
 });
});

