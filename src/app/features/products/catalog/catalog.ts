import { ProductImageView } from '../../../shared/product-images/product-image';
import { productImages } from '../../../shared/product-images/product-images';
import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, effect, inject, signal, DestroyRef } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, map, of, startWith, Subject, switchMap } from 'rxjs';
import { ProductCatalog } from '../../../core/data/product-catalog';
import { Product } from '../../../shared/models/product';
import { QuoteStore } from '../../../core/quote/quote-store';
import { QuotePresentation } from '../../../core/quote/quote-presentation';
import { QuotePanel } from '../../../core/quote/quote-panel/quote-panel';
import { breadcrumb, PAGE_SEO, Seo } from '../../../core/seo/seo';
import { CatalogHandoff } from '../../../core/seo/catalog-handoff';

@Component({
  selector: 'app-catalog', imports: [RouterLink, ProductImageView, QuotePanel],
  templateUrl: './catalog.html', styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Catalog {
  readonly handoff = inject(CatalogHandoff);
  private readonly source = inject(ProductCatalog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  catalogReturn() {
    const tree = this.router.parseUrl(this.router.url);
    tree.queryParams = { ...tree.queryParams };
    const search = this.query().trim();
    if (search) tree.queryParams['buscar'] = search;
    else delete tree.queryParams['buscar'];
    return this.router.serializeUrl(tree);
  }
  imageFor(product: Product): import('../../../shared/models/product').ProductImage | undefined { return productImages(product)[0]; }
  addFromCatalog(product: Product) {
    return this.router.navigate(['/productos', product.slug], {
      queryParams: { regresar: this.catalogReturn() }
    });
  }
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly routeData = toSignal(this.route.data, { initialValue: this.route.snapshot.data });
  private readonly routeParams = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly refresh = new Subject<void>();
  private readonly requestedSearch = computed(()=>(this.params().get('buscar')??'').slice(0,120));
  readonly query = signal('');
  readonly isCategoryPage = computed(() => this.routeData()['categoryRoute'] === true);
  readonly category = computed(() => this.isCategoryPage() ? this.routeParams().get('slug') ?? '' : this.params().get('categoria') ?? '');
  private readonly search = toObservable(this.query).pipe(
    map(value => value.trim()), distinctUntilChanged(), debounceTime(300), startWith(''), distinctUntilChanged()
  );
  readonly state = toSignal(combineLatest([
    toObservable(this.category).pipe(distinctUntilChanged()),
    this.search, this.refresh.pipe(startWith(undefined))
  ]).pipe(switchMap(([category, search]) => this.source.list({ category, search }, { fresh: this.handoff.visible() }).pipe(
    map(products => ({ category, products: products.filter(product => product.published), loading: false, error: false })),
    startWith({ category, products: [], loading: true, error: false }),
    catchError(() => of({ category, products: [], loading: false, error: true }))
  ))), { initialValue: { category: '', products: [], loading: true, error: false } });
  readonly categoryState = toSignal(combineLatest([
    toObservable(this.category).pipe(distinctUntilChanged()), this.route.queryParamMap,
    this.refresh.pipe(startWith(undefined))
  ]).pipe(switchMap(([category]) =>
    this.source.categories({ fresh: this.handoff.visible() }).pipe(
      map(categories => ({ category, categories, loading: false, error: false })),
      startWith({ category, categories: [], loading: true, error: false }),
      catchError(() => of({ category, categories: [], loading: false, error: true }))
    )
  )), { initialValue: { category: '', categories: [], loading: true, error: false } });
  readonly categories = computed(() => this.categoryState().categories);
  readonly activeCategory = computed(() => this.categories().find(category => category.slug === this.category()) ?? null);
  readonly filtered = computed(() => this.state().products);
  private readonly categoriesReady = computed(() => !this.categoryState().loading && !this.categoryState().error
    && this.categoryState().category === this.category());
  readonly categoryUnavailable = computed(() => this.isCategoryPage() && this.categoriesReady() && !this.activeCategory());
  readonly handoffReady = computed(() => this.categoriesReady() && (this.categoryUnavailable()
    || (!this.state().loading && !this.state().error && this.state().category === this.category())));
  retry() { this.refresh.next(); }
  readonly quote = inject(QuoteStore);
  readonly quotePresentation = inject(QuotePresentation);
  constructor() {
    afterRenderEffect(() => {
      if (this.handoffReady()) this.handoff.complete(this.isCategoryPage() ? `/productos/${this.category()}` : '/productos');
      else if (this.state().error || this.categoryState().error) this.handoff.temporaryError();
    });
    this.quotePresentation.catalogPage.set(true);
    this.destroyRef.onDestroy(() => {
      this.quotePresentation.catalogPage.set(false);
      this.quotePresentation.dismissEmpty();
    });
    const seo=inject(Seo);
    effect(()=>{
      this.query.set(this.requestedSearch());
      if (this.isCategoryPage() && this.handoff.visible() && !this.handoffReady()) return;
      if (this.categoryUnavailable()) {
        seo.applyPage(`/productos/${this.category()}`, {
          title: 'Categoría no disponible | MIQA', description: 'Explora los productos públicos disponibles de MIQA.',
          robots: 'noindex,follow', structuredData: []
        });
        return;
      }
      const category = this.activeCategory();
      const hasQueryParams = this.params().keys.length > 0;
      if (this.isCategoryPage() && category) {
        const path = `/productos/${category.slug}`;
        const editorial = category.catalogDescription?.trim();
        const description = editorial
          ? `${editorial} Conoce las opciones de ${category.name.toLocaleLowerCase('es')} de MIQA en Trujillo.`
          : `Conoce las opciones de ${category.name} de MIQA en Trujillo y solicita una cotización para tu proyecto.`;
        seo.applyPage(path, {
          title: `${category.name} en Trujillo | MIQA`,
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
