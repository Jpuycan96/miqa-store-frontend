import { provideTestCatalog } from './testing/catalog.fixture';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Title, Meta } from '@angular/platform-browser';
import { routes } from './app.routes';
import { Header } from './core/header/header';
import { Categories } from './features/home/categories/categories';
import { contactWhatsAppUrl } from './core/config/whatsapp';

beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestCatalog()] }));
describe('MIQA Home', () => {
 it('uses general WhatsApp links without contact notices and preserves product navigation', async () => {
  TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  const harness = await RouterTestingHarness.create('/');
  const element = harness.routeNativeElement!;
  const dialog = element.querySelector('dialog')!;
  const showModal = vi.fn();
  dialog.showModal = showModal;
  const alert = vi.spyOn(window, 'alert');
  const links = element.querySelectorAll<HTMLAnchorElement>('app-header a[target="_blank"], app-hero a[target="_blank"], app-contact-cta a');
  expect(links.length).toBe(3);
  expect(element.querySelector('.contact-button')).toBeNull();
  expect(element.querySelector('.text-button')?.textContent).toContain('Hablar con nosotros');

  await harness.fixture.whenStable();
  for (const link of links) {
   expect(link.getAttribute('href')).toBe(contactWhatsAppUrl());
   expect(link.target).toBe('_blank');
   expect(link.rel).toBe('noopener noreferrer');
   expect(link.getAttribute('aria-label') || link.textContent?.trim()).toBeTruthy();
   link.addEventListener('click', event => event.preventDefault(), { once: true });
   link.click();
  }
  await harness.fixture.whenStable();
  expect(element.querySelector<HTMLElement>('#mobile-nav')!.hidden).toBe(true);
  expect(showModal).not.toHaveBeenCalled();
  expect(alert).not.toHaveBeenCalled();
  expect(element.querySelector('app-hero .primary-button')?.getAttribute('href')).toBe('/productos');
  expect(element.querySelector('#categorias')).toBeNull();
  vi.restoreAllMocks();
 });
 it('renders the home route and SEO metadata', async () => {
  TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  const harness = await RouterTestingHarness.create('/');
  const heading = harness.routeNativeElement?.querySelector('h1')?.textContent;
  expect(heading).toContain('Tu marca');
  expect(heading).toContain('nuestro compromiso');
  expect(heading).not.toContain('Hacemos');
  expect(harness.routeNativeElement?.querySelectorAll('.category').length).toBe(0);
  expect(harness.routeNativeElement?.querySelectorAll('main > .home-snap-section').length).toBe(4);
  expect(harness.routeNativeElement?.querySelector('.home-final-snap app-contact-cta + app-home-contact')).toBeTruthy();
  expect(TestBed.inject(Title).getTitle()).toBe('MIQA | Impresión, publicidad y soluciones gráficas');
  expect(TestBed.inject(Meta).getTag('name="description"')?.content).toContain('hacer visible tu marca');
 });
 it('opens and closes the mobile navigation using Escape', async () => {
  TestBed.configureTestingModule({providers:[provideRouter(routes)]});
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
