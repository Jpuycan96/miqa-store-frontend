# Catálogo vigente sin rebuild de Angular

Implementado exclusivamente en frontend. No se modificaron endpoints, reglas ERP,
precios, publicaciones, contenido editorial, backends ni configuración Cloudflare.
Esta corrección requiere el despliegue habitual del frontend una vez; después, los
cambios publicados que devuelve la API se reflejan sin volver a compilar Angular.

## Carga, hidratación y navegación

- `CatalogApiService` conserva la consulta SSR habitual para prerenderizar y para
  el primer render del navegador cuando existe TransferState. Así el cliente
  comienza con los mismos datos que el HTML, conservando la hidratación y replay.
- Tras la primera estabilización de Angular (`ApplicationRef.whenStable`), cada
  consulta inicial activa se revalida una sola vez: `transferCache: false` y
  `cache: 'no-store'`. No espera una segunda navegación ni reutiliza el snapshot
  del build. El observable completa al recibir la respuesta; no hay polling.
- Sin TransferState, o después de esa estabilización, se hace una sola consulta
  de red por suscripción. Una consulta inicial que no tenga su respuesta concreta
  en TransferState puede hacer una lectura inicial y una revalidación adicional.
  Cancelar la suscripción cancela también la revalidación pendiente y el HTTP.
- La comprobación de ruta de categoría usa una consulta fresca en el navegador,
  incluso antes de la hidratación, para reconocer categorías nuevas. En SSR se
  conserva la política habitual. Slugs nuevos utilizan el fallback SPA existente.
- El header consulta categorías al cambiar de navegación, excluyendo la misma
  navegación que lo creó. Un catálogo reutilizado recarga las categorías cuando
  cambia la categoría o los filtros de URL; la ficha lo hace al cambiar de slug o reintentar. Listas y
  búsquedas conservan su navegación, filtros y cancelación de respuestas anteriores.
- La API pública decide elegibilidad y disponibilidad. El frontend excluye
  `published: false`; un detalle con 404 o sin publicación deja de configurarse.
  `UNAVAILABLE` conserva su significado actual, sin inferir nuevas reglas ERP.
- Las respuestas nuevas actualizan títulos, descripciones, categorías, canonical,
  robots y BreadcrumbList con el servicio SEO existente. No se editan esos datos.

Se conserva el DOM de la ficha mientras se actualiza el mismo producto. El
configurador ERP usa su reconciliación existente; el formulario legacy solo se
inicializa al cambiar el ID. Cantidades, opciones válidas, notas y cotización no
se borran. Opciones incompatibles siguen las validaciones ERP existentes.
Si la revalidación falla, catálogo/header muestran sus estados de error existentes;
la ficha mantiene el último producto conocido y su borrador con un aviso visible
y reintento manual. Una baja confirmada mediante 404 sí retira la ficha.

No se cambió `provideClientHydration`, no se añadió `ngSkipHydration` ni una caché
persistente de productos. La coherencia inicial del DOM sigue la estrategia de
[hidratación de Angular](https://angular.dev/guide/hydration).

## Alcance de caché y disponibilidad

`no-store` evita reutilización de la caché HTTP del navegador. No puede corregir
una respuesta ya obsoleta entregada por la API o una regla CDN que fuerce el uso
de un snapshot. En DEV/producción verificar Network: URL API correcta, respuesta
vigente, Cache-Control, Age y CF-Cache-Status si aplica. No se cambiaron reglas CDN,
headers CORS ni parámetros del contrato para añadir cache busters.
Con API inaccesible no se puede garantizar información nueva: se informa el fallo.
Una página abierta e inactiva no se actualiza sola; se consulta por carga,
navegación, filtros/búsqueda o el reintento existente.

La portada mantiene sus contenidos editoriales estáticos; no se sustituyó su
selección de referencias visuales por productos ERP. El catálogo `/productos`, sus
categorías, fichas y navegación pública consumen la API.

## Sitemap y limitaciones SEO concretas

`npm run build` ejecuta `scripts/generate-sitemap.mjs`: consulta productos,
categorías y redirecciones de slugs; escribe `public/sitemap.xml` y
`public/_redirects`, que luego se copian a los assets. Solo incluye productos
publicados y las categorías devueltas por la API. Ambos archivos siguen siendo
estáticos; una sincronización ERP no los reescribe en Cloudflare.

`app.routes.server.ts` prerenderiza slugs conocidos en build y mantiene fallback
cliente. `wrangler.jsonc` sirve assets con `single-page-application`; el bundle
Node SSR generado por Angular no constituye un servidor dinámico desplegado con
esa configuración. No se cambió a RenderMode.Server ni se creó un Worker.

El HTML sin JavaScript, previews sociales y sitemap conservan el snapshot del
build. Los slugs nuevos ya funcionan en el navegador, pero su descubrimiento SEO
y HTML inicial actualizado siguen pendientes. Una ficha deshabilitada queda
`noindex,follow` después de consultar la API; su asset puede seguir respondiendo
HTTP 200. El frontend no puede convertir esa respuesta de Cloudflare en 404/410.
Las redirecciones estáticas tampoco se renuevan automáticamente.

### Estrategia propuesta para una etapa autorizada

1. Mantener por ahora el sitemap de build como respaldo, sin prometer que cambia
   con cada sincronización. No fabricar `lastmod` usando la fecha de compilación.
2. Implementar posteriormente un sitemap XML dinámico en el backend MIQA ya
   alojado, usando exactamente la visibilidad pública de productos/categorías.
   Consultar al solicitar el XML, o invalidar su caché después de sincronización,
   publicación/despublicación y cambios editoriales. No depende de un administrador
   abierto ni de polling del frontend. Este endpoint es una propuesta, no existe
   por este cambio y requiere autorización de backend/despliegue.
3. Servirlo en el host API existente con URLs canonical del host de la tienda.
   En esa etapa, referenciarlo desde robots.txt o enviarlo como sitemap externo
   mediante Search Console con las verificaciones de propiedad correspondientes.
   Esto permite actualizar el XML sin incorporar infraestructura Cloudflare nueva.
   [Google documenta ambas vías de sitemaps alojados en otro sitio](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap#cross-submit).
4. Si se exige mantener `/sitemap.xml` en el host Store y HTML/HTTP 404 vigentes
   sin JavaScript, evaluar por separado un handler/proxy o renderizado dinámico
   con invalidación por eventos. Requiere autorización explícita de Cloudflare;
   no se implementó. No basta purgar un asset: su contenido sigue siendo de build.

## Validación reproducible

Pruebas focalizadas de HTTP, carga/navegación, formularios, cotización y SEO:

```powershell
npm.cmd test -- --watch=false --include='src/app/core/data/*.spec.ts' --include='src/app/features/products/**/*.spec.ts' --include='src/app/core/header/*.spec.ts' --include='src/app/core/quote/**/*.spec.ts' --include='src/app/core/seo/*.spec.ts'
git diff --check
```

El build de validación ejecutó `npm run build` con fetch simulado localmente,
incluyendo un producto ERP, y restauró los bytes originales de sitemap y redirects.
No se consultaron ni modificaron catálogos reales. Evidencia local ignorada:
`.tmp/catalog-fresh-tests.log`, `.tmp/catalog-fresh-build.log` y
`.tmp/catalog-fresh-browser.json`. La validación local no certifica políticas CDN,
la sincronización real del backend ni el rastreo/indexación en producción.
