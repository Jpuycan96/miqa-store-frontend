import { ProductImage } from './product';

export type ProductPlaceholder = 'print' | 'backlit' | 'packaging' | 'cards' | 'flyers' | 'merch';

export interface FeaturedProduct {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  image?: string;
  imageAlt?: string;
  gallery?: readonly string[];
  images?: readonly ProductImage[];
  priceFrom?: number | null;
  showPrice: boolean;
  featured: boolean;
  placeholder?: ProductPlaceholder;
}
