import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from '../../app';
import { routes } from '../../app.routes';
import { provideTestCatalog } from '../../testing/catalog.fixture';
import { PRODUCTS } from '../data/products.mock';
import { QuoteStore } from './quote-store';
import { QuotePresentation } from './quote-presentation';

describe('One integrated quotation in the public flow', () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideTestCatalog()] });
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); localStorage.clear(); sessionStorage.clear(); });

  it('never mounts a quote drawer in the application root and preserves add feedback', async () => {
    const fixture = TestBed.createComponent(App); await fixture.whenStable();
    const store = TestBed.inject(QuoteStore);
    store.addItem(PRODUCTS[2], { quantity: 1 }); store.open(); await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-quote-drawer')).toBeNull();
    expect(fixture.nativeElement.querySelector('#quote-drawer')).toBeNull();
    expect(fixture.nativeElement.querySelector('.quote-toast')?.textContent).toContain('Roll Up');
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('focuses the catalog panel through the header without changing filters or opening state', async () => {
    const h = await RouterTestingHarness.create('/productos?categoria=impresion-gran-formato&buscar=Roll');
    const store = TestBed.inject(QuoteStore);
    store.addItem(PRODUCTS[2], { quantity: 2 }); await h.fixture.whenStable();
    const url = TestBed.inject(Router).url;
    h.routeNativeElement!.querySelector<HTMLButtonElement>('.quote-toggle')!.click(); await h.fixture.whenStable();
    const panel = h.routeNativeElement!.querySelector('#integrated-quote-panel')!;
    expect(document.activeElement).toBe(panel.querySelector('h2'));
    expect(TestBed.inject(Router).url).toBe(url);
    expect(store.isOpen()).toBe(false);
    expect(h.routeNativeElement!.querySelectorAll('app-quote-panel')).toHaveLength(1);
    expect(h.routeNativeElement!.querySelector('.quote-toggle')?.hasAttribute('aria-haspopup')).toBe(false);
  });

  it('shows a dismissible empty state only after requesting the empty cart', async () => {
    const h = await RouterTestingHarness.create('/productos');
    expect(h.routeNativeElement!.querySelector('app-quote-panel')).toBeNull();
    h.routeNativeElement!.querySelector<HTMLButtonElement>('.quote-toggle')!.click(); await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('app-quote-panel .empty')).not.toBeNull();
    expect(document.activeElement).toBe(h.routeNativeElement!.querySelector('app-quote-panel h2'));
    h.routeNativeElement!.querySelector<HTMLButtonElement>('.dismiss-empty')!.click(); await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('app-quote-panel')).toBeNull();
    expect(h.routeNativeElement!.querySelector('.has-quote')).toBeNull();
  });

  it('hides the panel when removing the last item even after header access', async () => {
    const h = await RouterTestingHarness.create('/productos');
    const store = TestBed.inject(QuoteStore);
    store.addItem(PRODUCTS[2], { quantity: 1 }); await h.fixture.whenStable();
    h.routeNativeElement!.querySelector<HTMLButtonElement>('.quote-toggle')!.click(); await h.fixture.whenStable();
    h.routeNativeElement!.querySelector<HTMLButtonElement>('app-quote-panel .remove')!.click(); await h.fixture.whenStable();
    expect(h.routeNativeElement!.querySelector('app-quote-panel')).toBeNull();
    expect(h.routeNativeElement!.querySelector('.has-quote')).toBeNull();
  });

  it('navigates from home to the catalog panel and preserves cart lines', async () => {
    const h = await RouterTestingHarness.create('/');
    const store = TestBed.inject(QuoteStore);
    store.addItem(PRODUCTS[2], { quantity: 3 }); await h.fixture.whenStable();
    h.routeNativeElement!.querySelector<HTMLButtonElement>('.quote-toggle')!.click(); await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/productos');
    expect(h.routeNativeElement!.querySelector('app-quote-panel')).not.toBeNull();
    expect(store.items()[0].quantity).toBe(3);
    expect(document.activeElement).toBe(h.routeNativeElement!.querySelector('app-quote-panel h2'));
  });

  it('accesses the detail panel and returns with products while resetting old visibility state', async () => {
    const h = await RouterTestingHarness.create('/productos/roll-up?regresar=' + encodeURIComponent('/productos?categoria=impresion-gran-formato&buscar=Roll'));
    const store = TestBed.inject(QuoteStore);
    store.addItem(PRODUCTS[2], { quantity: 4 }); store.open(); await h.fixture.whenStable();
    h.routeNativeElement!.querySelector<HTMLButtonElement>('.quote-toggle')!.click(); await h.fixture.whenStable();
    expect(document.activeElement).toBe(h.routeNativeElement!.querySelector('app-quote-panel h2'));
    store.open();
    h.routeNativeElement!.querySelector<HTMLAnchorElement>('.return-products')!.click(); await h.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/productos?categoria=impresion-gran-formato&buscar=Roll');
    expect(store.isOpen()).toBe(false);
    expect(store.items()[0].quantity).toBe(4);
    expect(h.routeNativeElement!.querySelectorAll('app-quote-panel')).toHaveLength(1);
    expect(h.routeNativeElement!.querySelector('#quote-drawer')).toBeNull();
    expect(TestBed.inject(QuotePresentation).showEmpty()).toBe(false);
  });
});
