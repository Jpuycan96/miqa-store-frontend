import { Product, ProductCategory, ProductSaleType } from '../../shared/models/product';

export interface CategoryDto {
  readonly id?: string | number;
  readonly slug: string;
  readonly name: string;
  readonly catalogHeadline?: string | null;
  readonly catalogDescription?: string | null;
  readonly displayOrder?: number;
}
interface OptionDto { readonly id: string | number; readonly name: string; }
export interface ImageDto {
  readonly id: string | number;
  readonly url: string;
  readonly altText: string;
  readonly primaryImage: boolean;
  readonly displayOrder: number;
}
export interface ProductDto {
  readonly id: string | number;
  readonly slug: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly categorySlug?: string;
  readonly category: CategoryDto;
  readonly image: string | null;
  readonly gallery?: readonly string[] | null;
  readonly images?: readonly ImageDto[] | null;
  readonly featured: boolean;
  readonly published: boolean;
  readonly saleType: ProductSaleType;
  readonly unitLabel: string;
  readonly packSize?: number | null;
  readonly packLabel?: string | null;
  readonly minQuantity?: number | null;
  readonly step?: number | null;
  readonly materials?: readonly OptionDto[] | null;
  readonly extras?: readonly OptionDto[] | null;
}

export function resolveProductImage(reference: string | null, mediaBaseUrl = ''): string {
  if (!reference) return '';
  if (/^https?:\/\//i.test(reference)) return reference;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference)) return '';
  if (reference.startsWith('/images/')) return reference;
  return mediaBaseUrl ? `${mediaBaseUrl.replace(/\/+$/, '')}/${reference.replace(/^\/+/, '')}` : reference;
}
export function mapCategory(dto: CategoryDto): ProductCategory {
  return {
    slug: dto.slug,
    name: dto.name,
    catalogHeadline: dto.catalogHeadline?.trim() || undefined,
    catalogDescription: dto.catalogDescription?.trim() || undefined
  };
}
export function mapProduct(dto: ProductDto, mediaBaseUrl = ''): Product {
  return {
    id: String(dto.id), slug: dto.slug, name: dto.name, shortDescription: dto.shortDescription || dto.description,
    description: dto.description || dto.shortDescription, categorySlug: dto.categorySlug ?? dto.category.slug,
    image: resolveProductImage(dto.image, mediaBaseUrl),
    gallery: (dto.gallery ?? []).map(image => resolveProductImage(image, mediaBaseUrl)),
    images: dto.images?.map(image => ({ ...image, id: String(image.id), url: resolveProductImage(image.url, mediaBaseUrl) })),
    featured: dto.featured, published: dto.published, saleType: dto.saleType, unitLabel: dto.unitLabel,
    packSize: dto.packSize ?? undefined, packLabel: dto.packLabel ?? undefined,
    minQuantity: dto.minQuantity ?? undefined, step: dto.step ?? undefined,
    materials: (dto.materials ?? []).map(option => ({ id: String(option.id), name: option.name })),
    extras: (dto.extras ?? []).map(option => ({ id: String(option.id), name: option.name }))
  };
}
