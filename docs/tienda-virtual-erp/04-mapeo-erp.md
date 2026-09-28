# Mapeo explícito MIQA → ERP

[Volver al índice](README.md).

Alcance de Fase 3. Entidades reales, relaciones y contratos del ERP **PENDIENTES DE AUDITORÍA**; modelo de mapeo **PENDIENTE DE DISEÑO**.

## Principios

- Producto MIQA no equivale automáticamente a Material ERP. Una selección comercial puede necesitar varias asociaciones para interpretarse en ERP.
- Las asociaciones deben ser explícitas, configurables y usar IDs estables de cada sistema.
- No mapear por nombres, slugs, coincidencias de texto ni posición en una lista. Los nombres sirven para mostrar información; pueden cambiar.
- Los IDs conservan el contexto del sistema y del tipo de entidad al que pertenecen. No se supone que un ID MIQA tenga el mismo significado en ERP.
- Se permite mapeo parcial. La solicitud web puede persistirse y conservarse aunque requiera completar información antes de generar una cotización ERP.
- Ningún mapeo debe sobrescribir el snapshot original de la solicitud.

## Posibles destinos

Los siguientes son destinos conceptuales acordados, no nombres definitivos de tablas o clases:

| Destino ERP posible | Asociación a estudiar |
| --- | --- |
| Servicio ERP | Trabajo o servicio comercial requerido por la selección MIQA. |
| Material ERP | Material aplicable cuando corresponda; no se deduce del nombre del producto. |
| Modelo | Modelo requerido por el producto o servicio según las reglas reales del ERP. |
| Variante | Alternativa concreta asociada a la configuración elegida. |
| Extra | Opción adicional seleccionada que tenga correspondencia explícita. |

Las medidas, unidades, presentaciones y cantidades también deben interpretarse correctamente. No se acuerdan conversiones automáticas de unidades ni equivalencias entre paquetes y materiales.

**PENDIENTE DE AUDITORÍA:** qué combinaciones exige cada flujo ERP y cómo se identifican sus entidades. **PENDIENTE DE DISEÑO:** cardinalidad de las asociaciones, reglas por configuración, administración y tratamiento de destinos inactivos o eliminados.

## Mapeo parcial y revisión

El futuro vendedor deberá poder distinguir los datos que ya tienen correspondencia válida de los que necesitan resolución. No se inventarán IDs ni se elegirán coincidencias aproximadas para completar automáticamente lo faltante.

Completar el mapeo permite avanzar hacia la cotización solo si también se cumplen las demás reglas del ERP. Un mapeo completo no prueba por sí solo que una solicitud sea cotizable.

**PENDIENTE DE DISEÑO:** interfaz de resolución, responsables, permisos y cómo registrar la relación entre la solicitud MIQA y la cotización ERP resultante sin alterar la selección histórica.

## Conversión y automatización posteriores

En Fase 4 la solicitud aparecerá en «Solicitudes Tienda Virtual». En Fase 5, el vendedor revisará y completará los datos antes de crear la cotización mediante `OrdenTrabajo` con `esCotizacion=true`. La OT se obtendrá después mediante la conversión existente del ERP.

En Fase 6 podrá estudiarse automatización para productos completamente mapeados. **PENDIENTE DE DISEÑO:** condiciones de elegibilidad y controles. No se autoriza crear directamente una OT desde MIQA ni omitir validaciones comerciales.

La integración será por API entre backends y con bases separadas. Este documento no implementa sincronización, endpoints, tablas ni cambios en ERP.
