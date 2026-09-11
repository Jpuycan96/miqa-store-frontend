import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { WHATSAPP_NUMBER } from '../../../core/config/whatsapp';
import { routes } from '../../../app.routes';
import { ContactCta } from './contact-cta';

describe('Contact CTA', () => {
  it('renders a direct WhatsApp link with the centralized number and advice message', async () => {
    const fixture = TestBed.createComponent(ContactCta);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const link = element.querySelector<HTMLAnchorElement>('a')!;
    const url = new URL(link.href);
    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe('/' + WHATSAPP_NUMBER);
    expect(url.searchParams.get('text')).toBe('Hola, estoy consultando desde la web de MIQA.\nTengo una idea/proyecto y quisiera recibir asesoría.');
    expect([...url.searchParams.keys()]).toEqual(['text']);
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.getAttribute('aria-label')).toContain('WhatsApp');
    expect(element.querySelector('h2')?.textContent).toBe('Cuéntanos qué necesitas y te ayudamos a hacerlo realidad.');
  });

  it('appears immediately after Projects', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const harness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.querySelector('app-projects + app-contact-cta')).toBeTruthy();
  });
});
