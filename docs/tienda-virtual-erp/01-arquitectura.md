# Arquitectura y límites

[Volver al índice](README.md).

Estado: decisiones funcionales acordadas el 2026-09-28; implementación futura.

## Responsabilidades

| Sistema o participante | Responsabilidad objetivo |
| --- | --- |
| Frontend MIQA | Permitir configurar productos y contacto, solicitar persistencia al backend MIQA y abrir WhatsApp únicamente tras recibir confirmación y referencia. |
| Backend MIQA | Validar la solicitud conforme al contrato que se diseñe, persistir contacto e ítems con snapshot, asignar una referencia estable y atender reintentos sin duplicar la misma operación. |
| WhatsApp | Mantener la conversación comercial e incluir la referencia MIQA para identificar la solicitud. No es el almacenamiento de la solicitud. |
| Integración entre backends | Transferir la información por API en fases posteriores. El mecanismo de entrega y sincronización está PENDIENTE DE DISEÑO. |
| ERP | Presentar «Solicitudes Tienda Virtual» y aplicar sus reglas para la cotización y la posterior OT. |
| Vendedor | Revisar la solicitud, completar información y autorizar la creación de la cotización cuando sea válida para ERP. |

## Decisiones acordadas

1. MIQA y ERP mantienen bases de datos separadas.
2. La futura integración será backend-to-backend mediante API; no habrá acceso compartido a PostgreSQL.
3. El frontend MIQA nunca accederá directamente a PostgreSQL ERP. Se comunica con el backend MIQA.
4. Una solicitud web puede existir sin todos los datos necesarios para una cotización ERP. La falta de mapeo no impide por sí sola persistir una solicitud válida en MIQA.
5. Producto MIQA no equivale automáticamente a Material ERP.
6. No se mapearán entidades por nombre ni slug.
7. Los mapeos usarán IDs explícitos y estables, con destinos comprobados en ERP.
8. Precio público MIQA, precio de venta ERP y costo de inventario ERP son conceptos separados.
9. El costo de inventario nunca se utilizará automáticamente como precio público.
10. No se inventarán precios, stock, reviews ni ratings.
11. La solicitud conservará un snapshot histórico de lo seleccionado al enviarla.
12. Los cambios posteriores del catálogo no alterarán ese snapshot.

## Persistencia y conversación

La secuencia obligatoria es guardar en MIQA, confirmar la referencia y después abrir WhatsApp. La solicitud debe sobrevivir a la falta de envío del mensaje, al cierre de WhatsApp y a cambios posteriores del catálogo.

La integración ERP toma como origen la solicitud persistente. No se acuerda leer conversaciones, implementar un bot, usar WhatsApp Cloud API ni interpretar un mensaje como confirmación de persistencia o de recepción en ERP.

## Cotización ERP y OT

El flujo funcional acordado reutilizará `OrdenTrabajo` con `esCotizacion=true` para la cotización. La conversión posterior a OT seguirá el mecanismo existente del ERP.

**PENDIENTE DE AUDITORÍA:** ubicación, contratos, validaciones, permisos y efectos del mecanismo existente. Esta documentación recoge el mecanismo indicado por el propietario; no afirma haber inspeccionado su implementación.

La Fase 6 no autoriza saltarse estas validaciones ni crear directamente una OT desde un visitante anónimo.

## Límites de la Fase 1

La futura implementación de Fase 1 se limita a MIQA: persistencia de solicitudes, envío desde la tienda y apertura posterior de WhatsApp. No incluye cambios en ERP, su bandeja, sus bases de datos ni creación de cotizaciones ERP.

En esta entrega solo se crean documentos en el frontend. No se modifican código Angular, backends, bases, migraciones, configuración, sitemap, dependencias ni producción.

## Pendientes técnicos

| Tema | Estado |
| --- | --- |
| Estructura y capacidades actuales del backend MIQA para solicitudes | PENDIENTE DE AUDITORÍA. |
| Entidades y reglas de cotización/conversión del ERP | PENDIENTE DE AUDITORÍA. |
| Modelo definitivo, contrato del endpoint MIQA y validaciones | PENDIENTE DE DISEÑO, después de auditar MIQA. |
| Contrato de integración, autenticación entre servicios, entrega, reintentos y conciliación | PENDIENTE DE DISEÑO, después de auditar ambos backends. |
| Acceso, conservación y tratamiento de los datos de contacto | PENDIENTE DE DISEÑO. |

No se fijan rutas HTTP, tablas, tecnologías de mensajería ni credenciales en esta etapa.
