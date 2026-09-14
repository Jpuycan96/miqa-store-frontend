import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  // API-owned slugs are not available at build time. Static Assets handles client navigation.
  { path: 'productos/:slug', renderMode: RenderMode.Client },
  // /productos prerenders its noindex loading shell; data starts after client hydration.
  { path: '**', renderMode: RenderMode.Prerender }
];
