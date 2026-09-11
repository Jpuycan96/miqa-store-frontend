export interface HomeService {
  slug: string;
  name: string;
  description: string;
  kind: 'laser' | 'cnc' | 'print' | 'installation';
  image?: { src: string; alt: string };
  link?: string;
}
