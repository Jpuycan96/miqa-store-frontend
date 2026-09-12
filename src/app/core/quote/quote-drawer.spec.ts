import { TestBed } from '@angular/core/testing';
import { QuoteDrawer } from './quote-drawer';
import { QuoteStore, QUOTE_STORAGE_KEY } from './quote-store';
import { PRODUCTS } from '../data/products.mock';

describe('Quote drawer', () => {
  it('opens as a dialog, closes with Escape and releases body scrolling', async () => {
    localStorage.removeItem(QUOTE_STORAGE_KEY);
    const fixture = TestBed.createComponent(QuoteDrawer);
    const element: HTMLElement = fixture.nativeElement;
    const dialog = element.querySelector('dialog')!;
    dialog.showModal = () => { dialog.open = true; };
    dialog.close = () => { dialog.open = false; };
    await fixture.whenStable();
    const store = TestBed.inject(QuoteStore);
    store.addItem(PRODUCTS[2], { quantity: 1 });
    store.open();
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    expect(element.querySelector('.quote-action')?.textContent).toContain('Cotizar por WhatsApp');
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(store.isOpen()).toBe(false);
    expect(dialog.open).toBe(false);
    expect(document.body.style.overflow).not.toBe('hidden');
    fixture.destroy();
    localStorage.removeItem(QUOTE_STORAGE_KEY);
  });
});
