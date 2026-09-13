import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, computed, DestroyRef, DOCUMENT, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { take } from 'rxjs';
import { ProductCatalog } from '../data/product-catalog';
import { Product } from '../../shared/models/product';
import { QuoteConfiguration, QuoteItem } from '../../shared/models/quote-item';
import { buildQuoteMessage, createQuoteItem, getQuoteItemIdentity, mergeQuoteItems, validQuantity } from './quote-utils';
import { whatsAppUrl } from '../config/whatsapp';

export const QUOTE_STORAGE_KEY = 'miqa.quote.v1';

@Injectable({ providedIn: 'root' })
export class QuoteStore {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly catalog = inject(ProductCatalog);
  private readonly state = signal<readonly QuoteItem[]>([]);
  private readonly visibility = signal(false);
  private products = new Map<string, Product>();
  private restored = false;
  private nextId = 0;
  private pendingSaved: readonly unknown[] = [];
  private restoreVersion = 0;
  readonly items = this.state.asReadonly();
  readonly isOpen = this.visibility.asReadonly();
  /** Count configured lines, not incompatible units such as millares and square metres. */
  readonly totalItems = computed(() => this.items().length);
  readonly whatsappUrl = computed(() => whatsAppUrl(buildQuoteMessage(this.items())));
  readonly confirmation = signal('');
  private confirmationTimer?: ReturnType<typeof setTimeout>;
  readonly highlightedItemId = signal<string | null>(null);
  private highlightTimer?: ReturnType<typeof setTimeout>;
  readonly persistenceWarning = signal('');

  constructor() {
    inject(DestroyRef).onDestroy(() => { clearTimeout(this.confirmationTimer); clearTimeout(this.highlightTimer); });
    // Browser data is restored after hydration; SSR and the first client render stay identical.
    afterNextRender(() => this.restore());
  }

  open() { this.visibility.set(true); }
  close() { this.visibility.set(false); }

  addItem(product: Product, configuration: QuoteConfiguration): boolean {
    const item = createQuoteItem(product, configuration, `quote-${++this.nextId}`);
    if (!item) return false;
    const existing = this.items().find(current => getQuoteItemIdentity(current) === getQuoteItemIdentity(item));
    if (existing && !validQuantity(existing.quantity + item.quantity, product.minQuantity, product.step)) return false;
    this.products.set(product.id, product);
    this.state.update(items => mergeQuoteItems([...items, item]));
    this.persist();
    this.confirmation.set(`${product.name}: ${existing ? 'actualizado en' : 'agregado a'} tu cotización.`);
    if (existing) {
      this.highlightedItemId.set(existing.id);
      clearTimeout(this.highlightTimer);
      if (this.browser) this.highlightTimer = setTimeout(() => this.highlightedItemId.set(null), 1000);
    }
    clearTimeout(this.confirmationTimer);
    if (this.browser) this.confirmationTimer = setTimeout(() => this.confirmation.set(''), 3500);
    return true;
  }

  removeItem(id: string) {
    this.state.update(items => items.filter(item => item.id !== id));
    this.persist();
  }

  updateQuantity(id: string, quantity: number): boolean {
    const item = this.items().find(item => item.id === id);
    const product = item && this.products.get(item.productId);
    if (!product || !validQuantity(quantity, product.minQuantity, product.step)) return false;
    this.state.update(items => items.map(item => item.id === id ? { ...item, quantity } : item));
    this.persist();
    return true;
  }

  quantityRules(item: QuoteItem) {
    const product = this.products.get(item.productId);
    return { minimum: product?.minQuantity ?? 1, step: product?.step ?? 1 };
  }

  clear() { this.restoreVersion++; this.pendingSaved = []; this.state.set([]); this.persist(); }

  restore(): void {
    if (!this.browser || this.restored) return;
    this.restored = true;
    let raw: string | null | undefined;
    try { raw = this.document.defaultView?.localStorage.getItem(QUOTE_STORAGE_KEY); }
    catch {
      this.persistenceWarning.set('No pudimos recuperar la cotización guardada. Puedes iniciar una nueva.');
      return;
    }
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      this.pendingSaved = parsed;
    } catch {
      this.persistenceWarning.set('No pudimos recuperar la cotización guardada. Puedes iniciar una nueva.');
      return;
    }
    const version = this.restoreVersion;
    this.catalog.list().pipe(take(1)).subscribe({
      next: products => {
        if (version !== this.restoreVersion) return;
        for (const product of products) this.products.set(product.id, product);
        try {
          const restored = this.pendingSaved.flatMap((value: unknown) => {
            if (!value || typeof value !== 'object') return [];
            const saved = value as Record<string, unknown>;
            const product = products.find(product => product.id === saved['productId']);
            if (!product || typeof saved['quantity'] !== 'number') return [];
            const material = saved['selectedMaterial'];
            const extraIds = Array.isArray(saved['selectedExtras']) ? saved['selectedExtras'].flatMap(extra =>
              extra && typeof extra === 'object' && typeof extra.id === 'string' ? [extra.id] : []) : [];
            const item = createQuoteItem(product, {
              quantity: saved['quantity'],
              widthMeters: typeof saved['widthMeters'] === 'number' ? saved['widthMeters'] : undefined,
              heightMeters: typeof saved['heightMeters'] === 'number' ? saved['heightMeters'] : undefined,
              materialId: material && typeof material === 'object' && 'id' in material && typeof material.id === 'string' ? material.id : undefined,
              extraIds, notes: typeof saved['notes'] === 'string' ? saved['notes'] : undefined
            }, `quote-${++this.nextId}`);
            return item ? [item] : [];
          });
          this.pendingSaved = [];
          this.state.update(current => mergeQuoteItems([...restored, ...current]));
          this.persist();
        } catch {
          this.persistenceWarning.set('No pudimos recuperar la cotización guardada. Puedes iniciar una nueva.');
        }
      },
      error: () => this.persistenceWarning.set('No pudimos recuperar la cotización guardada. Inténtalo al recargar.')
    });
  }

  private persist(): void {
    if (!this.browser) return;
    try {
      this.document.defaultView?.localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify([...this.pendingSaved, ...this.items()]));
    } catch {
      this.persistenceWarning.set('Tu cotización funciona en esta sesión, pero no pudo guardarse en este dispositivo.');
    }
  }
}
