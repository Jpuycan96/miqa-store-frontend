# MIQA Store — contexto y traspaso

Actualizado: 11 de septiembre de 2026. Inspección del código y validaciones locales de esta fecha. Este documento es la fuente principal de contexto de producto/diseño; distingue implementación existente de requisitos futuros. Las rutas de archivos son relativas a la raíz del frontend salvo indicación contraria.

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
