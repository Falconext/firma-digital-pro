# 06 · Implementación y Despliegue en Producción

> **Para quién es este documento:** para el **equipo técnico** encargado de llevar Firma Digital Pro de desarrollo a **producción**. Incluye el checklist de puesta en marcha, la migración de SQLite a PostgreSQL, la configuración de seguridad, la compilación y el servido de ambos proyectos, opciones de despliegue, HTTPS, copias de seguridad y un plan de implementación por fases.

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Checklist de puesta en marcha](#2-checklist-de-puesta-en-marcha)
3. [Variables de entorno y seguridad](#3-variables-de-entorno-y-seguridad)
4. [Migrar de SQLite a PostgreSQL](#4-migrar-de-sqlite-a-postgresql)
5. [Compilar el backend y el frontend](#5-compilar-el-backend-y-el-frontend)
6. [Opciones de despliegue](#6-opciones-de-despliegue)
7. [HTTPS (obligatorio para ReFirma)](#7-https-obligatorio-para-refirma)
8. [Copias de seguridad](#8-copias-de-seguridad)
9. [Plan de implementación por fases](#9-plan-de-implementación-por-fases)

---

## 1. Requisitos previos

| Componente | Recomendación |
| --- | --- |
| **Node.js** | Versión 18 LTS o superior (backend y frontend lo requieren). |
| **npm** | Incluido con Node.js. |
| **PostgreSQL** | 14+ (para producción). No hace falta en desarrollo (usa SQLite). |
| **Servidor** | VPS Linux (Ubuntu 22.04+ recomendado) o plataforma gestionada. |
| **Dominio + certificado TLS** | Un dominio propio y certificado HTTPS (Let's Encrypt es gratuito). |
| **ReFirma** | En las PCs de los usuarios que firmarán (ver `04-integracion-refirma.md`). |

---

## 2. Checklist de puesta en marcha

Una lista para no olvidar nada al desplegar por primera vez:

- [ ] Servidor aprovisionado con Node.js 18+ instalado.
- [ ] PostgreSQL instalado y con una base de datos y usuario creados.
- [ ] Código del proyecto clonado en el servidor.
- [ ] **Backend:** archivo `.env` de producción creado (a partir de `.env.example`).
- [ ] Secretos JWT (`JWT_SECRET`, `JWT_REFRESH_SECRET`) cambiados por cadenas largas y aleatorias.
- [ ] `DATABASE_URL` apuntando a PostgreSQL y `provider` cambiado a `postgresql` en `schema.prisma`.
- [ ] `CORS_ORIGIN` configurado con el dominio real del frontend.
- [ ] `STORAGE_DIR` apuntando a una carpeta con permisos de escritura y respaldada.
- [ ] Dependencias instaladas (`npm install`) en backend y frontend.
- [ ] Cliente de Prisma generado y migraciones aplicadas.
- [ ] Seed ejecutado (usuario admin inicial creado).
- [ ] **Frontend:** `.env` con `VITE_API_URL` apuntando a la API de producción.
- [ ] Backend compilado (`npm run build`) y frontend compilado (`npm run build`).
- [ ] Backend corriendo como servicio persistente (PM2 o similar).
- [ ] Frontend estático servido por Nginx (o CDN).
- [ ] **HTTPS** configurado y funcionando (obligatorio).
- [ ] Copias de seguridad de base de datos y `storage/` programadas.
- [ ] Contraseña del usuario admin inicial cambiada tras el primer ingreso.
- [ ] `DEMO_MODE = false` y integración ReFirma ajustada (si se firma de verdad).
- [ ] Prueba de extremo a extremo (login, subir, firmar, descargar) superada.

---

## 3. Variables de entorno y seguridad

### Backend (`backend/.env`)

Partiendo de `backend/.env.example`, para producción:

```bash
# Puerto de la API
PORT=3000

# Prefijo global
API_PREFIX=api

# CORS: dominio(s) REAL(es) del frontend (separados por coma). NO usar "*".
CORS_ORIGIN=https://firma.tu-entidad.pe

# Base de datos: PostgreSQL en producción
DATABASE_URL="postgresql://usuario:clave@localhost:5432/firma_digital?schema=public"

# JWT: CAMBIAR por cadenas largas y aleatorias (mínimo 32 caracteres)
JWT_SECRET=<cadena-larga-aleatoria-1>
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=<cadena-larga-aleatoria-2-distinta>
JWT_REFRESH_EXPIRES_IN=7d

# Almacenamiento de PDFs (ruta absoluta recomendada, con respaldo)
STORAGE_DIR=/var/firma-digital/storage

# Usuario admin inicial (para el seed)
ADMIN_EMAIL=admin@tu-entidad.pe
ADMIN_PASSWORD=<contraseña-fuerte-inicial>
```

> 🔐 **Generar secretos seguros:** ejecuta `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` una vez por cada secreto. Nunca reutilices el mismo valor para `JWT_SECRET` y `JWT_REFRESH_SECRET`.

**Reglas de seguridad imprescindibles:**

- **Cambia** todos los secretos JWT que vienen por defecto (`cambia-esto-...`). Si no lo haces, cualquiera podría falsificar tokens.
- **CORS restringido:** `CORS_ORIGIN` debe listar exactamente el/los dominio(s) del frontend. No uses `*`.
- **Nunca** subas el archivo `.env` al repositorio (debe estar en `.gitignore`).
- **Cambia la contraseña del admin inicial** apenas ingreses por primera vez.
- Las contraseñas ya se guardan **hasheadas con bcrypt**; no hay que hacer nada extra, pero verifica que nadie desactive esa lógica.

### Frontend (`frontend/.env`)

```bash
# URL de la API de producción (con /api al final)
VITE_API_URL=https://firma.tu-entidad.pe/api
```

> Recuerda que las variables del frontend (Vite) se **incrustan en el build**. Cualquier cambio requiere **recompilar** (`npm run build`). No pongas secretos aquí: todo lo del frontend es público.

---

## 4. Migrar de SQLite a PostgreSQL

En desarrollo el proyecto usa **SQLite** (un archivo `dev.db`). Para producción se recomienda **PostgreSQL**. Pasos concretos:

### Paso 1 — Crear la base de datos en PostgreSQL

```bash
sudo -u postgres psql
CREATE DATABASE firma_digital;
CREATE USER firma_user WITH ENCRYPTED PASSWORD 'clave-segura';
GRANT ALL PRIVILEGES ON DATABASE firma_digital TO firma_user;
\q
```

### Paso 2 — Cambiar el proveedor en `schema.prisma`

Edita `backend/prisma/schema.prisma` y cambia el bloque `datasource`:

```prisma
datasource db {
  provider = "postgresql"   // antes decía "sqlite"
  url      = env("DATABASE_URL")
}
```

### Paso 3 — Ajustar `DATABASE_URL`

En `backend/.env`:

```bash
DATABASE_URL="postgresql://firma_user:clave-segura@localhost:5432/firma_digital?schema=public"
```

### Paso 4 — Regenerar el cliente y crear el esquema

```bash
cd backend
npm run prisma:generate                       # regenera el cliente de Prisma
npx prisma migrate dev --name init-postgres   # crea las tablas en PostgreSQL (entorno de dev)
# En un servidor de producción, usa migraciones ya versionadas:
#   npx prisma migrate deploy
```

### Paso 5 — Sembrar el usuario admin

```bash
npm run db:seed
```

> ⚠️ **Nota sobre migraciones existentes:** las migraciones de Prisma son específicas del motor. Si ya tenías migraciones creadas para SQLite, lo más limpio al cambiar a PostgreSQL en un proyecto nuevo es **regenerar** las migraciones contra PostgreSQL (borrar la carpeta `prisma/migrations` **solo si no hay datos de producción que preservar** y volver a crear con `migrate dev`). Si ya hay datos, planifica una **migración de datos** de SQLite a PostgreSQL con una herramienta de exportación/importación.

> 💡 **Comando todo-en-uno para producción:** el `package.json` del backend incluye `npm run setup`, que ejecuta `prisma generate && prisma migrate deploy && seed`. Úsalo tras configurar el `.env`.

---

## 5. Compilar el backend y el frontend

### Backend (NestJS)

```bash
cd backend
npm install                 # instala dependencias
npm run build               # compila TypeScript a JavaScript en la carpeta dist/
npm run setup               # genera cliente Prisma, aplica migraciones y siembra admin
npm run start:prod          # arranca desde dist/main (producción)
```

El resultado de `npm run build` queda en `backend/dist/`. En producción se ejecuta con `node dist/main` (que es lo que hace `start:prod`).

### Frontend (Vite + React)

```bash
cd frontend
npm install
npm run build               # genera archivos estáticos optimizados en dist/
```

El resultado queda en `frontend/dist/`: un conjunto de archivos **estáticos** (HTML, CSS, JS) que se sirven con cualquier servidor web o CDN. Para probar localmente el build: `npm run preview`.

---

## 6. Opciones de despliegue

### Opción A — VPS con Nginx + PM2 (recomendada para control total)

Arquitectura: **Nginx** al frente (sirve el frontend estático y hace de *reverse proxy* al backend), **PM2** mantiene el backend Node.js siempre encendido.

**1. Mantener el backend vivo con PM2:**

```bash
npm install -g pm2
cd backend
pm2 start dist/main.js --name firma-backend
pm2 save                 # guarda la lista de procesos
pm2 startup              # arranca PM2 al reiniciar el servidor
```

**2. Servir el frontend y hacer proxy con Nginx** (`/etc/nginx/sites-available/firma`):

```nginx
server {
    listen 80;
    server_name firma.tu-entidad.pe;

    # Frontend estático (resultado de "npm run build" en frontend/)
    root /var/www/firma-digital/frontend/dist;
    index index.html;

    # SPA: cualquier ruta desconocida devuelve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API: reenvía /api al backend NestJS (puerto 3000)
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # (Aumentar si se suben PDFs grandes)
    client_max_body_size 20M;
}
```

Activar y recargar:

```bash
sudo ln -s /etc/nginx/sites-available/firma /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> ℹ️ Con este esquema, `CORS_ORIGIN` puede ser el mismo dominio, ya que frontend y API se sirven bajo el mismo host (`/` y `/api`). El proxy de Nginx cumple en producción el papel que el proxy de Vite cumple en desarrollo.

### Opción B — Plataformas gestionadas (menos operación)

- **Backend:** **Railway**, Render o similar. Despliegan directamente desde el repositorio, ofrecen PostgreSQL gestionado y variables de entorno por panel. Configura el comando de build (`npm run build`) y el de inicio (`npm run start:prod`), además del `setup`/migraciones.
- **Frontend:** **Vercel** o Netlify. Detectan Vite automáticamente; solo define `VITE_API_URL` en su panel de variables. Sirven el frontend por CDN con HTTPS incluido.

> ⚠️ En plataformas gestionadas, el **almacenamiento de archivos en disco suele ser efímero** (se borra en cada despliegue). Si usas Railway/Render para el backend, migra el `StorageService` a almacenamiento de objetos en la nube (S3, etc.) — ver `05-arquitectura.md`, sección 8.2 — o monta un volumen persistente.

---

## 7. HTTPS (obligatorio para ReFirma)

**HTTPS no es opcional en producción.** Es obligatorio por dos razones:

1. **Seguridad:** protege credenciales, tokens JWT y los propios documentos en tránsito.
2. **ReFirma:** los navegadores modernos **restringen** la comunicación con componentes locales y ciertas APIs desde páginas servidas sin HTTPS. Sin HTTPS, la invocación al Invoker puede fallar.

**Con Let's Encrypt (gratuito) en un VPS con Nginx:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d firma.tu-entidad.pe
```

Certbot configura el certificado y la **renovación automática**, y redirige HTTP a HTTPS. En plataformas gestionadas (Vercel/Netlify/Railway), el HTTPS viene incluido automáticamente.

> 🔎 Tras activar HTTPS, actualiza `VITE_API_URL` a `https://...` y recompila el frontend, y confirma que `CORS_ORIGIN` use `https://`.

---

## 8. Copias de seguridad

Hay **dos cosas críticas** que respaldar. Perder cualquiera de ellas es perder documentos firmados.

### 8.1 Base de datos

**PostgreSQL** (respaldo diario recomendado):

```bash
# Respaldo
pg_dump -U firma_user firma_digital > /backups/firma_$(date +%F).sql

# Restauración
psql -U firma_user firma_digital < /backups/firma_2026-08-09.sql
```

**SQLite** (si aún se usa): basta con copiar el archivo `dev.db` (idealmente con la app detenida o usando `sqlite3 .backup`).

### 8.2 Carpeta de storage (los PDFs)

Los archivos PDF (originales y firmados) viven en `STORAGE_DIR`. **La base de datos guarda solo los nombres**, no los archivos; por eso hay que respaldar ambos en conjunto.

```bash
# Respaldo comprimido de la carpeta de archivos
tar -czf /backups/storage_$(date +%F).tar.gz /var/firma-digital/storage
```

### 8.3 Automatización

Programa ambos respaldos con `cron` (por ejemplo, diario a la 2 a. m.) y **envía las copias a otro lugar** (otro servidor, almacenamiento en la nube). Prueba periódicamente que una restauración funcione: un respaldo no verificado no es un respaldo.

```cron
0 2 * * *  pg_dump -U firma_user firma_digital > /backups/firma_$(date +\%F).sql
15 2 * * * tar -czf /backups/storage_$(date +\%F).tar.gz /var/firma-digital/storage
```

---

## 9. Plan de implementación por fases

Un despliegue ordenado reduce riesgos. Se propone este plan por fases:

### Fase 1 — Instalación y configuración técnica

- Aprovisionar servidor, PostgreSQL, dominio y HTTPS.
- Configurar `.env` de producción (secretos, CORS, DB, storage).
- Migrar a PostgreSQL, compilar y desplegar backend + frontend.
- Ejecutar prueba de humo (login, subir, ver, descargar) en **MODO DEMO**.
- **Entregable:** plataforma accesible por HTTPS, con admin inicial creado.
- **Responsable:** equipo técnico / DevOps.

### Fase 2 — Capacitación funcional (usuarios finales)

- Formar a operadores y administradores con el documento `02-capacitacion-funcional.md`.
- Practicar el flujo completo en MODO DEMO (sin certificados reales).
- Crear los usuarios reales y cargar los firmantes de la entidad.
- **Entregable:** usuarios capaces de operar la plataforma.

### Fase 3 — Capacitación técnica (equipo interno)

- Formar al personal técnico de la entidad con `03-capacitacion-tecnica.md`, `05-arquitectura.md` y `04-integracion-refirma.md`.
- Repasar cómo mantener, respaldar y extender el sistema.
- **Entregable:** equipo interno capaz de dar soporte de primer nivel.

### Fase 4 — Marcha blanca (piloto con firma real)

- Instalar **ReFirma** en una o pocas PCs piloto; conectar lector/token.
- Cambiar `DEMO_MODE = false` y **ajustar la integración** (argumentos y listeners) según el Manual de RENIEC (`04-integracion-refirma.md`).
- Firmar documentos **reales de bajo riesgo** con un grupo reducido de usuarios.
- Verificar validez legal de la firma, integridad (SHA-256) y registros de auditoría.
- Corregir incidencias (permisos, puertos, certificados) y documentarlas.
- **Entregable:** flujo de firma real validado en producción controlada.

### Fase 5 — Producción (despliegue total)

- Extender la instalación de ReFirma al resto de PCs de firmantes.
- Habilitar a todos los usuarios.
- Confirmar que respaldos automáticos y monitoreo están operativos.
- Establecer un canal de soporte y un plan de mantenimiento.
- **Entregable:** sistema en producción plena con firma digital de validez legal.

---

> ✅ **Consejo final:** avanza de fase solo cuando la anterior esté verificada. Especialmente, **no habilites la firma real (Fase 4-5) sin HTTPS y sin haber ajustado la integración de ReFirma** a la versión licenciada por RENIEC a tu entidad.
