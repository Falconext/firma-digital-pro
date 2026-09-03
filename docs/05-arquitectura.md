# 05 · Arquitectura del Sistema

> **Para quién es este documento:** para el **equipo técnico**. Describe la arquitectura general, el modelo de datos, la **lista completa de endpoints** de la API, las decisiones de diseño y las estrategias de escalabilidad de Firma Digital Pro.

---

## Índice

1. [Visión general de la arquitectura](#1-visión-general-de-la-arquitectura)
2. [Diagrama de arquitectura](#2-diagrama-de-arquitectura)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Modelo de datos](#4-modelo-de-datos)
5. [Lista completa de endpoints de la API](#5-lista-completa-de-endpoints-de-la-api)
6. [Formato uniforme de respuesta](#6-formato-uniforme-de-respuesta)
7. [Decisiones de diseño (y por qué)](#7-decisiones-de-diseño-y-por-qué)
8. [Cómo escalar el sistema](#8-cómo-escalar-el-sistema)

---

## 1. Visión general de la arquitectura

Firma Digital Pro es una aplicación web con **arquitectura cliente-servidor desacoplada** en tres grandes bloques, más un componente local:

- **Frontend (SPA)** — Una *Single Page Application* en React + Vite que corre en el navegador. Se comunica con el backend exclusivamente mediante una **API REST** sobre HTTP(S).
- **Backend (API REST)** — Una API en NestJS organizada por módulos, que aplica las reglas de negocio, la seguridad y la persistencia.
- **Persistencia** — Una base de datos relacional gestionada mediante **Prisma** (SQLite en desarrollo, PostgreSQL en producción) y un **almacenamiento de archivos** en disco para los PDFs.
- **ReFirma (local)** — El componente de firma de RENIEC que se ejecuta en la PC del usuario. No es parte del despliegue del servidor; se invoca desde el frontend (ver `04-integracion-refirma.md`).

El principio rector es la **separación de capas y responsabilidades**: cada pieza tiene un rol único y bien definido, lo que facilita mantener, probar y escalar el sistema.

---

## 2. Diagrama de arquitectura

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                            PC DEL USUARIO                                       │
│                                                                                 │
│   ┌──────────────────────────┐          ┌──────────────────────────────────┐   │
│   │      NAVEGADOR           │          │   ReFirma (RENIEC) — LOCAL       │   │
│   │  ┌────────────────────┐  │  ws://    │  Firma PAdES con el certificado  │   │
│   │  │ FRONTEND (React/   │  │ 127.0.0.1 │  digital (DNIe / token) + PIN    │   │
│   │  │ Vite SPA)          │◄─┼───────────┤                                  │   │
│   │  │ pages/ stores/ lib/│  │           └──────────────────────────────────┘   │
│   │  └─────────┬──────────┘  │                                                  │
│   └────────────┼─────────────┘                                                  │
└────────────────┼────────────────────────────────────────────────────────────────┘
                 │  HTTPS  (API REST, JSON)  →  todas las rutas bajo /api
                 ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              SERVIDOR                                           │
│                                                                                 │
│   ┌──────────────────────────── BACKEND (NestJS) ─────────────────────────────┐ │
│   │                                                                            │ │
│   │   main.ts  →  Prefijo /api · CORS · ValidationPipe global ·               │ │
│   │               ResponseInterceptor · HttpExceptionFilter                    │ │
│   │                                                                            │ │
│   │   Guards:  JwtAuthGuard (identidad)  ·  RolesGuard (permisos)              │ │
│   │                                                                            │ │
│   │   Módulos:                                                                 │ │
│   │   ┌────────┐ ┌────────┐ ┌────────────┐ ┌───────────┐ ┌─────────┐ ┌───────┐│ │
│   │   │  auth  │ │ users  │ │ signatories│ │ documents │ │ refirma │ │dashbo.││ │
│   │   └───┬────┘ └───┬────┘ └─────┬──────┘ └─────┬─────┘ └────┬────┘ └───┬───┘│ │
│   │       └──────────┴────────────┴──────────────┴────────────┴──────────┘    │ │
│   │                                   │                                        │ │
│   │        common/  →  PrismaService  │  StorageService                        │ │
│   └───────────────────────────────────┼────────────────────┬───────────────────┘ │
│                                        │                    │                     │
│                    ┌───────────────────▼───┐    ┌───────────▼──────────────┐      │
│                    │   BASE DE DATOS         │    │   ALMACÉN DE ARCHIVOS   │      │
│                    │   (Prisma)              │    │   carpeta storage/      │      │
│                    │   SQLite (dev)          │    │   PDFs originales y      │      │
│                    │   PostgreSQL (prod)     │    │   firmados               │      │
│                    │   tablas: usuarios,     │    └──────────────────────────┘      │
│                    │   firmantes, documentos,│                                     │
│                    │   auditoria             │                                     │
│                    └─────────────────────────┘                                     │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Stack tecnológico

| Capa | Tecnología | Versión (aprox.) | Rol |
| --- | --- | --- | --- |
| Frontend | React | 18 | Construcción de la interfaz por componentes. |
| Frontend | Vite | 6 | Servidor de desarrollo y empaquetado. |
| Frontend | TypeScript | 5 | Tipado estático. |
| Frontend | Tailwind CSS | 3 | Estilos utilitarios. |
| Frontend | Zustand | 5 | Estado global (auth, UI). |
| Frontend | Axios | 1.7 | Cliente HTTP. |
| Frontend | React Router | 6 | Enrutamiento de páginas. |
| Backend | NestJS | 10 | Framework de la API (módulos, DI). |
| Backend | Prisma | 6 | ORM y acceso a datos. |
| Backend | Passport-JWT | 4 | Autenticación con JWT. |
| Backend | bcryptjs | 2.4 | Hash de contraseñas y refresh tokens. |
| Backend | class-validator / class-transformer | 0.14 / 0.5 | Validación de DTOs. |
| Base de datos | SQLite → PostgreSQL | — | Persistencia relacional. |
| Firma | ReFirma Invoker (RENIEC) | según licencia | Firma digital PAdES. |

---

## 4. Modelo de datos

El "plano" de la base de datos está en `backend/prisma/schema.prisma`. Consta de **cuatro tablas** (más dos enumeraciones) que Prisma mapea a nombres en español mediante `@@map`.

### Enumeraciones

- **`Role`**: `ADMIN` · `OPERADOR` — roles del sistema.
- **`DocumentStatus`**: `PENDIENTE` · `FIRMADO` · `ANULADO` — estados del ciclo de vida de un documento.

### Tabla `usuarios` (modelo `User`)

Usuarios que ingresan a la plataforma.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | Int (PK, autoincrement) | Identificador único. |
| `nombre` | String | Nombres del usuario. |
| `apellido` | String | Apellidos del usuario. |
| `email` | String **único** | Correo, usado para iniciar sesión. |
| `password` | String | Contraseña **hasheada con bcrypt** (nunca en texto plano). |
| `rol` | Role (default `OPERADOR`) | Nivel de permisos. |
| `imagenPerfil` | String? | URL/nombre de imagen de perfil (opcional). |
| `estado` | Boolean (default `true`) | `false` = usuario deshabilitado (borrado suave). |
| `refreshToken` | String? | Refresh token **hasheado** para renovar la sesión. |
| `createdAt` | DateTime | Fecha de creación. |
| `updatedAt` | DateTime | Fecha de última actualización. |
| *relaciones* | — | `documents` (documentos creados), `auditLogs` (eventos de auditoría). |

### Tabla `firmantes` (modelo `Signatory`)

Personas cuya firma digital se estampa en los documentos.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | Int (PK) | Identificador único. |
| `nombre` | String | Nombre completo del firmante. |
| `dni` | String | DNI o RUC del firmante. |
| `cip` | String? | Número de colegiatura profesional (opcional). |
| `cargo` | String | Cargo (ej. "Gerente"). |
| `empresa` | String | Empresa/entidad. |
| `motivo` | String (default "Aprobación de Documento") | Motivo de firma que se muestra en el PDF. |
| `estado` | Boolean (default `true`) | `false` = firmante deshabilitado (borrado suave). |
| `createdAt` / `updatedAt` | DateTime | Marcas de tiempo. |
| *relaciones* | — | `documents` (documentos asociados a este firmante). |

### Tabla `documentos` (modelo `Document`)

Documentos PDF gestionados por la plataforma.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | Int (PK) | Identificador único. |
| `fileName` | String | Concepto / nombre visible del documento. |
| `storageKey` | String | Nombre del archivo PDF **original** en disco. |
| `signedKey` | String? | Nombre del archivo PDF **firmado** (si existe). |
| `status` | DocumentStatus (default `PENDIENTE`) | Estado: PENDIENTE, FIRMADO o ANULADO. |
| `hash` | String? | Huella **SHA-256** del archivo firmado (integridad). |
| `signedAt` | DateTime? | Fecha/hora de la firma. |
| `signatoryId` | Int? (FK → firmantes) | Firmante asociado (opcional). |
| `createdById` | Int (FK → usuarios) | Usuario que creó/subió el documento. |
| `createdAt` / `updatedAt` | DateTime | Marcas de tiempo. |

### Tabla `auditoria` (modelo `AuditLog`)

Bitácora de auditoría: rastro de quién hizo qué y cuándo.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `id` | Int (PK) | Identificador único. |
| `action` | String | Acción realizada (ej. `DOCUMENTO_FIRMADO`). |
| `entity` | String | Entidad afectada (ej. `Document`, `User`). |
| `entityId` | Int? | Id del registro afectado. |
| `detail` | String? | Detalle libre (ej. la huella SHA-256). |
| `ip` | String? | Dirección IP de origen. |
| `userId` | Int? (FK → usuarios) | Usuario que ejecutó la acción. |
| `createdAt` | DateTime | Fecha/hora del evento. |

### Relaciones (resumen)

```
usuarios (1) ───< (N) documentos      un usuario crea muchos documentos
firmantes (1) ──< (N) documentos      un firmante puede estar en muchos documentos
usuarios (1) ───< (N) auditoria       un usuario genera muchos eventos de auditoría
```

---

## 5. Lista completa de endpoints de la API

Todas las rutas llevan el prefijo global **`/api`** (configurado en `main.ts`). La columna **Auth** indica el requisito de acceso: 🔓 pública, 🔒 requiere token JWT, 👑 requiere token + rol **ADMIN**.

### Autenticación — `AuthController` (`/api/auth`)

| Método | Ruta | Auth | Descripción |
| --- | --- | :---: | --- |
| `POST` | `/api/auth/login` | 🔓 | Inicia sesión con email y contraseña. Devuelve `token`, `refreshToken` y datos del usuario. |
| `POST` | `/api/auth/refresh` | 🔓 | Renueva el `token` a partir de un `refreshToken` válido. |
| `POST` | `/api/auth/logout` | 🔒 | Cierra sesión: elimina el refresh token guardado. |
| `GET` | `/api/auth/me` | 🔒 | Devuelve los datos del usuario autenticado (para restaurar la sesión). |

### Usuarios — `UsersController` (`/api/usuario`) — *todo el controlador exige 👑 ADMIN*

| Método | Ruta | Auth | Descripción |
| --- | --- | :---: | --- |
| `POST` | `/api/usuario` | 👑 | Crea un usuario. |
| `GET` | `/api/usuario` | 👑 | Lista todos los usuarios. |
| `GET` | `/api/usuario/:id` | 👑 | Obtiene un usuario por id. |
| `PATCH` | `/api/usuario/:id` | 👑 | Actualiza un usuario. |
| `DELETE` | `/api/usuario/:id` | 👑 | Deshabilita un usuario (borrado suave: `estado = false`). |

### Firmantes — `SignatoriesController` (`/api/firmante`)

| Método | Ruta | Auth | Descripción |
| --- | --- | :---: | --- |
| `GET` | `/api/firmante` | 🔒 | Lista los firmantes activos (ordenados por nombre). |
| `GET` | `/api/firmante/:id` | 🔒 | Obtiene un firmante por id. |
| `POST` | `/api/firmante` | 👑 | Crea un firmante. |
| `PATCH` | `/api/firmante/:id` | 👑 | Actualiza un firmante. |
| `DELETE` | `/api/firmante/:id` | 👑 | Deshabilita un firmante (borrado suave). |

### Documentos — `DocumentsController` (`/api/file`) — *todo el controlador exige 🔒 JWT*

| Método | Ruta | Auth | Descripción |
| --- | --- | :---: | --- |
| `POST` | `/api/file/create-new` | 🔒 | Sube un documento nuevo (recibe PDF en base64). Lo asocia al usuario autenticado. |
| `GET` | `/api/file/listar` | 🔒 | Lista documentos. Acepta `?archivo=<texto>` para buscar por concepto. |
| `GET` | `/api/file/:id` | 🔒 | Obtiene los metadatos de un documento (incluye firmante). |
| `GET` | `/api/file/:id/contenido` | 🔒 | Devuelve el PDF (firmado si existe) en **base64** para previsualizar. |
| `GET` | `/api/file/:id/descargar` | 🔒 | Descarga el PDF como archivo (`application/pdf`). |
| `PATCH` | `/api/file/:id` | 🔒 | Actualiza metadatos del documento (concepto, firmante). |
| `DELETE` | `/api/file/:id` | 🔒 | Elimina el documento y sus archivos físicos (original y firmado). |

### ReFirma — `RefirmaController` (`/api/refirma`) — *todo el controlador exige 🔒 JWT*

| Método | Ruta | Auth | Descripción |
| --- | --- | :---: | --- |
| `POST` | `/api/refirma/preparar/:id` | 🔒 | Prepara la firma: devuelve los argumentos del Invoker (`argumentsBase64`). |
| `POST` | `/api/refirma/firmado/:id` | 🔒 | Recibe el PDF firmado (base64), lo guarda, calcula SHA-256, marca FIRMADO y audita. |

### Dashboard — `DashboardController` (`/api/dashboard`) — *exige 🔒 JWT*

| Método | Ruta | Auth | Descripción |
| --- | --- | :---: | --- |
| `GET` | `/api/dashboard/resumen` | 🔒 | Devuelve totales, últimos documentos y firmados por mes (para el panel). |

---

## 6. Formato uniforme de respuesta

Todas las respuestas del backend viajan con la misma envoltura, garantizada por el `ResponseInterceptor` (éxitos) y el `HttpExceptionFilter` (errores).

**Éxito:**

```json
{ "code": 1, "data": { }, "message": "OK", "status": 200 }
```

**Error:**

```json
{ "code": 2, "data": null, "message": "El correo ya está registrado", "status": 409 }
```

- `code`: `1` = éxito, `2` = error (compatibilidad con la lógica del frontend original).
- `data`: la carga útil real (o `null` en errores).
- `message`: mensaje legible.
- `status`: código HTTP.

El cliente `frontend/src/lib/api.ts` desenvuelve automáticamente el campo `data`, de modo que los componentes reciben directamente el contenido útil.

---

## 7. Decisiones de diseño (y por qué)

### 7.1 Arquitectura modular (NestJS)

Cada dominio (auth, users, signatories, documents, refirma, dashboard) es un **módulo autónomo** con su controlador y servicio. **Por qué:** aísla responsabilidades, facilita la navegación del código, permite probar módulos por separado y agregar nuevos sin afectar a los existentes.

### 7.2 Separación de capas (controlador vs. servicio)

Los **controladores** solo enrutan y validan; la **lógica de negocio** vive en los **servicios**. **Por qué:** mantiene los controladores delgados, concentra las reglas en un lugar testeable y evita duplicación. Un cambio de regla se hace en el servicio sin tocar la capa HTTP.

### 7.3 Interceptor de respuesta uniforme + filtro de errores

Todas las respuestas comparten un mismo formato `{ code, data, message, status }`. **Por qué:** el frontend tiene un único contrato para leer respuestas y errores, lo que simplifica el manejo de estados y mensajes, y mantiene compatibilidad con la lógica del proyecto original.

### 7.4 Seguridad por guards y validación por DTOs

`JwtAuthGuard` protege la identidad, `RolesGuard` los permisos, y el `ValidationPipe` global rechaza datos malformados según los DTOs. **Por qué:** la seguridad y la validación se aplican de forma **declarativa** (con decoradores) y consistente, reduciendo el riesgo de olvidos. Las contraseñas y refresh tokens se guardan **hasheados con bcrypt**.

### 7.5 Borrado suave (soft delete)

Usuarios y firmantes no se eliminan físicamente: se marcan con `estado = false`. **Por qué:** preserva el **historial y la trazabilidad** (esencial en firma digital), evita romper relaciones con documentos ya firmados y permite reactivar registros. *(Los documentos, en cambio, sí se eliminan físicamente junto con sus archivos, por decisión operativa.)*

### 7.6 Auditoría

Cada firma genera un registro en la tabla `auditoria` (acción, entidad, usuario, IP, huella SHA-256). **Por qué:** la firma digital exige **no repudio y trazabilidad**; poder responder "quién firmó qué, cuándo y desde dónde" es un requisito legal y de seguridad.

### 7.7 Storage aislado y verificación de integridad

El acceso a archivos se centraliza en `StorageService`, que además calcula el **SHA-256** de cada documento firmado. **Por qué:** aislar el almacenamiento permite migrar a la nube (S3, etc.) sin tocar la lógica de negocio, y la huella permite verificar que un PDF no fue alterado tras firmarse.

### 7.8 Configuración por entorno

Todo lo variable (puerto, CORS, secretos JWT, `DATABASE_URL`, carpeta de storage) se lee de variables de entorno vía `configuration.ts`. **Por qué:** separa configuración de código, permite distintos ambientes (dev/prod) sin recompilar y mantiene los secretos fuera del repositorio.

### 7.9 Frontend desacoplado con cliente HTTP único

Toda la comunicación pasa por `lib/api.ts`, que gestiona token, refresco automático y desenvoltura de respuestas. **Por qué:** un único punto de control para autenticación y errores; cambios de URL o política de tokens se hacen en un solo archivo.

---

## 8. Cómo escalar el sistema

La arquitectura está pensada para crecer de forma incremental. Estrategias, de menor a mayor esfuerzo:

### 8.1 Migrar de SQLite a PostgreSQL

Primer paso natural al pasar a producción o cuando haya concurrencia real. En `schema.prisma` se cambia `provider = "postgresql"` y se ajusta `DATABASE_URL`. **Por qué:** SQLite (archivo único) no soporta bien múltiples escrituras concurrentes; PostgreSQL sí, y ofrece respaldos, réplicas y mejor rendimiento. Pasos detallados en `06-implementacion-despliegue.md`.

### 8.2 Almacenamiento de archivos en la nube

Reemplazar el disco local por un servicio de objetos (Amazon S3, Azure Blob, GCS). Como todo el acceso a archivos está aislado en `StorageService`, basta con reimplementar sus métodos (`savePdfFromBase64`, `read`, `remove`, `sha256`) contra el SDK de la nube. **Por qué:** durabilidad, respaldo automático y capacidad de servir varias instancias del backend compartiendo el mismo almacén.

### 8.3 Escalado horizontal del backend (balanceo de carga)

Ejecutar varias instancias del backend detrás de un balanceador (Nginx, o el balanceador del proveedor). **Requisito previo:** que el estado no viva en una sola instancia. La API ya es **prácticamente stateless** (el estado está en la base de datos; la sesión es un JWT). Solo hay que mover el storage a la nube (8.2) y usar PostgreSQL (8.1) para que cualquier instancia atienda cualquier petición.

### 8.4 Base de datos gestionada y réplicas

Usar un servicio de PostgreSQL gestionado con réplicas de lectura y respaldos automáticos. **Por qué:** alta disponibilidad y reparto de la carga de lectura (por ejemplo, las consultas del dashboard).

### 8.5 Caché y optimización

Introducir una capa de caché (por ejemplo Redis) para respuestas frecuentes como el resumen del dashboard, y añadir índices en la base de datos sobre campos de búsqueda (`fileName`, `status`, `signedAt`). **Por qué:** reduce carga y mejora tiempos de respuesta a medida que crece el volumen de documentos.

### 8.6 Observabilidad

Agregar logging estructurado, métricas y trazas (por ejemplo con un APM). **Por qué:** operar a escala requiere ver el estado del sistema, detectar cuellos de botella y auditar incidentes. El sistema ya usa el `Logger` de NestJS en el módulo de ReFirma como base.

### 8.7 CDN para el frontend

Servir el frontend compilado (estático) desde una CDN o un servicio como Vercel/Netlify. **Por qué:** el frontend es un conjunto de archivos estáticos; una CDN lo entrega rápido y libera al servidor de esa tarea.

> 📌 **Regla de crecimiento:** por el desacoplamiento y el aislamiento de storage y datos, se puede escalar **una pieza a la vez** sin reescribir el sistema. Empieza por PostgreSQL + storage en la nube; el resto se añade según la demanda real.
