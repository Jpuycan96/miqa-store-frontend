# MIQA Store - Workflow de desarrollo y despliegue

Este archivo contiene el contexto operativo del proyecto MIQA Store.

Antes de modificar código con Codex/IA, leer:
1. PROJECT_CONTEXT.md
2. WORKFLOW.md

No asumir que una conversación anterior conserva todo el contexto.

## Arquitectura

MIQA Store es el catálogo público de Soluciones Micaela.

Frontend:
- Angular
- Ruta local: D:\MIQA-STORE\miqa-store-frontend
- Producción: https://store.solucionesmicaela.com
- Despliegue: Cloudflare, conectado al repositorio Git.

Backend:
- Spring Boot / Java 21
- Ruta local: D:\MIQA-STORE\miqa-store-backend
- API PROD: https://api-store.solucionesmicaela.com
- API DEV local: http://localhost:8081
- Servicio PROD en VPS: miqa-store.service
- Puerto PROD interno: 127.0.0.1:8082

Base de datos:
- PROD: miqa_store_db
- DEV: miqa_store_dev_db

MIQA Store y el ERP son sistemas separados.
Nunca conectar el frontend directamente a PostgreSQL.
Nunca modificar las bases del ERP desde tareas de MIQA.

## Entornos frontend

Development:
http://localhost:8081

Production:
https://api-store.solucionesmicaela.com

Angular utiliza environment/fileReplacements.

Antes de publicar verificar que el bundle PROD no apunte a localhost.

## Levantar DEV local

### 1. Túnel SSH

Abrir una PowerShell independiente:

ssh -N -L 5433:127.0.0.1:5432 -p 2222 root@64.176.22.247

Mantener esa terminal abierta.

### 2. Backend

En otra PowerShell:

cd D:\MIQA-STORE\miqa-store-backend
.\scripts\Start-Dev.ps1

El script solicita la contraseña de la BD DEV.

Debe utilizar:
- PostgreSQL: 127.0.0.1:5433
- BD: miqa_store_dev_db
- Spring Boot: localhost:8081

No levantar DEV mediante mvnw spring-boot:run directamente si faltan
las variables requeridas.

### 3. Frontend

En otra PowerShell:

cd D:\MIQA-STORE\miqa-store-frontend
npm start

Frontend:
http://localhost:4200

## Validaciones frontend

Suite completa:

npm.cmd test -- --watch=false

Build producción:

npm.cmd run build

El build genera sitemap y prerender y puede consultar la API PROD.

Revisión Git:

git diff --check
git status

## Git

Antes de modificar:

git status --short
git branch --show-current

Evitar:
- git add .
- git add -A
- git reset --hard
- git clean
- git restore de cambios ajenos

Preferir staging selectivo.

Antes de push:
1. tests;
2. build;
3. git diff --check;
4. git status;
5. revisar archivos staged;
6. confirmar entorno PROD.

## Producción frontend

La rama principal es main.

El push a main puede activar automáticamente el despliegue de Cloudflare.

Por ello:
- no hacer push hasta terminar tests/build;
- verificar producción después del despliegue.

## Producción backend

VPS:
64.176.22.247

SSH:
ssh -p 2222 root@64.176.22.247

Servicio:
miqa-store.service

No editar código fuente directamente en el VPS.
No mostrar ni copiar secretos o archivos de entorno.

## ERP

El ERP existente es independiente de MIQA Store.

ERP:
- Angular + Spring Boot + PostgreSQL
- API: https://api.solucionesmicaela.com

Bases ERP:
- gigantografias_db = PROD
- gigantografias_dev = DEV

Nunca modificar estas bases durante tareas normales de MIQA.

La futura integración MIQA -> ERP debe ser backend-to-backend mediante API,
no mediante acceso compartido a PostgreSQL.

## Solicitudes Tienda Virtual - dirección futura

La tienda actualmente genera cotizaciones locales y WhatsApp.

La arquitectura prevista es:

Cliente
-> configura productos MIQA
-> Solicitud Web persistente en backend MIQA
-> referencia MIQA estable
-> opcionalmente WhatsApp
-> integración backend-to-backend
-> bandeja "Solicitudes Tienda Virtual" en ERP
-> vendedor revisa/completa información
-> creación de cotización ERP válida
-> conversión posterior a OT.

No crear directamente una OrdenTrabajo ERP desde un visitante anónimo.

## Precios

No confundir:
- precio público;
- precio de venta ERP;
- costo de inventario.

Nunca mostrar costos internos del ERP como precios públicos.

No inventar precios, stock, reseñas ni ratings.

## Mapeo MIQA -> ERP

No mapear por nombres o slugs.

Usar identificadores explícitos/configurables.

Producto MIQA no equivale necesariamente a Material ERP.

Pueden requerirse asociaciones con:
- Servicio ERP
- Material comercial ERP
- Modelo
- Variante
- Extra
- presentación/cantidad.

El mapeo puede ser parcial; una solicitud web debe poder existir aunque
todavía necesite resolución manual en ERP.

## Estado validado al 2026-09-28

Se integró la funcionalidad de cantidades editables sobre las categorías/SEO
modernos.

Reglas:
- cantidad inicial = mínimo;
- cantidad manual entera >= mínimo;
- no necesita ser múltiplo del step;
- botones + / - utilizan step;
- nunca bajar del mínimo;
- decimales se truncan;
- vacío/inválido normaliza al mínimo;
- cantidad exacta se conserva en cotización, localStorage y WhatsApp.

Validación:
- 27 archivos de tests;
- 117 tests aprobados;
- build producción aprobado;
- sitemap generado dinámicamente;
- prerender habilitado.

No eliminar SEO moderno, categorías dinámicas, sitemap, prerender ni
BreadcrumbList al modificar catálogo/productos.

## Regla para Codex/IA

Antes de trabajar:
- leer PROJECT_CONTEXT.md;
- leer WORKFLOW.md;
- revisar git status;
- preservar cambios existentes.

Codex/IA debe modificar código solo cuando sea necesario.

Git, tests, builds, commits, pushes y despliegues se ejecutan manualmente
cuando sea práctico para reducir consumo y mantener control.
