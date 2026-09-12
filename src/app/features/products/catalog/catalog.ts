import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ProductCatalog } from '../../../core/data/product-catalog';
import { Product } from '../../../shared/models/product';
import { QuoteStore } from '../../../core/quote/quote-store';
import { createQuoteItem } from '../../../core/quote/quote-utils';
import { AreaConfigurator } from '../area-configurator/area-configurator';
import { QuotePanel } from '../../../core/quote/quote-panel/quote-panel';
import { Seo } from '../../../core/seo/seo';

@Component({
  selector: 'app-catalog', imports: [RouterLink, NgOptimizedImage, AreaConfigurator, QuotePanel],
  templateUrl: './catalog.html', styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Catalog {
  private readonly source = inject(ProductCatalog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly state = toSignal(this.source.list().pipe(
    map(products => ({ products, error: false })), catchError(() => of({ products: [], error: true }))
  ));
  readonly categories = toSignal(this.source.categories().pipe(catchError(() => of([]))), { initialValue: [] });
  readonly quote = inject(QuoteStore);
  readonly selected = signal<Product | null>(null);
  readonly quantities = signal<Record<string, number>>({});
  quantity(product: Product) { return this.quantities()[product.id] ?? product.minQuantity ?? 1; }
  change(product: Product, delta: number) { this.quantities.update(values => ({ ...values, [product.id]: Math.max(product.minQuantity ?? 1, this.quantity(product) + delta) })); }
  canAdd(product: Product) { return !!createQuoteItem(product, { quantity: this.quantity(product) }, 'preview'); }
  add(product: Product) { this.quote.addItem(product, { quantity: this.quantity(product) }); }
  readonly query = signal('');
  readonly category = computed(() => this.params().get('categoria') ?? '');
  readonly filtered = computed(() => {
    const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const query = normalize(this.query().trim());
    return (this.state()?.products ?? []).filter(product => product.published
      && (!this.category() || product.categorySlug === this.category()) && normalize(product.name).includes(query));
  });

  constructor() { inject(Seo).apply('/productos'); }
  categoryName(slug: string) { return this.categories().find(category => category.slug === slug)?.name ?? slug; }
  filterCategory(category: string) {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { categoria: category || null }, queryParamsHandling: 'merge' });
  }
  reset() { this.query.set(''); this.filterCategory(''); }
}
