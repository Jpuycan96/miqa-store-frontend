# Diagnóstico de pricing ERP — 5 de octubre de 2026

## Resultado real

Evaluaciones directas contra POST https://api-store.solucionesmicaela.com/api/public/pricing/evaluate, sin Angular y sin guardar solicitudes ni modificar catálogos:

| Producto | Cantidad | HTTP MIQA | Estado MIQA | Importe |
| --- | --- | --- | --- | --- |
| LLAVERO DESTAPADOR | 50, 75, 100, 500 | 409 en los cuatro casos | CONFIGURATION_STALE | null |
| IMPRESIÓN UV / Banner 13 Oz, 1 × 1 m | 1 | 200 | PRICE_AVAILABLE | 35.00 PEN, incluye IGV |

El fallo de pricing no lo crea la reactividad de Angular: se reproduce usando directamente el payload público vigente. No se convirtió el 409 en éxito ni se calculó precio en frontend.

## Payloads públicos capturados

### IMPRESIÓN UV

```json
{
  "productId": "9e237e5b-9291-4701-83fd-f77db413f599",
  "quantity": 1,
  "erpMaterialId": "10",
  "erpModelId": null,
  "measures": {
    "ancho": 1,
    "alto": 1
  }
}
```

Binding público observado (estos campos NO se envían desde Angular al endpoint público de pricing):

```json
{
  "erpServiceId": "1",
  "catalogRevision": "2596f371bdc4add30a391818078042e40810c580ec731a34c1577de56c2eff17",
  "configurationVersion": "1"
}
```

Respuesta MIQA real, HTTP 200:

```json
{
  "status": "PRICE_AVAILABLE",
  "amount": "35.00",
  "currency": "PEN",
  "includesIgv": true,
  "scope": "TOTAL_LINEA",
  "quoteMode": "M2",
  "billableBase": {
    "quantity": "1.0",
    "unit": "M2"
  }
}
```

### LLAVERO DESTAPADOR

```json
{
  "productId": "3380d0ac-c869-43e7-a473-83987d2746ab",
  "quantity": 50,
  "erpMaterialId": "412",
  "erpModelId": null,
  "measures": {}
}
```

Binding público observado (estos campos NO se envían desde Angular al endpoint público de pricing):

```json
{
  "erpServiceId": "148",
  "catalogRevision": "97c99d4f0b989adcad439d5b58b4983d0aaf2842669bf81bc6f2e1ee86611f7c",
  "configurationVersion": "0"
}
```

Respuesta MIQA real, HTTP 409:

```json
{
  "status": "CONFIGURATION_STALE",
  "amount": null,
  "currency": null,
  "includesIgv": null,
  "scope": null,
  "quoteMode": null,
  "billableBase": null
}
```

## Traza de código y límites del diagnóstico

1. ErpConfigurator.pricingRequest valida la selección y crea productId, quantity, erpMaterialId, erpModelId y measures. PublicPricing.evaluate mantiene exactamente esa lista de campos.
2. MIQA PricingService.evaluate obtiene el contrato de PublicErpConfiguration.resolve(productId), desde erp_catalog_services.payload; crea una selección/snapshot autoritativo. La revisión del navegador no participa en este POST.
3. MIQA ErpPricing.evaluate construye contractVersion=1, erpServiceId, erpMaterialId, erpModelId, cantidad como string decimal, medidas como strings, catalogRevision y configurationVersion del snapshot. ErpCatalogClient llama la ruta fija /api/integracion/tienda-virtual/v1/precios/evaluar. La clave se usa únicamente en un header y no se registra.
4. En el código ERP disponible, PrecioIntegracionService.java:52–53 compara actual.catalogRevision() con request.catalogRevision(). Si difieren, devuelve HTTP 409, CONFIGURACION_OBSOLETA y motivo CATALOGO_CAMBIO. Ocurre ANTES de validar cantidad/medidas y calcular escalas. Esta rama no compara configurationVersion.
5. MIQA ErpPricing también convierte en CONFIGURATION_STALE: HTTP ERP 404; estado ERP CONFIGURACION_OBSOLETA; o discrepancia de catalogRevision/configurationVersion entre snapshot y una respuesta ERP exitosa. No publica motivos ni revisiones de la respuesta.
6. PublicPricing transforma HTTP MIQA 409 en CONFIGURATION_STALE. El template muestra «Actualizar opciones» y canAdd bloquea el agregado. Este es el disparador exacto confirmado en frontend.

La catalogRevision ERP es un SHA-256 de servicio, configuración técnica, materiales/modelos aprobados, estructura/validez de tarifas, estado y motivos. Incluye rangos de escala; no depende de la cantidad del request ni de evaluatedAt. Un cambio de rangos/configuración puede requerir sincronizar el catálogo MIQA, pero NO se afirma que eso ocurrió en este caso.

NO se dispone aún de HTTP, estado, motivos, catalogRevision ni configurationVersion realmente recibidos de ERP por MIQA. Las revisiones publicadas arriba pertenecen al catálogo MIQA, no a una captura privada de ERP. No se puede distinguir rigurosamente la rama exacta de ErpPricing ni identificar el nuevo hash ERP con la respuesta pública disponible. El problema está confirmado en la integración MIQA/ERP; no se ha demostrado cuál de los dos repositorios necesita una corrección.

## Diagnóstico local sanitizado

Las variables ERP_TIENDA_VIRTUAL_BASE_URL y ERP_TIENDA_VIRTUAL_API_KEY no están disponibles en Process/User/Machine; tampoco APP_ERP_BASE_URL/APP_ERP_API_KEY. Solo se comprobaron presencias, sin imprimir valores. Los logs locales se inspeccionaron mediante conteos de los códigos CATALOGO_CAMBIO, CONFIGURACION_OBSOLETA y CONFIGURATION_STALE; no se encontraron coincidencias ni se imprimieron logs completos. No se leyeron archivos de credenciales.

Helper temporal ignorado: .tmp/diagnose-erp-pricing.mjs. No se instrumentó el código backend ni se añadió logging permanente. Desde una sesión que ya tenga configurada la integración, ejecutar:

```powershell
node D:\MIQA-STORE\miqa-store-frontend\.tmp\diagnose-erp-pricing.mjs
```

El helper reproduce una evaluación de cada producto usando los bindings públicos capturados y el contrato del cliente MIQA. Envía la clave únicamente en el header; no guarda ni muestra headers, variables, excepciones o cuerpos crudos. Bloquea redirects, limita timeout/cuerpo y emite exclusivamente campos permitidos de request y respuesta, con comparación de revisiones. Guarda .tmp/pricing-upstream-sanitized.json. Aquí devuelve NOT_CONFIGURED y no contactó ERP.

Es un REPLAY_FROM_PUBLIC_SNAPSHOT_NOT_SERVER_TRACE: permite obtener una respuesta real de ERP para ese snapshot, pero no afirma observar el request que una instancia MIQA de producción envió. La representación decimal puede diferir (por ejemplo 1 frente a 1.0), aunque el valor numérico es equivalente.

Para capturar el intercambio exacto en una instancia MIQA local configurada, colocar un breakpoint después de client.evaluatePrice(...) en ErpPricing.evaluate y comparar los campos permitidos del snapshot con status y los campos estado/motivos/catalogRevision/configurationVersion de la respuesta parseada. No inspeccionar headers, client.toString, variables de credenciales ni registrar response.body completo. No se arrancó/reinició una instancia ni se alteró producción.

La corrección definitiva se decidirá tras esa captura: confirmar el catálogo vigente, comparar su revisión con el snapshot MIQA y revisar sincronización/proyección o consistencia de la revisión ERP según los datos. No se ejecutó sincronización, cambio backend ni cambio ERP.

## Cambios frontend y validación

- Plantilla compartida para el control de cantidad. Sin medidas: cantidad a la izquierda, materiales a la derecha; pricing debajo al ancho normal. Con medidas: conserva composición M2 existente.
- Listas de materiales verticales, con los radios cuadrados existentes y selección ?nica. CSS genérico, sin condiciones por nombres/IDs.
- Los botones usan incrementoSugerido; multiploObligatorio solo valida. Cubierto un incremento 100 distinto del múltiplo 50.
- Mismo render de PRICE_AVAILABLE y misma autoridad ERP del importe para todas las formas de cotización. Se conservan tests de reevaluación, payload permitido, 409 real, carrito y revisiones.
- 53/53 pruebas enfocadas en cuatro archivos: configurador, pricing, presentación del detalle y cotización ERP.
- 4/4 pruebas del helper con HTTP simulado: éxito, 409 preservado, clave reflejada y excepción con secreto; ningún secreto se imprime.
- Edge headless local con API simulada: cuatro casos M2/ESCALA a 1440/390 px, materiales verticales y posición correcta, cero infracciones axe/overflow/errores JS. Evidencia .tmp/erp-generic-layout-results.json.
- Build offline aprobado, 14 rutas prerenderizadas. Warnings CSS previos: detalle 4.98 kB, catálogo 4.11 kB, panel 4.36 kB. Sitemap/redirects originales restaurados por helper.
- Sin commit, push, deploy ni cambio de rama main. Backends sin modificaciones realizadas por esta tarea.

## Procedimiento VPS posterior a nueva sincronizacion

El propietario confirma que una nueva sincronizacion ERP -> MIQA en produccion no resolvio el 409 para servicio 148/material 412/cantidad 50. No considerar una simple resincronizacion como solucion confirmada.

Helper local temporal: `.tmp/miqa-erp-pricing-vps.py`. Copiarlo al VPS desde PowerShell local:

```powershell
scp -P 2222 "D:\MIQA-STORE\miqa-store-frontend\.tmp\miqa-erp-pricing-vps.py" root@64.176.22.247:/tmp/miqa-erp-pricing-vps.py
```

Ejecutar dentro del VPS:

```bash
sudo python3 -B /tmp/miqa-erp-pricing-vps.py --unit miqa-store.service --case 148:412:50 --case 1:10:1
```

No ejecutado contra VPS por esta tarea. No reinicia ni modifica servicios/configuracion/catalogos. Usa standard library Python 3, systemctl MainPID y el entorno del proceso en memoria; no abre EnvironmentFile. Usa APP_ERP_* si estan presentes, o ERP_TIENDA_VIRTUAL_*. No envia secretos en argv ni los imprime. Consulta catalogo MIQA local en 127.0.0.1:8082 y hace dos evaluaciones ERP autenticadas con clave solo en header. Sin redirects ni proxies ambientales, con timeout/cuerpo limitado y rechazo de secretos reflejados. Fallos generan solo un mensaje generico, sin traceback/cuerpo.

Solo emite erpServiceId, erpMaterialId, erpModelId, quantity, catalogRevisionSent, configurationVersionSent, httpERP, estadoERP, motivosERP, catalogRevisionERP, configurationVersionERP. El caso de referencia usa medidas 1x1 m. Devolver el array JSON de los dos casos; nunca entorno, headers ni credenciales. No se incluyen importes.

Limite: reproduce el contrato del cliente MIQA usando su snapshot publico actual; no instrumenta el request Java real. Si la aplicacion sobreescribe configuracion ERP por argumentos JVM/configuracion externa en lugar de estas variables, abortar ese procedimiento y preparar instrumentacion exacta separada. No deducir valores privados a partir de los publicos.

Interpretacion pendiente de salida real:
- HTTP 409 + CONFIGURACION_OBSOLETA + CATALOGO_CAMBIO y revision distinta confirma A.
- HTTP 200 + PRECIO_DISPONIBLE con ambas revisiones iguales descarta obsolescencia para ese snapshot; revisar adapter/instancia/concurrencia MIQA (B) con captura exacta antes de corregir.
- Otros estados, codigos, HTTP o discrepancia solo de configurationVersion identifican otra rama concreta (C), sin convertirla en exito.

Validacion local con datos sinteticos: once campos permitidos, 409 preservado, payload de referencia 1x1, fallo sin credenciales antes de red. Compilacion Python aprobada. UI y codigo backend/ERP intactos durante esta preparacion. Diagnostico real upstream pendiente de ejecucion por el propietario.
