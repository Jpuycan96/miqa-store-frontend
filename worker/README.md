# HTML publico dinamico y transicion Angular - etapas 2 y 3

Implementado y validado unicamente en local. El endpoint backend /api/public/seo/pages/{slug} todavia no esta desplegado segun el propietario. La etapa 3 esta completa localmente; publicar/verificar primero el backend y despues el frontend por un flujo autorizado.

## Flujo

`index.mjs` exporta solamente el handler. `router.mjs` compone el proxy de sitemap existente y `catalog-pages.mjs`:

- `/sitemap.xml`: implementación existente, sin modificaciones.
- `/productos/{slug}`: GET/HEAD dinámicos. Slug canónico ASCII en minúsculas, guiones y hasta 160 caracteres, compatible con el contrato backend.
- `/productos/{slug}/`: 307 a la variante sin barra, conservando el query del navegador, también para productos nuevos.
- Otros paths, archivos, rutas anidadas y métodos de otras rutas: `env.ASSETS.fetch(request)` con la solicitud original. `/productos` conserva su comportamiento actual.

Wrangler mantiene dominio, fecha de compatibilidad y configuración de HTML/SPA. `run_worker_first` usa `['/sitemap.xml', '/productos/*']`: el patrón es más amplio que una ruta parametrizada, por lo que el router filtra exactamente los paths correspondientes y delega los demás.

`SEO_PAGES_BACKEND_BASE_URL` es configurable y vale `https://api-store.solucionesmicaela.com/api/public/seo/pages`. Acepta HTTPS y HTTP exclusivamente para loopback local. No admite credenciales, query ni fragmento. El upstream recibe un GET nuevo incluso para HEAD, solo `Accept: application/json`, `redirect: manual` y `cache: no-store`. No recibe parámetros ni headers del visitante.

El backend conserva la autoridad sobre elegibilidad, precedencia categoría/producto, aliases y fallbacks SEO. El Worker no consulta ERP, listado administrativo ni precios, y no vuelve a implementar esas reglas.

## Contrato y errores

Consume los campos públicos de la etapa 1: `type`, `name`, `slug`, `seoTitle`, `seoDescription`, `bodyDescription`, `image: {url, altText} | null`, `breadcrumbs: [{name,url}]`, `links: [{name,url}]`, `canonicalUrl`.

El título y la descripción SEO deben estar resueltos y no vacíos; los fallbacks llegan del backend. Se copian solo campos permitidos. La canonical de un 200 debe coincidir con el slug solicitado. Canonical, breadcrumbs y enlaces usan exclusivamente el origen fijo `https://store.solucionesmicaela.com`; enlaces de catálogo tienen un slug válido y no contienen query, fragmento, credenciales ni puerto alternativo. Breadcrumbs admiten además `/` y `/productos`.

Imágenes: HTTPS sin credenciales, fragmentos, puertos alternativos ni hosts locales/IP literales. Pueden venir de un dominio público con DNS, como el frontend o `/media` de la API. El Worker no descarga esas imágenes: las descarga el navegador. La publicación y disponibilidad efectiva del medio siguen siendo responsabilidad del backend; no se realiza resolución DNS ni comprobación HTTP de imágenes por petición.

| Backend / condición | Respuesta pública |
| --- | --- |
| 200 + contrato válido + CSR válido | 200 HTML actual |
| 301 a otra URL canónica de catálogo permitida | 301, Location validada, sin cuerpo |
| 404 | 404 genérico, sin Angular ni ficha antigua |
| 500 / 502 / 503 / 504 | Conserva el código, con HTML genérico |
| JSON, contrato o redirección inválidos; fallo de red | 502 temporal |
| Timeout total de 10 segundos | 504 temporal |
| Configuración o plantilla incompatible | 500; nunca reutiliza prerender |
| Métodos distintos de GET/HEAD en ficha | 405, Allow GET, HEAD |

Todas las respuestas del catálogo, incluyendo errores y redirecciones, usan `Cache-Control: no-store`. HEAD sigue validando todo y no devuelve cuerpo. Nunca se copian cookies, ETag u otros headers del backend o del asset CSR. Los errores llevan `noindex,nofollow`; un fallo temporal nunca se transforma en 404. Un backend que devuelve 404 porque el endpoint aún no está desplegado es indistinguible de un slug ausente: por eso el orden de despliegue es obligatorio.

Límites: JSON 512 KiB, CSR 2 MiB, 2.000 enlaces de categoría, 16 breadcrumbs, slug 160 caracteres y longitudes acotadas por campo. Los cuerpos se leen por chunks, con validación UTF-8 y límite de bytes incluso sin Content-Length. El timeout abarca fetch, lectura del JSON, fetch/lectura del CSR y transformación. Las respuestas excesivas se rechazan como error temporal; no se truncan silenciosamente.

## Plantilla CSR

Con `html_handling: drop-trailing-slash`, el binding obtiene **`/index.csr`**, correspondiente al archivo construido **`dist/miqa-store-frontend/browser/index.csr.html`**. Pedir `/index.csr.html` produce una redirección; nunca se sustituye la plantilla por `/`, `index.html` o el HTML de un producto.

`HTMLRewriter` elimina títulos, canonical, robots, description, OG/Twitter y todo JSON-LD anterior. Inserta una sola versión actual en head y un BreadcrumbList con el mismo marcador `data-miqa-seo-jsonld` que Angular ya utiliza. Texto y atributos se escapan; JSON-LD escapa también los delimitadores que podrían cerrar el script. Se conservan base, favicon, CSS, modulepreload y scripts de bootstrap de la plantilla.

La validación exige doctype, html/head/body, una base `/`, un único `app-root` vacío y al menos un script module externo. Rechaza contenido prerenderizado, atributos de hidratación y TransferState. Una plantilla ausente, incorrecta o hidratada produce un error temporal, sin fallback antiguo.

Se inserta un `main#miqa-catalog-seo[data-miqa-catalog-seo]` antes de `app-root`, nunca dentro. Incluye nombre, descripción en texto, imagen y breadcrumbs; categorías incluyen enlaces públicos. No hay detección de bots ni HTML diferente por User-Agent. Categorías con query params conservan `noindex,follow` y canonical limpia, conforme al comportamiento Angular existente.

## Transicion Worker / Angular - etapa 3 local

El marcador existente main#miqa-catalog-seo[data-miqa-catalog-seo][data-miqa-canonical] es suficiente: no se modifico el generador del Worker. CatalogHandoff comprueba que sea hijo directo de body, con dominio/path canonicos correctos; jamas busca o elimina contenido dentro de app-root.

ProductDetail y Catalog solicitan datos publicos frescos, sin TransferCache, y conservan metadatos/HTML iniciales mientras cargan. El producto confirma tambien categorias actuales para respetar precedencia; la categoria confirma tanto la lista publica de categorias como los productos de la vista. Si la lista publica confirma que la categoria desaparecio, se retira la ficha aun si el listado de productos falla. Tras el render confirmado (afterRenderEffect) retiran el bloque. Se conserva durante fallos/timeout, con un aviso accesible de informacion temporal; Reintentar mantiene el flujo habitual y puede repetir reconocimiento de ruta ante una categoria que el guard no pudo cargar.

La ausencia confirmada/despublicacion elimina la ficha obsoleta y muestra no-disponible/noindex sin JSON-LD. Un fallo de categorias nunca convierte un 404 de producto en prueba suficiente de ausencia de una pagina compartida. Una categoria aun publica con busqueda sin resultados no se considera retirada. Navegacion cancela respuestas de rutas anteriores y abandonar el catalogo retira la ficha anterior despues del render de la nueva vista.

ProductShell conserva una sola region principal durante el fallback y despues del handoff. Solo se devuelve foco al contenido si estaba en el bloque eliminado y no cambio a otro control; preventScroll evita scroll inducido. No hay eliminacion al bootstrap, timers, polling, observers, deteccion de bots, modificaciones del arbol Angular ni nuevas dependencias. Sin JavaScript el HTML publico permanece completo. Prerender sin marcador mantiene su hidratacion normal y revalidacion existente.

El Worker decide 200/301/404/errores al solicitar el documento. Si el recurso se retira entre esa solicitud y la confirmacion Angular, se elimina su ficha y se actualiza robots, pero el cliente no puede cambiar el status HTTP ya recibido. La plantilla minima y la vista completa tienen geometria distinta: queda medir CLS con imagenes/contenidos reales.

Revisar cache CDN/redes sociales, CSP si se agrega, imagenes no disponibles, coste/latencia del backend sin cache y categorias que alcancen el limite de payload/enlaces. No se emite Product JSON-LD con ofertas o resenas inventadas.

## Validacion local sin produccion

Desde la raiz frontend, con Node 22 y dependencias ya instaladas:

```powershell
node scripts/build-catalog-offline.cjs
node node_modules/@angular/cli/bin/ng.js test --watch=false
node --test worker/index.test.mjs worker/catalog-pages.test.mjs
node worker/local-check.mjs
node worker/handoff-check.mjs
```

Para el build de validacion, scripts/build-catalog-offline.cjs usa fixtures y bloquea fetch externos; ejecuta ng build directamente sin generar ni cambiar sitemap/redirects. El **dist generado contiene fixtures y sirve unicamente para pruebas**: reconstruir por el flujo habitual con datos reales antes de publicar, con autorizacion separada. No ejecutar npm run build directamente en estas comprobaciones, ya que consulta produccion y regenera archivos.

La suite Worker usa Node, mocks, jsdom y workerd/Miniflare ya incluido con Wrangler. local-check.mjs necesita dist existente, inicia backend simulado loopback y Wrangler dev --local, sobrescribe ambas URLs backend y cierra los procesos que inicio. Comprueba frescura sin rebuild, GET/HEAD, privacidad, redirects, errores, timeout real, assets/SPA y sitemap. Guarda HTML en .tmp/catalog-worker/. Wrangler local puede adaptar Location al origen loopback; tests nativos verifican canonical de produccion.

handoff-check.mjs requiere Edge local (MIQA_EDGE_PATH opcional) y una copia local de axe (.tmp/axe.min.js o MIQA_AXE_PATH). No descarga ni instala nada. Usa HTML Worker real basado en el CSR construido, API simulada y bloqueo de solicitudes externas del documento. Guarda .tmp/catalog-handoff/results.json y cierra sus procesos. La prueba de hidratacion usa el fixture prerenderizado /productos/vinil-impreso. No se requieren cambios de base de datos.

Resultados locales de etapa 3, 10/10/2026: 284 tests Angular (39 archivos), 53 Worker, smoke Wrangler y build offline con 15 rutas aprobados. Diecisiete auditorias axe 4.10.3: cero infracciones y errores de hidratacion; producto/categoria a 390/1440 px, carga/foco, errores de red/categorias, 404/despublicacion, categoria retirada, navegacion producto/categoria/home, JS deshabilitado y prerender hidratado con 404 actual. Metadata unica. Tres avisos CSS existentes (catalog, product-detail, quote-panel). Sitemap, XML estatico, redirects, generador y lock conservados byte a byte. Sin cambios backend/BD ni commit, push o deploy.

Referencias: [Worker-first por paths](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [HTML handling](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/), [HTMLRewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/).

Referencias Angular: [afterRenderEffect](https://angular.dev/api/core/afterRenderEffect), [acceso DOM tras render](https://angular.dev/guide/components/dom-apis).

Nota de pruebas: products.spec.ts (busqueda con esperas fijas/debounce) fallo una vez mientras se compilaba en paralelo; la suite completa posterior, sin build concurrente, paso 284/284. No se altero esa prueba existente.
