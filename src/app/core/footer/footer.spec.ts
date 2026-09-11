import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { contactWhatsAppUrl } from '../config/whatsapp';
import { Footer } from './footer';

describe('Footer', () => {
  it('renders the brand, valid navigation, general contact and current copyright', async () => {
    const fixture = TestBed.createComponent(Footer);
    await fixture.whenStable();
    const footer: HTMLElement = fixture.nativeElement.querySelector('footer');
    expect(footer).toBeTruthy();
    expect(footer.querySelector('img')?.alt).toBe('MIQA Soluciones Gráficas');
    expect(footer.textContent).toContain('Hacemos visible tu marca.');
    expect([...footer.querySelectorAll('nav a')].map(a => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Productos', '/productos'], ['Servicios', '/#servicios'], ['Proyectos', '/proyectos']
    ]);
    const contact = footer.querySelector<HTMLAnchorElement>('.footer-contact')!;
    expect(contact.textContent).toContain('Conversemos por WhatsApp');
    expect(contact.getAttribute('href')).toBe(contactWhatsAppUrl());
    expect(contact.target).toBe('_blank');
    expect(contact.rel).toBe('noopener noreferrer');
    expect(footer.querySelector('a[href="#"]')).toBeNull();
    expect(footer.textContent).toContain(`© ${new Date().getFullYear()} MIQA. Todos los derechos reservados.`);
  });

  it('closes Home after the contact CTA and links to existing destinations', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const harness = await RouterTestingHarness.create('/');
    const home = harness.routeNativeElement!;
    expect(home.querySelector('main')?.nextElementSibling?.tagName).toBe('APP-FOOTER');
    expect(home.querySelector('main')?.lastElementChild?.tagName).toBe('APP-CONTACT-CTA');
    expect(home.querySelector('#servicios')).toBeTruthy();
    for (const path of ['/productos', '/proyectos']) {
      await harness.navigateByUrl(path);
      expect(harness.routeNativeElement?.querySelector('h1')).toBeTruthy();
    }
  });
});
