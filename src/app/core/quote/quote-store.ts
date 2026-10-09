import { isPlatformBrowser } from '@angular/common';
import { afterNextRender, computed, DestroyRef, DOCUMENT, inject, Injectable, Injector, PLATFORM_ID, signal } from '@angular/core';
import { catchError, of, Subscription, switchMap, take, timer, timeout } from 'rxjs';
import { PricingResult, PublicPricing, sumAmounts } from '../data/public-pricing';
import { ProductCatalog } from '../data/product-catalog';
import { Product } from '../../shared/models/product';
import { ErpSelection, validErpQuantity } from '../../shared/models/erp-configuration';
import { QuoteConfiguration, QuoteItem } from '../../shared/models/quote-item';
import { buildQuoteMessage, createQuoteItem, getQuoteItemIdentity, mergeQuoteItems, normalizeQuantity, validQuantity } from './quote-utils';
import { whatsAppUrl } from '../config/whatsapp';

export const QUOTE_STORAGE_KEY = 'miqa.quote.v1';

@Injectable({ providedIn: 'root' })
export class QuoteStore {
  private readonly injector = inject(Injector);
  // Informative session previews only: never persisted or sent in a quote request.
  private readonly evaluatedPrices = signal<ReadonlyMap<string, { key: string; result: PricingResult }>>(new Map());
  private readonly priceRequests = new Map<string, { key: string; subscription: Subscription }>();
  private priceKey(item: QuoteItem) { return JSON.stringify([getQuoteItemIdentity(item), item.quantity]); }
  priceFor(item: QuoteItem): PricingResult | { status: 'LOADING' } {
    if (!item.erp) return { status: 'QUOTE_REQUIRED' };
    const price = this.evaluatedPrices().get(item.id);
    return price?.key === this.priceKey(item) ? price.result : { status: 'LOADING' };
  }
  readonly priceSummary = computed(() => {
    const prices = this.items().map(item => this.priceFor(item));
    const available = prices.filter((price): price is Extract<PricingResult, { status: 'PRICE_AVAILABLE' }> => price.status === 'PRICE_AVAILABLE');
    const sameTax = available.every(price => price.includesIgv === available[0]?.includesIgv);
    return {
      amount: available.length ? sumAmounts(available.map(price => price.amount)) : null,
      complete: prices.length > 0 && available.length === prices.length && sameTax,
      pending: prices.length - available.length,
      includesIgv: available.length > 0 && available.every(price => price.includesIgv),
      mixedTax: !sameTax
    };
  });

  /** Reconcile only while the existing panel is mounted; unchanged lines keep their requests. */
  refreshPrices() {
    const items = this.items();
    for (const [id, request] of this.priceRequests) {
      if (!items.some(item => item.id === id && this.priceKey(item) === request.key)) {
        request.subscription.unsubscribe(); this.priceRequests.delete(id);
        this.evaluatedPrices.update(prices => { const next = new Map(prices); next.delete(id); return next; });
      }
    }
    for (const item of items) {
      const erp = item.erp;
      const key = this.priceKey(item);
      if (!erp || this.priceRequests.get(item.id)?.key === key) continue;
      // Check the stored revisions: the public pricing endpoint uses MIQA's current snapshot.
      const subscription = timer(300).pipe(
        switchMap(() => this.catalog.findBySlug(item.productSlug).pipe(take(1), timeout(8000))),
        switchMap(product => {
          const binding = product?.configuration;
          if (!product || product.id !== item.productId || !product.published || binding?.mode !== 'ERP')
            return of<PricingResult>({ status: 'CONFIGURATION_INVALID' });
          if (binding.catalogRevision !== erp.catalogRevision || binding.configurationVersion !== erp.configurationVersion
              || binding.erpServiceId !== erp.erpServiceId) return of<PricingResult>({ status: 'CONFIGURATION_STALE' });
          if (!createQuoteItem(product, { quantity: item.quantity, erp }, 'preview'))
            return of<PricingResult>({ status: 'CONFIGURATION_INVALID' });
          return this.injector.get(PublicPricing).evaluate({ productId: item.productId, quantity: item.quantity,
            erpMaterialId: erp.erpMaterialId, erpModelId: erp.erpModelId ?? null, measures: erp.measures });
        }),
        catchError(() => of<PricingResult>({ status: 'TEMPORARILY_UNAVAILABLE' }))
      ).subscribe(result => {
        if (!this.items().some(current => current.id === item.id && this.priceKey(current) === key)) return;
        this.evaluatedPrices.update(prices => new Map(prices).set(item.id, { key, result }));
      });
      this.priceRequests.set(item.id, { key, subscription });
    }
  }
  stopPrices() {
    for (const request of this.priceRequests.values()) request.subscription.unsubscribe();
    this.priceRequests.clear(); this.evaluatedPrices.set(new Map());
  }
  retryPrice(id: string) {
    this.priceRequests.get(id)?.subscription.unsubscribe(); this.priceRequests.delete(id);
    this.evaluatedPrices.update(prices => { const next = new Map(prices); next.delete(id); return next; });
    this.refreshPrices();
  }
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
  readonly whatsappUrl = computed(() => {
    const items = this.items().map(item => ({
      ...item, quantity: item.erp ? item.quantity : normalizeQuantity(item.quantity, this.quantityRules(item).minimum)
    }));
    return whatsAppUrl(buildQuoteMessage(items));
  });
  readonly confirmation = signal('');
  private confirmationTimer?: ReturnType<typeof setTimeout>;
  readonly highlightedItemId = signal<string | null>(null);
  private highlightTimer?: ReturnType<typeof setTimeout>;
  readonly persistenceWarning = signal('');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopPrices());
    inject(DestroyRef).onDestroy(() => { clearTimeout(this.confirmationTimer); clearTimeout(this.highlightTimer); });
    // Browser data is restored after hydration; SSR and the first client render stay identical.
    afterNextRender(() => this.restore());
  }

  open() { this.visibility.set(true); }
  close() { this.visibility.set(false); }
  productFor(item: QuoteItem) { return this.products.get(item.productId); }

  addItem(product: Product, configuration: QuoteConfiguration): boolean {
    const item = createQuoteItem(product, configuration, `quote-${++this.nextId}`);
    if (!item) return false;
    const existing = this.items().find(current => getQuoteItemIdentity(current) === getQuoteItemIdentity(item));
    if (existing && (item.erp ? !validErpQuantity(Math.round((existing.quantity + item.quantity) * 1e6) / 1e6, item.erp.quantityRules)
      : !validQuantity(existing.quantity + item.quantity, product.minQuantity))) return false;
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
    if (!product || !item || (item.erp ? !validErpQuantity(quantity, item.erp.quantityRules) : !validQuantity(quantity, product.minQuantity))) return false;
    this.state.update(items => items.map(item => item.id === id ? { ...item, quantity } : item));
    this.persist();
    return true;
  }

  changeQuantity(item: QuoteItem, delta: number) {
    if (item.erp) return this.updateQuantity(item.id, Math.round((item.quantity + delta) * 1e6) / 1e6);
    return this.updateQuantity(item.id, normalizeQuantity(item.quantity + delta, this.quantityRules(item).minimum));
  }

  quantityRules(item: QuoteItem) {
    if (item.erp) return { minimum: Number(item.erp.quantityRules.minimo), step: Number(item.erp.quantityRules.multiploObligatorio ?? item.erp.quantityRules.incrementoSugerido) };
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
              erp: saved['erp'] && typeof saved['erp'] === 'object' ? saved['erp'] as ErpSelection : undefined,
              quantity: saved['quantity'],
              widthMeters: typeof saved['widthMeters'] === 'number' ? saved['widthMeters'] : undefined,
              heightMeters: typeof saved['heightMeters'] === 'number' ? saved['heightMeters'] : undefined,
              materialId: material && typeof material === 'object' && 'id' in material && typeof material.id === 'string' ? material.id : undefined,
              extraIds, notes: typeof saved['notes'] === 'string' ? saved['notes'] : undefined
            }, `quote-${++this.nextId}`);
            if (!item && (saved['erp'] || product.configuration?.mode === 'ERP' || product.configuration?.mode === 'UNAVAILABLE'))
              this.persistenceWarning.set('Algunas opciones cambiaron. Vuelve al producto para configurarlo de nuevo.');
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
