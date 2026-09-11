import { TestBed } from '@angular/core/testing';
import { Categories } from './categories';

describe('Home categories', () => {
  it('renders the six commercial categories with their catalog query links', async () => {
    const fixture = TestBed.createComponent(Categories);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const names = ['Impresión gran formato', 'Letreros Publicitarios', 'Merchandising', 'Imprenta y Papelería', 'Señalética', 'Branding e Instalaciones'];
    const slugs = ['impresion-gran-formato', 'letreros-publicitarios', 'merchandising', 'imprenta-papeleria', 'senaletica', 'branding-instalaciones'];
    expect(Array.from(element.querySelectorAll('h3'), h => h.textContent)).toEqual(names);
    const links = element.querySelectorAll<HTMLAnchorElement>('a.category');
    expect(links.length).toBe(6);
    links.forEach((link, i) => {
      expect(link.getAttribute('href')).toBe('/productos?categoria=' + slugs[i]);
      expect(link.getAttribute('aria-label')).toBe('Explorar ' + names[i]);
    });
    expect(element.textContent).not.toContain('Letreros Luminosos');
  });
});
