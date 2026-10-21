# MiqaStoreFrontend

## Prueba local con MIQA Store TEST por SSH — 21/10/2026

Mantener abierto el túnel `127.0.0.1:18083` hacia MIQA TEST `127.0.0.1:8083` en Vultr.
Desde este frontend ejecutar `npm.cmd start` (o `npm start`). Si ya hay un servidor en 4200,
detenerlo con Ctrl+C en su terminal y volver a iniciarlo para cargar el proxy y los replacements.

`npm start` sigue siendo `ng serve`, con `development` predeterminado:

- `environment.development.ts`: API relativa al origen del frontend, sin credenciales.
- `angular.json`: proxy solo en serve development y entry points browser/server solo en build development.
- `proxy.development.json`: `/api/**` y `/media/**` van exclusivamente a `http://127.0.0.1:18083`.
- `main.development.ts`, `main.server.development.ts` y `test-http.config.ts`: conservan la autenticación
  y adaptan referencias absolutas restauradas de `http(s)://api-store.solucionesmicaela.com/media/`
  a `/media/`, tanto en SSR como en navegador. No hay fallback a PROD si TEST falla.
- No se modifican environment productivo, servicios, backend, Worker ni scripts de publicación.
  Para esta prueba usar únicamente `npm start`, sin `--configuration production`.

URLs comprobadas con los slugs que entrega TEST (no deducirlos del nombre):

| Prueba | URL |
| --- | --- |
| Inicio | http://localhost:4200/ |
| Todos los productos | http://localhost:4200/productos |
| Merchandising | http://localhost:4200/productos?commercialCategory=impresion-gran-formato-1 |
| Artículos Promocionales | http://localhost:4200/productos?commercialCategory=impresion-gran-formato-1&subcategory=subcategoria-44 |
| Impresión Gran Formato / Impresiones | http://localhost:4200/productos?commercialCategory=merchandising-1&subcategory=subcategoria-46 |
| Ficha Llaveros Acrílicos | http://localhost:4200/productos/llaveros-acrilicos |
| Ficha Impresión UV | http://localhost:4200/productos/impresion-uv |
| Acceso administrativo | http://localhost:4200/admin/login |
| Productos administrativos | http://localhost:4200/admin/productos |
| Categorías editoriales ERP | http://localhost:4200/admin/categorias |

Abrir el menú de una categoría con hover/botón; en móvil abrir el menú y su flecha. Seleccionar hija,
buscar por texto y pulsar TODOS para limpiar. DevTools → Network debe mostrar `/api/...` y `/media/...`
en localhost:4200. La petición comercial usa `commercialCategory`, `subcategory` y `search`.
También se puede abrir http://localhost:4200/api/public/commercial/categories para inspeccionar el árbol.

El catálogo público no requiere login. Admin usa POST `/api/admin/auth/login`, GET `/auth/me` y Bearer
solo en `/api/admin/`; sin sesión, `/api/admin/auth/me` devuelve 401. Usar exclusivamente una cuenta
existente de TEST: no hay credenciales incorporadas ni se creó una cuenta. El mecanismo preexistente
conserva el JWT de sesión en localStorage (`miqa.admin.session.v1`); cerrar sesión o limpiar esa clave
antes de entrar con TEST si se reutiliza el mismo origen con otro entorno. No se agregaron secretos.
Para inspección sin modificar datos, no guardar/publicar/subir imágenes ni enviar solicitudes.

Resultado de solo lectura: 2 categorías comerciales públicas, 2 subcategorías y 25 productos sin filtro;
cada hija anterior devuelve 1 producto. Los 7/25/126 y 3 asignaciones sincronizados, informados por el
propietario, son totales de base y no aseguran visibilidad pública. Los nombres/slugs llegan cruzados:
Merchandising usa `impresion-gran-formato-1` e Impresión Gran Formato usa `merchandising-1`.
No se corrigieron datos ni se presume la causa. No existe una pantalla independiente para administrar
subcategorías, los 126 servicios ERP o asignaciones, ni se consulta el estado global SUCCESS desde esta UI.

La imagen de muestra consultada por el proxy devolvió 401 desde TEST; el placeholder es esperado hasta
resolver entrega/permisos de medios en otra tarea. No se desactiva autenticación ni se usa imagen de PROD.
No se verificó login real ni escritura administrativa. Abrir una ficha ERP puede evaluar precios con el
endpoint público existente; no se validaron aquí precios ni envío de solicitudes.

Validación: `npm.cmd test -- --watch=false`, 275 pruebas existentes aprobadas; tres nuevas pruebas de
adaptación de medios aprobadas en ejecución focalizada. `npm start -- --host localhost --port 4201`
compiló browser/server y sirvió SSR y proxy reales (4200 estaba ocupado y se preservó su proceso).
Edge con datos reales, 1440/390 px: dos auditorías axe sin infracciones, sin overflow/excepciones JS
ni solicitudes externas. Evidencia ignorada en `.tmp/test-integration/`. No se ejecutó `npm run build`
porque su generador de sitemap usa configuración productiva; la compilación verificada es development.

Para revertir solo esta tarea, volver `storeApiBaseUrl` a `http://localhost:8081` en
`environment.development.ts`; quitar de `angular.json` los replacements de `main.ts`/`main.server.ts`
y `proxyConfig` de serve development; eliminar `proxy.development.json`, `src/main.development.ts`,
`src/main.server.development.ts`, `src/environments/test-http.config.ts` y su `.spec.ts`; reiniciar Angular.
Las notas de esta sección y de PROJECT_CONTEXT pueden retirarse por separado. Conservar los demás
cambios locales existentes: no usar una restauración global de Git.

## Navegación comercial — 20/10/2026

El header conserva logo, categorías horizontales, TODOS, carrito y búsqueda. Consume
`GET /api/public/commercial/categories` y muestra un dropdown blanco con sombra por categoría con
subcategorías. Desktop: hover o botón accesible; móvil: botón táctil independiente del enlace del padre.
Tab/Enter permiten recorrer y abrir opciones; Escape cierra y devuelve foco al botón. Sin mega menú,
imágenes, banners ni contenido editorial de subcategorías. Carga/error con reintento y árbol vacío
con acceso TODOS disponible; no se usa el catálogo histórico como fallback de errores HTTP.
Si el árbol comercial responde correctamente `[]`, el encabezado consulta `/api/public/categories`
y muestra sus enlaces históricos `/productos/{slug}` en desktop y móvil. No inventa subcategorías ni
envía filtros comerciales desde esos enlaces. Si ambas listas están vacías conserva TODOS.

- Padre: `/productos?commercialCategory={slug}`.
- Hija: `/productos?commercialCategory={slug}&subcategory=subcategoria-{idERP}`.
- Búsqueda combinada: añade `buscar={texto}` a esa URL; se envía como `search` al backend.
- TODOS: `/productos`, limpia categoría/subcategoría/búsqueda.
- Las URLs anteriores `/productos/{categoria}` y `?categoria={slug}&buscar={texto}` conservan sus filtros
  históricos. El detalle sigue en `/productos/{producto}`, con `regresar` para conservar la selección.

CatalogApiService elige `/api/public/commercial/products` cuando hay filtros comerciales; sin ellos conserva
`/api/public/products`. Reutiliza ProductDto, mapeo, imágenes, tarjetas y orden existentes. Deduplica por ID
como defensa adicional; el backend conserva autoridad sobre asignaciones y elegibilidad. La navegación
comercial mantiene el orden ERP y slugs recibidos; no fabrica relaciones ni administra subcategorías.
No se cambian SEO, precios, carrito, publicación, rutas Worker ni sitemap.

El header no recarga el árbol por cada cambio de búsqueda. La búsqueda del catálogo usa el debounce
existente del header, cancelación switchMap y una sola lectura del estado URL para evitar una petición
inicial sin filtros seguida de otra filtrada. Se conserva la revalidación SSR existente (snapshot y lectura
fresca posterior, deliberadas), sin polling ni caché persistente nueva.

Validación local: `npm.cmd test -- --watch=false`, 275/275 pruebas en 38 archivos; incluye dropdown,
foco/Escape, móvil, URL inicial compartida, padre/hija/TODOS, búsqueda combinada, deduplicación y regresiones.
`node scripts/build-catalog-offline.cjs`: build production exitoso, 15 rutas prerenderizadas. Los fetch
externos se bloquean y la navegación comercial del prerender usa árbol vacío simulado. Artefacto `dist`
solo para validación, NO publicar. Cuatro advertencias CSS no bloqueantes: tres preexistentes y header
4.51 kB frente al umbral de aviso de 4 kB (límite de error 8 kB sin cambios).

Comprobación Edge headless sobre CSR de ese build con siete categorías sintéticas y API interceptada:
dropdown desktop a 1440 px, menú móvil abierto a 390 px y breakpoint desktop a 1200 px. Tres auditorías
axe sin infracciones, sin overflow horizontal ni excepciones de JavaScript; comprobados recorrido del
cursor padre/opciones, Escape con foco restaurado y cierre móvil al seleccionar hija. Evidencia local
ignorada en `.tmp/commercial-navigation/`. El sandbox impedía responder a CDP; la comprobación pasó al
ejecutar el arnés local fuera de él, manteniendo interceptadas/bloqueadas las solicitudes externas.

Sin dependencias nuevas, cambios backend/ERP/BD, sincronizaciones, commit/push/deploy. Pendiente validar
datos comerciales reales cuando el backend esté disponible por el flujo autorizado.

## SEO dinamico: estado actual de verificacion local

Resultados confirmados por el propietario para esta entrega; esta actualizacion documental no vuelve a ejecutar pruebas ni builds:

- Backend: 299 pruebas ejecutadas, 297 aprobadas, 0 fallos, 0 errores y 2 omitidas. Las omitidas no se contabilizan como aprobadas.
- Angular: 284 pruebas aprobadas en la ultima ejecucion de su suite. Cloudflare Worker: 53 pruebas aprobadas.
- Compilacion Angular exitosa; sitemap generado con 32 URLs y 33 rutas prerenderizadas. Estos resultados sustituyen como estado actual al build historico offline de 15 rutas con fixtures, que se conserva solo como evidencia de pruebas y no como artefacto para publicar.
- Integracion backend-Worker verificada localmente. El Worker ya esta desarrollado y probado: consulta GET /api/public/seo/pages/{slug}, genera HTML SEO dinamico y coordina la transicion con Angular.
- SeoPageService sustituye las imagenes HTTP del contrato SEO por https://store.solucionesmicaela.com/images/brand/logo-miqa3.png; conserva HTTPS y rutas relativas validas, sin cambiar el contrato JSON ni el catalogo general.
- Los cambios nuevos de SEO dinamico todavia NO se han publicado. El sitemap dinamico existente ya estaba en produccion, segun el propietario; eso no acredita la publicacion de las nuevas paginas SEO.

Los resultados y pendientes de las etapas anteriores se conservan como historial; prevalece este estado actual para la implementacion SEO. La integracion local no equivale a verificacion ni despliegue en produccion.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
