# Fase 1 — Solicitud Web persistente en MIQA

[Volver al índice](README.md).

Actualización: **2026-09-28**. Backend cerrado en el commit local `af7645f69593b0cd4bd78e87d8c4f53fd91ed767`. **V1–V7 aplicadas desde esquema vacío exclusivamente en PostgreSQL TEST local; V7 validada.** Suite backend: 123 tests, 0 failures, 0 errors, 2 skipped, BUILD SUCCESS. **Solicitud Web persistente implementada e integración local real validada**, según confirmación del propietario. Angular y WhatsApp posterior al POST implementados localmente, sin commit/push/despliegue del frontend. Revisión final de código sin defectos bloqueantes.

Flujo validado el **2026-09-28**: Angular `localhost:4200` → backend TEST `localhost:8081` → PostgreSQL TEST `127.0.0.1:55432/miqa_store_test_db` → solicitud persistida → referencia devuelta al frontend → WhatsApp preparado después de persistir. La prueba generó `MIQA-000017` únicamente en TEST; se comprobaron `RECIBIDA` / `TIENDA_VIRTUAL`, Roll Up, `QUANTITY`, cantidad **5** y snapshot histórico JSONB persistido. No se incluyen datos personales de la prueba.

## Flujo y alcance

El backend recibe contacto y selecciones, valida el catálogo, guarda cabecera e ítems con snapshot y confirma una referencia después del commit. Angular abre WhatsApp con esa referencia únicamente después de confirmar el guardado. Ante un timeout reintenta con la misma clave y contenido.

No hay precios, importes cero, cuentas de clientes, DNI/RUC, bandeja administrativa, GET público de solicitudes ni integración ERP. No se han modificado ERP, DEV ni PROD. El carrito local y los enlaces generales de contacto WhatsApp se conservan; las acciones de envío del panel/drawer ahora requieren persistencia.

## Implementación Angular

- `QuoteStore` continúa administrando selección, cantidades y localStorage sin cambios. `quote-request.ts` define request/response y serializa únicamente contacto, notas e IDs/configuración, sin nombres, área calculada, precios ni referencia del cliente.
- `QuoteSubmission`, singleton compartido, usa HttpClient y `STORE_API_CONFIG`; no cambia environments. `QuoteSubmit` presenta el mismo formulario reactivo en panel y drawer, con nombre/teléfono obligatorios y email/notas generales opcionales. Estados idle/sending/success/error; doble submit bloqueado, timeout 30 segundos, errores 400/409/413/429/red recuperables.
- Al primer envío válido genera UUID v4 con Web Crypto y guarda copia exacta del request y del mensaje. La copia no se reconstruye a partir del catálogo ni del carrito durante los reintentos. Los cambios posteriores del carrito corresponden a otra solicitud; el formulario informa de ello y permite ver el contenido original.
- `sessionStorage`, clave `miqa.quote-submission.v1`, mantiene el intento por pestaña, incluso al recargar. Guarda contacto, notas, selección, UUID y mensaje mientras no esté confirmado; no añade contacto al localStorage del carrito. Al confirmar elimina el payload/contacto de ese registro y conserva referencia/enlace. Fallo de almacenamiento muestra aviso y permite continuar en memoria; cerrar/eliminar la sesión pierde esta recuperación. No hay sincronización entre pestañas.
- Reintentar conserva UUID y payload frente a cualquier error. «Modificar solicitud» descarta el intento solo tras confirmación explícita que advierte que el anterior podría haberse registrado. Tras éxito, «Preparar otra solicitud» habilita un nuevo envío con otra UUID. Abrir de nuevo WhatsApp desde el enlace confirmado no hace otro POST.
- Solo después de respuesta válida se abre `whatsAppUrl` con la referencia MIQA, las líneas originales y notas generales. Si el navegador bloquea la ventana, el enlace «Continuar en WhatsApp» queda visible. El usuario aún debe enviar el mensaje en WhatsApp. Ni éxito ni fallo borran automáticamente el carrito.
- Límites comprobados antes del nuevo POST: 1–50 ítems, enteros hasta 1 000 000 000, AREA de 0.01 a 1000 m con hasta seis decimales y 64 KiB de JSON. No se redondean cantidades ni se imponen múltiplos. El catálogo, la obligatoriedad de material y la consistencia de PACK siguen bajo autoridad del backend.

## Contrato implementado

`POST /api/public/quote-requests`, anónimo, con `Content-Type: application/json` e `Idempotency-Key` obligatorio en formato UUID completo. El cliente deberá generar una clave aleatoria por operación, conservarla durante los reintentos y usar otra para una solicitud intencionalmente nueva.

Ejemplo ilustrativo; los IDs deben existir y estar disponibles en el catálogo del entorno:

```json
{
  "contact": {
    "name": "Cliente de ejemplo",
    "phone": "+51999999999",
    "email": "cliente@example.test"
  },
  "notes": "Observación general",
  "items": [
    {
      "productId": "roll-up",
      "saleType": "QUANTITY",
      "quantity": 50,
      "extraIds": [],
      "notes": "Observación del ítem"
    },
    {
      "productId": "tarjetas-personales",
      "saleType": "PACK",
      "packSize": 1000,
      "quantity": 1
    },
    {
      "productId": "vinil-impreso",
      "saleType": "AREA",
      "quantity": 2,
      "widthMeters": 2.5,
      "heightMeters": 1.2,
      "materialId": "blanco",
      "extraIds": ["laminado"]
    }
  ]
}
```

`saleType` identifica la configuración seleccionada; `packSize` es obligatorio solamente para PACK. Ambos se contrastan con el catálogo. Si cambiaron, se devuelve 409 en vez de reinterpretar la selección. Etiquetas y nombres históricos siempre proceden del backend. Los campos ajenos al DTO se ignoran: enviar nombres, referencia, estado, origen, área calculada o precios no los convierte en autoridad ni los incorpora al snapshot.

Respuesta mínima, sin contacto, ítems, snapshot, hash ni clave:

```json
{
  "reference": "MIQA-000001",
  "receivedAt": "2026-09-28T15:00:00Z",
  "confirmation": "Solicitud recibida"
}
```

| HTTP | Resultado |
| --- | --- |
| 201 | Nueva solicitud confirmada tras commit. |
| 200 | Replay confirmado con referencia y fecha originales. |
| 400 | Formato, contacto, límites o configuración inválidos; clave ausente/inválida. |
| 409 | Clave reutilizada con contenido diferente o selección incompatible con el catálogo actual. |
| 413 | Cuerpo superior a 65 536 bytes. |
| 429 | Presupuesto global del POST agotado; incluye `Retry-After`. |

Los errores reutilizan `ApiError`. El conflicto de solicitudes no muestra el mensaje de slug/nombre y su 413 no muestra el límite de imágenes de 5 MB. Los errores administrativos existentes conservan sus mensajes. Las respuestas de esta ruta llevan `Cache-Control: no-store`, incluidos errores que atraviesan la cadena de seguridad.

## Validaciones y reglas

| Campo/regla | Contrato |
| --- | --- |
| Contacto | Nombre obligatorio, máximo 160 caracteres. Teléfono obligatorio, entrada máxima 32; acepta dígitos, `+` inicial, espacios, paréntesis y guiones. Se eliminan separadores y se exigen 7–15 dígitos; no se infiere país ni se verifica posesión. |
| Email | Opcional, máximo 254 y formato email. Puede omitirse o ser `null`/cadena vacía. |
| Ítems | Entre 1 y 50, conservando orden; no se fusionan líneas en backend. |
| IDs | Máximo 64 caracteres. Extras opcionales, máximo 50 IDs por ítem; se deduplican y ordenan para comparar contenido. |
| Notas | Generales y por ítem, opcionales, máximo 1000 caracteres cada una. Se recortan extremos; no se trunca contenido excesivo. |
| Cantidad | Entero JSON `Long`/`bigint`, desde el mínimo vigente del producto (o 1) hasta **1 000 000 000**. Rechaza decimales, strings numéricos y booleanos. |
| Step | Se guarda como regla histórica, pero no exige múltiplos. `min=12`, `step=12`, `quantity=50` se conserva como 50. Normalizar entradas de los controles sigue siendo responsabilidad del frontend. |
| PACK | Cantidad de paquetes, tamaño, etiqueta y unidad; no se multiplica ni sustituye la cantidad solicitada. |
| AREA | Ancho y alto obligatorios, `BigDecimal`, de **0.01 a 1000 metros**, máximo seis decimales. Área exacta por pieza calculada en backend; no se multiplica por cantidad. |
| Otros tipos | No admiten dimensiones; QUANTITY y AREA no admiten `packSize`. |
| Catálogo | Producto existente/publicado y categoría activa. Material y extras propios del producto y activos; no se sustituyen opciones inválidas. |
| Material | Si existen materiales activos, debe seleccionarse uno, conforme a `createQuoteItem` actual; sin materiales activos puede omitirse. |

El mínimo real **0.01 m** y las notas por ítem de 1000 caracteres se comprobaron en `product-detail.ts`, su plantilla y `quote-utils.ts`. El envío Angular comunica los límites técnicos de dimensiones, precisión y cantidad antes del POST; los controles existentes de configuración y sus cantidades editables se conservan.

## Modelo y migración V7

Archivo backend: `src/main/resources/db/migration/V7__quote_requests.sql`. V1–V6 intactas; no se creó V8. El 28/09/2026 Flyway validó siete migraciones y aplicó V1–V7 desde esquema vacío en TEST, ahora en v7. No se aplicó V7 a DEV/PROD.

| Almacenamiento | Contenido |
| --- | --- |
| `quote_request_reference_seq` | Secuencia PostgreSQL bigint dedicada; admite huecos y no usa count/max ni memoria. |
| `quote_requests` | ID técnico UUID como varchar, número y referencia únicos, fechas, estado `RECIBIDA`, origen `TIENDA_VIRTUAL`, contacto, notas, clave UUID única y hash SHA-256. |
| `quote_request_items` | ID técnico, FK obligatoria a solicitud, posición 1–50 única por solicitud, ID/nombre/slug históricos de producto, tipo, cantidad bigint, unidad, pack, medidas numeric, área, notas y JSONB. |

Referencia de al menos seis dígitos: `MIQA-000001`, `MIQA-999999`, `MIQA-1000000`. El número no es el ID técnico. Un check vincula referencia y número. V7 incluye checks de estado/origen/cantidad/presentación/área/versión JSONB, unicidad de idempotencia/referencia, índice cronológico y timestamps con los triggers existentes. El índice único de `(request_id, position)` cubre también el acceso por FK.

No hay FK hacia producto, categoría, material o extra. Retirar o renombrar el catálogo no elimina ni recalcula el histórico. La FK ítem→solicitud impide eliminar una cabecera con ítems. No se expone API de actualización/eliminación.

Snapshot `schemaVersion: 1`: producto, categoría `{id,name,slug}`, tipo, cantidad, unidad, presentación, medidas/área, material `{id,name}`, extras `{id,name}`, notas y reglas vigentes: mínimo, step, máximo de cantidad, obligatoriedad de material y límites de dimensiones. No contiene precio ni sustituto cero. Fase 2 deberá versionar su evolución sin reescribir estos snapshots.

El nuevo agregado usa `JdbcTemplate` y límites transaccionales propios mediante `JdbcTransactionManager`; no reemplaza el gestor JPA de administración. Cabecera e ítems se guardan en una transacción. `REPEATABLE_READ` proporciona una instantánea consistente del catálogo para toda la solicitud.

## Idempotencia exacta

La idempotencia está cubierta por tests: misma clave y mismo contenido devuelven la misma solicitud/referencia sin duplicados; misma clave y contenido diferente responden 409 sin modificar la solicitud original ni crear otra.

1. Validar DTO y clave. Canonicalizar contacto/notas recortando extremos, teléfono sin separadores, opcionales vacíos como ausencia, decimales sin ceros finales y extras únicos ordenados. El orden de ítems sí importa; IDs y contenido interior de notas no se reinterpretan.
2. SHA-256 de una representación JSON posicional estable, versión 1. Incluye contacto, notas y configuración seleccionada, tipo y tamaño de pack. No depende del orden de propiedades JSON, nombres del catálogo ni clave.
3. Buscar la clave persistida **antes de consultar catálogo**. Mismo hash devuelve la confirmación guardada; distinto hash devuelve 409. Permite replay aunque el catálogo haya cambiado o desaparecido después.
4. Si no existe, iniciar una transacción nueva, volver a comprobar clave, validar catálogo/configuración y guardar cabecera e ítems.
5. PostgreSQL garantiza unicidad con `uq_quote_requests_idempotency_key`. Solo se reconoce como carrera de idempotencia SQLSTATE `23505` con ese nombre exacto de constraint.
6. El intento perdedor termina en rollback; se consulta al ganador en **otra transacción nueva** y se compara el hash. No se reutiliza una transacción abortada ni se convierte cualquier `DataIntegrityViolationException` en replay.

No hay caducidad de claves ni borrado implementado. Claves distintas con el mismo contenido crean solicitudes diferentes. Las fechas se guardan con microsegundos para que la confirmación inicial coincida con la recuperada de PostgreSQL.

## Seguridad y protección básica

CORS conserva orígenes explícitos configurados. Solo la ruta nueva añade POST/OPTIONS e `Idempotency-Key`; el resto del catálogo mantiene GET/HEAD/OPTIONS y administración conserva JWT. Sin wildcards ni credenciales CORS.

El filtro limita body antes de deserializar, también sin `Content-Length`/con transferencia chunked. Los DTOs sensibles ocultan datos en `toString`; el nuevo módulo no registra body, contacto, notas, clave ni hash. No se añaden logs SQL/de parámetros. Las respuestas no revelan excepciones internas.

Se conserva y prueba un **límite global por instancia**, configurable con `app.quote-requests.max-requests-per-minute`, por defecto **120 POST por ventana de 60 segundos**. Cuenta intentos y replays; devuelve 429/`Retry-After`. Es atómico y acotado en memoria; no usa IP ni `X-Forwarded-For`.

**Pendiente: limitación por cliente/IP en proxy confiable.** No se verificó la cadena real de proxies ni se confía en encabezados arbitrarios. Un cliente puede consumir el presupuesto global de todos; se reinicia con el proceso, no se comparte entre réplicas y no evita ataques distribuidos o conexiones lentas. No equivale a protección antiabuso completa. No hay CAPTCHA.

## Validaciones realizadas y pendientes

Validación vigente del 28/09/2026, confirmada por el propietario y corroborada con reportes Surefire: **123 tests, 0 failures, 0 errors, 2 skipped, BUILD SUCCESS**, ejecutando `./mvnw.cmd test` con `SPRING_PROFILES_ACTIVE=test`. PostgreSQL TEST local aislado creado en `127.0.0.1:55432/miqa_store_test_db`, usuario `miqa_store_local`; contraseña externa. DEV, PROD y ERP no fueron tocados. La revisión final solo actualiza documentación y no repite pruebas ni abre conexiones.

Antecedente de implementación: **53 tests unitarios aprobados**, cero fallos/errores/omitidos, sin iniciar Spring Boot, servidor, Flyway ni DataSource:

| Clase | Tests |
| --- | ---: |
| `QuoteRequestCanonicalizerTest` | 11 |
| `QuoteCatalogTest` | 10 |
| `QuoteRequestServiceTest` | 7 |
| `QuoteRequestHttpTest` | 9 |
| `ConfigurationTest` | 7 |
| `ProductionConfigurationTest` | 7 |
| `AdminCatalogServiceDeletionTest` | 2 |

Las últimas dos clases usan mocks/configuración en memoria; no acceden a producción ni administración real. Tras la auditoría posterior, la guarda TEST se amplió: exige `127.0.0.1:55432/miqa_store_test_db` y usuario `miqa_store_local` en datasource y en cualquier URL/usuario explícito Hikari/Flyway. Rechaza JNDI, clases de DataSource alternativas, mapas de propiedades JDBC y combinar local/prod. Se ejecuta como EnvironmentPostProcessor después de ConfigData y antes de crear DataSource/Flyway, con binding de aliases.

Validación anterior del aislamiento: **26 tests unitarios aprobados** (`TestDatabaseIsolationTest`, `ConfigurationTest`, `ProductionConfigurationTest`), sin arrancar Spring ni DB. La configuración TEST ya no usa `TEST_DB_PORT`/`TEST_DB_USERNAME`; solo la contraseña entra por `TEST_DB_PASSWORD`. El script backend `scripts/Start-TestPostgres.ps1` prepara un clúster TEST separado en `.local/postgres-test/data`, sin invocar los helpers compartidos. Se revisó sintácticamente; no se ejecutó durante esta revisión ni se infiere su ejecución del resultado Maven. Procedimiento y límites en el README backend. V7 y la integración PostgreSQL ya quedaron validadas por la suite completa posterior.

Las pruebas HTTP unitarias invocan controlador, filtro y procesador CORS directamente, sin levantar Spring; **no sustituyen un arranque HTTP integrado**. Las pruebas de transacciones usan un gestor simulado; **no prueban una carrera PostgreSQL real**.

`QuoteRequestApiTest`: **14 tests de integración ejecutados, 0 failures, 0 errors**. Cubren POST anónimo, persistencia/tipos/snapshot, validaciones, replay tras cambios/eliminación del catálogo, conflictos, referencias y claves concurrentes, CORS/no-store, administración protegida y rechazo sin persistencia parcial. Usa perfil test y comprueba `current_database()`. `TestDatabaseIsolationTest`: **12 tests, 0 failures, 0 errors**. `CatalogApiTest` verifica siete migraciones.

Compilación Java 21 y empaquetado local con tests omitidos: antecedentes aprobados. Los primeros intentos unitarios detectaron dos expectativas incorrectas de test, corregidas antes del resultado final. La suite completa posterior sí arrancó Spring/Flyway contra TEST aislado y pasó con los totales indicados. No se ejecutaron tests/build frontend: solo cambiaron documentos y el build podría consultar PROD.

Validación Angular local: **132/132 tests, 28 archivos**. Incluye serialización de los tres tipos, contacto, opciones, UUID, doble submit, retry inmutable/recarga, errores, conservación del carrito, referencia y apertura posterior al éxito, además de regresiones de cantidades manuales. Build correcto con catálogo simulado: sitemap de 13 URLs y 14 rutas prerenderizadas; no valida disponibilidad de API real. Advertencia en `catalog.scss` no modificado: 4.11 kB/4 kB. Edge 390/1440 con API interceptada: error → retry → éxito correcto, sin overflow ni excepciones JS; axe sin infracciones en ambos formularios. Los archivos temporales y evidencias están ignorados. No se ejecutó ninguna petición a DEV/PROD ni se modificó backend.

Pendientes actuales:

- Mantener V7 fuera de DEV/PROD hasta una autorización posterior; la validación TEST no autoriza despliegue.
- Resolver protección por cliente en proxy confiable y política de acceso/retención de contacto antes de operación pública.

La implementación de Fase 1 y su integración local real están validadas; esto no constituye validación de despliegue. ERP sigue sin modificaciones. Las fases de precios, mapeo ERP, bandeja ERP y conversión a cotización/OT siguen pendientes.
