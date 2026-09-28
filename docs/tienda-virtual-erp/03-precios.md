# Precios públicos selectivos

[Volver al índice](README.md).

Alcance de Fase 2. Estrategia conceptual; implementación exacta **PENDIENTE DE DISEÑO**.

## Modalidades

| Modalidad | Significado para el cliente | Información pendiente |
| --- | --- | --- |
| Precio conocido o fijo | Hay un importe público definido para un alcance comercial concreto. | Unidad, presentación, configuración, cantidad y condiciones a las que aplica. |
| «Desde» | Se muestra un importe inicial para determinadas condiciones; no garantiza el total de cualquier configuración. | Condiciones del importe base y cómo explicar variaciones. |
| «Precio por cotizar» | No hay un importe público aplicable; el vendedor deberá revisarlo. | Presentación y reglas de atención. |

Las modalidades deben poder coexistir en el catálogo y en una misma solicitud. Un producto sin precio público puede solicitarse. «Precio por cotizar» no equivale a precio cero ni a producto gratuito.

## Tres conceptos separados

| Concepto | Propósito |
| --- | --- |
| Precio público MIQA | Información comercial que se decide mostrar al visitante. |
| Precio de venta ERP | Importe de venta que corresponde a la cotización conforme a las reglas del ERP. |
| Costo de inventario ERP | Dato interno de costos, distinto de un precio de venta o un precio público. |

Nunca utilizar automáticamente el costo de inventario como precio público ni exponerlo como tal. La existencia de un mapeo MIQA → ERP no autoriza copiar precios o costos entre sistemas.

No se inventarán precios, stock, reviews ni ratings para completar una ficha. La ausencia de información se conserva explícitamente.

## Solicitud y revisión comercial

La solicitud conservará en su snapshot la información pública de precio que efectivamente se mostró al enviarla, incluida su modalidad y las condiciones necesarias para interpretarla cuando estén definidas.

Un cambio posterior del catálogo no actualizará retroactivamente ese snapshot. El vendedor podrá establecer el precio de la cotización ERP siguiendo sus reglas, distinguiéndolo del dato histórico mostrado en MIQA.

La Fase 1 no depende de implantar un motor de precios: puede registrar solicitudes sin precio disponible.

## Pendientes

- **PENDIENTE DE AUDITORÍA:** fuentes y reglas existentes de precios en MIQA y ERP.
- **PENDIENTE DE DISEÑO:** origen administrable del precio público, moneda, impuestos, unidades, presentaciones, vigencia, precisión y redondeo.
- **PENDIENTE DE DISEÑO:** aplicación de precios a cantidades, medidas, materiales, variantes y extras; cálculo o ausencia de totales en solicitudes mixtas.
- **PENDIENTE DE DISEÑO:** condiciones de «Desde», diferencias entre estimación y cotización final, y tratamiento de un precio que cambia antes del envío.
- **PENDIENTE DE DISEÑO:** modelos, campos, endpoints e interfaz de administración.

Este documento no fija fórmulas, importes, márgenes ni cambios de SEO o datos estructurados.
