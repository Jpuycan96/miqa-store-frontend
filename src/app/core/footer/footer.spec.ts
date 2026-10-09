import { provideTestCatalog } from '../../testing/catalog.fixture';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { contactWhatsAppUrl } from '../config/whatsapp';
import { Footer } from './footer';

beforeEach(() => TestBed.configureTestingModule({ providers: [provideTestCatalog()] }));

describe('Footer', () => {
  it('renders only the current copyright without the removed blocks', async () => {
    const fixture = TestBed.createComponent(Footer);
    await fixture.whenStable();
    const footer: HTMLElement = fixture.nativeElement.querySelector('footer');
    expect(footer).toBeTruthy();
    expect(footer.querySelector('.footer-layout, .footer-brand, nav, .footer-contact, img, a')).toBeNull();
    expect(footer.querySelectorAll('p')).toHaveLength(1);
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} MIQA. Todos los derechos reservados.`);
  });

  it('keeps Home contact content and floating WhatsApp outside the compact footer', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const harness = await RouterTestingHarness.create('/');
    const home = harness.routeNativeElement!;
    expect(home.querySelector('main')?.nextElementSibling?.tagName).toBe('APP-FOOTER');
    expect(home.querySelector('main')?.lastElementChild?.classList.contains('home-final-snap')).toBe(true);
    expect(home.querySelector('.home-final-snap')?.lastElementChild?.tagName).toBe('APP-HOME-CONTACT');
    expect(home.querySelector('#servicios')).toBeNull();
    const whatsapp = home.querySelector<HTMLAnchorElement>('app-floating-whatsapp a')!;
    expect(whatsapp.getAttribute('href')).toBe(contactWhatsAppUrl());
    expect(whatsapp.target).toBe('_blank');
    expect(whatsapp.rel).toBe('noopener noreferrer');
    expect(home.querySelector('app-footer a')).toBeNull();

    for (const path of ['/productos', '/proyectos']) {
      await harness.navigateByUrl(path);
      expect(harness.routeNativeElement?.querySelector('h1')).toBeTruthy();
    }
  });
});
