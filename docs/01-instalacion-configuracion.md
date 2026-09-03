# 📥 Guía de Instalación y Configuración

Esta guía te lleva **paso a paso** desde una computadora vacía hasta tener la plataforma **Firma Digital Pro** funcionando. Está escrita para que la pueda seguir alguien sin experiencia previa.

---

## 1. Requisitos previos

Antes de empezar necesitas instalar estas herramientas (una sola vez):

| Herramienta | Para qué sirve | Dónde descargarla |
| ----------- | -------------- | ----------------- |
| **Node.js 18 o superior** | Ejecuta el backend y el frontend | <https://nodejs.org> (versión LTS) |
| **Git** *(opcional)* | Descargar y versionar el código | <https://git-scm.com> |
| Un editor de código | Ver y editar el código | Recomendado: **VS Code** |

**Verifica que Node.js quedó instalado.** Abre una terminal y escribe:

```bash
node --version   # debe mostrar v18.x.x o superior
npm --version    # debe mostrar un número de versión
```

> 💡 La “terminal” es la ventana de comandos: en Windows busca **PowerShell**, en Mac/Linux busca **Terminal**.

---

## 2. Obtener el código

Si recibiste el proyecto en una carpeta comprimida (.zip), descomprímela. Si usas Git:

```bash
git clone <url-del-repositorio> firma-digital-pro
cd firma-digital-pro
```

Dentro verás dos carpetas principales: `backend/` y `frontend/`.

---

## 3. Configurar y arrancar el BACKEND (la API)

El backend es el “motor” que guarda los datos y realiza la lógica.

### 3.1. Entra a la carpeta

```bash
cd backend
```

### 3.2. Crea el archivo de configuración

El proyecto trae un archivo de ejemplo `.env.example`. Cópialo con el nombre `.env`:

```bash
cp .env.example .env      # En Windows PowerShell: copy .env.example .env
```

Abre el archivo `.env` con tu editor. Cada variable está comentada. Las más importantes:

| Variable | Qué es | Valor por defecto |
| -------- | ------ | ----------------- |
| `PORT` | Puerto de la API | `3000` |
| `CORS_ORIGIN` | Dirección del frontend permitida | `http://localhost:5173` |
| `DATABASE_URL` | Ubicación de la base de datos | `file:./dev.db` (SQLite) |
| `JWT_SECRET` | Clave secreta para los tokens | *(cámbiala en producción)* |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Usuario administrador inicial | `admin@firmadigital.pe` / `Admin123!` |

> 🟢 Para **desarrollo/pruebas** puedes dejar los valores por defecto.
> 🔴 Para **producción** debes cambiar los secretos (ver [`06-implementacion-despliegue.md`](06-implementacion-despliegue.md)).

### 3.3. Instala las dependencias

```bash
npm install
```

Esto descarga las librerías que el proyecto necesita (se guardan en `node_modules/`). Puede tardar un par de minutos.

### 3.4. Prepara la base de datos

```bash
npm run prisma:generate            # genera el "cliente" para hablar con la BD
npx prisma migrate dev --name init # crea las tablas
npm run db:seed                    # crea el usuario admin y firmantes de ejemplo
```

Al terminar el seed deberías ver:

```
✔ Usuario admin listo: admin@firmadigital.pe / Admin123!
✔ 2 firmantes de ejemplo listos
```

### 3.5. Arranca el backend

```bash
npm run start:dev
```

Cuando veas este mensaje, la API está lista:

```
🚀 API Firma Digital Pro corriendo en http://localhost:3000
```

> ⚠️ **Deja esta terminal abierta.** Si la cierras, el backend se detiene.

---

## 4. Configurar y arrancar el FRONTEND (la interfaz)

Abre una **segunda terminal** (sin cerrar la del backend).

```bash
cd frontend
cp .env.example .env      # En Windows: copy .env.example .env
npm install
npm run dev
```

Verás algo como:

```
  VITE v6.x  ready in 500 ms
  ➜  Local:   http://localhost:5173/
```

Abre esa dirección en tu navegador: **http://localhost:5173**

> 💡 En desarrollo, el frontend redirige automáticamente las llamadas `/api` al backend (gracias al “proxy” configurado en `vite.config.ts`). No necesitas configurar nada más.

---

## 5. Primer ingreso

En la pantalla de login usa las credenciales del administrador:

- **Correo:** `admin@firmadigital.pe`
- **Contraseña:** `Admin123!`

¡Listo! Ya puedes navegar el panel, subir documentos y firmarlos (en MODO DEMO).

---

## 6. Estructura de los archivos de configuración

| Archivo | Ubicación | Para qué |
| ------- | --------- | -------- |
| `backend/.env` | Backend | Puerto, base de datos, secretos JWT, storage |
| `frontend/.env` | Frontend | URL de la API (`VITE_API_URL`) |
| `backend/prisma/schema.prisma` | Backend | Define las tablas de la base de datos |
| `frontend/src/lib/refirma.ts` | Frontend | Activa/desactiva el MODO DEMO de ReFirma |

---

## 7. Comandos útiles (referencia rápida)

### Backend

| Comando | Qué hace |
| ------- | -------- |
| `npm run start:dev` | Arranca la API en modo desarrollo (se recarga sola al editar) |
| `npm run build` | Compila la API para producción |
| `npm run start:prod` | Arranca la API ya compilada |
| `npm run prisma:studio` | Abre una interfaz visual para ver la base de datos |
| `npm run db:seed` | Vuelve a cargar los datos iniciales |

### Frontend

| Comando | Qué hace |
| ------- | -------- |
| `npm run dev` | Arranca la interfaz en modo desarrollo |
| `npm run build` | Compila la interfaz para producción (carpeta `dist/`) |
| `npm run preview` | Previsualiza la versión compilada |

---

## 8. Solución de problemas comunes

| Problema | Causa probable | Solución |
| -------- | -------------- | -------- |
| `command not found: node` | Node.js no está instalado | Instala Node.js y reinicia la terminal |
| La interfaz no carga datos | El backend no está corriendo | Arranca el backend (`npm run start:dev`) |
| Error de CORS en el navegador | `CORS_ORIGIN` no coincide con la URL del frontend | Ajusta `CORS_ORIGIN` en `backend/.env` |
| “Usuario o contraseña incorrectos” | No se ejecutó el seed | Corre `npm run db:seed` en el backend |
| El puerto 3000 o 5173 está ocupado | Otro programa lo usa | Cambia `PORT` (backend) o el puerto en `vite.config.ts` |

---

➡️ **Siguiente paso:** aprende a usar la plataforma en [`02-capacitacion-funcional.md`](02-capacitacion-funcional.md), o revisa el despliegue a producción en [`06-implementacion-despliegue.md`](06-implementacion-despliegue.md).
