import { ProductImageGallery } from '../../../shared/product-images/product-image-gallery';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, map, of, startWith, Subject, switchMap } from 'rxjs';
import { ProductCatalog } from '../../../core/data/product-catalog';
import { Product } from '../../../shared/models/product';
import { QuoteStore } from '../../../core/quote/quote-store';
import { createQuoteItem } from '../../../core/quote/quote-utils';
import { AreaConfigurator } from '../area-configurator/area-configurator';
import { QuotePanel } from '../../../core/quote/quote-panel/quote-panel';
import { Seo } from '../../../core/seo/seo';

@Component({
  selector: 'app-catalog', imports: [RouterLink, ProductImageGallery, AreaConfigurator, QuotePanel],
  templateUrl: './catalog.html', styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Catalog {
  private readonly source = inject(ProductCatalog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly refresh = new Subject<void>();
  private readonly requestedSearch = computed(()=>(this.params().get('buscar')??'').slice(0,120));
  readonly query = signal('');
  readonly category = computed(() => this.params().get('categoria') ?? '');
  private readonly search = toObservable(this.query).pipe(
    map(value => value.trim()), distinctUntilChanged(), debounceTime(300), startWith(''), distinctUntilChanged()
  );
  readonly state = toSignal(combineLatest([
    this.route.queryParamMap.pipe(map(params => params.get('categoria') ?? ''), distinctUntilChanged()),
    this.search, this.refresh.pipe(startWith(undefined))
  ]).pipe(switchMap(([category, search]) => this.source.list({ category, search }).pipe(
    map(products => ({ products, loading: false, error: false })),
    startWith({ products: [], loading: true, error: false }),
    catchError(() => of({ products: [], loading: false, error: true }))
  ))), { initialValue: { products: [], loading: true, error: false } });
  readonly categoryState = toSignal(this.refresh.pipe(startWith(undefined), switchMap(() =>
    this.source.categories().pipe(
      map(categories => ({ categories, error: false })),
      catchError(() => of({ categories: [], error: true }))
    )
  )), { initialValue: { categories: [], error: false } });
  readonly categories = computed(() => this.categoryState().categories);
  readonly filtered = computed(() => this.state().products);
  retry() { this.refresh.next(); }
  readonly quote = inject(QuoteStore);
  readonly selected = signal<Product | null>(null);
  readonly quantities = signal<Record<string, number>>({});
  quantity(product: Product) { return this.quantities()[product.id] ?? product.minQuantity ?? 1; }
  change(product: Product, delta: number) { this.quantities.update(values => ({ ...values, [product.id]: Math.max(product.minQuantity ?? 1, this.quantity(product) + delta) })); }
  canAdd(product: Product) { return !!createQuoteItem(product, { quantity: this.quantity(product) }, 'preview'); }
  add(product: Product) { this.quote.addItem(product, { quantity: this.quantity(product) }); }
  constructor() { inject(Seo).apply('/productos');effect(()=>this.query.set(this.requestedSearch())); }
  categoryName(slug: string) { return this.categories().find(category => category.slug === slug)?.name ?? slug; }
  filterCategory(category: string) {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { categoria: category || null }, queryParamsHandling: 'merge' });
  }
  reset() { this.query.set(''); this.filterCategory(''); }
}
