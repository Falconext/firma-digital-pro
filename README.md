# 🖋️ Firma Digital Pro

Plataforma web para la **firma digital de documentos PDF** con validez legal, integrada con **ReFirma (RENIEC)** bajo el marco de la IOFE del Estado Peruano.

Versión moderna, escalable y fácil de mantener de una plataforma de firma de documentos. Reemplaza el sello visual por **firma digital real (PAdES)** y agrega gestión de firmantes, auditoría, control de acceso por roles y un panel de métricas.

---

## ✨ Características

- 🔐 **Autenticación segura** con JWT + refresh token y roles (Administrador / Operador).
- 📄 **Gestión de documentos**: subir, buscar, previsualizar, descargar y eliminar PDFs.
- 🖊️ **Firma digital real con ReFirma (RENIEC)** — formato PAdES, certificado del DNIe o token.
- 👥 **Firmantes administrables** (ya no “quemados” en el código).
- 🧾 **Auditoría**: registro de quién firmó qué y cuándo, con huella SHA-256 de integridad.
- 📊 **Dashboard** con métricas y gráfico de documentos firmados por mes.
- 🎨 **Interfaz premium** (estilo *Soft UI*), accesible (WCAG AA) y responsiva.

---

## 🧱 Tecnologías

| Capa      | Tecnología                                             |
| --------- | ------------------------------------------------------ |
| Frontend  | Vite · React · TypeScript · Tailwind CSS · Zustand     |
| Backend   | NestJS · Prisma · JWT (Passport)                       |
| Base datos| SQLite (desarrollo) → PostgreSQL (producción)          |
| Firma     | ReFirma Invoker (RENIEC) — firma PAdES                 |

---

## 📁 Estructura del proyecto

```
firma-digital-pro/
├── backend/          → API (NestJS + Prisma)
│   ├── prisma/       → Esquema de base de datos y datos iniciales (seed)
│   └── src/
│       ├── common/   → Piezas compartidas (Prisma, storage, guards, filtros)
│       ├── config/   → Configuración (lee el .env)
│       └── modules/  → auth, users, signatories, documents, refirma, dashboard
├── frontend/         → Interfaz (Vite + React)
│   └── src/
│       ├── components/ → UI reutilizable + layout
│       ├── lib/        → cliente API, integración ReFirma, utilidades
│       ├── pages/      → Login, Dashboard, Documentos, Firmantes
│       └── stores/     → estado global (auth, notificaciones)
├── docs/             → 📚 Documentación y capacitación (ver abajo)
└── design-system/    → Sistema de diseño (colores, tipografías, reglas)
```

---

## 🚀 Puesta en marcha rápida (desarrollo)

> Requisitos: **Node.js 18+** y **npm**. No necesitas instalar ninguna base de datos (usa SQLite).

### 1) Backend

```bash
cd backend
cp .env.example .env          # crea tu configuración
npm install                   # instala dependencias
npm run prisma:generate       # genera el cliente de base de datos
npx prisma migrate dev --name init   # crea la base de datos
npm run db:seed               # crea el usuario admin y firmantes de ejemplo
npm run start:dev             # arranca la API en http://localhost:3000
```

### 2) Frontend (en otra terminal)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                   # abre http://localhost:5173
```

### 3) Ingresa

- **Usuario:** `admin@firmadigital.pe`
- **Contraseña:** `Admin123!`

> 💡 La firma viene en **MODO DEMO** (simula la firma sin ReFirma instalado), para que puedas probar todo el flujo. Para usar la firma real, revisa [`docs/04-integracion-refirma.md`](docs/04-integracion-refirma.md).

---

## 📚 Documentación y capacitación

Todo está en la carpeta [`docs/`](docs/):

| Documento | Para quién | Contenido |
| --------- | ---------- | --------- |
| [`01-instalacion-configuracion.md`](docs/01-instalacion-configuracion.md) | Equipo técnico | Instalación paso a paso y configuración |
| [`02-capacitacion-funcional.md`](docs/02-capacitacion-funcional.md) | Usuarios finales | Cómo usar la plataforma (manual de usuario) |
| [`03-capacitacion-tecnica.md`](docs/03-capacitacion-tecnica.md) | Ingenieros (no programadores) | El código explicado desde cero |
| [`04-integracion-refirma.md`](docs/04-integracion-refirma.md) | Equipo técnico | Integración con ReFirma (RENIEC) |
| [`05-arquitectura.md`](docs/05-arquitectura.md) | Equipo técnico | Arquitectura, modelo de datos, endpoints |
| [`06-implementacion-despliegue.md`](docs/06-implementacion-despliegue.md) | Equipo técnico | Despliegue en producción e implementación |

---

## 🔒 Seguridad

- Las contraseñas se guardan **hasheadas** (bcrypt), nunca en texto plano.
- El backend valida **todos** los datos de entrada (class-validator).
- Acceso protegido por **guards** JWT y control de **roles**.
- Cada documento firmado guarda su **huella SHA-256** para verificar integridad.

> ⚠️ Antes de producción, cambia los secretos JWT del `.env` por cadenas largas y aleatorias, y usa **HTTPS** (obligatorio para ReFirma).

---

## 📄 Licencia

Software entregado al cliente. Uso interno de la entidad.
