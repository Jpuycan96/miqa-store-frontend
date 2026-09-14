import { ProductImage } from '../models/product';

export interface ImageSource {
  readonly name: string;
  readonly image?: string;
  readonly imageAlt?: string;
  readonly gallery?: readonly string[];
  readonly images?: readonly ProductImage[];
}

/** Metadata is authoritative; old image/gallery responses remain supported. */
export function productImages(product: ImageSource): readonly ProductImage[] {
  const images = product.images?.length
    ? [...product.images].sort((a, b) => Number(b.primaryImage) - Number(a.primaryImage) || a.displayOrder - b.displayOrder || a.id.localeCompare(b.id))
    : [product.image, ...(product.gallery ?? [])].filter((url): url is string => !!url).map((url, index) => ({
        id: String(index), url, altText: product.imageAlt || product.name, primaryImage: index === 0, displayOrder: index
      }));
  return images.filter((image, index) => !!image.url && images.findIndex(other => other.url === image.url) === index).slice(0, 3);
}
