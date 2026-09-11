import { HomeService } from '../../../shared/models/home-service';

export const HOME_SERVICES: readonly HomeService[] = [
  { slug: 'corte-grabado-laser', kind: 'laser', name: 'Corte y grabado láser', description: 'Corta y graba tus ideas en acrílico o MDF.' },
  { slug: 'corte-cnc', kind: 'cnc', name: 'Corte CNC', description: 'Corte router y cuchilla para PVC desde 2 mm hasta 20 mm de espesor.' },
  { slug: 'impresion-gran-formato', kind: 'print', name: 'Impresión en gran formato', description: 'Producción gráfica para interiores, exteriores y comunicación visual.' },
  { slug: 'instalaciones', kind: 'installation', name: 'Instalaciones', description: 'Montaje e implementación de soluciones gráficas y publicitarias para tu negocio.' }
];
