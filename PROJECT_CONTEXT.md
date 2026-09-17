# MIQA Store — contexto y traspaso

## Páginas SEO de categorías públicas — 17 de septiembre de 2026

- Las seis categorías principales tienen landings limpias en `/productos/{categorySlug}`. El router las declara explícitamente antes de `:slug`, por lo que esos seis slugs reutilizan `Catalog` y cualquier otro slug continúa en `ProductDetail`; no se usa una heurística ni una consulta ambigua a la API.
- La landing obtiene nombre, `catalogHeadline` y `catalogDescription` desde la API, muestra solo productos publicados de la categoría y emite title local para Trujillo, descripción derivada del copy editorial, canonical propia, OG/Twitter, `index,follow` y `BreadcrumbList` de tres niveles. Si lleva query params pasa a `noindex,follow` conservando la canonical limpia de la categoría. No se emite JSON-LD `Product`.
- Header desktop/móvil enlaza esas categorías por sus URLs limpias; TODOS conserva `/productos`. Las categorías no incluidas en la lista SEO siguen pudiendo usar el query param anterior. `/productos` con búsqueda/filtros mantiene `noindex,follow` y canonical `/productos`.
- La lista declarativa de seis categorías se comparte entre rutas Angular, prerender, navegación y generador del sitemap. El build falla como antes si la API pública requerida no responde. Validación: 109/109 tests; build correcto; 34 rutas estáticas (home, catálogo, proyectos, seis categorías y 25 productos); sitemap con 33 URLs indexables (sin Proyectos); HTML real inspeccionado para Merchandising, Imprenta/Papelería y Tarjetas personales.

## SEO público fase 1 — 16 de septiembre de 2026

- Home, `/productos` limpio y los productos publicados usan `index,follow`; cualquier query param del catálogo conserva canonical `/productos` y usa `noindex,follow`. Productos consumen `seoTitle`/`seoDescription` públicos con fallbacks no vacíos, canonical propia y OG/Twitter con imagen real o logo institucional. Las páginas de producto emiten únicamente JSON-LD BreadcrumbList: no emiten Product porque MIQA no publica offers, reviews ni aggregateRating reales. Home usa LocalBusiness con los datos públicos confirmados.
- El catálogo consulta la API durante prerender y entrega sus cards reales. `productos/:slug` usa `RenderMode.Prerender`, `getPrerenderParams` desde la API pública y fallback CSR para slugs aún no incluidos en el último build. El build validado generó 25 productos y 28 rutas estáticas totales.
- `npm run build` genera primero `public/sitemap.xml` desde la API de producción; falla si la API no responde o no devuelve una lista. El sitemap validado contiene Home, catálogo y 25 productos publicados (27 URLs), sin Admin, filtros, query params ni Proyectos.
- `public/_headers` añade `X-Robots-Tag: noindex, nofollow` a `/admin` y `/admin/*` en Cloudflare Static Assets, además del noindex Angular existente. La ruta wildcard muestra una página Not Found con `noindex,nofollow`; el HTTP 404 real sigue pendiente porque `not_found_handling: single-page-application` devuelve 200 sin introducir un Worker dinámico.
- Validación: API producción 200 con 25 publicados; 107/107 tests; build limpio; 25/25 HTML de producto con contenido, canonical, index y JSON-LD; catálogo con 25 cards y sin «Cargando productos…»; robots y `_headers` copiados; cero páginas Admin prerenderizadas. Sin deploy, commit ni push.

## Editor Admin de productos compacto y materiales — 16 de septiembre de 2026

- Información general y Configuración de venta son secciones accesibles contraíbles: abiertas al crear, cerradas al editar y tras guardar; muestran resúmenes derivados del formulario y no pierden estado al alternarse. El formulario conserva dos columnas y reduce moderadamente alturas y espacios.
- Materiales conserva filas compactas y un único editor que solo se abre al agregar o editar; cancelar limpia y cierra sin HTTP, y guardar exitosamente actualiza y cierra. El nombre se recorta y debe incluir al menos una letra o número Unicode; los registros legacy inválidos siguen visibles para eliminación manual.
- El frontend consume `DELETE /api/admin/products/{productId}/materials/{materialId}` tras confirmación nativa identificando el material. Bloquea operaciones duplicadas, elimina solo del estado local tras 204 y reutiliza el feedback/error Admin. No se modificó backend.
- Validación: 101/101 tests y build de producción correctos; tres rutas prerenderizadas. Sin commit, push ni despliegue.

## Fotografías reales de proyectos — 15 de septiembre de 2026

- «Proyectos que hablan por nosotros.» permanece hardcodeado con cinco proyectos: Letreros Publicitarios, Señaléticas, Implementación de local, Impresión de gran formato y Merchandising. Cada entrada usa su fotografía real de `/images/projects/`; se retiró el fallback de arte CSS y las categorías pequeñas bajo las imágenes.
- Las fotografías cargan lazy mediante `NgOptimizedImage` y usan cover centrado. Projects se separa con un gris azulado suave (#f4f7f8): móvil usa una columna, desde 768 px dos, desde 1024 px tres y desde 1200 px recupera la composición editorial con Letreros Publicitarios grande a la izquierda y cuatro proyectos en una cuadrícula 2×2 a la derecha, con gaps de 24 px. En desktop, el hover eleva 3 px, escala la fotografía 1.025, realza sutilmente color y muestra un acento cyan; reduced motion conserva el estado visual sin transformaciones. No se modificaron backend, Admin ni otras secciones.

## Cabeceras editoriales administrables del catálogo — 15 de septiembre de 2026

- `/productos` conserva su cabecera general para TODOS. Cuando el query param estable `categoria` coincide con una categoría pública cargada por API, la misma vista muestra su nombre, `catalogHeadline` y `catalogDescription`; reacciona a navegación interna, acceso directo y recarga sin rutas ni páginas adicionales ni contenido comercial hardcodeado en el catálogo.
- Admin Categorías permite editar ambos campos dentro de «CABECERA DEL CATÁLOGO», con preview local inmediata y persistencia solo mediante el Guardar existente. El Header deriva la categoría activa del mismo query param y usa texto navy con underline cyan en desktop y móvil; TODOS queda activo cuando no existe `categoria`.

## Scroll Snap de Home — 15 de septiembre de 2026

- Desde 1024 px, el documento usa `scroll-snap-type: y proximity`; Hero, Favoritos, Proyectos y el grupo final CTA + Contacto son cuatro targets consecutivos con `scroll-snap-align: start` y una altura mínima disponible, nunca una altura fija.
- El header sticky ocupa 122 px (38 px de franja superior + 84 px de barra principal), compensados mediante `scroll-padding-top`. En esta vista desktop el desplazamiento normal es nativo (`scroll-behavior: auto`) y `proximity` solo completa el encaje final. Por debajo de 1024 px no se aplica snap ni altura mínima. `prefers-reduced-motion: reduce` conserva el snap nativo sin desplazamiento suave.

## Favoritos compactos en Home — 15 de septiembre de 2026

- «Los favoritos de nuestros clientes.» muestra los tres primeros productos destacados y conserva sus datos y acciones. Se retiraron el eyebrow «Los más solicitados» y el párrafo introductorio; el título y «Ver todos los productos» comparten la franja superior desde tablet.
- Desktop desde 1024 px usa tres columnas iguales, medios de 220 px y espaciado vertical reducido para que título, enlace y las tres tarjetas entren completos en un viewport típico de 900 px, sin overflow ni recorte. Móvil mantiene su flujo de una columna y tablet dos columnas.

## Configuración de entornos frontend/API — 15 de septiembre de 2026

- DEV frontend: http://localhost:4200
- DEV API: http://localhost:8081
- PROD API: https://api-store.solucionesmicaela.com
- `npm start` usa la configuración `development` de Angular y reemplaza `src/environments/environment.ts` por `src/environments/environment.development.ts`.
- `npm run build` usa la configuración `production` predeterminada y conserva `src/environments/environment.ts`. `STORE_API_CONFIG` es el único punto de configuración consumido por catálogo y administración; `mediaBaseUrl` permanece vacío para conservar las referencias `/images/...` existentes.

## Catálogo compacto — 15 de septiembre de 2026

- /productos deja de renderizar la fila de filtros bajo «Encuentra lo que necesitas». El header mantiene la navegación por categoría y TODOS; se conservan los filtros categoria/buscar por URL, los nombres de categoría y toda la lógica de cotización.
- Desde 1024 px: tres productos por fila, imágenes de 210 px de alto con contain y padding 12 px, gap vertical 18 px, márgenes de categoría/título/presentación reducidos y controles de 44 px intactos. Padding superior del catálogo 12 px, heading 4 px y contador 4/8 px. Sin cambios a Home, header, búsqueda, WhatsApp, admin ni backend.
- Verificación local con seis productos representativos y API interceptada: en 1276×1031 las dos filas completas terminan en y=931 px sin scroll; en 1440/1920×1031 terminan en y=936 px. Imágenes proporcionadas, sin overflow; tres auditorías axe sin infracciones. Navegación por categoría y TODOS comprobada; tests de catálogo actualizados para la navegación por URL en lugar de los filtros retirados. Evidencias ignoradas .tmp/catalog-compact-* y .tmp/check-catalog-compact.cjs.

## Home: proyectos compactos y contacto — 14 de septiembre de 2026

- La sección visual «¿Qué necesitas crear?» y sus seis tarjetas dejan de renderizarse en Home; el componente reutilizable, el header y el catálogo se conservan.
- Proyectos conserva las cinco muestras existentes (el pedido mencionaba cuatro), sus títulos y categorías. Desktop desde 1024 px usa siete columnas: principal de tres columnas y dos filas, cuatro muestras de dos columnas a su derecha; medios secundarios de 150 px, gap 24 × 20 px y padding de sección 36/40 px. Altura total comprobada: 672–680 px en 1276/1440/1920. Móvil apilado con medios de 210 px; tablet conserva dos columnas.
- HomeContact al final del main, después de ContactCta y antes del footer: mapa a la izquierda e información a la derecha desde 768 px; apilado debajo. Solo este bloque usa 957 173 688 y https://wa.me/51957173688. El número global y los contactos anteriores no cambian.
- Ubicación confirmada por el propietario el 15 de septiembre de 2026: Av. España Nº1520, Trujillo 13007. Google Maps identifica el negocio con ftid 0x91ad3db79e2849f1:0x307e6133cef0512e (CID decimal 3494337236029165870). El iframe usa https://www.google.com/maps?cid=3494337236029165870&output=embed, carga lazy, título accesible, ancho 100% y alto 260 px móvil / 300 px desktop. «Abrir en Maps» conserva el enlace completo suministrado por el propietario, en pestaña nueva con noopener noreferrer. Se retiró el aviso de ubicación pendiente. Sin formulario ni email; header y otras secciones intactos.
- Validación local: 91/91 tests, build correcto con tres rutas prerenderizadas; 375/430/768/1276/1440/1920 sin overflow horizontal, revisión visual y seis auditorías axe sin infracciones. Evidencias ignoradas en .tmp/home-contact-*, .tmp/home-projects-* y .tmp/check-home-contact.cjs. Sin commit, push ni deploy.

## Navegación pública y hero — 14 de septiembre de 2026

- Hero mobile: contenedor cuadrado con margen interior del 8%, piezas proporcionales y alturas naturales, sin scale ni recorte del contenedor. Home conserva solo el H1 y los dos enlaces del hero; Explorar productos abre /productos sin filtros (Todos). El bloque completo de Servicios deja de renderizarse en Home; el componente reutilizable se conserva.
- Header de dos niveles: franja navy con Inicio/Nosotros/Ubícanos; estos dos últimos se muestran como Próximamente, sin enlace mientras no exista destino real. No se inventan datos de ubicación.
- Desde 1200 px, hasta seis categorías públicas de ProductCatalog en el orden de la API y TODOS ocupan una cuadrícula central, seguidas de cotización y búsqueda. Categorías a 15 px/peso 600, con nombres completos en hasta dos líneas; franja superior a 13 px. Header con margen local de 32 px por lado, sin el antiguo límite de 1720 px; max-width global intacto. Bajo 1200 px, hamburguesa con enlaces superiores, categorías, Todos, búsqueda y cotización; franja superior oculta bajo 768 px y márgenes móviles de 16 px.
- Búsqueda global en la misma fila del header: reemplaza temporalmente las categorías, conserva TODOS e iconos, y Escape/lupa restauran la navegación. Sin botón de envío ni buscador duplicado en catálogo. Debounce de 250 ms: Home muestra coincidencias con enlace al producto; en catálogo actualiza buscar en la URL conservando categoria y reutiliza el filtrado existente. TODOS elimina filtros. Conversemos permanece retirado; WhatsApp flotante usa verde #25D366 (hover #1EBE5D), contactWhatsAppUrl y el número actual sin cambios.
- Hero conserva los tres assets independientes y las entradas arriba/izquierda/derecha (historial 357dcfc): 1800 ms, desplazamientos iniciales de 100/90/90 px y delays 0/120/240 ms. Las declaraciones de animation quedan fuera del media query para que Angular enlace los keyframes encapsulados correctamente; reduce los desactiva. Espera la carga de las tres imagenes; prefers-reduced-motion muestra el estado final. Verificado en 375/430/768/1276/1920 px, sin piezas recortadas ni overflow final; 90 tests y build correctos.

## Refinamiento del admin — 14 de septiembre de 2026

- Materiales y categorías administrativos se muestran alfabéticamente por nombre con el comparador español existente, sin campos ni textos de Orden. Se ordenan copias de las colecciones únicamente en estas vistas; al editar se conserva displayOrder y al crear se asigna 0 internamente. El orden público de categorías/Home permanece intacto, sin cambios de API ni esquema.
- Listados de materiales y categorías con filas y acciones compactas. El formulario de materiales muestra Nombre, Activo y Guardar/Cancelar.
- Upload inmediato: el único icono abre el selector y elegir un archivo válido inicia la subida, con loading en el mismo control. Sin preview temporal ni segundo paso de confirmación; se puede quitar la imagen al terminar. Se conservan JPG/PNG/WebP, 5 MB, tres imágenes, alt igual al nombre guardado y orden automático del backend.
- Galería administrativa con thumbnails de 128 × 96 px, estrella principal y Quitar, junto al control de upload; wrap natural en móvil.

## Simplificación UX/UI del catálogo y admin — 14 de septiembre de 2026

Trabajo exclusivamente frontend, local, sobre 39cdfec. Sin commit, push, deploy, cambios backend ni migraciones. Esta sección reemplaza las decisiones de interfaz anteriores sobre orden manual, dos descripciones, Extras y metadata de imágenes.

- Productos alfabéticos en catálogo público y listado administrativo mediante comparador compartido Intl.Collator('es'), sin distinguir mayúsculas/acentos y con orden numérico natural. Se ordena una copia de la respuesta completa actual; si la API incorpora paginación, trasladar el orden al servidor. Categorías y Home conservan su orden.
- Formulario con una sola Descripción visible. Al guardar, shortDescription se deriva de sus primeros 500 caracteres tras trim; description conserva el texto completo. Productos legacy sin description recuperan shortDescription en formulario y detalle. displayOrder permanece interno: se conserva al editar y se envía 0 al crear. Sin cambios de columnas.
- Extras fuera del V1 visible: retirado su editor administrativo y los selectores del detalle/configurador AREA. Materiales intactos. Modelos, endpoints y soporte de cotizaciones guardadas previamente se conservan; no se modifica WhatsApp ni se descartan extras de cotizaciones históricas.
- Upload compacto: seleccionar archivo, preview de 64px, flecha de upload de 44px, loading, refresco y limpieza del selector/blob. Alt automático igual al nombre del producto guardado. displayOrder se omite para usar el cálculo automático existente del backend; primera imagen solicita principal, las siguientes no. Conservados JPG/PNG/WebP, 5 MB y máximo tres.
- Tarjetas de imágenes: thumbnail, estrella principal y Quitar. Eliminados alt/order visibles, checkbox, badge y edición de metadata. Estrella con aria-pressed y nombre accesible por imagen; PATCH principal y refresco de GET existentes, sin recarga de página. Producto destacado también usa estrella en listado; Publicar/Despublicar mantiene su control independiente.
- Galería: puntos de 8px sin cápsula, botones de 24×32px juntos, centrados al pie, doble contraste claro/oscuro. Visor centrado de min(75vw,1000px) por 75dvh; móvil hasta 520px usa 94vw. Flechas sin círculos, área de 48×56px. Conservados contain, contador, puntos, teclado, Escape, X, backdrop y foco.

Validación: npx ng test --watch=false: 80/80 tests en 20 archivos. npm run build correcto, sin warnings, tres rutas prerenderizadas. Edge headless local con API/media interceptadas: 360/390/768/1024/1440/1920 sin overflow; ocho auditorías axe sin infracciones en catálogo/visor/fallback/admin a 390/1440. Verificados dimensiones, puntos transparentes, flechas sin bordes, foco, Escape/X/backdrop, preview/upload, tres imágenes, estrella principal y quitar. Tests HTTP cubren orden alfabético, estrella destacado/publicación independiente, descripción única/legacy y compatibilidad de campos. No prueba contra producción ni certificación integral WCAG. Evidencias ignoradas: .tmp/ux-tests.log, ux-build.log, ux-gallery-browser.json, check-ux-gallery.cjs y ux-gallery-*.png.

## Upload y galería de producto — 14 de septiembre de 2026

Trabajo LOCAL, sin commit, push, deploy ni acceso a producción. Ambos repositorios estaban limpios al comenzar; el cambio de API de producción ya estaba versionado en 14fb9fb. STORE_API_CONFIG.baseUrl sigue en https://api-store.solucionesmicaela.com y mediaBaseUrl sigue vacío. El estado de producción comunicado por el propietario reemplaza las referencias históricas a API solo local; la nueva funcionalidad de esta sección todavía NO se ha desplegado.

Admin ProductResources: flujo principal seleccionar archivo desde PC, preview blob temporal (URL revocada al cambiar/cancelar/subir/destruir), JPG/JPEG/PNG/WebP, hasta 5 MiB (5 MB en UI), error local de tipo/extensión/vacío/tamaño. Máximo tres imágenes activas incluyendo legacy; selector/upload se deshabilitan al alcanzar el máximo. AltText, orden opcional automático y principal. Tarjetas con thumbnail/fallback, alt, orden, badge Principal, Hacer principal, Editar metadata y Quitar. Después de mutación se refresca GET de imágenes sin recargar página; muestra errores/confirmación y permite reintentar la actualización si la escritura terminó pero falló la lectura. No URL manual en el flujo visible; imágenes antiguas pueden editar metadata conservando su referencia.

AdminApi incorpora POST /api/admin/products/{pid}/images/upload con FormData (file, altText, displayOrder opcional, primaryImage), GET /images, PATCH /images/{id}/primary y POST /images/{id}/remove (204). Mantiene interceptor Bearer existente, sin Content-Type manual en multipart. El backend aplica límite transaccional de tres incluso con concurrencia y con POST manual; es la autoridad.

Backend local: V4 agrega active/storage_key, baja lógica y cleanup de archivos administrados; primera imagen sin principal se vuelve principal, principal nueva desmarca anterior y baja de principal promueve primera por orden. MEDIA_STORAGE_PATH/products/{id}/{uuid}.jpg|png|webp; producción usa /opt/miqa-store/media. URL absoluta de MEDIA_BASE_URL=https://api-store.solucionesmicaela.com/media. Se conservan /images/products/... y /images/hero/... sin anteponer base de medios, migrar ni intentar borrar archivos frontend. No conversión a WebP, blobs en DB ni servicio externo.

Modelos Product/FeaturedProduct admiten images con id/url/altText/primaryImage/displayOrder. Mapper conserva metadata y URLs legacy/absolutas. productImages prioriza principal, luego displayOrder/id, elimina URLs duplicadas y limita a tres; admite respuestas antiguas image/gallery. shared/product-images contiene ProductImageGallery, ProductImageLightbox y ProductImageView con fallback sin icono roto.

Tarjetas de /productos, destacados de Home y detalle usan la galería compartida. Una imagen no muestra puntos; dos/tres muestran botones centrados dentro de la zona inferior, con aria-label y aria-pressed. Sin autoplay ni swipe. Click en imagen abre visor, no navega ni agrega a cotización; el título de catálogo sigue enlazando al detalle. Se conservan dimensiones, proporciones, padding/escala de destacados y max-width.

Visor: dialog nativo en top layer, fondo oscuro, imagen contain, anterior/siguiente/puntos/contador; flechas de teclado, Escape, X y backdrop. No cierra al pulsar imagen. Foco inicial en X, contención nativa, restauración al disparador y restauración de overflow al cerrar/destruir. Renderizado browser-only de showModal mediante afterNextRender. No Angular Material, dependencias nuevas, cambios a WhatsApp, cotización, rutas, categorías, seed, SEO ni diseño global.

Validación: npx ng test --watch=false, 75/75 tests en 20 archivos; npm run build correcto, sin advertencias, bundles browser/server y tres rutas prerenderizadas. Backend: 45 tests aprobados y package Java 21. Edge headless con build local, respuestas API/media interceptadas y sesión ficticia que nunca sale a producción: seis anchos 360/390/768/1024/1440/1920 sin overflow; ocho auditorías axe sin infracciones (catálogo, visor, fallback y admin a 390/1440). Verificados teclado/foco, navegación del detalle, preview de archivo real local, multipart simulado, máximo tres, refresco, principal y quitar; sin errores JavaScript. No certificación integral de WCAG ni validación contra API productiva.

Evidencias ignoradas: .tmp/image-gallery-tests.log, image-gallery-build.log, image-gallery-browser.json, check-image-gallery.cjs y image-gallery-*.png. Ningún mock se agregó a producción. Nginx/media productivos no se modificaron. La entrega física local requiere configurar un servidor de media y MEDIA_BASE_URL; la prueba de navegador utiliza interceptación, mientras los tests backend prueban HTTP, PostgreSQL y escritura real en storage temporal.


## Cierre de versionado local ? 13 de septiembre de 2026

Cierre Git LOCAL: se conserva main y origin existente. Store API ya estaba versionada en 67502d7; el commit de esta etapa incluye solamente el panel administrativo y cambios/documentaci?n pendientes. Validaci?n: 61 tests, build correcto y tres rutas prerenderizadas. Sin push, deploy ni cambios funcionales nuevos durante el cierre.


## Panel administrativo local completado — 13 de septiembre de 2026

Estado vigente para administración. Esta sección reemplaza las referencias históricas a ausencia de admin y a categorías públicas cacheadas permanentemente. No se rediseñó Home ni catálogo, no se modificó QuoteStore y no se hizo commit/push/deploy, ni cambios en ERP, Cloudflare o producción.

Al retomar tras el límite de créditos ya existían la API admin, JWT/BCrypt, migración V3, las seis rutas Angular, formularios, subrecursos y tests. También existía la corrección para no registrar credenciales en logs. Quedaban la documentación frontend y la última validación del paquete corregido. Se conservaron todos los archivos y migraciones; no se reconstruyó el panel.

Rutas lazy, standalone y con RenderMode.Client:
- /admin/login: login y errores, autocomplete adecuado, sin Header/Footer público.
- /admin: resumen de productos totales/publicados/destacados y categorías activas, calculado con endpoints existentes.
- /admin/productos: listado responsive, búsqueda con debounce 300 ms, categoría, published y featured; acciones publicar/despublicar/destacar/quitar destacado.
- /admin/productos/nuevo y /admin/productos/:id/editar: nombre, slug editable/sugerido solo hasta edición manual, categoría, descripciones, QUANTITY/PACK/AREA, unidades, presentación, mínimos/paso, orden, visibilidad y SEO.
- /admin/categorias: alta/edición inline, nombre/slug/descripción/orden y estado activo.

Layout desktop sidebar + contenido; móvil navegación colapsable en flujo, sin tabla ancha. Componentes principales en src/app/features/admin: AdminLogin, AdminLayout, AdminSummary, AdminProductList, AdminProductForm, AdminCategories, ProductResources y OptionEditor. No Angular Material ni librerías visuales nuevas.

AdminApi concentra las llamadas HTTP y usa STORE_API_CONFIG.baseUrl = http://127.0.0.1:8081. El catálogo público conserva ProductCatalog/CatalogApiService: categorías se vuelven a consultar al visitar la vista para reflejar administración sin una caché permanente. Productos/detalles ya consultaban API. No mocks en producción ni dependencia admin → fixtures. El parámetro category administrativo representa ID; el público sigue usando slug.

AdminAuth encapsula token, login/logout/me y localStorage miqa.admin.session.v1 con guard isPlatformBrowser. Interceptor agrega Bearer solo al prefijo /api/admin/ de la API configurada, nunca a terceros o /api/public; 401 borra sesión y redirige al login. Guard de padre/hijos valida sesión con /auth/me. No se guardan contraseñas. localStorage permite persistir la sesión pero es accesible ante XSS; antes de producción revisar CSP, política de expiración y alternativa cookie HttpOnly/BFF con CSRF. Logout local no revoca un JWT copiado hasta expirar; backend verifica también usuario activo en cada solicitud.

Backend D:\MIQA-STORE\miqa-store-backend: Spring Security, JWT HS256 con clave base64 de al menos 32 bytes, issuer/audience, expiración configurable (PT1H por defecto), BCrypt cost 12 y límite local de cinco fallos de login por minuto/usuario. /api/admin/** protegido salvo POST /auth/login; GET /api/public/** abierto. CORS permite exactamente http://localhost:4200, incluido Authorization. Endpoints completos y variables documentados en README/PROJECT_CONTEXT del backend.

Formulario PACK exige packSize/packLabel; QUANTITY y AREA envían ambos null. Se avisa que guardar otro tipo eliminará presentación PACK; lo escrito se conserva hasta guardar o volver a PACK y se limpia tras guardar otro tipo. UI y backend validan cantidades, orden, longitudes, requeridos y slug; DB garantiza unicidad. Opciones permiten agregar/editar nombre, estado y orden. Imagen permite URL/path, altText, orden, principal y preview. Solo referencias: no upload físico; media futura en VPS mediante MEDIA_STORAGE_PATH/MEDIA_BASE_URL, independiente de Angular. Referencias /images/... del seed y validación son TEMPORALES.

SSR/build: /admin y /admin/** se resuelven en cliente, sin prerender de sesión ni HTTP admin en build. Catálogo y detalle mantienen su estrategia y noindex; admin establece noindex,nofollow. Sitemap/Cloudflare intactos. SEO de producto se almacena/administra, sin activar indexación pública.

Validación al retomar: 61/61 tests frontend en 18 archivos, 26/26 backend sin omitidos. npm.cmd run build correcto, bundles browser/server y tres rutas públicas prerenderizadas (/ /productos /proyectos); comprobado con API apagada. Maven test/package Java 21 correctos, Flyway V1/V2/V3 y Hibernate validate. Tests HTTP frontend no requieren backend real: login, guard, interceptor por origen, 401, creación/edición, slug manual, PACK/AREA, categorías y regresiones de catálogo/cotización.

Para usar el panel (terminales separadas):

```powershell
cd D:\MIQA-STORE\miqa-store-backend
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\Start-LocalAdmin.ps1 -Username miqa-local
# Elegir contraseña LOCAL de al menos 12 caracteres en el prompt seguro.

cd D:\MIQA-STORE\miqa-store-frontend
npm.cmd start -- --host localhost --port 4200
# Abrir http://localhost:4200/admin/login
```

El helper genera/reutiliza .local/admin-jwt.key (ignorado) y carga PostgreSQL aislado 127.0.0.1:55432 / miqa_store_db. LocalAdminBootstrap solo se ejecuta con perfil local y tabla admin_users vacía; no cambia contraseñas existentes. Tests usan exclusivamente miqa_store_test_db. ADMIN_JWT_SECRET es obligatorio para arrancar sin helper; ADMIN_JWT_EXPIRATION opcional. ADMIN_BOOTSTRAP_USERNAME/PASSWORD solo para primera cuenta local. No contraseñas predeterminadas ni de producción.

Deuda antes de producción: TLS/proxy VPS, API URL y CORS reales, secretos nuevos/rotación, provisión del primer admin de producción, restricciones de acceso a claves locales, rate limiting persistente/proxy, CSP y política de sesión, backup/permisos DB. Listados sin paginación, sin versión optimista ni historial de auditoría y sin guard global de cambios sin guardar. Upload, entrega /media, recuperación de contraseña, roles complejos, analítica, pedidos/pagos y ERP permanecen excluidos.



## Integración local Store API — 13 de septiembre de 2026

Esta es la fuente vigente para el catálogo y reemplaza las referencias históricas a LocalProductCatalog/mocks y a ocho rutas prerenderizadas. Trabajo LOCAL, sin commit, push, deploy, cambios en Cloudflare/ERP/producción ni modificaciones del backend. Al comenzar, frontend estaba limpio en b8d6387.

- ProductCatalog resuelve CatalogApiService (HttpClient con withFetch). STORE_API_CONFIG en src/app/core/config/store-api.ts centraliza baseUrl = http://127.0.0.1:8081 y mediaBaseUrl vacío. Se puede sustituir el token mediante providers cuando se autorice otro entorno; https://api-store.solucionesmicaela.com es solo la arquitectura futura, NO está configurado para producción.
- Backend existente: D:\MIQA-STORE\miqa-store-backend, Spring Boot/Java 21 y PostgreSQL aislado en 127.0.0.1:55432, miqa_store_db. No hubo incompatibilidades que requirieran cambios backend. Su documento histórico aún describe Angular desconectado; esta sección registra la integración actual sin modificar ese proyecto.
- GET /api/public/categories mantiene orden del backend y añade Todos solo en UI; categorías compartidas en memoria, errores recuperables. GET /api/public/products envía category/search/featured; búsqueda 300 ms debounce, trim, cancelación con switchMap y máximo 120 caracteres conforme al contrato. La búsqueda sigue la semántica del servidor: case-insensitive, acentos significativos. GET /api/public/products/{slug} trae detalles; solo HTTP 404 representa producto no disponible, los demás errores permiten Reintentar. Timeout HTTP de 8 segundos. Sin fallback a mocks.
- Mapper centralizado normaliza IDs a string, opcionales null a undefined/arrays vacíos, categoría y opciones. URLs de imágenes HTTP(S) absolutas se conservan; referencias relativas pueden resolverse con mediaBaseUrl. /images/... del seed siguen siendo referencias TEMPORALES servidas por Angular; arquitectura definitiva de media en VPS propio, sin upload ni proveedores externos implementados.
- products.mock.ts permanece claramente marcado TEST FIXTURE ONLY, importado exclusivamente por tests y testing/catalog.fixture.ts. Ni ProductCatalog, rutas server, catálogo ni detalle lo importan. Los ejemplos comerciales de Featured Products en Home no forman parte de este cambio.
- UX/CSS aprobados intactos: chips, cards, PACK/QUANTITY rápidos, AREA modal, detalle, panel desde 1280 y drawer. Estados discretos loading/error/empty, reintentos sin recargar página, imágenes ausentes sin ngSrc vacío. Primeras seis imágenes con prioridad de carga para cubrir filas visibles y evitar NG02955. No se cambió tamaño, imagen, copy comercial ni WhatsApp.
- QuoteStore conserva cantidades, identidad/agrupación y mensajes. La restauración asíncrona revalida con catálogo completo; conserva datos guardados durante carga/error y combina nuevas adiciones una sola vez. Vaciar invalida una respuesta pendiente para que no reaparezcan artículos.

SSR/prerender: el servicio espera afterNextRender antes de hacer HTTP, nunca consulta API durante render de servidor ni antes de hidratación. /productos prerenderiza una estructura de carga con noindex,follow; /productos/:slug usa RenderMode.Client y no enumera slugs ni consulta DB en build. / y /proyectos conservan prerender. Tres rutas estáticas, bundles browser/server generados. Detalle aplica noindex,follow al ejecutarse el cliente; al ser CSR no entrega HTML de ficha ni un HTTP 404 de documento (el 404 corresponde a API y estado amigable de la app). Cloudflare Static Assets, sitemap y Search Console intactos. No desplegar esta configuración local sin una tarea posterior que configure API/CORS de producción.

Validación: 52/52 tests en 16 archivos, incluyendo HttpTestingController (categorías, filtros combinados con featured true/false, DTO/null/media, detalle, 404/500, loading/error/retry/empty, debounce/cancelación y producto exclusivo de respuesta HTTP), regresiones de cotización y restauración tardía. npm.cmd run build correcto sin warnings, primero comprobado con API 8081 apagada: tres rutas prerenderizadas. Tests frontend no requieren backend real. Maven no se reejecutó: backend no cambió.

Prueba integrada: helper de PostgreSQL reconoció clúster existente; JAR Java 21 arrancó en 127.0.0.1:8081. Angular en http://localhost:4200 (usar localhost, NO 127.0.0.1:4200: CORS backend local autoriza exactamente localhost:4200). Edge confirmó seis categorías/cinco productos reales, categoría imprenta-papeleria y búsqueda tarjetas vía Network, cinco detalles, materiales/extras, PACK/QUANTITY/AREA, agregación, persistencia al recargar, panel/drawer, enlace WhatsApp con cinco líneas y reintento tras bloqueo de API. Se inspeccionó el href/mensaje; no se envió ningún mensaje externo. 404 desconocido permanece en la app. Sin errores inesperados de consola; errores provocados por la prueba de indisponibilidad se registran aparte.

Responsive de catálogo: 360/390/430/768/1024/1440/1920, sin overflow de documento ni imágenes rotas, panel únicamente desde 1280. Cinco detalles sin overflow a 390. Axe: cero infracciones en catálogo a 390/1440; no es certificación total de accesibilidad. Capturas de catálogo desktop/mobile y drawer revisadas. Evidencias locales ignoradas en .tmp/check-api.cjs, api-browser-check.json, api-catalog-390.png, api-catalog-1440.png, api-quote-desktop.png, api-quote-mobile.png, api-tests.log y api-build.log.

Para repetir (terminales separadas):

```powershell
# Terminal backend; política solo para esta sesión si bloquea los helpers revisados.
cd D:\MIQA-STORE\miqa-store-backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\Start-LocalPostgres.ps1
.\scripts\Use-LocalDatabase.ps1
$env:JAVA_HOME = (Resolve-Path '.tmp\jdk21\jdk-21.0.12.1+1').Path
& "$env:JAVA_HOME\bin\java.exe" -jar target/miqa-store-backend-0.0.1-SNAPSHOT.jar

# Terminal frontend
cd D:\MIQA-STORE\miqa-store-frontend
npm.cmd start -- --host localhost --port 4200
# Abrir http://localhost:4200/productos

# Validación frontend sin backend
npm.cmd test -- --watch=false
npm.cmd run build
```

Al finalizar esta integración se dejan los procesos locales de API/frontend y PostgreSQL disponibles para revisión. Si ya están escuchando, no arrancar otra instancia. Revisión del propietario: chips y búsqueda, cantidades y agrupación, AREA con material/extras, detalle por slug y cotización en móvil/desktop. Base localhost solo sirve desde este PC; no se configuró acceso LAN/celular real ni producción.



## Agrupación de cotización y Hero compacto — 12 de septiembre de 2026

Trabajo LOCAL sin commit, push ni deploy. Se conservaron los cambios pendientes anteriores; no se modificaron Cloudflare, backend, SEO/indexación ni otras secciones de Home. Esta actualización reemplaza la decisión histórica de mantener cada agregado como una línea independiente.

- Identidad centralizada en `core/quote/quote-utils.ts`, `getQuoteItemIdentity`: serialización JSON de productId, saleType, unidad/presentación, material por id, extras por ids únicos ordenados, ancho/alto originales para AREA y notas recortadas en extremos. No utiliza cantidad, id de fila, nombre del producto ni área redondeada como identificador único; conserva tamaño y etiqueta de la presentación como parte de la configuración. Las notas distintas y las medidas/materiales/extras distintos mantienen líneas separadas; el orden de selección de extras no crea diferencias.
- `mergeQuoteItems` agrupa conservando orden e id de la primera línea y sumando cantidades con protección contra desbordamiento de enteros. QuoteStore la usa al agregar y al restaurar localStorage, consolidando también duplicados guardados de etapas anteriores. El agregado valida la cantidad acumulada con las reglas del producto. No se duplicó lógica en cards, detalle, panel ni drawer.
- Badge de Header, panel y drawer siguen contando **líneas/configuraciones distintas**, nunca la suma de unidades, millares o piezas. El mensaje de WhatsApp refleja la cantidad acumulada; AREA muestra área por pieza y cantidad de piezas cuando supera una.
- Al acumular: misma fila, confirmación «[producto]: actualizado en tu cotización.» y highlight suave `#e9fafa` con acento cyan durante 1000 ms en panel/drawer. Sin apertura automática ni movimiento de scroll. Temporizadores reiniciables y liberados al destruir el store. El highlight no añade animación de movimiento; el toast conserva 3500 ms.
- Hero: nuevo H1 «Tu marca, nuestro compromiso.» con salto tras la coma y punto cyan. Se permite ajuste natural de líneas en móvil. Se conservaron copy secundario, CTAs, composición de los tres assets y superficies. No se tocó el lema del Footer, que es otra sección.
- Hero mobile: contenedor cuadrado con margen interior del 8%, piezas proporcionales y alturas naturales, sin scale ni recorte del contenedor. Home conserva solo el H1 y los dos enlaces del hero; Explorar productos abre /productos sin filtros (Todos). El bloque completo de Servicios deja de renderizarse en Home; el componente reutilizable se conserva.
- Las tres animaciones de entrada existentes pasan de 700 a **1400 ms**, conservando delays de 0/120/240 ms. El texto no tenía animación de entrada; no se agregó una nueva. `prefers-reduced-motion` mantiene las imágenes sin animación, verificado en navegador.

Validación: 41/41 pruebas, 13 archivos; build sin warnings, ocho rutas prerenderizadas. Tests de acumulación PACK/QUANTITY/AREA, configuraciones distintas (medidas/material/extras/notas), identidad por saleType, persistencia/migración, id estable, conteo de líneas, eliminación/updateQuantity, mensaje WhatsApp, expiración de highlight y protección numérica. Test de Home actualizado al nuevo H1; metadata intacta. Edge local en los siete anchos solicitados, sin overflow horizontal ni errores de consola. Agregado triple de Volantes y Roll Up: dos filas con cantidades 3 y badge 2; AREA idéntica acumula dos piezas y medidas/material distintos crean otras filas. Highlight desaparece tras un segundo. Axe sin infracciones en Hero a 390/1440 y catálogo con cotización. Evidencias y script ignorados en `.tmp/hero-compact-*`, `.tmp/quote-merged.png`, `.tmp/hero-merge-check.json` y `.tmp/check-hero-merge.cjs`.

Revisión visual pendiente del propietario: salto de línea del nuevo H1 en móvil, composición visible al cargar, ritmo más pausado de entrada y highlight al repetir un producto.

## Catálogo denso y panel persistente — 12 de septiembre de 2026

Etapa exclusivamente LOCAL, sin commit/push/deploy ni cambios en Cloudflare, backend, SEO/indexación o Home. Esta sección reemplaza los tamaños y controles de catálogo descritos en la etapa anterior; los cambios pendientes anteriores siguen conservados.

- Desde 1280 px, `/productos` usa layout real `3fr 1fr`, separación 24 px: aproximadamente 75% catálogo y 25% cotización, dentro del max-width aprobado de 1320 px. Se eligen **tres columnas de productos** para conservar legibilidad. A 1024 px hay tres columnas sin panel; desde 600 px hay dos; móvil una. Chips conservados, desplazables horizontalmente, controles táctiles de catálogo de al menos 44 px.
- Nuevo `core/quote/quote-panel/quote-panel.{ts,html,scss}`: sección etiquetada dentro del main, ligera, sin overlay. Sticky a 112 px (Header desktop termina a 97 px), altura máxima `100dvh - 128px`, listado con scroll interno y acciones visibles. Usa exclusivamente QuoteStore y describeQuoteItem existentes; muestra líneas, presentaciones, medidas/área, material, extras/notas y permite cambiar cantidad, eliminar, vaciar y WhatsApp. Se oculta mediante CSS bajo 1280 px, sin introducir divergencias de hidratación. Header sigue abriendo el drawer explícitamente en todos los tamaños; ambos consumen el mismo estado.
- Cards: eliminados descripción corta, equivalencia, «Por m²» y «Ver detalles». Imagen y nombre son enlaces accesibles al detalle. PACK muestra «1 millar»; QUANTITY «Por unidad»; cantidad y Agregar comparten fila compacta con botón de ancho natural. AREA conserva solo Configurar como acción, con el mismo modal/sheet existente. Se mantienen mínimos/pasos, filtros y cantidades. No hay apertura automática ni cambios al store, toast o mensaje WhatsApp.
- Cabecera, separaciones y cards más compactas. Imágenes 4:3 y contain; no se cambiaron archivos de imagen. Detalle conserva estructura/copy/configurador; imagen un 20% más baja (256/344/464 px según breakpoint, antes 320/430/580), título máximo 46 px antes 58, menor padding y espacios, controles de al menos 44 px y textarea de dos filas. La reducción proviene de CSS real, sin escalar la página.
- Tests de integración actualizados: agregado PACK/QUANTITY actualiza panel y contador; cantidad/eliminación del panel actualizan el mismo QuoteStore y mensaje; navegación desde imagen/nombre; AREA mantiene validación/modal y agregado sin drawer.

Validación: 36/36 tests en 13 archivos; build correcto sin warnings y ocho rutas prerenderizadas. Edge local en 360, 390, 430, 768, 1024, 1440 y 1920 px: sin overflow horizontal, controles en una fila, panel solo en desktop ancho, sticky bajo Header, operaciones del panel y WhatsApp correctos; modal mantiene foco/scroll y no abre drawer al agregar. Sin errores de consola. Axe sin infracciones en catálogo con panel/configurador y detalles PACK/AREA revisados a 390/1440 px, tras corregir el landmark del panel dentro de main. Evidencias ignoradas en `.tmp/panel-*`, `.tmp/compact-*` y scripts `.tmp/check-panel*.cjs`.

Revisión del propietario: equilibrio 75/25 y tres columnas, panel vacío/con productos, densidad de controles y detalle más compacto. En pantallas de poca altura y en móvil el detalle AREA sigue requiriendo scroll; no se ocultaron campos para forzarlo en un viewport.

## Descubrimiento y cotización rápida — 12 de septiembre de 2026

Actualización LOCAL sobre el catálogo anterior, sin commit, push ni deploy. No se cambió Cloudflare, backend, SEO/indexación, datos de productos ni Home. Los cambios pendientes de la etapa anterior se conservaron.

- `/productos` presenta una cabecera compacta: «PRODUCTOS MIQA», «Encuentra lo que necesitas.» y «Configura tus productos y reúne todo en una sola cotización.». Buscador compacto, al lado en desktop. Se conserva el ancho máximo global de 1320 px.
- Filtro de categoría mediante siete botones/chips visibles (Todos y las seis categorías), con `aria-pressed`, navegación por teclado y scroll horizontal en móvil. Cambia el query `categoria` sin recargar y conserva búsqueda y cantidades seleccionadas. No hay select.
- Grid de una columna móvil, dos desde 600 px, tres desde 1024 px y cuatro desde 1280 px. Imágenes 4:3 con contain. Cabecera, separaciones, imágenes y tipografía de cards más compactas; imágenes de la primera fila comienzan aproximadamente a 343–351 px en desktop probado.
- PACK y QUANTITY se agregan desde la card: cantidad con mínimo/paso, presentación/unidad, equivalencia en unidades y enlace secundario «Ver detalles». Se reutiliza la validación de `quote-utils.ts`; no se inventan precios.
- AREA muestra «Por m²» y «Configurar». Nuevo componente `features/products/area-configurator/area-configurator.{ts,html,scss}`: dialog nativo sobre catálogo, formulario reactivo de medidas/material/extras/notas y cálculo de área. Comparte validación/modelo con detalle mediante `createQuoteItem` y `calculateArea`. No navega ni cambia filtros; al agregar o cerrar devuelve el foco al disparador sin desplazarlo. Escape y backdrop cierran; foco contenido por dialog modal, bloqueo/restauración del scroll; en móvil se presenta como sheet al borde inferior.
- Cambio deliberado del contrato de `QuoteStore.addItem`: agrega/persiste y emite confirmación temporal; **ya no abre QuoteDrawer**. Aplica tanto a cards/modal como a `/productos/:slug`. El drawer se abre explícitamente desde Header; conserva sus operaciones y WhatsApp. Confirmación global con `role=status`, sin capturar foco ni clics, visible durante 3.5 segundos; cada agregado reinicia el temporizador y este se limpia al destruir el store. El contador continúa contando líneas configuradas.
- Tests nuevos en `features/products/quick-quote.spec.ts`: chips y búsqueda conservada, PACK/QUANTITY desde cards, contador y apertura explícita, modal AREA/validación/mensaje/cierre, ausencia de navegación y drawer cerrado tras agregar. Se actualizaron las expectativas existentes del drawer y del título del catálogo.

Validación: 35/35 pruebas, 13 archivos; build correcto sin warnings, ocho rutas prerenderizadas. Edge local en 360, 390, 430, 768, 1024, 1440 y 1920 px: sin overflow horizontal ni errores de consola, agregado consecutivo de PACK/QUANTITY/AREA, contador 3, drawer cerrado tras agregar, mensaje WhatsApp completo, Escape, foco restaurado, posición de scroll idéntica antes/después del configurador en los siete anchos y confirmación que desaparece. Axe-core sin infracciones detectadas en catálogo/configurador a 390 y 1440 px. Scripts, capturas y resultados en `.tmp/quick-*` y `.tmp/check-quick.cjs`, ignorados. Revisar visualmente densidad de cards, scroll de chips, sheet móvil y fotografías referenciales ya documentadas de Vinil/Banner.

## Catálogo y cotizador local — 12 de septiembre de 2026

Etapa implementada únicamente en el frontend local, sobre el commit `4167479`. Sin commit, push ni deploy. Esta sección reemplaza las referencias históricas a `/productos` como página provisional y al cotizador como trabajo futuro. Producción no ha cambiado. Cloudflare, verificación de Google, teléfono centralizado, assets originales y diseño de las secciones de Home se conservan.

- Modelos en `shared/models/product.ts` y `quote-item.ts`: productos QUANTITY, PACK y AREA, categorías, materiales exclusivos, extras múltiples y configuración de cotización.
- `core/data/products.mock.ts`: cinco productos publicados de ejemplo (Tarjetas personales, Volantes A5, Roll Up, Vinil impreso y Banner), sin precios. Se reutilizan imágenes existentes; Vinil y Banner comparten la referencia de impresión, pendiente de fotografía específica. Las seis categorías mantienen los slugs de Home; las categorías sin mocks muestran un estado vacío.
- `ProductCatalog` en `core/data/product-catalog.ts` es el contrato inyectable con `list()`, `findBySlug()` y `categories()`, mediante Observables. `LocalProductCatalog` es el proveedor actual. Una implementación HTTP puede reemplazarlo para Spring Boot sin acoplar las vistas al origen mock. Hay estados de carga/error en las vistas. No existe conexión a backend.
- `/productos` usa un shell propio con Header/Footer y catálogo lazy: búsqueda por nombre sin distinguir acentos/mayúsculas, filtro por query `categoria` y cards responsive. `/productos/:slug` configura cantidad, paquetes o medidas según el producto. Slugs actuales: `tarjetas-personales`, `volantes-a5`, `roll-up`, `vinil-impreso`, `banner`. Un slug desconocido muestra producto no disponible.
- Formularios reactivos: cantidades enteras con mínimo/paso del producto; PACK muestra equivalencia en unidades; AREA exige ancho/alto positivos (mínimo 0.01 m) y material cuando corresponde. Área calculada sin redondear en el modelo, presentada con dos decimales. Extras con checkbox, materiales con radio y notas opcionales hasta 1000 caracteres. El drawer permite variar cantidad de piezas de una misma medida; el área indicada es por pieza.
- `core/quote/quote-store.ts` usa signals para agregar, eliminar, cambiar cantidad, vaciar y abrir/cerrar. El contador indica líneas configuradas, no suma unidades incompatibles. Cada agregado crea una línea independiente. Persistencia bajo `miqa.quote.v1`, protegida por plataforma y restaurada después de hidratación. Los datos guardados se revalidan contra productos/opciones actuales; se ignoran productos inexistentes y configuraciones inválidas. Fallos de almacenamiento muestran aviso y permiten seguir en memoria.
- `quote-utils.ts` concentra validación, cálculo y mensaje multilínea. WhatsApp reutiliza exclusivamente `core/config/whatsapp.ts`, sin duplicar el teléfono. El mensaje incluye productos, cantidades/presentaciones, medidas/área, material, extras y notas. No hay precios, pagos ni checkout.
- Drawer global en App: dialog nativo derecho, modal, foco inicial/cierre con Escape y retorno del foco, scroll del documento bloqueado mientras abre. Casi todo el ancho en móvil; 520 px máximo en desktop. Header incorpora botón/contador y enlace al catálogo. Las secciones aprobadas de Home no se rediseñaron.
- Prerender explícito de los cinco productos publicados más `/`, `/productos` y `/proyectos`: ocho rutas. Slugs no prerenderizados usan fallback cliente. SEO de detalles mediante `Seo.applyPage`; catálogo/detalles conservan `noindex,follow` por tratarse de datos mock en etapa local. Antes de publicar un catálogo real, revisar indexación/sitemap y metadata. `/proyectos` continúa provisional.

Validaciones de esta etapa: 32/32 tests en 12 archivos; `npm run build` correcto, ocho rutas prerenderizadas y sin warnings. Pruebas cubren m², validación por tipo, mensaje WhatsApp, operaciones del store, restauración/revalidación, almacenamiento corrupto/bloqueado, protección SSR, filtros, cambios de slug y cierre modal con Escape. Edge local sobre el servidor Node generado: catálogo, detalle AREA, drawer y Home en 360, 390, 430, 768, 1024, 1440 y 1920 px, sin overflow horizontal ni errores de consola; agregado, mensaje codificado, recarga/persistencia y cierre comprobados. Axe-core 4.10.3 (temporal, sin instalar dependencia) sin infracciones WCAG 2 A/AA y 2.1 AA en catálogo, detalles PACK/QUANTITY/AREA y drawer a 390/1440 px. Evidencias y scripts locales en `.tmp`, ignorado por Git. No se envió ningún mensaje real por WhatsApp.

Revisión visual pendiente del propietario: catálogo, configurador y drawer; especialmente las imágenes referenciales de Vinil/Banner y categorías todavía sin productos mock. La siguiente etapa puede sustituir el proveedor local por API, conservando modelos y consumidores; deberá revisar también la estrategia de prerender y sincronización de la cotización si la carga pasa a ser remota.

Contexto previo: 11 de septiembre de 2026. Las secciones siguientes conservan las decisiones y validaciones de etapas anteriores, sujetas a las actualizaciones indicadas arriba. Este documento es la fuente principal de contexto de producto/diseño; distingue implementación existente de requisitos futuros. Las rutas de archivos son relativas a la raíz del frontend salvo indicación contraria.

## Favicon y SEO técnico de producción

Dominio canónico: https://store.solucionesmicaela.com. Custom Domain activo y producción operativa según el propietario. Esta sección reemplaza los pendientes históricos de favicon/canonical/metadata y activación del dominio. No hubo push ni despliegue en esta tarea.

SEO centralizado en `src/app/core/seo/seo.ts`, aplicado por los tres componentes de página tanto en SSR/prerender como al navegar en cliente. `src/index.html` contiene los valores base de Home y los enlaces a iconos; el servicio actualiza etiquetas existentes sin duplicarlas. No se deriva canonical del hostname de la petición: workers.dev nunca es canónico.

| Ruta | Title | Description | Canonical | Robots |
| --- | --- | --- | --- | --- |
| / | MIQA \| Impresión, publicidad y soluciones gráficas | Impresión, letreros publicitarios, merchandising, señalética y soluciones gráficas para hacer visible tu marca. | https://store.solucionesmicaela.com/ | index,follow |
| /productos | Productos \| MIQA | Explora las soluciones de impresión, publicidad, señalética, merchandising y producción gráfica de MIQA. | https://store.solucionesmicaela.com/productos | noindex,follow |
| /proyectos | Proyectos \| MIQA | Conoce proyectos de impresión, señalética, letreros e implementación desarrollados por MIQA. | https://store.solucionesmicaela.com/proyectos | noindex,follow |

Decisión explicada antes de implementar: páginas de catálogo/portafolio todavía son avisos de preparación; noindex temporal evita indexar ese contenido provisional. Home sigue indexable. `public/robots.txt` permite rastreo de toda la web y declara sitemap; no bloquea páginas noindex ni assets. `public/sitemap.xml` es XML válido y contiene solo Home, sin lastmod inventado.

Open Graph por ruta: title, description, type website y URL canónica. Twitter/X: summary, title y description, sin cuentas sociales. `og:image` pendiente: no existe un asset social adecuado 1200x630; no se compuso ni deformó un logo. JSON-LD Organization con nombre MIQA, URL de producción y logo horizontal original; sin teléfono temporal, dirección, horarios, redes, ratings ni datos inventados. Se conserva lang es, UTF-8 y viewport.

Favicons derivados exclusivamente de `public/images/brand/miqa-logo2.png`, manteniendo proporción y canal alfa, sin modificar el original: `public/favicon.ico` (16/32/48px), `public/favicon-96x96.png` y `public/apple-touch-icon.png` (180px). Reemplazado el icono Angular. Derivación local con sharp ya disponible, sin nuevas dependencias; script temporal en .tmp/derive-favicons.cjs. La reducción conserva todo el logo, por lo que su texto pequeño no es legible en tamaños de pestaña; no se rediseñó la marca.

Validación: 21/21 tests en nueve archivos (los 20 anteriores más navegación SEO entre rutas y vuelta a Home). Build sin warnings, tres rutas prerenderizadas. Inspección con parser HTML sin ejecutar JS: titles, descriptions, canonical, robots, OG/Twitter únicos y coherentes por ruta; JSON-LD válido; referencias de iconos presentes; robots y sitemap copiados al output. XML sitemap validado. Cloudflare, Angular build/rutas, WhatsApp, estilos y logos originales intactos. Sin secretos ni temporales versionados.

Futuras páginas: añadir metadata específica al mapa SEO y aplicarla desde el componente; mantener canonical absoluto de producción sin query ni fragmento; habilitar indexación solo al publicar contenido útil y agregar la URL al sitemap. Al reemplazar los avisos /productos y /proyectos, retirar noindex y agregarlos al sitemap. Incluir imagen social real cuando exista, validar prerender y navegación, y ejecutar tests/build antes de un despliegue autorizado.

## Despliegue Cloudflare Workers — configuración V1

Esta estrategia reemplaza el plan anterior de servir el frontend desde VPS. Home V1 permanece intacta sobre 357dcfc. Remoto existente: https://github.com/Jpuycan96/miqa-store-frontend.git. El VPS NO participa en el frontend; el futuro api-store sí podrá vivir en VPS. El servidor SSR Node y sus scripts se conservan como alternativa local, pero no se ejecutan ni se publican en Workers. NG_ALLOWED_HOSTS y PORT no son necesarios para Static Assets.

Se despliega `dist/miqa-store-frontend/browser` como Workers Static Assets, aprovechando el prerender Angular. El build sigue generando browser/ y server/ sin cambios en angular.json ni rutas. Wrangler versionado en `wrangler.jsonc`, Worker `miqa-store-frontend`, workers_dev habilitado, Custom Domain de producción declarado para store.solucionesmicaela.com, sin account ID ni tokens.

`assets.html_handling = drop-trailing-slash` sirve `/productos` desde productos/index.html y `/proyectos` desde proyectos/index.html, preservando las URLs actuales; las variantes con barra redirigen a la URL sin barra. Cada ruta recibe su propio HTML/SEO prerenderizado. `not_found_handling = single-page-application` habilita fallback al index para navegación sin asset coincidente; no reemplaza los HTML existentes ni añade rutas Angular. La Home contiene el ancla servicios y Angular hidrata normalmente.

Archivos: nuevos wrangler.jsonc y .node-version; modificados package.json, package-lock.json, .gitignore y este contexto. Wrangler devDependency exacta 4.131.1, lockfile actualizado. Node fijado en .node-version a 22.14.0, entorno local validado; engines >=22.12.0 <23 combina el mínimo de Angular con Node >=22 exigido por Wrangler y conserva la misma rama mayor. npm local 11.3.0, packageManager conservado. Cloudflare reconoce .node-version; evitar un NODE_VERSION del dashboard que lo contradiga.

Configuración Git integration en la raíz del repositorio:
- Build command: `npm run build`.
- Deploy command: `npx wrangler deploy` (usa la dependencia fijada y wrangler.jsonc).
- Output de assets: `dist/miqa-store-frontend/browser`.
- Worker: `miqa-store-frontend`.
- URL pública desplegada correctamente según el propietario: https://miqa-store-frontend.jhairthmanuelpt.workers.dev.
- Custom Domain de producción: `store.solucionesmicaela.com`. Declarado en wrangler.jsonc mediante routes con pattern exacto y custom_domain: true; activo en producción según el propietario. No es una Worker Route delante de un origen externo. Sin wildcard, zone_id ni account_id.

Futuros despliegues: ejecutar npm ci, npm test -- --watch=false, npm run build y npx wrangler deploy --dry-run; revisar cambios y commit. Solo después de autorización, subir a la rama conectada de GitHub para activar Workers Builds. Probar workers.dev en /, /productos, /proyectos y /#servicios antes de configurar dominio. Autenticación del build gestionada por Cloudflare, nunca guardada en Git. Para emulación local: `npx wrangler dev --local` después del build.

Validación local: 20/20 tests; build correcto sin warnings, tres rutas prerenderizadas; dry-run Wrangler correcto (29 archivos leídos, sin publicación). Workers local: HTTP 200 con título y H1 propios en las tres rutas; 19 assets JS/CSS/imágenes/favicon verificados; /productos/ y /proyectos/ redirigen 307 sin barra. Edge sobre Workers local: ancla Servicios y navegación Angular a productos correctas, sin errores de consola. No hay fuentes web externas: se conserva la pila de fuentes del sistema. .wrangler/, .dev.vars, .env, logs, dist y .tmp ignorados. La primera ejecución sandbox de Wrangler requirió acceso a su directorio de configuración de usuario; al ejecutarse con los permisos locales necesarios, dry-run y emulación pasaron.

Validación del Custom Domain: Wrangler 4.131.1 deploy --dry-run correcto, 20/20 tests y build correcto con tres rutas prerenderizadas. Solo se modificaron wrangler.jsonc y este documento. No se ejecutó deploy real ni push; no se modificaron DNS, dominio raíz, www, api, laser-api, ERP ni VPS. Static Assets y la aplicación permanecen intactos. El dry-run valida la configuración local; no confirma activación del dominio ni certificado en Cloudflare.

Referencias oficiales consultadas:
- https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/
- https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/
- https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/
- https://developers.cloudflare.com/workers/ci-cd/builds/build-image/

## Cierre Home V1 — primer despliegue (histórico SSR Node)

El propietario considera Home V1 suficientemente terminada para primer despliegue y autoriza el commit `feat: complete MIQA store home v1` tras las validaciones. Esta decisión reemplaza los pendientes históricos de revisión/commit de esta etapa. No autoriza push ni configurar remoto/VPS. El primer despliegue sigue pendiente.

Flujo cerrado: Header → Hero → seis Categories → Featured Products → Services → Projects → Contact CTA → Footer. WhatsApp general funciona centralizado en Header, Hero, Contact CTA y Footer; productos mantienen mensajes específicos. El número temporal NO cambió: antes de anunciar públicamente la web debe decidirse si reemplazarlo por el comercial definitivo. `/productos` y `/proyectos` siguen provisionales, permitido en este despliegue; catálogo, backend y admin son fases posteriores.

Validación de cierre: 20/20 tests, ocho archivos; `npm.cmd run build -- --configuration production` correcto sin warnings de build, tres rutas prerenderizadas (`/`, `/productos`, `/proyectos`). Servidor Node comprobado con HTTP 200 y HTML renderizado en las tres rutas, y HTTP 200 para los 12 assets de public. Ancla `/#servicios` comprobada en Edge, sin errores de consola. Revisión de archivos candidatos sin credenciales detectadas; `.gitignore` excluye dependencias, build, caches, .tmp, logs y archivos .env. Las coincidencias de password en package-lock son nombres de dependencias @inquirer, no secretos.

Producción real verificada:
- Output: `D:\MIQA-STORE\miqa-store-frontend\dist\miqa-store-frontend`, con `browser/` y `server/`; desplegar ambos directorios juntos.
- Entrypoint: `dist/miqa-store-frontend/server/server.mjs`, no `main.server.mjs`.
- Desde la raíz del proyecto: `node dist/miqa-store-frontend/server/server.mjs` o `npm run serve:ssr:miqa-store-frontend`.
- Puerto por variable `PORT`, por defecto 4000. Usar `NODE_ENV=production`.
- Requisito del runtime instalado: `NG_ALLOWED_HOSTS` debe incluir los hostnames reales recibidos (sin protocolo ni puerto, separados por comas). Sin host autorizado, la prueba devolvió fallback CSR y avisos; con `NG_ALLOWED_HOSTS=localhost`, las tres rutas devolvieron HTML prerenderizado sin errores. Configurar el dominio definitivo al preparar el VPS, sin usar comodín para omitir la protección.
- Ejemplo Linux de prueba local desde la raíz: `NODE_ENV=production PORT=4000 NG_ALLOWED_HOSTS=localhost node dist/miqa-store-frontend/server/server.mjs`. Para tráfico público sustituir/agregar el hostname confirmado.
- Node local validado: 22.14.0; engines de Angular instalado: ^20.19.0 || ^22.12.0 || >=24.0.0. No usar ng serve como servidor de producción.

SEO: se conserva title comercial MIQA y description equivalente existentes. HTML base con lang es, UTF-8, viewport, description y Open Graph básico (title, description, type website). Sin og:url ni og:image inventados. Favicon existente válido pero genérico Angular, conservado; favicon MIQA dedicado queda pendiente no bloqueante, sin generación ni descarga. Dominio final y metadatos sociales específicos quedan pendientes de configuración del despliegue.

## IMPORTANT FOR CODEX / FUTURE AGENTS

Before doing any work:
1. Read this entire file and AGENTS.md.
2. Run git status and inspect recent git history.
3. Inspect the relevant implementation.
4. Never assume previous chat history is available.
5. Never discard uncommitted work.
6. Ask/report if this document conflicts with actual code. Do not silently overwrite working code.
7. Update this file after meaningful milestones.

No implementar el roadmap por iniciativa propia. No hacer commit, push, instalar dependencias, cambiar textos comerciales ni rediseñar componentes sin una solicitud que lo autorice. Los cambios pendientes son trabajo deliberado, no archivos que deban limpiarse.

## 1. Producto y alcance comercial

Nueva web pública/catálogo de **MIQA / Soluciones Micaela**, separada del ERP existente. El ERP es otro sistema Angular + Spring Boot + PostgreSQL, según contexto del propietario; no se inspeccionó ni se modificó en esta tarea.

V1 permite descubrir productos, servicios y proyectos y cotizar por WhatsApp. Flujo: cliente consulta desde la web → persona de MIQA atiende por WhatsApp → crea manualmente la OT en el ERP.

No implementar actualmente carrito, checkout, pagos, cuentas de clientes, login de clientes, SUNAT, stock, integración ERP, creación automática de OT ni WhatsApp Cloud API. No es un ecommerce transaccional.

## 2. Directorios e infraestructura

- Frontend y repositorio local: `D:\MIQA-STORE\miqa-store-frontend`.
- Backend reservado: `D:\MIQA-STORE\miqa-store-backend`; carpeta vacía al inspeccionar. No se está desarrollando todavía.
- Arquitectura futura: Angular Store Frontend → Store API Spring Boot → PostgreSQL independiente `miqa_store_db`.
- Frontend previsto en Cloudflare; fotografías futuras en infraestructura propia/VPS. No usar Cloudinary.
- Se mencionó `api-store.solucionesmicaela.com` como posibilidad futura, no como endpoint implementado.
- No hay API Store, base de datos, administrador ni integración con ERP en el frontend actual.

## 3. Stack y configuración verificados

`package.json` declara rangos; `npm ls --depth=0` mostró las siguientes versiones instaladas:

| Dependencia | Declaración | Instalada |
| --- | --- | --- |
| Angular core/common/compiler/forms/router/platform-browser/platform-server | ^21.1.0 | 21.2.23 |
| Angular compiler-cli | ^21.1.0 | 21.2.23 |
| Angular CLI/build/SSR | ^21.1.1 | 21.2.24 |
| Tailwind CSS | ^4.3.3 en dependencies; ^4.1.12 en devDependencies | 4.3.3 |
| @tailwindcss/postcss | ^4.1.12 | 4.3.3 |
| TypeScript | ~5.9.2 | 5.9.3 |
| Vitest | ^4.0.8 | 4.1.11 |
| jsdom | ^27.1.0 | 27.4.0 |
| Express | ^5.1.0 | 5.2.1 |
| RxJS | ~7.8.0 | 7.8.2 |
| PostCSS | ^8.5.3 | 8.5.28 |

Node local: 22.14.0. npm local y `packageManager`: 11.3.0. No se actualizaron dependencias. La duplicación de Tailwind se documenta, no se corrige automáticamente.

Convenciones: componentes standalone (sin declarar `standalone: true`), OnPush, signals, `input()`/`output()`, control flow `@if/@for/@switch`, HTML/SCSS externos, NgOptimizedImage, rutas lazy con `loadComponent`. No Angular Material como base visual. Reglas completas de TypeScript y accesibilidad en `AGENTS.md`.

`angular.json`: builder `@angular/build:application`; SCSS; assets desde `public`; estilos `src/tailwind.css` y `src/styles.scss`; `outputMode: server`; entry SSR `src/server.ts`. Presupuesto inicial 500 kB warning / 1 MB error; estilos por componente 4 kB warning / 8 kB error. No aumentar presupuestos para ocultar avisos.

## 4. Routing, SSR y SEO actuales

| URL | Componente lazy | Estado |
| --- | --- | --- |
| `/` | `features/home/home.ts` | Home |
| `/productos` | `features/products/products-coming-soon.ts` | Aviso: Estamos preparando nuestro catálogo. |
| `/proyectos` | `features/projects/projects-coming-soon.ts` | Aviso: Estamos preparando nuestro portafolio completo. |

Definición: `src/app/app.routes.ts`. No existen `/productos/:slug`, `/servicios`, `/nosotros`, páginas individuales ni wildcard de cliente. No convertir avisos en módulos completos sin solicitud.

`app.routes.server.ts` usa `RenderMode.Prerender` para `**`. El build genera tres rutas estáticas y bundles de servidor. `app.config.ts` configura router, listeners globales e hidratación con replay de eventos. `src/server.ts` sirve assets y usa AngularNodeAppEngine con Express; puerto por `PORT` o 4000. No confundir SSR disponible con renderizado dinámico por petición: las tres rutas actuales son prerenderizadas.

Home asigna título «MIQA Soluciones Gráficas | Impresión y Publicidad» y descripción con Meta. Las dos rutas provisionales tienen título de router. El regreso de `/productos` usa RouterLink y fragmento; `/proyectos` usa enlace nativo `/#proyectos`. No hay configuración de scroll por ancla en el router; no asumir que ambos regresos desplazan igual.

## 5. Sistema visual real

Valores de `src/styles.scss`:

| Token | Valor |
| --- | --- |
| --miqa-navy | #061b4f |
| --miqa-blue | #0b2559 |
| --miqa-cyan | #00d9e8 |
| --ink | #172033 |
| --muted | #616773 |
| --paper | #fff |
| --surface | #f6f7f9 |
| --page-width | 1320px |
| --radius-media | 24px |
| --radius | 28px |
| --font-sans | Aptos, Segoe UI, Arial, sans-serif |

`.page-shell`: ancho mínimo entre 1320px y viewport menos 40px; desde 768px resta 80px. **No modificar el max-width**, aprobado incluso tras revisión en ultrawide. Sombras discretas; foco global de 3px #087e8a. Movimiento reducido desactiva transiciones/animaciones globalmente y scroll suave.

Dirección aprobada: moderna, premium, editorial, mucho aire, imágenes grandes, tipografía limpia, radios suaves y asimetría controlada. Referencias históricas: CGB y Exaprint, sin copiar literalmente.

**Discrepancia importante:** el propietario describe un fondo general cálido aprobado. En el código actual `body` usa `var(--paper)` = blanco #fff; las superficies cálidas están en Hero (#eeede9), Categories, Services y Projects. No cambiar el fondo global ni eliminar superficies cálidas para reconciliar esta descripción. Reportar antes de cualquier ajuste.

Evitar apariencia dashboard/ERP, landing genérica, gradientes morados, glassmorphism, sombras fuertes, bordes excesivos, cards repetitivas y colores chillones.

## 6. Assets y logos

Inventario actual: 11 PNG bajo `public/images/`.

- `brand/logo-miqa3.png`: horizontal principal del Header, no sustituir.
- `brand/miqa-logo2.png`: circular secundario, no intercambiar con el horizontal.
- `hero/rollo-up.png`, `hero/tarjetas-personales.png`, `hero/senaletica.png`.
- Seis archivos de `products/` enumerados en la sección Featured Products.
- `public/images/projects/` es un destino futuro; no existe todavía en esta copia. Tampoco hay fotografías de Services.

Las imágenes de productos aportadas se usan sin convertir formato, descargar alternativas ni optimizar automáticamente. Pesan aproximadamente 1.5–2.5 MB cada una; una futura optimización requiere alcance explícito. Algunas contienen datos de contacto impresos, que no deben editarse por iniciativa propia.

## 7. Home y orden real

`src/app/features/home/home.ts` compone:

1. Skip link.
2. Header (`src/app/core/header/`).
3. Dentro de main#contenido: Hero → Categories → FeaturedProducts → Services → Projects → ContactCta.
4. Footer (`src/app/core/footer/`), fuera de main, después de ContactCta.
5. Diálogo nativo compartido de avisos fuera de main.

Secciones en `src/app/features/home/`: `hero/`, `categories/`, `featured-products/`, `services/`, `projects/`, `contact-cta/`. Cada carpeta tiene TS/HTML/SCSS; las nuevas secciones además tienen tests, y Services/Projects datos separados.

Home V1 cerrada por el propietario para el primer despliegue; Footer implementado. No existe Clientes/Marcas y **se decidió no agregar esa sección por ahora**. No inferirla a partir de solicitudes anteriores sobre el cierre de la Home.

## 8. Header

Logo horizontal, navegación Productos / Servicios / Proyectos / Nosotros, búsqueda y CTA «Conversemos». Menú móvil y buscador con signals; Escape cierra y devuelve foco al control correspondiente.

Comportamiento real pendiente: Productos apunta a `#categorias`; Servicios, Proyectos y Nosotros emiten `notice` y abren aviso, incluso aunque ahora existan Services/Projects. Conversemos, tanto desktop como móvil, abre WhatsApp mediante contactWhatsAppUrl(), con target _blank y rel noopener noreferrer. El menú móvil se cierra al activarlo. Se conservaron clases, estilos y texto visible.

Búsqueda actual filtra solamente Categories por nombre (normaliza acentos); no busca todo el catálogo.

## 9. Hero aprobado

- Eyebrow: «Ideas que se hacen realidad».
- H1: «Hacemos visible tu marca.» con punto cyan.
- Texto: «Impresión, publicidad y soluciones gráficas hechas para destacar.»
- CTAs: «Explorar productos» a #categorias y «Hablar con nosotros» al WhatsApp general mediante contactWhatsAppUrl(), nueva pestaña y rel seguro. Sin cambios visuales.
- Pie: «Tu idea. Nuestro oficio. Una marca que se ve.»

Tres imágenes separadas: roll-up central z-index 2, tarjetas a izquierda/frente z-index 3, señalética a derecha/detrás z-index 1. Composición compacta aprobada; no volver a agrandarla. Entrada 700ms desde arriba/izquierda/derecha, delays 0/120/240ms; luego quietas. Con reduced motion se muestran en posición final. NgOptimizedImage; roll-up priority, restantes eager.

## 10. Categories: seis categorías definitivas implementadas

«Explora por categoría» / «¿Qué necesitas crear?». Apoyo: «Encuentra la solución que necesitas y descubre todo lo que podemos crear para tu marca.» Funciona como entrada al futuro catálogo por categorías, no como lista de productos.

Datos en `features/home/categories/categories.data.ts`; modelo reutilizable `shared/models/home-category.ts` con nombre, slug, href, tipo de visual, número e `image?: {src, alt}`. Se conservan visuales CSS de `shared/graphic/`, sin imágenes externas ni nuevas dependencias.

Orden y enlaces reales actuales:
1. Impresión gran formato → `/productos?categoria=impresion-gran-formato`.
2. Letreros Publicitarios → `/productos?categoria=letreros-publicitarios`.
3. Merchandising → `/productos?categoria=merchandising`.
4. Imprenta y Papelería → `/productos?categoria=imprenta-papeleria`.
5. Señalética → `/productos?categoria=senaletica`.
6. Branding e Instalaciones → `/productos?categoria=branding-instalaciones`.

Toda la categoría es un enlace nativo con nombre accesible. `/productos` todavía muestra el aviso de catálogo en preparación: conserva el parámetro, pero no hay catálogo ni filtrado implementados allí. La búsqueda existente de la Home sigue filtrando categorías por nombre, ignorando acentos. El output `explore` se conserva por compatibilidad con Home, aunque los enlaces ya no lo emiten.

Composición editorial: desde 1024px, grid de diez columnas con spans 4/3/3 y 3/3/4, alturas visuales 290/240/265 y 265/240/290px y desplazamiento vertical de las categorías segunda y quinta. Desde 560px, dos columnas con alternancia vertical; móvil, una columna con visuales de 260px. Se reutilizan arte, radios, tipografía e interacciones existentes; Imprenta usa el visual de papelería `studio` y Branding el letrero con una variación sutil de ángulo y fondo.

Validación de esta actualización: 16/16 tests, incluidos seis nombres/enlaces y ausencia de «Letreros Luminosos»; build correcto y tres rutas prerenderizadas. Edge local a 360, 390, 430, 768, 1024, 1280, 1440 y 1920px: seis categorías, sin overflow horizontal ni errores de consola; navegación con parámetro comprobada. Sin commit.

## 11. Featured Products / Los más solicitados

Ubicación: `src/app/features/home/featured-products/`. Datos: `featured-products.mock.ts`; modelo: `src/app/shared/models/featured-product.ts`.

Copy actual: «Los más solicitados» / «Los favoritos de nuestros clientes.» / «Una selección de productos que nuestros clientes eligen para hacer visible su marca.» CTA RouterLink «Ver todos los productos →» a `/productos`.

| Nombre | Categoría | Slug / archivo PNG en public/images/products/ |
| --- | --- | --- |
| Impresión en alta calidad | IMPRESIÓN | impresion-alta-calidad |
| Letreros Publicitarios | LETREROS | letreros-publicitarios |
| Empaques | EMPAQUES | empaques |
| Tarjetas Personales | IMPRESIÓN | tarjetas-personales |
| Volantes | IMPRESIÓN | volantes |
| Merchandising personalizado | MERCHANDISING | merchandising-personalizado |

Rutas exactas: `/images/products/<slug>.png`. Cada objeto contiene imageAlt descriptivo. La descripción del primero ya dice «Ideal para promocionar…»; typo «para para» corregido con autorización. No restaurarlo.

Modelo actual: id, name, slug, category, description, image?, imageAlt?, priceFrom?, showPrice, featured, placeholder?. Los seis tienen featured true, showPrice false y priceFrom null. La plantilla nunca muestra precios, incluso si un objeto trae showPrice true. El componente filtra por featured, pero **no limita automáticamente a seis**; los datos actuales contienen seis. No alimentar más elementos a Home sin decidir ese límite.

Imágenes con NgOptimizedImage, fill, lazy, contain. Fondo unificado **#e2e7e9**; radio 24px y overflow hidden. Escala interna .9 para cuatro productos y .837 para Impresión/Merchandising; los cuatro menores tienen padding 12px. No aplicar de nuevo las reducciones históricas por leer prompts antiguos.

Dimensiones finales reales (tras dos reducciones exteriores consecutivas del 11%):
- Móvil <768: una columna, áreas visuales 280px de alto, ancho disponible completo.
- Tablet >=768: dos columnas; primer/sexto artículo width 79.21%, alto visual 221.788px, alineados end/start.
- Desktop >=1024: cuatro columnas; primer/sexto span 2 conservado, width 79.21%, alto 277.235px. Otros cuatro conservan altura 280px; segundo/quinto padding-top 36px. Títulos grandes 26px.
- Reducciones exteriores mediante width/height, no transform de tarjeta. La escala de la imagen se mantiene además de esas dimensiones.

Cada CTA individual es enlace nativo «Cotizar por WhatsApp», nueva pestaña y rel noopener noreferrer. ProductVisual sigue como fallback reutilizable para productos sin image; su CSS no está muerto. El texto «Composiciones conceptuales para imaginar tu próximo proyecto.» y `.visual-note` fueron eliminados.

## 12. WhatsApp centralizado

Archivo único: `src/app/core/config/whatsapp.ts`.

- `WHATSAPP_NUMBER = '51923034586'`: número **temporal de pruebas**, nacional 923034586.
- `whatsAppUrl(message)` construye `https://wa.me/...` con encodeURIComponent.
- `productWhatsAppUrl({name})` delega al helper general.
- Mensaje por producto: `Hola, estoy consultando desde la web de MIQA.\nQuisiera cotizar: [nombre].`
- `contactWhatsAppUrl()` centraliza el mensaje general compartido por Header, Hero y ContactCta: `Hola, estoy consultando desde la web de MIQA.\nTengo una idea/proyecto y quisiera recibir asesoría.`

El salto `\n` es un salto real en el mensaje, codificado en la URL. No duplicar números en componentes ni añadir formulario intermedio. Funciona como enlace nativo incluso con HTML prerenderizado sin JavaScript.

El propietario identifica **957 173 688** como número real visible en las artes del negocio; tarjetas y volantes lo incluyen. No sustituir el número temporal ni editar los PNG sin petición explícita. Header, Hero y Contact CTA ya usan contacto general; los seis productos mantienen mensajes específicos. Se eliminaron el output contact de Hero, su binding en Home y el texto de canal de contacto no habilitado. Los avisos ajenos al contacto se conservan.

Validación del contacto Header/Hero: 18/18 tests aprobados; enlaces generales, cierre de menú, ausencia de diálogo/alert de contacto, navegación #categorias y codificación del mensaje verificados. Los tests de productos siguen aprobados. Build correcto, tres rutas prerenderizadas. No se modificó CSS ni el teléfono. Sin commit.

## 13. Services

Componente: `features/home/services/services.ts`, HTML/SCSS correspondientes; datos `services.data.ts`; modelo `shared/models/home-service.ts`.

Encabezado: «Lo que hacemos» / «Tecnología, precisión y experiencia.» / «Soluciones para producir, transformar e instalar las ideas de tu negocio.»

| Servicio | Descripción exacta | Fondo |
| --- | --- | --- |
| Corte y grabado láser | Corta y graba tus ideas en acrílico o MDF. | #d9eeeb |
| Corte CNC | Corte router y cuchilla para PVC desde 2 mm hasta 20 mm de espesor. | #e0e8f2 |
| Impresión en gran formato | Producción gráfica para interiores, exteriores y comunicación visual. | #f0e7cd |
| Instalaciones | Montaje e implementación de soluciones gráficas y publicitarias para tu negocio. | #dce8df |

Son capacidades independientes, no productos ni pasos numerados. Desktop >=1024: cinco tracks, spans 3/2 y 2/3; láser e instalaciones con mayor presencia. Tablet >=768: dos columnas; móvil lista vertical. Tipografía navy y SVG lineales decorativos, sin fotos actuales. Hover desplaza SVG -3px solo con hover y no-preference.

HomeService: slug, name, description, kind (laser/cnc/print/installation), image? {src,alt}, link?. `input()` acepta otros datos. Si hay imagen se reemplaza SVG con NgOptimizedImage; link solo se renderiza si está definido. No existen rutas individuales; los datos actuales no asignan enlaces. Descripciones #34465a sobre fondos suaves: contraste calculado en revisión anterior >=7.67:1.

## 14. Projects

`features/home/projects/`: `projects.ts`, `.html`, `.scss`, `.data.ts`, `.spec.ts`; modelo `shared/models/home-project.ts`.

Copy: «Hecho por MIQA» / «Proyectos que hablan por nosotros.» / «Ideas que se convirtieron en espacios, piezas e instalaciones reales.» CTA «Ver todos los proyectos →» a ruta provisional `/proyectos`.

Datos **estructurales temporales**, no evidencia de trabajos de clientes reales:

| Título | Categoría | Slug |
| --- | --- | --- |
| Fachada comercial | Letreros e instalación | fachada-comercial |
| Señalética corporativa | Señalética | senaletica-corporativa |
| Implementación de local | Producción e instalación | implementacion-local |
| Gráfica de gran formato | Impresión | grafica-gran-formato |
| Letras corpóreas | Letreros | letras-corporeas |

HomeProject: id, title, category, slug, image?, imageAlt?, featured?, layoutVariant? ('lead'/'wide'). Primer elemento lead y featured true; quinto wide. featured es metadata, no se filtra en el componente actual.

Sin imágenes: composiciones abstractas CSS con geometría simple y colores neutros, aria-hidden; no se inventaron clientes ni descargaron imágenes. Con image se usa NgOptimizedImage fill/lazy/cover y imageAlt o title como fallback. Añadir fotos reales en `public/images/projects/` y actualizar datos/alt; revisar encuadres al hacerlo.

Desktop: primer elemento span 3 de cinco tracks y dos filas (~60%), dos secundarios apilados a la derecha; última fila spans 2/3. Tablet: dos columnas, último a todo el ancho. Móvil: figuras verticales con imagen amplia y figcaption siempre visible (categoría + título). Figuras sin link individual hasta definir detalles. Hover 1.025 en visual, no animación permanente; respeta reduced motion. No volver a añadir los detalles CSS retirados solo para superar el presupuesto de 4 kB.

## 15. Contact CTA final

`features/home/contact-cta/contact-cta.ts`, `.html`, `.scss`, `.spec.ts`. Inmediatamente después de Projects.

«¿Tienes una idea en mente?» / «Cuéntanos qué necesitas y te ayudamos a hacerlo realidad.» / «Conversemos →».

Franja de ancho completo, no card: navy #061b4f, texto #faf9f5, eyebrow #9edee2, botón cyan #00d9e8 y texto navy. Círculo técnico sutil recortado por overflow hidden. Desktop >=1024: grid 3fr/2fr y 88px de padding vertical; tablet horizontal con columna auto para CTA y 72px; móvil apilado, 56px vertical, título mínimo 30px. Botón mínimo 56px de alto.

Enlace directo generado con helper centralizado, target _blank, rel seguro y aria-label explicando WhatsApp/nueva pestaña. Foco blanco 3px; hover aclara botón y mueve flecha 3px si no hay reduced motion. No formulario, fotografía ni API. No se envió ningún mensaje para verificarlo.

### Footer implementado

Componente reutilizable `src/app/core/footer/footer.ts`, `.html`, `.scss`, `.spec.ts`; standalone, OnPush y NgOptimizedImage. Cierra Home después de Contact CTA, fuera de main. Superficie blanca `var(--paper)` y texto navy: separa claramente el cierre del CTA oscuro sin modificarlo e integra el fondo blanco del logo horizontal `logo-miqa3.png` sin editar el asset.

Contenido: logo con enlace a inicio, «Hacemos visible tu marca.», Productos → `/productos`, Servicios → `/#servicios`, Proyectos → `/proyectos`, «Conversemos por WhatsApp» mediante `contactWhatsAppUrl()` (target _blank, rel noopener noreferrer), divisor y copyright con año obtenido en TS mediante `new Date().getFullYear()`. En HTML prerenderizado, el año corresponde al build. No se incluyeron Nosotros, legales, redes ni datos comerciales sin destino o información real.

Desktop desde 1024px: tres zonas de anchos distintos; tablet desde 768px: marca a izquierda y navegación/contacto a derecha; móvil apilado, alineado a izquierda. Navegación con altura mínima 44px, contacto 48px, foco global visible y transición corta desactivada con reduced motion. Conserva max-width y tokens globales.

Validación: 20/20 tests aprobados en ocho archivos; build correcto con tres rutas prerenderizadas. Edge local en 390, 430, 768, 1024, 1280, 1440 y 1920px: sin overflow horizontal, sin texto cortado ni errores de consola, logo cargado, foco y reduced motion comprobados, ancla Servicios operativa. Sin auditoría axe completa. Footer implementado e incluido en el cierre autorizado de Home V1 para primer despliegue.

## 16. Próximo módulo: catálogo /productos (requisito, no implementado)

La Home contiene solo una selección; `/productos` alojará **más de 100 productos**. Diseñar buscador, filtro por las seis categorías definitivas, subcategorías opcionales, grid responsive, imágenes, acceso al detalle, carga progresiva/paginación y WhatsApp. La búsqueda actual del Header no resuelve esto.

Detalle previsto: `/productos/:slug`, cotización rápida; galería, nombre, descripción, aplicaciones, características, materiales/opciones, CTA WhatsApp prominente y posible sticky móvil. Sin carrito ni checkout. Decidir estrategia SSR/prerender de rutas dinámicas cuando se implemente; hoy no hay ruta parametrizada.

## 17. Administración futura y modelo preliminar

Requisito: catálogo y categorías administrables mediante Store API; los mocks no son permanentes. Administrador podrá crear/editar/publicar, ocultar sin borrar, cambiar imágenes/categoría, marcar/desmarcar destacados y posiblemente ordenar. Estados conceptuales: activo/publicado, oculto/inactivo y destacado. Los destacados podrán alimentar automáticamente «Los más solicitados» manteniendo selección pequeña.

Modelo futuro orientativo, **no contrato definitivo**: id, nombre, slug, categoría, subcategoría opcional, descripción corta/completa, imagen principal, galería, activo/publicado, destacado, orden, SEO metadata, createdAt, updatedAt. Decidir modelo final antes del backend. No implementar administración ni reemplazar los modelos actuales durante tareas de presentación/documentación.

## 18. Git: instantánea histórica anterior al cierre V1

Repositorio inicializado localmente en el frontend. Rama **main**. `git log --oneline --decorate -5` devuelve un solo commit:

```text
9bdf408 (HEAD -> main) feat: initialize MIQA store frontend
```

`git remote -v`: sin salida, **ningún remoto**. No origin, no push. Working tree con cambios deliberados y nada staged. El commit inicial contiene 58 archivos, pero no incluye la etapa actual de Home.

Estado esperado al terminar esta documentación: **9 archivos tracked modificados y 25 archivos untracked**. Lista completa:

```text
 M AGENTS.md
 M src/app/app.routes.ts
 M src/app/core/config/whatsapp.ts
 M src/app/features/home/featured-products/featured-products.html
 M src/app/features/home/featured-products/featured-products.mock.ts
 M src/app/features/home/featured-products/featured-products.scss
 M src/app/features/home/featured-products/featured-products.spec.ts
 M src/app/features/home/featured-products/featured-products.ts
 M src/app/features/home/home.ts
?? PROJECT_CONTEXT.md
?? public/images/products/empaques.png
?? public/images/products/impresion-alta-calidad.png
?? public/images/products/letreros-publicitarios.png
?? public/images/products/merchandising-personalizado.png
?? public/images/products/tarjetas-personales.png
?? public/images/products/volantes.png
?? src/app/features/home/contact-cta/contact-cta.html
?? src/app/features/home/contact-cta/contact-cta.scss
?? src/app/features/home/contact-cta/contact-cta.spec.ts
?? src/app/features/home/contact-cta/contact-cta.ts
?? src/app/features/home/projects/projects.data.ts
?? src/app/features/home/projects/projects.html
?? src/app/features/home/projects/projects.scss
?? src/app/features/home/projects/projects.spec.ts
?? src/app/features/home/projects/projects.ts
?? src/app/features/home/services/services.data.ts
?? src/app/features/home/services/services.html
?? src/app/features/home/services/services.scss
?? src/app/features/home/services/services.spec.ts
?? src/app/features/home/services/services.ts
?? src/app/features/products/products-coming-soon.ts
?? src/app/features/projects/projects-coming-soon.ts
?? src/app/shared/models/home-project.ts
?? src/app/shared/models/home-service.ts
```

Volver a ejecutar status, esta es una instantánea. No `git reset`, `git clean`, `git restore` ni checkout sobre modificaciones sin autorización explícita. No sobrescribir ni descartar cambios existentes.

Incidencia histórica: Git detectó propietario diferente entre usuario y sandbox; se usó `git -c safe.directory=D:/MIQA-STORE/miqa-store-frontend ...`. **En esta inspección git status y git log normales sí funcionaron**; `git config --show-origin --get-all safe.directory` muestra la ruta en configuración del usuario y entradas de sesión. No afirmar que sigue bloqueado. El sandbox todavía avisa que no puede leer `C:\Users\Jhairth Manuel/.config/git/ignore`; no impidió status/log. No modificar configuración global por iniciativa propia.

`.gitignore` excluye node_modules, dist, tmp, .tmp, toda .angular, coverage y otros cachés/IDE; conserva excepciones de configuración útil de .vscode. No versionar artefactos de build ni navegador. `.tmp/` contiene scripts y capturas de validaciones anteriores, no forma parte del handoff versionable.

## 19. Validación histórica y límites (ver cierre V1 para el resultado actual)

Reejecutado el 2026-09-11, aproximadamente 17:29 America/Lima:

```powershell
npm.cmd test -- --watch=false
npm.cmd run build
```

Resultado real: **15/15 tests**, seis archivos de tests, build producción correcto sin advertencias de presupuesto, **3 rutas prerenderizadas** (`/`, `/productos`, `/proyectos`). Bundle inicial 271.28 kB, transferencia estimada 77.64 kB. Se generaron bundles browser/server. Esta tarea documental no volvió a lanzar una prueba de servidor HTTP; el prerender sí ejecutó el renderizado de las rutas.

Tests actuales:
- `src/app/app.spec.ts`: 3 (Home/SEO, menú móvil Escape, filtro de categorías).
- `src/app/core/config/whatsapp.spec.ts`: 1 (codificación del mensaje).
- `featured-products/featured-products.spec.ts`: 3 (seis productos/fotos sin precios, fallback/datos, enlaces WhatsApp).
- `services/services.spec.ts`: 3 (capacidades, imagen/enlace opcional, integración/ruta).
- `projects/projects.spec.ts`: 3 (ejemplos, imagen opcional, orden/ruta).
- `contact-cta/contact-cta.spec.ts`: 2 (enlace/mensaje/semántica, posición tras Projects).

Validación anterior en esta misma sesión: Edge headless sobre servidor de producción local, 360/390/768/1024/1440/1920, sin overflow horizontal de página ni errores de consola; inspección visual, rutas, carga de imágenes, reduced motion y foco por teclado del CTA final. Scripts temporales `.tmp/check-products.cjs`, `check-projects.cjs`, `check-contact.cjs`. No instalados Playwright ni axe. **No hay auditoría axe completa actual**; no convertir revisión básica en certificación WCAG. El traspaso histórico mencionaba axe, pero no es resultado reproducido aquí.

En la franja final, una medida interna de scrollWidth puede superar clientWidth por el círculo decorativo recortado; las pruebas de documento no mostraron overflow horizontal. No confundir esa decoración recortada con contenido fuera de pantalla.

## 20. Comandos y prueba en celular

Scripts reales de package.json:

| Script | Comando |
| --- | --- |
| ng | ng |
| start | ng serve |
| build | ng build |
| watch | ng build --watch --configuration development |
| test | ng test |
| serve:ssr:miqa-store-frontend | node dist/miqa-store-frontend/server/server.mjs |

En PowerShell desde la raíz: `npm.cmd start` para desarrollo (habitualmente puerto 4200); `npm.cmd run serve:ssr:miqa-store-frontend` tras build para servidor (4000 salvo PORT). Usar dependencias existentes; no instalar ni actualizar para una revisión rutinaria.

Nota de LAN suministrada por el propietario:

```powershell
$env:NG_ALLOWED_HOSTS="<IP_LOCAL_PC>"
npx ng serve --host 0.0.0.0
```

La IP usada fue **192.168.1.104**, según propietario; no es permanente ni se volvió a comprobar conectividad desde un celular en esta tarea. Teléfono y PC deben estar en la misma Wi-Fi; abrir `http://<IP_LOCAL_PC>:4200`. Revisar IP y permisos de firewall si hace falta, no cambiar configuración de red automáticamente. La dependencia Angular local contiene soporte de allowedHosts y NG_ALLOWED_HOSTS; la nota no implica configuración persistida en angular.json.

## 21. Discrepancias y pendientes técnicos conocidos

- Categories ya presenta las seis categorías definitivas y sus enlaces; el filtrado real del catálogo por query param queda pendiente de construir `/productos`.
- Header aún no navega a las nuevas secciones Services/Projects; esos avisos y Nosotros siguen pendientes. El contacto de Header/Hero está resuelto y centralizado con el CTA final.
- Fondo global blanco real frente a descripción de fondo cálido general; conservar diseño y consultar antes de reconciliar.
- Footer implementado; Home V1 cerrada para primer despliegue. Clientes/Marcas excluido por decisión actual.
- Productos y proyectos completos son avisos de ruta, no catálogos. No hay detalles.
- Projects contiene ejemplos y arte CSS, no fotos reales; directorio de fotos aún no creado.
- FeaturedProducts no impone máximo seis y HomeProject.featured no filtra; tenerlo presente al conectar datos reales.
- El número real impreso y el temporal de pruebas son diferentes intencionalmente.
- Rutas provisionales no comparten Header/Footer y tienen estrategias distintas de regreso con fragmento.
- Tailwind declarado en dependencies y devDependencies; no se normalizó.
- No despliegue Cloudflare, API Store, PostgreSQL ni admin implementados.
- Los avisos Git de propietario históricos no bloquearon esta inspección. El permiso de lectura de ignore global sigue generando warning del sandbox.

## Decisiones aprobadas — no cambiar sin solicitud

- Store separado del ERP; integraciones solo en fases posteriores.
- No carrito ni checkout V1; no precios actualmente en Featured Products.
- WhatsApp directo, configuración única y número temporal conservado; no Cloud API todavía.
- No Cloudinary; imágenes futuras en infraestructura propia.
- Conservar superficies cálidas aprobadas y fondo actual; no convertir la web en una superficie blanca uniforme.
- Header, Hero y sistema visual aprobados; no rediseñar componentes aprobados.
- «Conversemos» aprobado; Letreros Publicitarios es el nombre correcto.
- max-width global 1320px aprobado, no agrandar por monitores ultrawide.
- Home no contiene +100 productos: pequeña selección; `/productos` será catálogo completo.
- Administración posterior con crear/editar/ocultar/publicar/destacar y categorías administrables.
- No sección Clientes/Marcas por ahora.
- No Angular Material como base visual, sin librerías nuevas innecesarias.
- No commits de esta etapa hasta revisión y autorización del propietario.

## Próximos pasos recomendados

Orden decidido por el propietario, no autorización para ejecutarlo automáticamente:

1. Workers y Custom Domain activos según el propietario; favicon y SEO preparados en el repositorio para el siguiente despliegue autorizado.
2. Footer implementado y aceptado para primer despliegue.
3. Seis categorías definitivas implementadas e incluidas en Home V1.
4. Cierre autorizado en un commit: feat: complete MIQA store home v1. No push ni remoto.
5. Diseñar `/productos` para +100 productos.
6. Crear `/productos/:slug`.
7. Reemplazar proyectos temporales con fotografías reales.
8. Construir `/servicios` si se necesita página completa.
9. Construir `/proyectos` completo.
10. Construir `/nosotros`.
11. Después iniciar Store API + PostgreSQL.
12. Después construir administración de catálogo.
13. Integraciones con ERP/SUNAT/pagos quedan para fases posteriores.
Validación integrada final tras retomar (13/09/2026): el paquete actualizado pasó login/guard, creación de categoría y producto, edición, material/extra/imagen principal, publicación visible en /productos, edición posterior reflejada en ficha pública, despublicación y logout. Sin errores JS inesperados; sin overflow en 360/390/768/1024/1440/1920; axe sin infracciones en listado, categorías y edición a 390/1440. Se conservaron las capturas y evidencia en .tmp/admin-browser-check.json y admin-*.png.

Estado final verificado en PostgreSQL: dos productos con slugs admin-local-check-1789281049545 y admin-local-check-1789358366249, ambos published=false; categorías homónimas active=false. Sus opciones/imágenes solo pertenecen a esos borradores. Cinco productos originales permanecen públicos. Usuario admin-e2e-local eliminado, admin_users vacío, preparado para crear cuenta propia con Start-LocalAdmin.ps1. No se conservó una contraseña de pruebas utilizable. Flyway V1/V2/V3 success en ambas bases; sin migraciones adicionales en la reanudación.

Backend de validación detenido y puerto 8081 libre; PostgreSQL propio sigue activo en 55432. Frontend disponible en localhost:4200. Para iniciar sesión por primera vez, arrancar backend con el helper y elegir contraseña propia; no hay admin/password predeterminados. Documentación backend README/PROJECT_CONTEXT y frontend PROJECT_CONTEXT completada; no hubo cambios de implementación ni errores de compilación que requirieran rehacer archivos durante esta reanudación.
