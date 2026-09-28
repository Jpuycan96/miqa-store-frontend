# Fase 1 — Solicitud Web persistente en MIQA

[Volver al índice](README.md).

Fase activa para definición. No implementada en esta entrega. No se diseñan tablas definitivas ni migraciones sin auditar antes el backend MIQA.

## Objetivo y secuencia

Transformar la intención reunida en «Mi cotización» en una solicitud almacenada en MIQA, con contacto, ítems y referencia estable, antes de abrir WhatsApp. El almacenamiento local del navegador no sustituye esta persistencia.

1. El cliente configura uno o varios productos y pulsa «Solicitar cotización».
2. Ingresa los datos básicos de contacto que se definan.
3. El frontend envía la solicitud al futuro endpoint del backend MIQA.
4. El backend valida y persiste la solicitud, su snapshot y su referencia.
5. Solo tras la confirmación de guardado, el frontend abre WhatsApp con la referencia.

Si el guardado falla o su resultado es incierto, no debe presentarse una solicitud como confirmada ni abrirse WhatsApp con una referencia inventada. El reintento debe resolver la incertidumbre sin crear duplicados de la misma operación.

## Información que deberá conservarse

Esta lista describe información funcional, no nombres definitivos de campos o tablas.

| Grupo | Información a conservar |
| --- | --- |
| Identificación | Referencia estable MIQA, momento del envío y estado de la solicitud. |
| Contacto | Datos básicos suministrados por el cliente. Campos obligatorios, formatos y validación: PENDIENTE DE DISEÑO. |
| Ítems | Identificadores disponibles de los productos MIQA y su descripción/nombre al enviar. |
| Cantidades | Valor exacto solicitado, unidad y presentación aplicables; no confundir unidades, paquetes o piezas. |
| Configuración | Materiales, medidas con sus unidades, extras y demás opciones seleccionadas que correspondan al producto. |
| Observaciones | Texto proporcionado por el cliente, con asociación al ítem o a la solicitud según el diseño posterior. |
| Precio disponible | Modalidad e información pública efectivamente mostrada al enviar, si existe; ausencia de precio o «Precio por cotizar» cuando corresponda. |
| Snapshot | Copia histórica suficiente para comprender lo seleccionado sin depender del catálogo futuro. |

Las cantidades manuales enteras válidas deben conservarse exactamente. El mínimo sigue aplicando; `step` gobierna los botones, no obliga a que la cantidad manual sea múltiplo de él. Se conservan las reglas actuales de truncado de decimales y normalización de entradas inválidas.

El soporte de extras en el alcance futuro no implica habilitar ahora selectores que no estén visibles en la tienda. Se registrará lo que efectivamente permita seleccionar el producto cuando se implemente la fase.

No se requiere tener resuelto el mapeo ERP para guardar una solicitud válida de MIQA. Las reglas mínimas propias de aceptación del backend MIQA están PENDIENTES DE DISEÑO.

## Snapshot histórico

Los IDs permiten identificar los elementos originales, pero no bastan para reconstruir el pasado. Deben conservarse también las descripciones, unidades, cantidades, medidas, opciones y datos públicos de precio relevantes en el momento del envío.

Renombrar, cambiar el precio, despublicar o retirar posteriormente un producto u opción no debe alterar la solicitud histórica. La revisión comercial o el enriquecimiento posterior para ERP deben distinguirse de la selección original del cliente.

**PENDIENTE DE DISEÑO:** representación del snapshot, validación de los datos enviados frente al catálogo, tratamiento de cambios entre selección y envío, y registro de correcciones posteriores. No se decide todavía un formato de almacenamiento.

## Referencia estable

La referencia permite que cliente, WhatsApp y vendedor hablen de la misma solicitud. El ejemplo acordado es `MIQA-000123`, representativo de `MIQA-XXXXXX`.

Debe identificar una solicitud de forma única y mantenerse estable tras reintentos o atención posterior. No presupone que la referencia visible sea la clave primaria de una tabla.

**PENDIENTE DE DISEÑO:** mecanismo de generación, alcance de unicidad, numeración, concurrencia y comportamiento al superar la longitud del ejemplo. No se fija una secuencia SQL ni un tipo de ID técnico.

## Estados conceptuales

Se necesita distinguir la solicitud guardada de su atención y de su futura integración. Como vocabulario de trabajo se contemplan estas situaciones; **nombres, transiciones y permisos están PENDIENTES DE DISEÑO**, no son un enum aprobado:

| Situación conceptual | Significado |
| --- | --- |
| Registrada en MIQA | La persistencia terminó y existe una referencia estable. |
| Pendiente de revisión o de información | La solicitud existe, pero requiere trabajo comercial antes de una cotización ERP. |
| Vinculada a cotización ERP | Situación de fases posteriores, tras una conversión válida y trazable. |

Antes de persistir existe una selección local o un intento de envío; no debe confundirse con una solicitud ya registrada. Abrir WhatsApp no prueba que el mensaje se haya enviado, recibido o leído. El estado de entrega a ERP tampoco debe deducirse del estado de WhatsApp.

## Idempotencia

La misma operación de envío puede repetirse por doble clic, pérdida de respuesta o reintento de red. Debe producir una sola solicitud y devolver la misma referencia cuando el envío previo ya fue persistido.

Dos solicitudes intencionalmente distintas no deben fusionarse solo porque contienen los mismos productos o el mismo contacto. Tampoco debe modificarse silenciosamente una solicitud histórica al reutilizar la identidad de un intento con contenido diferente.

**PENDIENTE DE DISEÑO:** identificación de la operación, alcance y vigencia, persistencia de la deduplicación, concurrencia, respuesta ante contenido distinto y recuperación después de una respuesta perdida. No se fija un header ni un contrato HTTP.

## Relación con WhatsApp

El mensaje posterior al guardado debe incluir la referencia MIQA. El texto completo y la experiencia ante un bloqueo o fallo de apertura están PENDIENTES DE DISEÑO.

Cerrar WhatsApp, no tenerlo disponible o decidir no enviar el mensaje no elimina ni revierte la solicitud. Reabrir la conversación para una solicitud ya confirmada debe reutilizar su referencia, sin requerir crear otra solicitud.

## Criterios de aceptación de la futura implementación

1. Una solicitud con uno o varios ítems y contacto válido queda persistida en MIQA antes de abrir WhatsApp.
2. La confirmación devuelve una referencia estable y el mensaje de WhatsApp la incluye.
3. Las cantidades y configuraciones válidas conservan exactamente la selección enviada, sin redondeo a múltiplos de `step`.
4. Cerrar WhatsApp o no enviar el mensaje no elimina la solicitud.
5. Un cambio posterior del catálogo no altera el snapshot histórico.
6. Repetir la misma operación, incluso si se perdió la respuesta del servidor, no crea solicitudes duplicadas.
7. Un fallo de persistencia no se presenta como éxito; la selección puede reintentarse sin perderse.
8. La ausencia de precio público o de mapeo ERP no bloquea por sí sola una solicitud válida de MIQA.
9. La Fase 1 funciona sin modificar ERP, sin escribir en su base de datos y sin crear cotizaciones ERP ni OT.
10. Se conservan las funcionalidades actuales de cantidades, catálogo, SEO, categorías dinámicas y prerender.

Estos criterios son requisitos futuros; no constituyen pruebas ejecutadas en esta entrega documental.
