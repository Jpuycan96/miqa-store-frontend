export interface HomeProject {
  id: number;
  title: string;
  category: string;
  slug: string;
  image?: string;
  imageAlt?: string;
  featured?: boolean;
  layoutVariant?: 'lead' | 'wide';
}
