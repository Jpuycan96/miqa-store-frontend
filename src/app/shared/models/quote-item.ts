import { ProductExtraOption, ProductMaterialOption, ProductSaleType } from './product';

export interface QuoteItem {
  readonly id: string;
  readonly productId: string;
  readonly productSlug: string;
  readonly productName: string;
  readonly saleType: ProductSaleType;
  readonly quantity: number;
  readonly unitLabel: string;
  readonly packSize?: number;
  readonly packLabel?: string;
  readonly widthMeters?: number;
  readonly heightMeters?: number;
  readonly areaSquareMeters?: number;
  readonly selectedMaterial?: ProductMaterialOption;
  readonly selectedExtras?: readonly ProductExtraOption[];
  readonly notes?: string;
}

export interface QuoteConfiguration {
  readonly quantity: number;
  readonly widthMeters?: number;
  readonly heightMeters?: number;
  readonly materialId?: string;
  readonly extraIds?: readonly string[];
  readonly notes?: string;
}
