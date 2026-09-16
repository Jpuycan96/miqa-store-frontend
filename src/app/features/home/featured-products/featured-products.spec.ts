import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FeaturedProducts } from './featured-products';
import { FEATURED_PRODUCTS } from './featured-products.mock';

describe('FeaturedProducts', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));
  it('renders the three featured Home products without prices or introductory copy', async () => {
    const fixture = TestBed.createComponent(FeaturedProducts);
    fixture.componentRef.setInput('products', FEATURED_PRODUCTS);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('article').length).toBe(3);
    expect(element.querySelectorAll('.price').length).toBe(0);
    expect(Array.from(element.querySelectorAll('h3'), title => title.textContent))
      .toEqual(['Impresión en alta calidad', 'Letreros Publicitarios', 'Empaques']);
    expect(element.querySelectorAll('app-product-visual').length).toBe(0);
    const images = element.querySelectorAll('img');
    expect(images.length).toBe(3);
    images.forEach((image, index) => {
      expect(image.getAttribute('src')).toBe(FEATURED_PRODUCTS[index].image);
      expect(image.getAttribute('alt')).toBe(FEATURED_PRODUCTS[index].imageAlt);
      expect(image.getAttribute('loading')).toBe('lazy');
    });
    expect(element.querySelector('.visual-note')).toBeNull();
    expect(element.textContent).not.toContain('Los más solicitados');
    expect(element.textContent).not.toContain('Una selección de productos');
  });

  it('accepts replacement data, hides nonfeatured items and supports a local image', async () => {
    const fixture = TestBed.createComponent(FeaturedProducts);
    fixture.componentRef.setInput('products', [
      { ...FEATURED_PRODUCTS[0], image: '/images/brand/logo-miqa3.png', imageAlt: 'Muestra local', priceFrom: null },
      { ...FEATURED_PRODUCTS[1], featured: false },
      { ...FEATURED_PRODUCTS[2], image: undefined, showPrice: true, priceFrom: 100 }
    ]);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('article').length).toBe(2);
    expect(element.querySelectorAll('.price').length).toBe(0);
    expect(element.querySelector('img')?.getAttribute('alt')).toBe('Muestra local');
    expect(element.querySelectorAll('app-product-visual').length).toBe(1);
  });

  it('renders safe native WhatsApp links with each product encoded in the message', async () => {
    const fixture = TestBed.createComponent(FeaturedProducts);
    fixture.componentRef.setInput('products', FEATURED_PRODUCTS);
    await fixture.whenStable();
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.quote-link');
    expect(links.length).toBe(3);
    links.forEach((link, index) => {
      const url = new URL(link.href);
      expect(url.origin).toBe('https://wa.me');
      expect(url.pathname).toBe('/51923034586');
      expect(url.searchParams.get('text')).toBe(
        'Hola, estoy consultando desde la web de MIQA.\nQuisiera cotizar: ' + FEATURED_PRODUCTS[index].name + '.');
      expect(link.textContent).toContain('Cotizar por WhatsApp');
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
    });
  });
});
