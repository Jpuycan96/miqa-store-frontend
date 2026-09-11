import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ProductPlaceholder } from '../../../shared/models/featured-product';

@Component({
  selector: 'app-product-visual',
  templateUrl: './product-visual.html',
  styleUrl: './product-visual.scss',
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductVisual {
  readonly kind = input.required<ProductPlaceholder>();
}

