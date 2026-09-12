export type ProductSaleType = 'QUANTITY' | 'PACK' | 'AREA';

export interface ProductCategory {
  readonly slug: string;
  readonly name: string;
}

export interface ProductMaterialOption {
  readonly id: string;
  readonly name: string;
}

export interface ProductExtraOption {
  readonly id: string;
  readonly name: string;
}

export interface Product {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly categorySlug: string;
  readonly image: string;
  readonly gallery?: readonly string[];
  readonly featured: boolean;
  readonly published: boolean;
  readonly saleType: ProductSaleType;
  readonly unitLabel: string;
  readonly packSize?: number;
  readonly packLabel?: string;
  readonly materials?: readonly ProductMaterialOption[];
  readonly extras?: readonly ProductExtraOption[];
  readonly minQuantity?: number;
  readonly step?: number;
}
