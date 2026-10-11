# MiqaStoreFrontend

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
