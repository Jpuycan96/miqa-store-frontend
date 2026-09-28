# Proyecto MIQA Store → WhatsApp → ERP

Inicio formal: **2026-09-28**. Fase activa: **Fase 1 — Solicitud Web persistente en MIQA**.

Este conjunto de documentos registra el flujo funcional y las decisiones acordadas para integrar las solicitudes de la tienda con la atención comercial y el ERP. La entrega inicial es exclusivamente documental: no implementa ninguna fase.

## Objetivo

Conservar en MIQA lo que el cliente solicita antes de abrir WhatsApp, asignarle una referencia estable y permitir que posteriormente un vendedor lo revise en el ERP y cree una cotización válida. La solicitud web puede estar completa para MIQA y, aun así, necesitar datos adicionales para el ERP.

## Flujo acordado

1. El cliente entra a MIQA Store, selecciona uno o varios productos y configura cantidades, materiales, medidas, extras y observaciones según corresponda. El soporte futuro de precios permitirá mostrar un precio disponible o «Precio por cotizar».
2. Reúne los productos en «Mi cotización», pulsa «Solicitar cotización» e ingresa sus datos básicos de contacto.
3. MIQA guarda la solicitud y su snapshot histórico. Solo después de confirmar la persistencia devuelve una referencia estable, por ejemplo `MIQA-000123`, y permite abrir WhatsApp.
4. WhatsApp abre con un mensaje que incluye la referencia. Sigue siendo el canal de conversación; cerrar la aplicación o no enviar el mensaje no elimina la solicitud.
5. En una fase posterior, la integración por API entre backends permite que la solicitud aparezca en «Solicitudes Tienda Virtual» del ERP.
6. El vendedor consulta referencia, contacto, productos, cantidades, medidas, materiales, extras, observaciones e información de precio disponible. Completa los datos faltantes y revisa las reglas del ERP.
7. Cuando la información es válida, crea una cotización ERP mediante el mecanismo existente de `OrdenTrabajo` con `esCotizacion=true`. Después puede convertirla en OT mediante el flujo existente del ERP.

```mermaid
flowchart TD
    A[MIQA Store: Mi cotización y contacto] --> B[Backend MIQA: solicitud persistente y snapshot]
    B --> C[Referencia estable MIQA-000123]
    C --> D[WhatsApp: conversación con referencia]
    B -->|Fases posteriores: API entre backends| E[ERP: Solicitudes Tienda Virtual]
    E --> F[Revisión y datos completados por el vendedor]
    F --> G[Cotización ERP: OrdenTrabajo con esCotizacion=true]
    G --> H[Conversión existente a OT]
```

La llegada al ERP no depende de extraer el mensaje de WhatsApp ni de que el cliente lo envíe. No se crea directamente una OT desde MIQA.

## Roadmap

| Fase | Alcance | Estado inicial |
| --- | --- | --- |
| 1 | Solicitud persistente en MIQA: modelo, referencia, estados, contacto, ítems, cantidades, configuraciones, snapshot, endpoint backend, envío frontend y WhatsApp después de persistir. Sin tocar ERP. | Activa para definición; implementación pendiente. |
| 2 | Precios públicos selectivos: conocido/fijo, «Desde» y «Precio por cotizar». | PENDIENTE DE DISEÑO. |
| 3 | Mapeo explícito MIQA → ERP hacia Servicio, Material, Modelo, Variante o Extra. | PENDIENTE DE AUDITORÍA y PENDIENTE DE DISEÑO. |
| 4 | Bandeja ERP «Solicitudes Tienda Virtual». | PENDIENTE DE DISEÑO. |
| 5 | Conversión controlada: Solicitud Web → Cotización ERP → OT. | PENDIENTE DE AUDITORÍA y PENDIENTE DE DISEÑO. |
| 6 | Automatización futura de productos completamente mapeados. | PENDIENTE DE DISEÑO; no habilitada por esta documentación. |

## Estado actual y alcance

Las cantidades editables del catálogo quedaron previamente desplegadas y validadas, según lo comunicado por el propietario. `WORKFLOW.md` registra 117 pruebas aprobadas en 27 archivos y build de producción aprobado. No se repiten esas validaciones ni se verifica producción en esta tarea.

El flujo actual conserva la cotización local y genera WhatsApp. La solicitud web persistente y la integración automática con ERP todavía no existen dentro de este proyecto. No se han modificado ERP ni bases de datos para esta integración.

Se preservan cantidades editables, SEO moderno, categorías dinámicas, sitemap, prerender y BreadcrumbList. La documentación no activa precios, extras nuevos, endpoints ni cambios de interfaz.

## Documentos

- [Arquitectura, responsabilidades y límites](01-arquitectura.md).
- [Fase 1: Solicitud Web persistente](02-solicitud-web.md).
- [Precios públicos selectivos](03-precios.md).
- [Mapeo explícito con ERP](04-mapeo-erp.md).
- [Bitácora del proyecto](05-historial.md).
- Contexto general: [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md).
- Operación del proyecto: [WORKFLOW.md](../../WORKFLOW.md).

**PENDIENTE DE AUDITORÍA** identifica hechos técnicos que deben comprobarse en los sistemas existentes. **PENDIENTE DE DISEÑO** identifica decisiones todavía no adoptadas. Las descripciones conceptuales no son contratos de API ni esquemas de base de datos definitivos.
