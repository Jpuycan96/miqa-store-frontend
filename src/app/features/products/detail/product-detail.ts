import { DecimalPipe } from '@angular/common';
import { ProductImageGallery } from '../../../shared/product-images/product-image-gallery';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, Subject, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { ProductCatalog } from '../../../core/data/product-catalog';
import { QuoteStore } from '../../../core/quote/quote-store';
import { calculateArea, createQuoteItem, quantityLabel } from '../../../core/quote/quote-utils';
import { absoluteUrl, breadcrumb, INSTITUTIONAL_IMAGE, Seo } from '../../../core/seo/seo';
import { Product } from '../../../shared/models/product';
import { productImages } from '../../../shared/product-images/product-images';

interface ProductState { slug?: string; product?: Product; loading: boolean; error: boolean; }

@Component({
  selector: 'app-product-detail', imports: [ProductImageGallery, RouterLink, ReactiveFormsModule, DecimalPipe],
  templateUrl: './product-detail.html', styleUrl: './product-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetail {
  private readonly catalog = inject(ProductCatalog);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(Seo);
  readonly quote = inject(QuoteStore);
  private readonly refresh = new Subject<void>();
  retry() { this.refresh.next(); }
  readonly state = toSignal(combineLatest([this.route.paramMap.pipe(
    map(params => params.get('slug') ?? ''), distinctUntilChanged()), this.refresh.pipe(startWith(undefined))]).pipe(
    switchMap(([slug]) => this.catalog.findBySlug(slug).pipe(
      map(product => ({ slug, product, loading: false, error: false } as ProductState)),
      startWith({ slug, loading: true, error: false } as ProductState),
      catchError(() => of({ slug, loading: false, error: true } as ProductState))
    ))
  ), { initialValue: { loading: true, error: false } as ProductState });
  readonly product = computed(() => this.state().product);
  readonly categories = toSignal(this.catalog.categories().pipe(catchError(() => of([]))), { initialValue: [] });
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
    effect(() => {
      const product = this.product();
      this.form.reset({ quantity: product?.minQuantity ?? 1, width: null, height: null, material: '', notes: '' });
      const path = `/productos/${encodeURIComponent(this.state().slug ?? this.route.snapshot.paramMap.get('slug') ?? '')}`;
      const title = product?.seoTitle?.trim() || (product ? `${product.name} | MIQA` : 'Producto no disponible | MIQA');
      const description = product?.seoDescription?.trim() || product?.shortDescription?.trim() || product?.description?.trim() || 'Explora los productos y soluciones gráficas disponibles de MIQA.';
      const primaryImage = product ? productImages(product)[0] : undefined;
      const image = primaryImage?.url || INSTITUTIONAL_IMAGE;
      const structuredData = product ? [{
        '@context':'https://schema.org','@type':'Product',name:product.name,description,
        ...(image?{image:absoluteUrl(image)}:{}),...(product.categoryName?{category:product.categoryName}:{}),
        url:absoluteUrl(path),brand:{'@type':'Brand',name:'MIQA'}
      },breadcrumb([{name:'Inicio',path:'/'},{name:'Productos',path:'/productos'},{name:product.name,path}])] : [];
      this.seo.applyPage(path, {
        title, description, robots: product?.published ? 'index,follow' : 'noindex,follow', type: product ? 'product' : 'website',
        image, imageAlt: primaryImage?.altText || product?.name || 'MIQA', structuredData
      });
    });
  }

  changeQuantity(delta: number) {
    this.form.controls.quantity.setValue(Math.max(this.product()?.minQuantity ?? 1, this.quantity() + delta));
  }
  add() {
    const product = this.product();
    if (product) this.quote.addItem(product, this.configuration());
  }
}
