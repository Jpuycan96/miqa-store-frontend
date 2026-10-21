# MIQA Store: preparación de producción — 21/10/2026

**Actualización posterior del mismo día:** propietario confirma V13 y sincronización PROD exitosa
(6 categorías, 153 servicios, 0 subcategorías/asignaciones). GET verificados: commercial/categories 200/[],
categories 200/6, ambos listados de productos sin filtro 200/49. Header ahora recurre a categorías públicas
solo ante árbol comercial vacío exitoso. Frontend listo para ese escenario: 282 pruebas Angular y 58 Worker
aprobadas, build real 58 rutas y menú con 6 categorías desktop/móvil. Sin commit/push/deploy.
Los bloqueos por 404 y requisitos V13 pendientes de las secciones siguientes son **históricos**, anteriores
a esta confirmación; no ejecutar nuevamente migración/sincronización para publicar este ajuste de navegación.

**Decisión: frontend verificado, despliegue comercial todavía condicionado al backend/ERP PROD.**
Arquitectura confirmada por el propietario: Angular/Worker en Cloudflare; API/PostgreSQL/media en Vultr.
No trasladar Angular a Vultr. No se desplegó, migró, reinició, hizo commit/push ni modificó producción.
Solo se hicieron consultas HTTP GET/OPTIONS de producción. No se consultó PostgreSQL remoto ni ERP PROD.

## 1. Estado y separación de cambios

`main` frontend: `e17c2c8701c1e7f8da245e0d682ba42a3169404b`.
`main` backend: `c0b31732d71969f06c4d2b5d4c33cff7b6439ddb`.
Ambos coinciden con `origin/main` local **y con `git ls-remote origin refs/heads/main`** en esta revisión.
No hay commits adelantados; los cambios comerciales están en working tree, incluidos archivos sin seguimiento.
Ramas auxiliares existentes no se mezclaron. No hay workflow de despliegue del frontend versionado en este repo;
la configuración remota de Workers Builds no se inspeccionó.

Inventario frontend al inicio: **14 modificados y 6 nuevos**, todos preservados:

| Grupo | Archivos pendientes |
| --- | --- |
| Funcional/visual, candidato a release | `src/app/core/data/catalog-api.service.ts`, `src/app/core/data/product-catalog.ts`, `src/app/core/header/header.ts`, `header.html`, `header.scss`, `src/app/features/products/catalog/catalog.ts`, `src/app/shared/models/product.ts` |
| Pruebas de release | `src/app/core/data/catalog-api.service.spec.ts`, `src/app/features/products/catalog-api.spec.ts`, `src/app/core/header/commercial-navigation.spec.ts` (nuevo) |
| Validación offline, no artefacto publicable | `scripts/offline-catalog-fetch.cjs` |
| Documentación | `README.md`, `PROJECT_CONTEXT.md` |
| Exclusivo desarrollo/TEST | `angular.json` (solo ramas development), `src/environments/environment.development.ts`, `proxy.development.json`, `src/main.development.ts`, `src/main.server.development.ts`, `src/environments/test-http.config.ts`, `src/environments/test-http.config.spec.ts` |

Los archivos TEST pueden conservarse como herramientas locales; no deben copiarse como configuración de runtime
ni aplicarse a production. Si se excluyen de un futuro commit, excluir también sus referencias en angular.json.
No restaurar globalmente este repositorio: hay trabajo deliberado anterior.

Listo en frontend: árbol comercial, dropdowns alineados/sombra/hover, teclado/móvil, filtros padre/hija,
búsqueda combinada, deduplicación, TODOS y detalle con regreso. Servicios públicos históricos/SEO preservados.
No hay gestión Angular independiente de subcategorías/asignaciones ni estado global de sincronización.
No se requiere construir esas pantallas para publicar la navegación ya implementada.

## 2. Verificación ejecutada y bloqueo real

- `npm.cmd test -- --watch=false`: **278/278**, 39 archivos.
- `node --test worker/*.test.mjs`: **58/58**.
- `npm.cmd run build -- --configuration production --output-path .tmp/production-readiness/dist`:
  **correcto, datos públicos reales de PROD**, sin mocks ni NODE_OPTIONS. 57 URLs, 58 rutas.
  Se guardaron y restauraron byte a byte los originales de `public/sitemap.xml` y `public/_redirects`.
- `wrangler deploy --dry-run --assets .tmp/production-readiness/dist/browser --outdir .tmp/production-readiness/worker --config wrangler.jsonc`:
  correcto; **sin subir** Worker/assets. Se utilizó el CLI ya instalado, 4.131.1.
- 196 archivos JS/MJS/HTML/JSON/CSS inspeccionados: cero coincidencias de túnel `127.0.0.1:18083`,
  `localhost:18083`, proxy.development.json, main.development, test-http.config, testMediaReferences o nombre DB TEST.
- Cuatro avisos de presupuesto CSS no bloqueantes: header 4.88 kB, catálogo 4.24 kB, detalle 4.31 kB,
  panel 6.73 kB; umbral de aviso 4 kB, límite 8 kB intacto.

| HTTP producción, sin sesión | Resultado |
| --- | --- |
| `/api/public/categories` | 200, 6 categorías |
| `/api/public/products` | 200, 49 productos |
| `/api/public/commercial/categories` | **404** |
| `/api/public/commercial/products` | **404** |
| `/api/admin/auth/me` | 401 esperado |
| OPTIONS admin desde `https://store.solucionesmicaela.com` | 200, origen exacto y Authorization admitidos |
| Una imagen `/media/products/...` publicada por PROD | 200 image/png |

**No publicar todavía este frontend comercial:** build exitoso no acredita disponibilidad de endpoints.
El Header consulta el árbol comercial sin fallback al histórico ante 404: perdería la navegación por categorías.
El artefacto real está aislado en `.tmp/production-readiness/dist`, pero debe reconstruirse tras preparar
backend/snapshot PROD. El `dist/` habitual sigue siendo el de validaciones offline anteriores: **NO subirlo**.

## 3. Backend, migraciones y ERP

**Sí requiere backend nuevo de MIQA**, salvo que esos endpoints ya existan internamente y solo falte exponerlos;
eso se distingue en el preflight local de Vultr. Las implementaciones están sin seguimiento en el backend local:

- `catalog/CommercialCatalog{Controller,Repository,Service}.java`.
- `erp/ErpCommercialClassification{,Client,Controller,Failure,Repository,Service,Validation}.java`.
- `src/main/resources/db/migration/V13__erp_commercial_classification.sql`.
- Cambios adicionales de `pom.xml` (H2 solo test) y `config/LocalDatabaseGuard.java` (aislamiento vultr-test),
  pruebas comerciales/de aislamiento y documentación. Revisarlos como parte del candidato; no usar un JAR viejo
  de `D:\MIQA-STORE\release` por su nombre. Construir desde el árbol fuente revisado.

**V13** añade cuatro columnas comerciales en categories y cuatro tablas:
`erp_commercial_subcategories`, `erp_commercial_services`, `erp_commercial_service_subcategories`,
`erp_commercial_sync_status`, con claves/índices y estado inicial NEVER. No llena la clasificación desde TEST.
Requiere el esquema anterior, incluido `erp_category_id` de V10.
El conjunto **real** de migraciones pendientes en PROD se desconoce hasta leer `flyway_schema_history`.
Si PROD está en V12, el único delta local es V13. Si falta alguna V1–V12, detenerse y revisar su impacto;
no autorizar implícitamente todas por arrancar el JAR. Flyway está habilitado al arrancar prod: **start/restart
del JAR candidato puede ejecutar migraciones**, no es una comprobación inocua.
No usar clean/repair/baseline ni ejecutar V13 a mano además de Flyway.

ERP PROD debe ofrecer `GET /api/integracion/tienda-virtual/v1/clasificacion-comercial` con
`X-ERP-Service-Key`, contrato completo y revisión válida. Las fuentes locales ERP lo implementan como lectura
transaccional. La funcionalidad nueva y su SQL `docs/migrations/2026-10-19__subcategorias_tienda_virtual.sql`
también están sin versionar allí, junto con cambios ajenos: **no promover todo su working tree**.
Ese SQL crea subcategorías/relaciones/revisiones; rechaza objetos ya existentes, no es un script de reejecución.
No prueba que falte en PROD: requiere inventario del responsable ERP.

Si endpoint/esquema/credencial PROD no están listos, **bloquear esta release comercial y tramitar un cambio ERP
separado**. Esta preparación no incluye migraciones, cambios de claves, despliegue ni reinicio ERP/LaserMonitor.
No conectar MIQA PROD a ERP DEV (8084), a MIQA TEST (8083/18083), ni copiar sus datos/asignaciones.
Las cantidades 7/25/126/3/SUCCESS pertenecen a DEV/TEST; no son criterios numéricos de aceptación PROD.

La API MIQA usa `ERP_TIENDA_VIRTUAL_BASE_URL` / `ERP_TIENDA_VIRTUAL_API_KEY` (o propiedades `app.erp.*`)
también para el catálogo técnico v1. Confirmar destino PROD efectivo y conservar las credenciales PROD actuales
si ya son correctas. Si falta provisionar credencial, hacerlo por el responsable ERP en otro cambio, nunca
reutilizar DEV/TEST ni rotar unilateralmente una clave compartida. El navegador nunca recibe esa clave.
La sincronización comercial es manual; no hay job/webhook comercial nuevo. Comparte lock con v1: puede haber
409 SYNC_BUSY temporal; ejecutar una sola vez en ventana tranquila, verificar y no hacer reintentos ciegos.
Los productos deben tener publicación, binding y configuración v1 elegibles: snapshot SUCCESS no publica todo.

Producción frontend conserva `environment.ts`: `https://api-store.solucionesmicaela.com`; no necesita proxy SSH.
Autenticación: JWT Bearer solo en admin, guard con `/auth/me`, 401 limpia sesión. JWT en localStorage es el diseño
existente (accesible ante XSS), no una cookie HttpOnly. CORS exacto HTTPS, sin credenciales/cookies ni wildcard.
Mantener secretos exclusivamente en configuración externa protegida; conservar JWT PROD y cuentas existentes.
No ejecutar bootstrap de administrador para actualizar una instalación existente.

## 4. Procedimiento futuro — NO ejecutado

Todos los bloques siguientes requieren una ventana de despliegue autorizada. Parar en cada condición fallida.
Las rutas/unidad son las de las plantillas locales; **confirmarlas contra la instalación real antes de usarlas**.
La documentación deploy/ antigua dice que media no está servida; el GET actual devuelve 200: no reinstalar
esa plantilla Nginx ni sobrescribir su configuración operativa. No se requiere cambiar Nginx para estos endpoints.

### A. Preflight, solo lectura en Vultr

Entrar mediante el alias SSH de producción conocido por el operador; no se inventa host/usuario SSH.

```bash
systemctl is-active miqa-store.service
systemctl show miqa-store.service -p FragmentPath -p User -p Group
test -f /opt/miqa-store/app/miqa-store-backend.jar
test -f /etc/miqa-store/miqa-store.env
curl --fail --silent --show-error http://127.0.0.1:8082/actuator/health
curl --silent --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:8082/api/public/commercial/categories
sudo -u postgres psql -X -p 5432 -v ON_ERROR_STOP=1 -d miqa_store_db -c \
  "BEGIN READ ONLY; SELECT current_database(), current_setting('port'), version(); SELECT version, script, checksum, success FROM flyway_schema_history ORDER BY installed_rank; COMMIT;"
```

Confirmar prod/miqa_store_db/8082, Java 21, versión PostgreSQL y herramienta pg_dump compatible,
historial correcto sin errores y pendientes limitados a V13 (o V13 ya aplicada y validada).
Si el endpoint interno da 200 y el externo 404, resolver exposición en el host MIQA; no migrar por deducción.
Comprobar ERP PROD y credencial por canal protegido; no mostrar archivos env ni imprimir claves.
Ensayar antes backup/restore y arranque del JAR anterior con esquema V13 en un entorno aislado autorizado.

### B. Candidato backend, local Windows

Tras revisar/seleccionar los cambios del backend y ejecutar su suite aislada comercial/de configuración:

```powershell
Set-Location D:\MIQA-STORE\miqa-store-backend
# Java 21; sin levantar Spring contra ninguna base real.
.\mvnw.cmd -o '-DskipTests' package
if ($LASTEXITCODE -ne 0) { throw 'Package falló' }
jar tf target/miqa-store-backend-0.0.1-SNAPSHOT.jar | Select-String 'V13__erp_commercial_classification.sql|CommercialCatalogController.class'
Get-FileHash target/miqa-store-backend-0.0.1-SNAPSHOT.jar -Algorithm SHA256
```

Package sin tests no sustituye la suite: en esta preparación se ejecutaron pruebas Angular/Worker, no Maven.
El README backend contiene la selección H2/HTTP sin PostgreSQL real; exigir su resultado actual antes de liberar.
Transferir solo ese JAR verificado a `/tmp/miqa-store-backend.candidate.jar` en Vultr, mediante el SSH aprobado.
No transferir env, secretos, DB TEST, target completo, scripts de bootstrap o plantillas systemd/Nginx.

### C. Respaldo y actualización MIQA, root en Vultr

Prerrequisito: endpoint ERP PROD disponible, prueba de restauración completada y rollback de JAR compatible
con V13 ensayado. Este bloque sí detiene/arranca **solo MIQA**, exclusivamente en la futura ventana autorizada.

```bash
sudo -i
set -euo pipefail
umask 077
release_stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir="/opt/miqa-store/backups/release-$release_stamp"
pg_bin=/usr/lib/postgresql/18/bin  # plantilla existente; ajustar SOLO a versión comprobada en A
test -x "$pg_bin/pg_dump"
test -x "$pg_bin/pg_restore"
test -f /tmp/miqa-store-backend.candidate.jar
read -r -p 'SHA256 del JAR candidato verificado localmente: ' candidate_sha256
printf '%s  %s\n' "$candidate_sha256" /tmp/miqa-store-backend.candidate.jar | sha256sum --check -
install -d -m 0700 "$backup_dir"
systemctl stop miqa-store.service
cp -p /opt/miqa-store/app/miqa-store-backend.jar "$backup_dir/backend.jar"
cp -p /etc/miqa-store/miqa-store.env "$backup_dir/miqa-store.env"
sudo -u postgres "$pg_bin/pg_dump" -p 5432 -d miqa_store_db -Fc > "$backup_dir/database.dump"
"$pg_bin/pg_restore" --list "$backup_dir/database.dump" > /dev/null
tar -C /opt/miqa-store -czf "$backup_dir/media.tar.gz" media
sha256sum "$backup_dir"/backend.jar "$backup_dir"/database.dump "$backup_dir"/media.tar.gz > "$backup_dir/SHA256SUMS"
sha256sum --check "$backup_dir/SHA256SUMS"
install -o root -g miqa-store -m 0640 /tmp/miqa-store-backend.candidate.jar /opt/miqa-store/app/miqa-store-backend.jar.next
mv /opt/miqa-store/app/miqa-store-backend.jar.next /opt/miqa-store/app/miqa-store-backend.jar
systemctl start miqa-store.service  # Flyway aplica V13 aquí, si es el único pendiente aprobado
```

Conservar respaldo restringido y una copia fuera de Vultr por el canal de backups existente; no adjuntarlo
al informe. Si falla backup, instalación o health, no continuar: usar rollback D. No aplicar cambios de
configuración si los valores ERP PROD existentes son correctos. Los cambios necesarios se hacen con sudoedit
en el archivo protegido y revisión separada; jamás con secretos como argumentos o en el frontend.

```bash
systemctl is-active miqa-store.service
curl --fail --silent --show-error http://127.0.0.1:8082/actuator/health
sudo -u postgres psql -X -p 5432 -v ON_ERROR_STOP=1 -d miqa_store_db -c \
  "BEGIN READ ONLY; SELECT version, script, success FROM flyway_schema_history WHERE version='13'; COMMIT;"
curl --fail --silent --show-error https://api-store.solucionesmicaela.com/api/public/commercial/categories
curl --silent --output /dev/null --write-out '%{http_code}\n' https://api-store.solucionesmicaela.com/api/admin/auth/me
```

Exigir health UP, V13 success, endpoints comerciales 200 y admin 401 sin sesión. Antes de sincronizar, árbol
vacío puede ser correcto. Login real con cuenta **PROD** y GET /auth/me deben verificarse por el operador.
Preparar un archivo efímero root-only 0600 `/run/miqa-admin-prod.curl` con el header Bearer de esa sesión,
sin imprimirlo ni guardar el token en Git/chat/historial; sin URL alternativa ni verbose en ese archivo.

```bash
curl --fail --silent --show-error --config /run/miqa-admin-prod.curl \
  --request POST http://127.0.0.1:8082/api/admin/erp-commercial-classification/sync \
  | jq -e '.outcome == "SUCCESS" and (.classificationRevision | startswith("sha256:"))'
curl --fail --silent --show-error --config /run/miqa-admin-prod.curl \
  http://127.0.0.1:8082/api/admin/erp-commercial-classification/sync \
  | jq '{outcome,succeededAt,categories,subcategories,services,assignments}'
rm -- /run/miqa-admin-prod.curl
```

Verificar nombres, slugs, totales propios de PROD y al menos un padre/hija con productos públicos elegibles.
No exigir 7/25/126/3 ni fabricar asignaciones. Si no hay categorías públicas útiles, mantener frontend anterior.

### D. Rollback backend

Ante fallo, frontend anterior permanece activo. Usar la ruta exacta del respaldo de C, no el archivo más reciente
por patrón. **Solo si la compatibilidad del JAR anterior con V13 fue ensayada**:

```bash
# Misma sesión root; backup_dir es el respaldo registrado de C.
test -s "$backup_dir/backend.jar"
sha256sum --check "$backup_dir/SHA256SUMS"
systemctl stop miqa-store.service
install -o root -g miqa-store -m 0640 "$backup_dir/backend.jar" /opt/miqa-store/app/miqa-store-backend.jar.next
mv /opt/miqa-store/app/miqa-store-backend.jar.next /opt/miqa-store/app/miqa-store-backend.jar
cp -p "$backup_dir/miqa-store.env" /etc/miqa-store/miqa-store.env
systemctl start miqa-store.service
curl --fail --silent --show-error http://127.0.0.1:8082/actuator/health
```

Esto no revierte V13 ni la sincronización. No borrar tablas/columnas ni historial Flyway para regresar.
Si requiere recuperar datos, mantener MIQA detenido y activar recuperación DBA separada usando **su backup
PROD**, primero restaurado/verificado en instancia aislada. No se da una restauración destructiva automática:
puede perder solicitudes/editorial posteriores; debe acordarse el punto de recuperación. Nunca restaurar TEST
sobre PROD, ni tocar PostgreSQL completo, ERP o LaserMonitor. No ejecutar rollback de JAR no compatible.

### E. Frontend Cloudflare, después de C verificado

Desde el árbol fuente revisado de esta release; coordinar cualquier Workers Builds automático para evitar
que otro despliegue sobrescriba la versión. Registrar ID/versiones anteriores en Cloudflare antes de publicar.

```powershell
Set-Location D:\MIQA-STORE\miqa-store-frontend
node_modules/.bin/wrangler.cmd deployments list --config wrangler.jsonc --json
npm.cmd test -- --watch=false
if ($LASTEXITCODE -ne 0) { throw 'Tests fallaron' }
node --test worker/*.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'Worker tests fallaron' }
npm.cmd run build -- --configuration production
if ($LASTEXITCODE -ne 0) { throw 'Build falló' }
$testHits = rg -l '127\.0\.0\.1:18083|localhost:18083|test-http\.config|testMediaReferences|main\.development|proxy\.development\.json|miqa_store_c2_restore_test' dist/miqa-store-frontend
if ($LASTEXITCODE -gt 1 -or $testHits) { throw 'Artefacto no aprobado' }
node_modules/.bin/wrangler.cmd deploy --dry-run --config wrangler.jsonc
if ($LASTEXITCODE -ne 0) { throw 'Empaquetado falló' }
# SOLO tras autorización de publicación de la release revisada:
node_modules/.bin/wrangler.cmd deploy --config wrangler.jsonc
```

Se publica **Worker y `dist/miqa-store-frontend/browser` completos** mediante Wrangler/wrangler.jsonc,
incluidos index.csr.html, assets y rutas generadas. No subir `server/` a Vultr ni Angular sources/node_modules,
proxy/env TEST, .tmp, fixtures o dumps. Conservar el artefacto anterior/version Cloudflare y el nuevo checksum.

Verificar en navegador limpio `https://store.solucionesmicaela.com/productos`, menú desktop/móvil,
padre/hija/búsqueda/TODOS usando slugs obtenidos **de PROD**, recarga de URL filtrada, una ficha y una imagen.
Network debe consumir api-store HTTPS, sin 18083/8083/8084 ni hosts DEV/TEST. Login/logout PROD y /auth/me,
sin hacer cambios editoriales ni enviar solicitudes reales durante este smoke.

```bash
curl --fail --silent --show-error https://api-store.solucionesmicaela.com/api/public/commercial/categories | jq '[.[] | {name,slug,subcategories}]'
curl --fail --silent --show-error https://store.solucionesmicaela.com/sitemap.xml > /dev/null
```

Rollback frontend, PowerShell (usar **ID de versión anterior**, no ID de deployment):

```powershell
$previousWorkerVersion = Read-Host 'ID de VERSION anterior registrado antes del deploy'
node_modules/.bin/wrangler.cmd rollback $previousWorkerVersion --config wrangler.jsonc --message 'Rollback MIQA: verificación de release fallida'
```

Repetir smoke y registrar versión efectiva. Si se revierten ambas capas, **primero frontend**, después backend,
para que clientes no dependan de endpoints retirados. Clientes con pestañas antiguas pueden conservar JS nuevo:
preferir mantener backend compatible mientras se evalúa el fallo. No restaurar DB como reacción automática.

## 5. Cierre de preparación

Pendientes antes de GO: inventario real servicio/Flyway PROD, endpoint ERP PROD y credencial confirmados por
su responsable, backup restaurable, ensayo rollback sobre V13 y pruebas/package actuales del backend, snapshot
comercial PROD exitoso y árbol público útil. Las comprobaciones estáticas/HTTP de este informe no acreditan esos pasos.
Archivos creados por esta preparación: este informe y arneses/evidencias ignorados en `.tmp/production-readiness*`;
se actualizó PROJECT_CONTEXT. No se alteró código funcional ni configuración TEST/productiva.
