import { QuotePanel } from '../../../core/quote/quote-panel/quote-panel';
import { QuotePresentation } from '../../../core/quote/quote-presentation';
import { ErpConfigurator } from '../erp-configurator/erp-configurator';
import { ProductImageGallery } from '../../../shared/product-images/product-image-gallery';
import { afterRenderEffect, ChangeDetectionStrategy, Component, computed, effect, inject, DestroyRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, Subject, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { ProductCatalog } from '../../../core/data/product-catalog';
import { QuoteStore } from '../../../core/quote/quote-store';
import { breadcrumb, INSTITUTIONAL_IMAGE, Seo } from '../../../core/seo/seo';
import { Product } from '../../../shared/models/product';
import { productImages } from '../../../shared/product-images/product-images';
import { CatalogHandoff } from '../../../core/seo/catalog-handoff';

interface ProductState { slug?: string; product?: Product; loading: boolean; error: boolean; }

@Component({
  selector: 'app-product-detail', imports: [QuotePanel, ErpConfigurator, ProductImageGallery, RouterLink],
  templateUrl: './product-detail.html', styleUrl: './product-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetail {
  readonly handoff = inject(CatalogHandoff);
  private readonly catalog = inject(ProductCatalog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly returnParams = toSignal(this.route.queryParamMap ?? of(this.route.snapshot.queryParamMap));
  readonly returnToProducts = computed(() => {
    const target = this.returnParams()?.get('regresar') ?? '';
    const path = target.split('?')[0];
    const safe = (path === '/productos' || this.categories().some(category => path === `/productos/${category.slug}`))
      && !target.includes('\\') && !target.includes('#');
    return this.router.parseUrl(safe ? target : '/productos');
  });
  private readonly seo = inject(Seo);
  readonly quote = inject(QuoteStore);
  readonly quotePresentation = inject(QuotePresentation);
  readonly integratedOpen = this.quotePresentation.panelVisible;
  returnToCatalog() { this.quote.close(); this.quotePresentation.dismissEmpty(); }
  private readonly refresh = new Subject<void>();
  retry() {
    if (this.handoff.visible() && this.categories().some(category => category.slug === this.state().slug)) {
      // Retry recognition when a failed category guard selected the product route.
      void this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload', replaceUrl: true })
        .catch(() => this.handoff.temporaryError());
    } else this.refresh.next();
  }
  private loadedProduct: { slug: string; product: Product | undefined } | undefined;
  readonly state = toSignal(combineLatest([this.route.paramMap.pipe(
    map(params => params.get('slug') ?? ''), distinctUntilChanged()), this.refresh.pipe(startWith(undefined))]).pipe(
    switchMap(([slug]) => this.catalog.findBySlug(slug, { fresh: this.handoff.visible() }).pipe(
      map(product => {
        this.loadedProduct = { slug, product };
        return { slug, product, loading: false, error: false } as ProductState;
      }),
      startWith({ slug, product: this.loadedProduct?.slug === slug
        ? this.loadedProduct.product : undefined, loading: true, error: false } as ProductState),
      catchError(() => of({ slug, product: this.loadedProduct?.slug === slug ? this.loadedProduct.product : undefined,
        loading: false, error: true } as ProductState))
    ))
  ), { initialValue: { loading: true, error: false } as ProductState });
  readonly categoryState = toSignal(combineLatest([
    this.route.paramMap.pipe(map(params => params.get('slug') ?? ''), distinctUntilChanged()),
    this.refresh.pipe(startWith(undefined))
  ]).pipe(switchMap(([slug]) => this.catalog.categories({ fresh: this.handoff.visible() }).pipe(
    map(categories => ({ slug, categories, loading: false, error: false })),
    startWith({ slug, categories: [], loading: true, error: false }),
    catchError(() => of({ slug, categories: [], loading: false, error: true }))
  ))), { initialValue: { slug: '', categories: [], loading: true, error: false } });
  readonly categories = computed(() => this.categoryState().categories);
  readonly handoffReady = computed(() => {
    const state = this.state();
    const categories = this.categoryState();
    return !state.loading && !state.error && !categories.loading && !categories.error
      && state.slug === categories.slug && !categories.categories.some(category => category.slug === state.slug);
  });
  // Keep the fallback as the only product presentation until precedence is confirmed too.
  readonly product = computed(() => this.handoff.visible() && !this.handoffReady() ? undefined : this.state().product);
  readonly temporaryFailure = computed(() => this.state().error || (this.handoff.visible()
    && (this.categoryState().error || (!this.categoryState().loading
      && this.categories().some(category => category.slug === this.state().slug)))));
  readonly awaitingHandoff = computed(() => this.handoff.visible() && !this.handoffReady() && !this.temporaryFailure());
  readonly category = computed(() => this.categories().find(category => category.slug === this.product()?.categorySlug));
  constructor() {
    afterRenderEffect(() => {
      if (this.handoffReady()) this.handoff.complete(`/productos/${this.state().slug}`);
      else if (this.state().error || this.categoryState().error
        || (!this.categoryState().loading && this.categories().some(category => category.slug === this.state().slug))) {
        this.handoff.temporaryError();
      }
    });
    effect(() => this.quotePresentation.productDetail.set(!!this.product()));
    inject(DestroyRef).onDestroy(() => { this.quotePresentation.productDetail.set(false); this.quotePresentation.dismissEmpty(); });
    effect(() => {
      const product = this.product();
      if (this.handoff.visible() && !this.handoffReady()) return;
      const path = `/productos/${encodeURIComponent(this.state().slug ?? this.route.snapshot.paramMap.get('slug') ?? '')}`;
      const title = product?.seoTitle?.trim() || (product ? `${product.name} | MIQA` : 'Producto no disponible | MIQA');
      const description = product?.seoDescription?.trim() || product?.shortDescription?.trim() || product?.description?.trim() || 'Explora los productos y soluciones gráficas disponibles de MIQA.';
      const primaryImage = product ? productImages(product)[0] : undefined;
      const image = primaryImage?.url || INSTITUTIONAL_IMAGE;
      const structuredData = product
        ? [breadcrumb([{name:'Inicio',path:'/'},{name:'Productos',path:'/productos'},{name:product.name,path}])]
        : [];
      this.seo.applyPage(path, {
        title, description, robots: product?.published ? 'index,follow' : 'noindex,follow', type: product ? 'product' : 'website',
        image, imageAlt: primaryImage?.altText || product?.name || 'MIQA', structuredData
      });
    });
  }

}
