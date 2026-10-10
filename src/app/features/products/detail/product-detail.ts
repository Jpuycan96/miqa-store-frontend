import { QuotePanel } from '../../../core/quote/quote-panel/quote-panel';
import { QuotePresentation } from '../../../core/quote/quote-presentation';
import { QuantityInput } from '../../../shared/quantity-input';
import { ErpConfigurator } from '../erp-configurator/erp-configurator';
import { DecimalPipe } from '@angular/common';
import { ProductImageGallery } from '../../../shared/product-images/product-image-gallery';
import { ChangeDetectionStrategy, Component, computed, effect, inject, DestroyRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, Subject, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { ProductCatalog } from '../../../core/data/product-catalog';
import { QuoteStore } from '../../../core/quote/quote-store';
import { calculateArea, createQuoteItem, normalizeQuantity, quantityLabel } from '../../../core/quote/quote-utils';
import { breadcrumb, INSTITUTIONAL_IMAGE, Seo } from '../../../core/seo/seo';
import { Product } from '../../../shared/models/product';
import { productImages } from '../../../shared/product-images/product-images';

interface ProductState { slug?: string; product?: Product; loading: boolean; error: boolean; }

@Component({
  selector: 'app-product-detail', imports: [QuotePanel, ErpConfigurator, QuantityInput, ProductImageGallery, RouterLink, ReactiveFormsModule, DecimalPipe],
  templateUrl: './product-detail.html', styleUrl: './product-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetail {
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
  retry() { this.refresh.next(); }
  private loadedProduct: { slug: string; product: Product | undefined } | undefined;
  readonly state = toSignal(combineLatest([this.route.paramMap.pipe(
    map(params => params.get('slug') ?? ''), distinctUntilChanged()), this.refresh.pipe(startWith(undefined))]).pipe(
    switchMap(([slug]) => this.catalog.findBySlug(slug).pipe(
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
  readonly product = computed(() => this.state().product);
  readonly categories = toSignal(combineLatest([
    this.route.paramMap.pipe(map(params => params.get('slug') ?? ''), distinctUntilChanged()),
    this.refresh.pipe(startWith(undefined))
  ]).pipe(switchMap(() => this.catalog.categories().pipe(catchError(() => of([]))))), { initialValue: [] });
  readonly category = computed(() => this.categories().find(category => category.slug === this.product()?.categorySlug));
  readonly form = new FormGroup({
    quantity: new FormControl<number | null>(1, [Validators.required, Validators.min(1)]),
    width: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    height: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    material: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] })
  });
  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly area = computed(() => calculateArea(this.values().width ?? 0, this.values().height ?? 0));
  readonly quantity = computed(() => this.values().quantity ?? 0);
  readonly label = quantityLabel;
  readonly configuration = computed(() => ({
    quantity: this.quantity(), widthMeters: this.values().width ?? undefined,
    heightMeters: this.values().height ?? undefined, materialId: this.values().material ?? '',
    notes: this.values().notes ?? ''
  }));
  readonly canAdd = computed(() => {
    const product = this.product();
    return !!product && !!createQuoteItem(product, this.configuration(), 'preview');
  });

  constructor() {
    effect(() => this.quotePresentation.productDetail.set(!!this.product()));
    inject(DestroyRef).onDestroy(() => { this.quotePresentation.productDetail.set(false); this.quotePresentation.dismissEmpty(); });
    let initializedProductId: string | undefined;
    effect(() => {
      const product = this.product();
      if (product && initializedProductId !== product.id) {
        this.form.reset({ quantity: product.minQuantity ?? 1, width: null, height: null, material: '', notes: '' });
        initializedProductId = product.id;
      }
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

  changeQuantity(delta: number) {
    this.form.controls.quantity.setValue(normalizeQuantity(this.quantity() + delta, this.product()?.minQuantity));
  }
  add() {
    const product = this.product();
    if (product) this.quote.addItem(product, this.configuration());
  }
}
