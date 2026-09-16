import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { provideTestCatalog } from '../../../testing/catalog.fixture';
import { contactWhatsAppUrl } from '../../../core/config/whatsapp';

describe('Home contact', () => {
  it('shows the confirmed location and keeps the real WhatsApp number scoped to contact', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideTestCatalog()] });
    const harness = await RouterTestingHarness.create('/');
    const home = harness.routeNativeElement!;
    const contact = home.querySelector('app-home-contact')!;
    expect(contact.querySelector('dd a')?.getAttribute('href')).toBe('https://wa.me/51957173688');
    expect(contact.querySelector('dd a')?.textContent).toContain('957 173 688');
    expect(contact.textContent).toContain('Av. España Nº1520, Trujillo 13007');
    const frame = contact.querySelector('iframe')!;
    expect(frame.getAttribute('src')).toBe('https://www.google.com/maps?cid=3494337236029165870&output=embed');
    expect(frame.title).toContain('MIQA');
    expect(frame.getAttribute('loading')).toBe('lazy');
    const maps = contact.querySelector<HTMLAnchorElement>('.maps-link')!;
    expect(new URL(maps.href).searchParams.get('ftid')).toBe('0x91ad3db79e2849f1:0x307e6133cef0512e');
    expect(maps.target).toBe('_blank');
    expect(maps.rel).toBe('noopener noreferrer');
    expect(contact.querySelector('form, a[href="#"]')).toBeNull();
    expect(home.querySelector('app-hero a[target="_blank"]')?.getAttribute('href')).toBe(contactWhatsAppUrl());
    expect(home.querySelector('.home-final-snap app-contact-cta + app-home-contact')).toBeTruthy();
    expect(home.querySelector('app-categories')).toBeNull();
  });
});
