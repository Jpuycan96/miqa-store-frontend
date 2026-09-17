# MIQA Store — Roadmap y estado del proyecto

## Objetivo actual

Catálogo comercial público orientado a generar consultas y cotizaciones por WhatsApp. No es un ecommerce tradicional por ahora.

## Implementado

### Infraestructura

- [x] Frontend Angular independiente del ERP.
- [x] Backend Spring Boot independiente.
- [x] PostgreSQL independiente.
- [x] Frontend en producción: https://store.solucionesmicaela.com.
- [x] API en producción: https://api-store.solucionesmicaela.com.
- [x] Imágenes servidas desde infraestructura propia.
- [x] Cloudflare Workers Static Assets para el frontend.
- [x] Backend MIQA aislado del ERP.

### Catálogo

- [x] Categorías.
- [x] Productos.
- [x] Detalle de producto.
- [x] Búsqueda.
- [x] Productos destacados.
- [x] Proyectos.
- [x] Hasta 3 imágenes por producto.
- [x] Materiales y opciones por producto.
- [x] Tipos de venta `QUANTITY`, `PACK` y `AREA`.
- [x] Administración de productos y categorías.
- [x] Encabezados editoriales por categoría.
- [x] Orden alfabético de productos en frontend.
- [x] Contacto y cotización por WhatsApp.

### SEO técnico

- [x] Home indexable.
- [x] `/productos` indexable.
- [x] `/productos/:slug` indexable.
- [x] Prerender/SSG de productos publicados.
- [x] Canonical.
- [x] Meta title y description.
- [x] Open Graph.
- [x] Twitter Cards.
- [x] `og:image`.
- [x] `robots.txt`.
- [x] `sitemap.xml` generado desde productos publicados.
- [x] Sitemap actual con 27 URLs.
- [x] `BreadcrumbList` JSON-LD.
- [x] Admin protegido con `noindex,nofollow`.
- [x] Rutas con filtros/query params en `noindex,follow` y canonical limpio.
- [x] Página Not Found frontend con `noindex,nofollow`.
- [x] Google Search Console configurado.
- [x] Sitemap enviado y procesado correctamente por Google el 16/09/2026.
- [x] Google Search Console detecta 27 páginas en el sitemap.
- [x] `/productos` probado en tiempo real y confirmado por Google como indexable.
- [x] Solicitud manual de indexación de `/productos` realizada.

### Corrección SEO actual

- [x] Eliminar JSON-LD `Product` de `/productos/:slug`.
- [x] Mantener `BreadcrumbList` y el resto del SEO.
- [x] No inventar `offers`, precios, `review`, `aggregateRating`, estrellas, stock ni disponibilidad.
- [x] Validar el cambio localmente con 107/107 tests y build correcto.
- [ ] Hacer commit, push y deploy de la corrección.
- [ ] Validar la corrección posteriormente en Google Search Console.

Google exige `offers`, `review` o `aggregateRating` para que `Product` sea válido como fragmento enriquecido. MIQA actualmente no publica precios y no dispone de reseñas o ratings verificables.

> La ausencia actual de JSON-LD `Product` no impide que Google indexe las páginas de productos. Se elimina únicamente para evitar structured data inválido hasta disponer de datos reales.

## Pendientes prioritarios

### Google / SEO

- [ ] Hacer commit, push y deploy de la eliminación del JSON-LD `Product`.
- [ ] Volver a probar en Search Console `/productos/tarjetas-personales` después del deploy.
- [ ] Confirmar que desaparece el error de «Fragmentos de productos».
- [ ] Solicitar la indexación de una página representativa de producto después de validar.
- [ ] Revisar la evolución de páginas indexadas en Search Console.
- [ ] Revisar rendimiento, consultas, impresiones y clics conforme Google acumule datos.

### Resultados enriquecidos de productos — futuro importante

- [ ] Volver a implementar JSON-LD `Product` cuando MIQA tenga datos comerciales reales compatibles con Google.
- [ ] Evaluar `offers` cuando existan precios publicables y reales.
- [ ] Evaluar `review` cuando exista un sistema de reseñas reales.
- [ ] Evaluar `aggregateRating` cuando existan suficientes valoraciones verificables.
- [ ] Permitir estrellas y resultados enriquecidos únicamente con información real.
- [ ] Nunca inventar precio, reseñas, rating, stock o disponibilidad para SEO.

### Categorías SEO

- [x] Crear URLs limpias e indexables para las seis categorías públicas.
- [x] Evitar usar query params como landing SEO principal.
- [x] Incorporar title, description, canonical y contenido editorial por categoría.
- [x] Incorporar categorías indexables al sitemap.
- [x] Usar Admin/API como fuente de verdad para categorías, rutas, navegación, sitemap y prerender.
- [x] Generar slugs desde el nombre y conservar aliases históricos.
- [x] Generar reglas 301 de Cloudflare desde el historial de slugs.
- [ ] Desplegar coordinadamente V6/API y después reconstruir/publicar el frontend para activar redirects reales.

### HTTP 404

- [ ] Implementar HTTP 404 real para URLs públicas inexistentes.
- [ ] Mantener la compatibilidad necesaria para Admin/SPA.
- [ ] Evaluar un Worker o una estrategia equivalente antes de cambiar el fallback.

Actualmente el fallback SPA de Cloudflare puede responder HTTP 200 para rutas desconocidas.

### Sitemap y despliegues

- [ ] Automatizar la actualización del sitemap y prerender cuando se publiquen productos nuevos.

Actualmente, un producto publicado después del último build funciona mediante fallback CSR, pero necesita un nuevo build/deploy del frontend para entrar al sitemap y quedar prerenderizado.

## Catálogo y contenido

- [ ] Revisar la configuración comercial individual de los productos de Merchandising.
- [ ] Revisar `min_quantity`, `quantity_step`, `sale_type`, `pack_size` y `pack_label` producto por producto.
- [x] Configurar Abanicos por millar: `PACK`, `pack_size: 1000`, `pack_label: millar`, `min_quantity: 1000` y `quantity_step: 1000`.
- [ ] Completar imágenes faltantes de productos.
- [ ] Usar como imagen maestra recomendada 1800 × 1200 px, relación 3:2 y PNG transparente cuando corresponda.

No se debe asumir que todos los productos de Merchandising se venden por unidad.

## Admin / UX

- [ ] Convertir las notificaciones persistentes actuales en toast flotante.
- [ ] Evitar que los toast desplacen contenido.
- [ ] Ocultar automáticamente los toast después de aproximadamente 3–4 segundos.
- [ ] Reutilizar los toast para producto guardado, material agregado o eliminado, imagen subida y errores.

## Integraciones futuras

- [ ] Evaluar integración con el ERP.
- [ ] Evaluar creación automática de OT desde leads/cotizaciones cuando el flujo esté definido.
- [ ] Evaluar WhatsApp Cloud API.
- [ ] Evaluar carrito o cotización avanzada.
- [ ] Evaluar pagos online solamente si el negocio lo requiere.
- [ ] Evaluar integración con SUNAT cuando corresponda al flujo comercial.

## Fuera del alcance de V1

Por ahora no implementar:

- [ ] Checkout ecommerce.
- [ ] Pagos.
- [ ] Cuentas de cliente.
- [ ] Stock ecommerce.
- [ ] SUNAT.
- [ ] Creación automática de OT.
- [ ] Integración directa con la base de datos del ERP.

## Reglas técnicas importantes

- [x] MIQA Store y ERP deben permanecer aislados.
- [x] Nunca modificar la base de datos del ERP desde MIQA Store.
- [x] Nunca inventar información comercial para SEO.
- [x] No editar migraciones Flyway ya aplicadas.
- [x] Seguir el flujo desarrollo local → GitHub → despliegue controlado.
- [x] Realizar conscientemente los cambios de datos de producción sobre `miqa_store_db`.
- [x] No exponer PostgreSQL públicamente.
- [x] Mantener el backend productivo únicamente en loopback detrás de Nginx.
- [x] No tocar servicios ni configuración del ERP o LaserMonitor durante despliegues de MIQA.

## Worktree local conocido

Existen cuatro archivos de Hero con modificaciones preexistentes de line endings:

```text
src/app/features/home/hero/hero.html
src/app/features/home/hero/hero.scss
src/app/features/home/hero/hero.spec.ts
src/app/features/home/hero/hero.ts
```

No restaurarlos, limpiarlos ni incluirlos accidentalmente en commits sin autorización.
