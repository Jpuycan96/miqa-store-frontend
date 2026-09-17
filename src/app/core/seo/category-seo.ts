import categories from './public-categories.json';

export interface PublicSeoCategory {
  readonly slug: string;
  readonly title: string;
}

export const PUBLIC_SEO_CATEGORIES: readonly PublicSeoCategory[] = categories;

export function publicSeoCategory(slug: string): PublicSeoCategory | undefined {
  return PUBLIC_SEO_CATEGORIES.find(category => category.slug === slug);
}
