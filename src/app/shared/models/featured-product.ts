export type ProductPlaceholder = 'print' | 'backlit' | 'packaging' | 'cards' | 'flyers' | 'merch';

export interface FeaturedProduct {
  id: number;
  name: string;
  slug: string;
  category: string;
  description: string;
  image?: string;
  imageAlt?: string;
  priceFrom?: number | null;
  showPrice: boolean;
  featured: boolean;
  placeholder?: ProductPlaceholder;
}
