import { GraphicKind } from '../graphic/graphic';

export interface HomeCategory {
  name: string;
  slug: string;
  href: string;
  kind: GraphicKind;
  number: string;
  image?: { src: string; alt: string };
}
