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
import { breadcrumb, PAGE_SEO, Seo } from '../../../core/seo/seo';
import { publicSeoCategory } from '../../../core/seo/category-seo';

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
  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  private readonly refresh = new Subject<void>();
  private readonly requestedSearch = computed(()=>(this.params().get('buscar')??'').slice(0,120));
  readonly query = signal('');
  readonly category = computed(() => this.routeData()['categorySlug'] as string | undefined ?? this.params().get('categoria') ?? '');
  readonly isCategoryPage = computed(() => !!this.routeData()['categorySlug']);
  private readonly search = toObservable(this.query).pipe(
    map(value => value.trim()), distinctUntilChanged(), debounceTime(300), startWith(''), distinctUntilChanged()
  );
  readonly state = toSignal(combineLatest([
    toObservable(this.category).pipe(distinctUntilChanged()),
    this.search, this.refresh.pipe(startWith(undefined))
  ]).pipe(switchMap(([category, search]) => this.source.list({ category, search }).pipe(
    map(products => ({ products: products.filter(product => product.published), loading: false, error: false })),
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
  readonly activeCategory = computed(() => this.categories().find(category => category.slug === this.category()) ?? null);
  readonly filtered = computed(() => this.state().products);
  retry() { this.refresh.next(); }
  readonly quote = inject(QuoteStore);
  readonly selected = signal<Product | null>(null);
  readonly quantities = signal<Record<string, number>>({});
  quantity(product: Product) { return this.quantities()[product.id] ?? product.minQuantity ?? 1; }
  change(product: Product, delta: number) { this.quantities.update(values => ({ ...values, [product.id]: Math.max(product.minQuantity ?? 1, this.quantity(product) + delta) })); }
  canAdd(product: Product) { return !!createQuoteItem(product, { quantity: this.quantity(product) }, 'preview'); }
  add(product: Product) { this.quote.addItem(product, { quantity: this.quantity(product) }); }
  constructor() {
    const seo=inject(Seo);
    effect(()=>{
      this.query.set(this.requestedSearch());
      const category = this.activeCategory();
      const seoCategory = publicSeoCategory(this.category());
      const hasQueryParams = this.params().keys.length > 0;
      if (this.isCategoryPage() && category && seoCategory) {
        const path = `/productos/${seoCategory.slug}`;
        const editorial = category.catalogDescription?.trim();
        const description = editorial
          ? `${editorial} Conoce las opciones de ${category.name.toLocaleLowerCase('es')} de MIQA en Trujillo.`
          : `Conoce las opciones de ${category.name} de MIQA en Trujillo y solicita una cotización para tu proyecto.`;
        seo.applyPage(path, {
          title: seoCategory.title,
          description,
          robots: hasQueryParams ? 'noindex,follow' : 'index,follow',
          image: PAGE_SEO['/productos'].image,
          imageAlt: category.name,
          structuredData: [breadcrumb([
            { name: 'Inicio', path: '/' },
            { name: 'Productos', path: '/productos' },
            { name: category.name, path }
          ])]
        });
        return;
      }
      const filtered=hasQueryParams || this.isCategoryPage();
      seo.applyPage('/productos',{...PAGE_SEO['/productos'],robots:filtered?'noindex,follow':'index,follow',structuredData:[breadcrumb([{name:'Inicio',path:'/'},{name:'Productos',path:'/productos'}])]});
    });
  }
  categoryName(slug: string) { return this.categories().find(category => category.slug === slug)?.name ?? slug; }
  filterCategory(category: string) {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { categoria: category || null }, queryParamsHandling: 'merge' });
  }
  reset() { this.query.set('');void this.router.navigate([], {relativeTo:this.route,queryParams:{categoria:null,buscar:null},queryParamsHandling:'merge'}); }
}
