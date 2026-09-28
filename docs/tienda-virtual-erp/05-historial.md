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
