# Bitácora del proyecto

[Volver al índice](README.md).

Registrar nuevas entradas en orden cronológico, distinguiendo decisiones, implementación y validaciones. No presentar una fase planificada como terminada.

## 2026-09-28 — Inicio formal

- Inicio formal del proyecto de integración **Tienda Virtual → ERP**, con WhatsApp como canal de conversación.
- Flujo funcional acordado: MIQA Store → Solicitud Web persistente con snapshot y referencia → WhatsApp con referencia → bandeja «Solicitudes Tienda Virtual» del ERP → revisión del vendedor → Cotización ERP → OT.
- La solicitud se guardará antes de abrir WhatsApp y existirá aunque el cliente cierre la aplicación o no envíe el mensaje.
- Fase activa: **Fase 1 — Solicitud Web persistente**. Esta entrega formaliza la documentación; no implementa la fase.
- ERP todavía no modificado para este proyecto de integración.
- BD todavía no modificada para este proyecto de integración; no se crean migraciones.
- No existe todavía integración automática MIQA → ERP.
- Se acuerdan bases separadas, comunicación backend-to-backend por API, IDs explícitos y estables, mapeo parcial y separación entre precio público, precio de venta ERP y costo de inventario.
- Se registra el roadmap de seis fases y el uso futuro del mecanismo `OrdenTrabajo` con `esCotizacion=true`, sujeto a auditoría de su implementación antes de integrarlo.
- Se crean los seis documentos de esta carpeta. No se modifican código, configuración, sitemap, dependencias ni producción. No se hace commit, push ni deploy en esta tarea documental.

### Antecedente: cantidades editables

Antes del inicio formal, la funcionalidad de cantidades editables del catálogo quedó desplegada y validada, según lo comunicado por el propietario. Se conservaron cantidades exactas, mínimos, incrementos de botones por `step`, persistencia local y mensaje WhatsApp, junto con SEO y categorías dinámicas.

`WORKFLOW.md` registra 117 pruebas aprobadas en 27 archivos y build de producción aprobado. El cierre previo comunicado incluyó sitemap con 34 URLs, 35 rutas prerenderizadas y `git diff --check` aprobado. Son antecedentes de validación; no se ejecutaron nuevamente ni se verificó producción durante esta tarea.

### Estado del repositorio al iniciar

Lectura completa de `PROJECT_CONTEXT.md` y `WORKFLOW.md`. Rama `main`, working tree limpio y referencia local `origin/main` en el mismo commit `58277b7`.

Commits previos relevantes:

- `0d4cbd3` — `feat: allow editable product quantities`.
- `cb459b8` — `chore: refresh product sitemap`.
- `58277b7` — `docs: add development and deployment workflow`.

### Próximo trabajo pendiente

- **PENDIENTE DE AUDITORÍA:** backend MIQA antes de proponer modelo definitivo o endpoint de solicitudes.
- **PENDIENTE DE DISEÑO:** contacto, referencia, estados, snapshot, idempotencia, validaciones y experiencia de envío de Fase 1.
- **PENDIENTE DE AUDITORÍA:** entidades y mecanismo de cotización/conversión ERP antes de las fases de integración.

La siguiente implementación requiere una tarea posterior; esta bitácora no la ejecuta ni la da por aprobada técnicamente.

## 2026-09-28 — Backend de solicitudes, implementación local y reanudación

- Se retomó el trabajo interrumpido sin descartarlo. Ambos repositorios seguían en `feature/solicitudes-web`: frontend limpio, backend con seis archivos versionados modificados, once clases nuevas y V7 sin versionar. No había tests nuevos del módulo. Se revisaron esos cambios y el contexto antes de continuar.
- Se conservó el POST anónimo `/api/public/quote-requests`, contacto, referencia por secuencia, estado `RECIBIDA`, origen `TIENDA_VIRTUAL`, persistencia relacional con snapshot JSONB, canonicalización/hash, unicidad DB y recuperación idempotente tras rollback en una transacción nueva.
- Se completó el contrato de selección: tipo de venta y tamaño de pack se contrastan con el catálogo para rechazar cambios incompatibles. La regla real del frontend exige material cuando existen materiales activos; se incorporó al backend. Cantidad manual 50 con mínimo/step 12 permanece 50. Se verificó el mínimo real AREA de 0.01 m y se calcula el área exacta con BigDecimal.
- Se corrigió el check de versión JSONB de V7 para rechazar una versión nula. No se alteraron V1–V6 ni se creó V8. **V7 no se aplicó a ninguna base**, manual ni automáticamente.
- CORS mantiene orígenes explícitos; solo la nueva ruta permite POST con `Idempotency-Key`. Administración conserva JWT. Body máximo 64 KiB, `no-store`, errores específicos y respuestas sin contacto, snapshot, hash o clave.
- El presupuesto global en memoria admite por defecto 120 POST/minuto por instancia, con 429/Retry-After. No usa IP ni confía en `X-Forwarded-For`. La protección por cliente/proxy confiable sigue pendiente; el presupuesto global no se presenta como sustituto equivalente.
- Se añadieron cuatro clases unitarias del módulo (37 tests), una prueba de aislamiento TEST en `ConfigurationTest` y `QuoteRequestApiTest` con 14 pruebas PostgreSQL preparadas. `CatalogApiTest` espera siete migraciones. La guarda del perfil test rechaza bases distintas de `miqa_store_test_db` antes de arrancar Flyway/DataSource.
- Validación realmente ejecutada: **53 tests unitarios aprobados, cero fallos/errores/omitidos**, incluyendo regresiones de configuración y administración mediante mocks. Compilación Java 21 y package local aprobados. Las primeras ejecuciones detectaron dos expectativas de test incorrectas, corregidas. No se levantó Spring Boot ni se conectó a PostgreSQL.
- **Pendiente de ejecución:** las 14 pruebas nuevas PostgreSQL y las regresiones integradas existentes. Se compilaron, pero no se ejecutaron para respetar la prohibición de aplicar V7. Persistencia, constraints SQL, cadena HTTP completa y carreras DB todavía requieren comprobación real en TEST autorizado.
- Frontend: solo se actualizaron `02-solicitud-web.md` y esta bitácora. No se modificaron Angular, catálogo, cantidades, SEO, sitemap, rutas, prerender ni entornos. No se ejecutó build frontend porque puede consultar PROD.
- **Fase 1 incompleta:** faltan Angular y apertura de WhatsApp posterior al POST. ERP no fue modificado; no hay precios, bandeja administrativa ni GET público de solicitudes.
- Trabajo conservado sin staging ni commit. Sin push, deploy, cambio/merge a main, acceso DEV/PROD/ERP ni migración aplicada manualmente.

El contrato, límites, modelo, idempotencia y pendientes actuales se detallan en [Solicitud Web](02-solicitud-web.md). Las entradas anteriores describen su momento histórico, no el estado implementado tras esta reanudación.

## 2026-09-28 — Corrección del gate de aislamiento TEST

- La auditoría detuvo la integración antes de arrancar Spring: la guarda solo comprobaba datasource.url y los helpers compartidos no eran exclusivos de TEST.
- Se amplió el EnvironmentPostProcessor para comprobar datasource/Hikari/Flyway y aliases, con destino exacto `127.0.0.1:55432/miqa_store_test_db` y usuario `miqa_store_local`. JNDI y alternativas de conexión innecesarias se rechazan antes de inicializar beans/migraciones. No se cambió la lógica funcional de Solicitudes Web ni V7.
- Configuración TEST fija, contraseña externa `TEST_DB_PASSWORD`. Nuevo `Start-TestPostgres.ps1` para clúster TEST separado: preparado y parseado estáticamente, NO ejecutado. No se reutilizan los helpers que configuran perfil local u otras bases.
- Se añadieron 12 pruebas puramente unitarias de aislamiento; junto con configuración/regresión no-test se aprobaron **26 tests**, sin Spring/PostgreSQL/Flyway. Compilación/package sin tests aprobados.
- PostgreSQL NO iniciado, Flyway NO ejecutado y V7 NO aplicada. Pruebas integradas y arranque real del script siguen pendientes, al igual que Angular/WhatsApp. Fase 1 no terminada. Sin DEV/PROD/ERP, commit, push ni deploy.

## 2026-09-28 — Validación PostgreSQL TEST y revisión final del backend

- El propietario confirmó la creación de PostgreSQL TEST local aislado: `127.0.0.1:55432/miqa_store_test_db`, usuario `miqa_store_local`. No se documenta ni versiona su contraseña.
- Flyway validó siete migraciones y aplicó correctamente V1–V7 desde esquema vacío, dejando TEST en v7. V7 validada, V1–V6 sin cambios; DEV/PROD/ERP no fueron tocados.
- Ejecución manual confirmada: `SPRING_PROFILES_ACTIVE=test`, `./mvnw.cmd test`, **123 tests, 0 failures, 0 errors, 2 skipped, BUILD SUCCESS**. Los reportes Surefire locales corroboran los totales. `QuoteRequestApiTest`: 14 tests aprobados; `TestDatabaseIsolationTest`: 12 aprobados.
- Revisión de todos los cambios backend, incluidos V7, endpoint, idempotencia concurrente, snapshots, validación de catálogo/tipos/límites, contacto, respuesta sin PII, CORS/JWT, body/rate limit y aislamiento TEST. Sin hallazgos bloqueantes. No hay FK al catálogo vivo ni precios en el modelo nuevo.
- La revisión final actualizó únicamente documentación; no repitió tests ni conectó a ninguna base. Cierre autorizado mediante un único commit local del backend en `feature/solicitudes-web`. Los documentos del repositorio frontend quedan sin commit. Sin push, cambio a main, merge, deploy, VPS ni acceso DEV/PROD/ERP.
- Pendientes: Angular y WhatsApp después del POST, protección por cliente/proxy confiable y política de acceso/retención de contacto. El rate limit implementado es global por instancia. La Fase 1 completa sigue pendiente. La validación Maven no acredita por sí sola la ejecución específica del script de preparación TEST.

Esta entrada supersede los pendientes de ejecución PostgreSQL/V7 de las entradas anteriores, que se conservan como historial.

## 2026-09-28 — Integración Angular de Solicitud Web, sin commit

- Se conservaron los cuatro documentos pendientes y la rama `feature/solicitudes-web`. Backend cerrado previamente en `af7645f69593b0cd4bd78e87d8c4f53fd91ed767`, sin modificaciones durante esta tarea.
- Nuevo contrato TypeScript y serialización explícita, servicio compartido de envío y formulario reactivo en panel/drawer. Contacto mínimo y notas generales; POST antes de WhatsApp, referencia visible y enlace de respaldo, sin precios/cuentas/ERP.
- UUID v4 y payload/mensaje inmutables persistidos en sessionStorage antes de enviar. Retry exacto ante errores, timeout o recarga. El carrito mantiene su localStorage, cantidades y reglas; no se borra por éxito ni fallo. Modificar un intento incierto requiere confirmación explícita; una futura solicitud genera otra clave. Recuperación limitada a la sesión de la pestaña, con aviso si el almacenamiento falla.
- Estados de envío, doble submit bloqueado, manejo de 400/409/413/429/red y validación de límites antes del POST. Los datos enviados y el mensaje conservan cantidades manuales exactas, PACK, AREA, materiales/extras y notas.
- **132/132 tests en 28 archivos**. Se actualizaron las expectativas antiguas que buscaban un enlace WhatsApp antes de persistir; las regresiones de cantidades siguen pasando. Build producción correcto mediante interceptación local de fetch: **13 URLs de sitemap, 14 rutas prerenderizadas**, sin consulta de PROD. Se conservaron los artefactos públicos originales. Advertencia de presupuesto de `catalog.scss` no modificado: 4.11 kB frente a 4 kB.
- Edge headless con API simulada, 390/1440 px: error no abre WhatsApp ni pierde selección; retry con misma clave/body; éxito con referencia y enlace. Sin overflow ni excepciones JS; axe sin infracciones en formulario de panel/drawer. Evidencias y herramientas temporales ignoradas en `.tmp/quote-*`.
- Pendiente la prueba integrada Angular → backend TEST real y revisión del propietario. No se declara cerrada integralmente Fase 1 ni validado un despliegue. Protección por cliente/proxy y retención de contacto continúan pendientes.
- Sin commit, push, merge, deploy, cambio de rama, VPS, DEV/PROD ni ERP. No se levantó ni modificó backend.

## 2026-09-28 — Integración local real validada y actualización documental

- Solicitud Web persistente implementada. El propietario confirmó el flujo real: Angular `localhost:4200` → backend TEST `localhost:8081` → PostgreSQL TEST `127.0.0.1:55432/miqa_store_test_db` → solicitud persistida → referencia devuelta al frontend → WhatsApp preparado después de persistir.
- La prueba generó `MIQA-000017` únicamente en TEST. Se comprobaron estado `RECIBIDA`, origen `TIENDA_VIRTUAL`, producto Roll Up, tipo `QUANTITY`, cantidad **5** y snapshot histórico JSONB persistido. No se registran teléfono, email ni otros datos personales de la prueba.
- Idempotencia cubierta por tests: misma clave y contenido devuelven la misma solicitud/referencia sin duplicados; misma clave y contenido diferente responden 409 sin modificar la original ni crear otra.
- La recuperación de intentos pendientes usa `sessionStorage` y está limitada a la sesión/pestaña correspondiente. Precios, mapeo ERP, bandeja ERP y conversión a cotización/OT siguen pendientes, así como protección por cliente/proxy y política de acceso/retención antes de operación pública.
- Revisión final de código sin defectos bloqueantes; se corrige únicamente la observación documental de estado desactualizado. Esta entrada supersede los pendientes históricos de implementación e integración local de Fase 1; no acredita despliegue ni ejecución adicional de tests.
- Actualización exclusivamente documental, sin cambios de código, tests, commit, push, merge, deploy, cambio de rama ni acceso a DEV/PROD/VPS/ERP.
