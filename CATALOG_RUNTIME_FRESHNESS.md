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

## Sitemap dinamico preparado localmente y limites SEO

Desde el 10 de octubre de 2026, `wrangler.jsonc` prepara un Worker cuya prioridad
se limita a `/sitemap.xml`, con binding `ASSETS`. La variable `SITEMAP_BACKEND_URL`
apunta al endpoint `/api/public/seo/sitemap.xml` del host API. El backend decide
la visibilidad publica; el proxy no cambia reglas, no genera URLs ni `lastmod`.
Esta implementacion es local y requiere despliegue autorizado de backend y frontend.

El proxy admite GET y HEAD; ambos consultan GET al backend y validan el documento
completo antes de responder. Solo envia `Accept: application/xml`, sin query,
cookies ni headers del visitante, y rechaza redirects upstream. Comprueba HTTP
200, Content-Type XML, cuerpo no vacio y contrato `urlset/url/loc` con namespace
sitemap, entidades y caracteres XML validos. No admite DTD ni elementos extra;
si el backend incorpora `lastmod`, sitemapindex u otra extension, sera necesario
actualizar este validador. No requiere dependencias ni un proceso adicional.

El timeout total de 10 segundos incluye la lectura del cuerpo. Se conservan
los errores upstream 5xx con respuesta generica; XML/respuesta inesperada o red
inaccesible producen 502; timeout 504; configuracion invalida 500; metodos distintos
de GET/HEAD 405. HEAD omite siempre el cuerpo. Todos llevan `Cache-Control: no-store`.
No se entrega un XML vacio ni el asset estatico con 200 para encubrir un fallo.
No se usa Cache API. Se lee el XML completo en memoria; vigilar tamano y latencia
si el catalogo crece. Las reglas externas de cache/WAF de produccion requieren
verificacion posterior; no fueron consultadas ni modificadas.

`npm run build` sigue ejecutando `scripts/generate-sitemap.mjs`: consulta la API
y escribe `public/sitemap.xml` y `public/_redirects`. Se conservan esos archivos y
el script. El sitemap estatico continua en los assets, pero el Worker lo precedera
en `/sitemap.xml` una vez desplegado. No hay fallback automatico al snapshot.
Las demas rutas conservan Static Assets, redirects, headers y fallback SPA;
si llegan al handler, se delegan a `env.ASSETS.fetch(request)` sin transformacion.

`app.routes.server.ts` sigue prerenderizando slugs conocidos y usando fallback
cliente. El HTML inicial sin JavaScript y previews sociales siguen dependiendo
del build: este proxy no ejecuta SSR Angular ni cambia HTTP 404/410 de productos.
Un producto despublicado puede conservar un asset con HTTP 200 y actualizar su
`noindex,follow` solo despues de consultar la API en el navegador. Los redirects
de slugs siguen siendo estaticos. El sitemap dinamico mejora el descubrimiento;
no garantiza indexacion ni actualiza el HTML de una ficha.

### Validacion y despliegue posterior, con autorizacion

```powershell
node --test worker/index.test.mjs
node node_modules/wrangler/bin/wrangler.js dev --local --ip 127.0.0.1 --port 8787 --var SITEMAP_BACKEND_URL:http://127.0.0.1:9099/api/public/seo/sitemap.xml
```

Para el segundo comando debe existir un servidor simulado en loopback y assets
locales en `dist/miqa-store-frontend/browser`; no arrancar Spring contra una base
real ni ejecutar el build habitual para esta comprobacion. Las 21 pruebas Node
y una comprobacion Wrangler con assets existentes y servidor simulado pasaron:
XML GET/HEAD, privacidad, 405/500/502/504, deadline durante lectura, SPA y 307.
Node 22.14 muestra un aviso experimental de MockTimers usado solo en tests.

Primero publicar y verificar el endpoint backend; despues autorizar el flujo
habitual GitHub/Workers Builds: build `npm run build`, deploy `npx wrangler deploy`.
Esos comandos no se ejecutaron durante esta implementacion. El robots.txt actual
ya referencia el sitemap del host Store. Tras desplegar, comprobar GET/HEAD y
`Cache-Control`, contrastar XML con el backend, verificar rutas/redirects y revisar
Search Console. Revisar overrides de `SITEMAP_BACKEND_URL`, cache y WAF si hay
500/502 o datos obsoletos. Para rollback, restaurar la version anterior del Worker
mediante el flujo autorizado; volvera a servir el sitemap estatico del despliegue.

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
