import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { productWhatsAppUrl } from '../../../core/config/whatsapp';
import { FeaturedProduct } from '../../../shared/models/featured-product';
import { ProductVisual } from './product-visual';

@Component({
  selector: 'app-featured-products',
  imports: [NgOptimizedImage, ProductVisual, RouterLink],
  templateUrl: './featured-products.html',
  styleUrl: './featured-products.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeaturedProducts {
  readonly products = input.required<readonly FeaturedProduct[]>();
  readonly whatsappUrl = productWhatsAppUrl;
  readonly featuredProducts = computed(() => this.products().filter(product => product.featured));
}
