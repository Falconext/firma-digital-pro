# 03 · Capacitación Técnica — El Código Explicado Desde Cero

> **Para quién es este documento:** para **ingenieros que NO son programadores** (industriales, de sistemas sin experiencia en desarrollo web, mecánicos, civiles, etc.) que necesitan **entender, mantener y extender** la plataforma Firma Digital Pro. No damos por supuesto ningún conocimiento previo de JavaScript, TypeScript ni desarrollo web. Empezamos desde los conceptos más básicos y avanzamos con analogías simples.

> **Cómo leerlo:** léelo en orden la primera vez. Después úsalo como referencia. Cada concepto nuevo se explica con una analogía del mundo real antes de mostrar cómo se ve en este proyecto.

---

## Índice

1. [Panorama general: ¿qué es esta aplicación?](#1-panorama-general-qué-es-esta-aplicación)
2. [Conceptos fundamentales explicados con analogías](#2-conceptos-fundamentales-explicados-con-analogías)
   - 2.1 [Frontend y Backend](#21-frontend-y-backend)
   - 2.2 [¿Qué es una API REST?](#22-qué-es-una-api-rest)
   - 2.3 [¿Qué es una base de datos? ¿Qué hace Prisma?](#23-qué-es-una-base-de-datos-qué-hace-prisma)
   - 2.4 [¿Qué es JavaScript, TypeScript y Node.js?](#24-qué-es-javascript-typescript-y-nodejs)
3. [El Backend: NestJS explicado](#3-el-backend-nestjs-explicado)
   - 3.1 [Módulos](#31-módulos-las-áreas-del-edificio)
   - 3.2 [Controladores](#32-controladores-la-recepción)
   - 3.3 [Servicios](#33-servicios-los-trabajadores-especializados)
   - 3.4 [DTOs](#34-dtos-los-formularios-de-entrada)
   - 3.5 [Guards](#35-guards-los-vigilantes-de-seguridad)
   - 3.6 [Interceptores y Filtros](#36-interceptores-y-filtros)
4. [El Frontend: React, Vite y Zustand explicados](#4-el-frontend-react-vite-y-zustand-explicados)
5. [Autenticación: qué es JWT y cómo funciona el login](#5-autenticación-qué-es-jwt-y-cómo-funciona-el-login)
6. [Recorrido completo de una petición: subir un documento](#6-recorrido-completo-de-una-petición-subir-un-documento)
7. [Recorrido de la estructura de carpetas](#7-recorrido-de-la-estructura-de-carpetas)
8. [Cómo hacer cambios frecuentes (recetas prácticas)](#8-cómo-hacer-cambios-frecuentes-recetas-prácticas)
9. [Diccionario de términos](#9-diccionario-de-términos)

---

## 1. Panorama general: ¿qué es esta aplicación?

Firma Digital Pro es una **aplicación web**. Una aplicación web es un programa que se usa desde el navegador de internet, y que en realidad son **dos programas trabajando juntos**:

1. **El Frontend** — lo que *ves* en la pantalla (botones, tablas, formularios). Se ejecuta en el navegador del usuario.
2. **El Backend** — el "cerebro" que está en un servidor. Recibe pedidos del frontend, consulta la base de datos, aplica las reglas de negocio y responde.

Piénsalo como un **restaurante**:

- El **frontend** es el **comedor**: las mesas, la carta, el mozo que toma tu pedido. Es la cara visible.
- El **backend** es la **cocina**: donde se prepara realmente la comida, se guardan los ingredientes y se siguen las recetas. El cliente nunca la ve, pero sin ella no hay comida.
- La **base de datos** es la **despensa/almacén**: donde se guardan todos los ingredientes (los datos) de forma ordenada.
- **ReFirma** es como un **notario externo** al que la cocina llama cuando hace falta certificar algo oficialmente.

Ambos programas se comunican enviándose mensajes por internet. El lenguaje de esos mensajes se llama **API REST** (lo vemos más abajo).

---

## 2. Conceptos fundamentales explicados con analogías

### 2.1 Frontend y Backend

**Frontend** (del inglés "front" = frente): es la parte de "adelante", la que el usuario ve y toca. En este proyecto está en la carpeta `frontend/`. Está construido con **React** y se muestra en el navegador.

**Backend** (del inglés "back" = atrás): es la parte de "atrás", invisible para el usuario. Está en la carpeta `backend/`. Está construido con **NestJS** y se ejecuta en un servidor.

**¿Por qué separarlos?** Por las mismas razones que un restaurante separa comedor y cocina:

- **Seguridad:** las reglas importantes (¿este usuario puede firmar? ¿la contraseña es correcta?) se deciden en la cocina (backend), donde el cliente no puede manipularlas. Si esas decisiones estuvieran en el comedor (navegador), cualquiera podría alterarlas.
- **Orden:** cada equipo puede trabajar en su parte sin estorbar a la otra.
- **Reutilización:** mañana podrías tener una app de celular (otro "comedor") usando la misma "cocina".

### 2.2 ¿Qué es una API REST?

Una **API** (Interfaz de Programación de Aplicaciones) es simplemente **un conjunto de "puertas" con reglas** por las que dos programas se hablan. **REST** es un estilo muy común de organizar esas puertas usando las direcciones web (URLs) y unos "verbos".

**Analogía:** la API es como el **menú de un restaurante con servicio a domicilio**. Tú (frontend) no entras a la cocina; haces un pedido siguiendo el menú. Cada plato tiene:

- Una **dirección** (URL), por ejemplo `/api/file/listar` = "la lista de documentos".
- Un **verbo** (método HTTP) que indica *qué quieres hacer*:

| Verbo HTTP | Significa | Analogía |
| --- | --- | --- |
| `GET` | **Obtener / leer** datos | "Muéstrame el menú / tráeme lo que ya existe" |
| `POST` | **Crear** algo nuevo | "Quiero pedir un plato nuevo" |
| `PATCH` | **Modificar** algo existente | "Cambia mi pedido: sin cebolla" |
| `DELETE` | **Eliminar** algo | "Cancela ese plato" |

Cuando el frontend quiere la lista de documentos, envía: `GET /api/file/listar`. El backend responde con los datos. Esos datos viajan en un formato de texto llamado **JSON** (ver diccionario), que es la forma estándar de escribir información para que ambos programas la entiendan.

En este proyecto, **todas las rutas empiezan con `/api`** (eso se configura en `backend/src/main.ts`). La lista completa de puertas de la API está en el documento `05-arquitectura.md`.

### 2.3 ¿Qué es una base de datos? ¿Qué hace Prisma?

Una **base de datos** es un almacén de información **muy ordenado**. Imagina un archivador enorme con **tablas** (como hojas de cálculo de Excel):

- Una tabla `usuarios` con una fila por cada persona que entra al sistema.
- Una tabla `documentos` con una fila por cada PDF.
- Una tabla `firmantes` y una tabla `auditoria`.

Cada tabla tiene **columnas** (campos) que definen qué datos guarda. Por ejemplo, la tabla `usuarios` tiene columnas `nombre`, `email`, `password`, etc.

Este proyecto usa por defecto **SQLite**, que es una base de datos que vive en **un solo archivo** (`dev.db`), muy fácil para empezar. Para producción se recomienda **PostgreSQL**, una base de datos más robusta que corre como un servicio aparte (ver `06-implementacion-despliegue.md`).

**¿Qué es Prisma?** Hablar directamente con una base de datos requiere un lenguaje especial llamado **SQL**. **Prisma** es un **traductor** (se le llama "ORM", ver diccionario): tú escribes instrucciones sencillas en el lenguaje del proyecto (TypeScript) y Prisma las convierte a SQL por debajo.

**Analogía:** Prisma es como un **bibliotecario bilingüe**. Tú le dices en tu idioma *"tráeme todos los documentos firmados"* y él sabe pedirlo en el idioma de la base de datos, y te trae el resultado ya ordenado.

El "plano" de todas las tablas está en un solo archivo muy importante: **`backend/prisma/schema.prisma`**. Ahí cada `model` es una tabla. Por ejemplo:

```prisma
model User {
  id       Int    @id @default(autoincrement())
  nombre   String
  email    String @unique
  password String
  rol      Role   @default(OPERADOR)
  // ...
  @@map("usuarios")   // el nombre real de la tabla es "usuarios"
}
```

Esto se lee así: "Habrá una tabla llamada `usuarios`; cada fila tiene un `id` numérico automático, un `nombre` de texto, un `email` de texto que no puede repetirse (`@unique`), una `password`, y un `rol` que por defecto es `OPERADOR`".

### 2.4 ¿Qué es JavaScript, TypeScript y Node.js?

- **JavaScript** es el lenguaje de programación que entienden los navegadores. Originalmente servía solo para dar vida a las páginas web.
- **Node.js** es un programa que permite ejecutar JavaScript **fuera del navegador**, en un servidor. Gracias a Node.js podemos escribir el backend en el mismo lenguaje que el frontend.
- **TypeScript** es JavaScript **con una mejora clave: los "tipos"**. Un "tipo" es decir de antemano qué clase de dato es cada cosa (texto, número, verdadero/falso...).

**Analogía de TypeScript:** imagina un formulario donde cada casilla dice qué va en ella ("aquí solo números", "aquí solo una fecha"). Si te equivocas y pones letras donde van números, te avisa **antes** de entregarlo. TypeScript hace eso con el código: detecta errores **antes** de que el programa se ejecute, lo que hace el proyecto más seguro y fácil de mantener. Los archivos de TypeScript terminan en `.ts` (o `.tsx` cuando incluyen pantallas de React).

---

## 3. El Backend: NestJS explicado

El backend usa un **framework** (un conjunto de herramientas y reglas para construir de forma ordenada) llamado **NestJS**. Su gran ventaja es que organiza el código en piezas con roles claros, como los departamentos de una empresa.

**La gran analogía: el backend es como un edificio de oficinas.** Vamos por sus partes.

### 3.1 Módulos (las áreas del edificio)

Un **módulo** agrupa todo lo relacionado con un tema. Es como un **piso o departamento** del edificio: el "Área de Documentos", el "Área de Usuarios", el "Área de Firma", etc.

En este proyecto, el archivo `backend/src/app.module.ts` es la **recepción principal del edificio**: enumera todos los departamentos que existen:

```typescript
imports: [
  ConfigModule,      // Configuración general (lee el .env)
  PrismaModule,      // Conexión a la base de datos (compartida)
  StorageModule,     // Guardado de archivos PDF (compartido)
  AuthModule,        // Login y sesión
  UsersModule,       // Usuarios
  SignatoriesModule, // Firmantes
  DocumentsModule,   // Documentos PDF
  RefirmaModule,     // Integración con ReFirma
  DashboardModule,   // Métricas del panel
]
```

Cada módulo vive en su propia carpeta dentro de `backend/src/modules/`, y normalmente contiene tres archivos: un **controlador**, un **servicio** y un **módulo** que los une.

### 3.2 Controladores (la recepción)

Un **controlador** es la **recepción de cada departamento**. Su trabajo es **recibir los pedidos que llegan** (las peticiones de la API) y decidir a quién se los pasa. **No hace el trabajo pesado**: solo atiende y deriva.

Un controlador define las **rutas** (las direcciones URL) que ese departamento atiende. Ejemplo real del controlador de documentos (`backend/src/modules/documents/documents.controller.ts`):

```typescript
@Controller('file')                 // Todas estas rutas empiezan con /api/file
export class DocumentsController {
  @Post('create-new')               // POST /api/file/create-new  → subir documento
  create(...) { return this.service.create(...); }

  @Get('listar')                    // GET /api/file/listar       → listar documentos
  findAll(...) { return this.service.findAll(...); }

  @Delete(':id')                    // DELETE /api/file/5         → eliminar el documento 5
  remove(...) { return this.service.remove(...); }
}
```

Fíjate en el patrón: cada método del controlador **recibe** el pedido y **llama a `this.service`** (el trabajador especializado) para que haga la tarea real. Las palabras con `@` delante (como `@Get`, `@Post`) se llaman **decoradores**: son "etiquetas" que le dicen a NestJS qué hace cada método (ver diccionario).

### 3.3 Servicios (los trabajadores especializados)

Un **servicio** es **el trabajador experto** que sí hace la tarea. Contiene la **lógica de negocio**: las reglas reales del sistema. Si el controlador es el recepcionista, el servicio es el especialista de la oficina de atrás.

Ejemplo real del servicio de documentos (`documents.service.ts`), método para subir un documento:

```typescript
async create(userId: number, dto: CreateDocumentDto) {
  // 1) Guarda el archivo PDF en el disco y obtiene su nombre
  const storageKey = await this.storage.savePdfFromBase64(dto.base64File);
  // 2) Guarda los datos del documento en la base de datos
  return this.prisma.document.create({
    data: {
      fileName: dto.fileName,
      storageKey,
      signatoryId: dto.signatoryId,
      createdById: userId,
    },
    include: { signatory: true },
  });
}
```

Aquí vemos al servicio pidiendo ayuda a otros dos trabajadores compartidos:

- **`this.storage`** — el `StorageService`, encargado de guardar/leer archivos en el disco.
- **`this.prisma`** — el `PrismaService`, encargado de hablar con la base de datos.

Esta división (controlador que recibe, servicio que trabaja) se llama **separación de responsabilidades** y es una de las mejores prácticas del proyecto: hace el código más ordenado, fácil de probar y de mantener.

### 3.4 DTOs (los formularios de entrada)

**DTO** significa "Data Transfer Object" (objeto de transferencia de datos). Es un **formulario con reglas de validación** que define **cómo deben venir los datos** en un pedido.

**Analogía:** es como el formulario que llenas en un banco. Tiene casillas obligatorias, y si dejas una vacía o pones algo inválido (un correo mal escrito), **no te lo aceptan**. El DTO hace exactamente eso: si los datos que llegan no cumplen las reglas, NestJS **rechaza el pedido automáticamente** antes de que llegue al servicio.

Ejemplo real (`login.dto.ts`):

```typescript
export class LoginDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(4, { message: 'La contraseña es muy corta' })
  password!: string;
}
```

Las etiquetas `@IsEmail`, `@IsNotEmpty`, `@MinLength` son las **reglas de validación**. Si el email no tiene forma de correo, el sistema responde con el mensaje *"El correo no es válido"* sin siquiera intentar el login. Esta validación automática está activada globalmente en `main.ts`.

### 3.5 Guards (los vigilantes de seguridad)

Un **guard** (guardia) es un **vigilante en la puerta** que decide si un pedido **puede pasar o no**. Se ejecuta *antes* que el controlador.

En este proyecto hay dos guards clave:

1. **`JwtAuthGuard`** — el **vigilante de identidad**. Comprueba que el pedido traiga un "pase válido" (el token JWT, que veremos en la sección 5). Si no lo trae o está vencido, **no pasa** (error 401 "no autorizado").

2. **`RolesGuard`** — el **vigilante de permisos**. Comprueba que el usuario tenga el **rol** adecuado. Por ejemplo, administrar usuarios requiere ser **ADMIN**.

Se aplican con la etiqueta `@UseGuards(...)`. Ejemplo real (`users.controller.ts`):

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)   // Primero identidad, luego permisos
@Roles(Role.ADMIN)                     // Solo administradores
@Controller('usuario')
export class UsersController { ... }
```

Esto se lee: "Para entrar al área de usuarios necesitas (1) estar identificado y (2) ser ADMIN". La etiqueta `@Roles(Role.ADMIN)` le dice al `RolesGuard` cuál es el rol exigido.

### 3.6 Interceptores y Filtros

Estas dos piezas están en `backend/src/common/` y aseguran que **todas las respuestas del sistema tengan el mismo formato**, para que el frontend siempre sepa cómo leerlas.

- **Interceptor de respuesta** (`response.interceptor.ts`): cuando todo sale bien, **envuelve** la respuesta en un formato uniforme:

  ```json
  { "code": 1, "data": <lo que devolvió el servicio>, "message": "OK", "status": 200 }
  ```

  `code: 1` significa "éxito". El dato real siempre viene dentro de `data`.

- **Filtro de excepciones** (`http-exception.filter.ts`): cuando algo falla, **atrapa el error** y lo devuelve también con formato uniforme:

  ```json
  { "code": 2, "data": null, "message": "<motivo del error>", "status": 400 }
  ```

  `code: 2` significa "error". El frontend, al ver `code: 2`, sabe que debe mostrar el mensaje de error.

**Analogía:** son como el **departamento de correspondencia** que garantiza que todas las cartas que salen del edificio usen el mismo tipo de sobre y membrete, sin importar qué departamento las escribió.

---

## 4. El Frontend: React, Vite y Zustand explicados

El frontend (carpeta `frontend/`) es lo que el usuario ve. Usa varias herramientas:

**Vite** es el **empaquetador y servidor de desarrollo**. Su trabajo es tomar todo el código del frontend, prepararlo y servirlo al navegador rápidamente. Durante el desarrollo, además, refresca la pantalla automáticamente cada vez que guardas un cambio. Su configuración está en `frontend/vite.config.ts`. Ahí también se define un **proxy**: en desarrollo, cuando el frontend pide algo a `/api`, Vite lo reenvía al backend (puerto 3000). Esto evita problemas técnicos de comunicación entre ambos.

**React** es la librería para construir la interfaz mediante **componentes**. Un **componente** es una **pieza reutilizable de pantalla**, como un ladrillo Lego. Un botón es un componente; una tabla es un componente; una página entera es un componente hecho de componentes más pequeños.

**Analogía:** construir la interfaz con React es como armar con Legos. Tienes ladrillos pequeños (`Button`, `Input`, `Card`, `Modal`) que combinas para formar piezas mayores (una página como `DocumentsPage`). Los ladrillos reutilizables están en `frontend/src/components/`, y las páginas completas en `frontend/src/pages/`.

Un componente en React se ve como una función que **devuelve la descripción de lo que se debe mostrar**. Esa descripción se escribe con **JSX**, que es una mezcla de HTML (la estructura visual) dentro del código. Por eso los archivos terminan en `.tsx`.

**Zustand** es una librería para manejar el **estado global**, es decir, información que varias partes de la app necesitan compartir. Por ejemplo: **quién es el usuario que inició sesión** debe conocerse en muchas pantallas a la vez.

**Analogía:** Zustand es como una **pizarra compartida en la oficina**. Cualquier componente puede leer lo que hay en la pizarra (por ejemplo, "el usuario logueado es Ana, rol ADMIN") y cualquier acción autorizada puede actualizarla. Cuando la pizarra cambia, todos los componentes que la miran se actualizan solos.

En este proyecto hay dos "pizarras" (llamadas *stores*), en `frontend/src/stores/`:

- **`auth.store.ts`** — guarda el **usuario logueado** y las acciones `login`, `logout` y `restore` (restaurar la sesión al recargar la página).
- **`ui.store.ts`** — maneja las **notificaciones** ("toasts"), esos mensajitos verdes/rojos que aparecen y desaparecen.

Finalmente, **`frontend/src/lib/api.ts`** es una pieza central: es el **cliente HTTP**, el único lugar por donde el frontend habla con el backend. Se encarga automáticamente de:

- Adjuntar el "pase" (token JWT) a cada pedido.
- Si el pase venció, **renovarlo** solo y reintentar (ver sección 5).
- Desenvolver la respuesta (sacar el `data` de dentro del formato uniforme).

Que toda la comunicación pase por un solo archivo es una buena práctica: si mañana cambia algo (por ejemplo, la dirección del backend), se corrige en **un único lugar**.

---

## 5. Autenticación: qué es JWT y cómo funciona el login

**Autenticación** es el proceso de **comprobar que eres quien dices ser** (iniciar sesión). Este proyecto usa **JWT** (JSON Web Token).

**¿Qué es un token JWT?** Es un **pase o brazalete de un evento**. Cuando entras (login exitoso), el backend te entrega un brazalete (token) firmado digitalmente por él. A partir de ahí, **cada vez que pides algo, muestras el brazalete**. El vigilante (el `JwtAuthGuard`) lo revisa: si es auténtico y no ha vencido, te deja pasar; ya no te vuelve a pedir usuario y contraseña en cada acción.

**¿Por qué es seguro?** El token está **firmado con un secreto** que solo conoce el backend (la variable `JWT_SECRET` del `.env`). Si alguien intentara falsificar un brazalete, la firma no coincidiría y el vigilante lo rechazaría. Además, el token **caduca** (por defecto en 1 hora), para limitar el daño si alguien lo roba.

**El "refresh token" (pase de renovación):** como el token principal vence pronto, se entrega un segundo pase de larga duración (7 días) llamado **refresh token**. Cuando el pase principal caduca, el frontend usa el refresh token para pedir uno nuevo **sin molestar al usuario**. Es como un pase que te permite renovar tu brazalete en la puerta sin volver a hacer toda la fila.

### El login paso a paso (con archivos reales)

1. El usuario escribe correo y contraseña en `LoginPage.tsx` y presiona **Ingresar**.
2. Se llama a la acción `login` de `auth.store.ts`, que envía `POST /auth/login` a través de `api.ts`.
3. En el backend, `auth.controller.ts` recibe el pedido y lo pasa a `auth.service.ts`.
4. El servicio (`auth.service.ts`) hace lo siguiente:
   - Busca al usuario por su correo en la base de datos (vía Prisma).
   - Compara la contraseña ingresada con la **guardada en forma cifrada** (bcrypt, ver diccionario). **Nunca** se guardan contraseñas en texto legible.
   - Si todo coincide, **genera dos tokens** (el principal y el de refresco) y devuelve los datos del usuario.
5. El frontend guarda los tokens en el navegador (`localStorage`) y guarda al usuario en la "pizarra" `auth.store.ts`.
6. De ahí en adelante, `api.ts` adjunta el token en cada pedido automáticamente.

Cuando el usuario recarga la página, `App.tsx` llama a `restore()`, que usa el token guardado para volver a pedir los datos del usuario (`GET /auth/me`) y así **no tener que iniciar sesión de nuevo**.

---

## 6. Recorrido completo de una petición: subir un documento

Vamos a seguir **un solo clic** de principio a fin, recorriendo los archivos reales. Esto te enseña cómo "viaja" la información y te da el mapa para modificar cualquier funcionalidad.

**Escenario:** el usuario llena el formulario y presiona **Guardar** para subir un PDF.

```
┌──────────────────────────── NAVEGADOR (Frontend) ────────────────────────────┐
│                                                                               │
│  1. DocumentsPage.tsx                                                         │
│     El usuario elige un PDF. La función fileToBase64() (en lib/utils.ts)      │
│     convierte el archivo a texto "base64" (ver diccionario).                  │
│     Al presionar Guardar, se ejecuta submitUpload().                          │
│                                                                               │
│  2. lib/api.ts  →  http.post('/file/create-new', { fileName, base64File,     │
│                                                     signatoryId })            │
│     Adjunta el token JWT y envía el pedido al backend.                        │
└───────────────────────────────────────┬───────────────────────────────────────┘
                                         │  POST /api/file/create-new
                                         ▼
┌──────────────────────────────── SERVIDOR (Backend) ──────────────────────────┐
│                                                                               │
│  3. JwtAuthGuard  → ¿Trae token válido? Sí → continúa. No → 401.              │
│                                                                               │
│  4. CreateDocumentDto  → Valida que lleguen fileName y base64File.            │
│     Si falta algo, rechaza automáticamente.                                   │
│                                                                               │
│  5. documents.controller.ts  → método create()                               │
│     Recibe el pedido y llama al servicio.                                     │
│                                                                               │
│  6. documents.service.ts  → método create()                                  │
│     a) storage.savePdfFromBase64()  → guarda el PDF en la carpeta storage/    │
│        (StorageService, en common/storage/)                                   │
│     b) prisma.document.create()     → guarda los datos en la tabla           │
│        "documentos" (PrismaService, en common/prisma/)                        │
│                                                                               │
│  7. response.interceptor.ts  → envuelve la respuesta:                         │
│     { code: 1, data: <documento creado>, message: "OK", status: 201 }         │
└───────────────────────────────────────┬───────────────────────────────────────┘
                                         │  respuesta JSON
                                         ▼
┌──────────────────────────────── NAVEGADOR (Frontend) ────────────────────────┐
│  8. lib/api.ts desenvuelve la respuesta y devuelve solo "data".              │
│  9. DocumentsPage.tsx muestra el toast verde "Documento subido               │
│     correctamente" (vía ui.store.ts) y recarga la lista de documentos.       │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Lo importante:** este mismo patrón (Página → api.ts → Guard → DTO → Controlador → Servicio → Prisma/Storage → Interceptor → de vuelta) se repite para **todas** las funciones. Si entiendes este recorrido, entiendes cómo modificar cualquier parte del sistema.

---

## 7. Recorrido de la estructura de carpetas

Aquí tienes el "mapa del edificio" completo. Úsalo para orientarte cuando busques dónde tocar algo.

```
firma-digital-pro/
│
├── backend/                     ← LA COCINA (servidor, NestJS + Prisma)
│   ├── .env                     ← Configuración secreta (claves, puerto). NO se comparte.
│   ├── .env.example             ← Plantilla de configuración (sí se comparte).
│   ├── package.json             ← Lista de herramientas (dependencias) y comandos.
│   ├── prisma/
│   │   ├── schema.prisma        ← EL PLANO de la base de datos (tablas y campos).
│   │   └── seed.ts              ← Datos iniciales (usuario admin + firmantes de ejemplo).
│   └── src/
│       ├── main.ts              ← Punto de arranque del servidor. Configura /api, CORS, etc.
│       ├── app.module.ts        ← La recepción principal: lista todos los módulos.
│       ├── config/
│       │   └── configuration.ts ← Lee el .env y lo ordena en un objeto.
│       ├── common/              ← PIEZAS COMPARTIDAS por todos los módulos:
│       │   ├── prisma/          ← Conexión a la base de datos.
│       │   ├── storage/         ← Guardado/lectura de archivos PDF y cálculo de huella SHA-256.
│       │   ├── guards/          ← Los vigilantes (JwtAuthGuard, RolesGuard).
│       │   ├── decorators/      ← Atajos (@CurrentUser, @Roles).
│       │   ├── filters/         ← Manejo uniforme de errores.
│       │   └── interceptors/    ← Formato uniforme de respuestas.
│       └── modules/             ← LOS DEPARTAMENTOS (una carpeta por tema):
│           ├── auth/            ← Login, refresh, logout, sesión.
│           ├── users/           ← Usuarios (solo ADMIN).
│           ├── signatories/     ← Firmantes.
│           ├── documents/       ← Documentos PDF.
│           ├── refirma/         ← Integración con ReFirma (RENIEC).
│           └── dashboard/       ← Métricas del panel.
│
├── frontend/                    ← EL COMEDOR (navegador, Vite + React)
│   ├── .env / .env.example      ← Configuración (dirección de la API).
│   ├── vite.config.ts           ← Configuración de Vite (puerto, proxy a /api).
│   ├── package.json             ← Herramientas y comandos del frontend.
│   └── src/
│       ├── main.tsx             ← Punto de arranque del frontend.
│       ├── App.tsx              ← Define las rutas (qué página se ve en cada URL).
│       ├── types/               ← Definición de la "forma" de los datos (index.ts).
│       ├── lib/
│       │   ├── api.ts           ← Cliente HTTP: TODA la comunicación con el backend.
│       │   ├── refirma.ts       ← Integración con ReFirma en el navegador (y MODO DEMO).
│       │   └── utils.ts         ← Utilidades (convertir archivos, formatear fechas).
│       ├── stores/              ← Estado global (las "pizarras" de Zustand):
│       │   ├── auth.store.ts     ← Usuario logueado.
│       │   └── ui.store.ts       ← Notificaciones (toasts).
│       ├── components/
│       │   ├── ui/              ← Ladrillos reutilizables (Button, Input, Card, Modal...).
│       │   └── layout/          ← Estructura (barra lateral, ruta protegida).
│       └── pages/               ← Las pantallas completas:
│           ├── LoginPage.tsx     ← Inicio de sesión.
│           ├── DashboardPage.tsx ← Panel con métricas.
│           ├── DocumentsPage.tsx ← Gestión de documentos.
│           └── SignatoriesPage.tsx ← Gestión de firmantes.
│
├── docs/                        ← Esta documentación.
└── design-system/              ← Guía de diseño (colores, tipografías).
```

---

## 8. Cómo hacer cambios frecuentes (recetas prácticas)

El objetivo de este documento es que puedas **mantener y extender** el sistema. Aquí tienes recetas para las tareas más comunes. La idea es que veas el patrón, no que memorices.

### Receta A: Agregar un campo nuevo a una tabla (ejemplo: agregar "telefono" al firmante)

1. Abre `backend/prisma/schema.prisma` y, dentro del `model Signatory`, agrega la línea:
   `telefono String?` (el `?` significa "opcional").
2. En la terminal, dentro de `backend/`, ejecuta: `npx prisma migrate dev --name agregar-telefono-firmante`. Esto **actualiza la base de datos** para que tenga la nueva columna.
3. Agrega el campo al DTO en `signatories/dto/signatory.dto.ts` (por ejemplo `@IsOptional() @IsString() telefono?: string;`) para que el sistema lo acepte.
4. En el frontend, agrega el campo al formulario en `SignatoriesPage.tsx` y al tipo en `types/index.ts`.

### Receta B: Cambiar cómo se ve una pantalla

Ve directamente al archivo de la página en `frontend/src/pages/` (por ejemplo `DashboardPage.tsx`). El texto y la estructura visual están escritos en JSX ahí mismo. Los estilos usan **Tailwind** (clases como `text-2xl`, `bg-primary`), que son atajos para dar formato.

### Receta C: Cambiar una regla de negocio

Las reglas viven en los **servicios** (`*.service.ts`), no en los controladores. Por ejemplo, para cambiar qué pasa al firmar un documento, edita `refirma/refirma.service.ts`.

### Receta D: Agregar una nueva "puerta" (endpoint) a la API

1. En el **controlador** del módulo correspondiente, agrega un método con su decorador (`@Get`, `@Post`, etc.).
2. En el **servicio** del mismo módulo, agrega la función que hace el trabajo.
3. Desde el frontend, llámalo con `http.get(...)` / `http.post(...)` desde `api.ts`.

> ⚠️ **Regla de oro:** después de cualquier cambio en `schema.prisma`, **siempre** ejecuta una migración de Prisma. Y después de cambiar dependencias (`package.json`), ejecuta `npm install`.

---

## 9. Diccionario de términos

| Término | Explicación sencilla |
| --- | --- |
| **API** | Conjunto de "puertas" con reglas por las que dos programas se comunican. |
| **API REST** | Estilo común de organizar una API usando direcciones (URLs) y verbos (GET, POST...). |
| **Backend** | La "cocina": el programa del servidor, invisible al usuario. Aquí, NestJS. |
| **Base64** | Forma de escribir un archivo (como un PDF) usando solo texto, para poder enviarlo por internet dentro de un mensaje. |
| **bcrypt** | Método para guardar contraseñas de forma cifrada e irreversible, de modo que ni siquiera el administrador las puede leer. |
| **CORS** | Regla de seguridad del navegador que controla qué sitios pueden llamar a la API. Se configura en `main.ts`. |
| **Componente (React)** | Pieza reutilizable de pantalla (un botón, una tarjeta, una página). Como un ladrillo Lego. |
| **Controlador** | La "recepción": recibe los pedidos y los deriva al servicio. No hace el trabajo pesado. |
| **Decorador** | Etiqueta con `@` que le da un significado especial a un trozo de código (ej: `@Get`, `@Roles`). |
| **DTO** | "Formulario con reglas" que valida cómo deben venir los datos de un pedido. |
| **Endpoint** | Cada "puerta" concreta de la API (una URL + un verbo). Ej: `GET /api/file/listar`. |
| **Frontend** | El "comedor": lo que el usuario ve en el navegador. Aquí, React + Vite. |
| **Guard** | "Vigilante" que decide si un pedido puede pasar (identidad y permisos). |
| **Hash / SHA-256** | Huella digital única de un archivo. Si el archivo cambia aunque sea un poco, la huella cambia. Sirve para verificar que no fue alterado. |
| **HTTP** | El protocolo (idioma) por el que viajan los pedidos web. Sus verbos son GET, POST, PATCH, DELETE. |
| **JSON** | Formato de texto estándar para intercambiar datos entre programas. |
| **JWT (token)** | "Pase o brazalete" firmado que prueba que ya iniciaste sesión, sin repetir usuario y contraseña. |
| **localStorage** | Pequeño almacén del navegador donde el frontend guarda los tokens. |
| **Migración** | Actualización controlada de la base de datos cuando cambia su plano (`schema.prisma`). |
| **Módulo** | "Departamento" del backend que agrupa todo lo relativo a un tema. |
| **Node.js** | Programa que permite ejecutar JavaScript en el servidor (fuera del navegador). |
| **ORM** | "Traductor" entre el código y la base de datos. Aquí es **Prisma**. |
| **PAdES** | Estándar técnico de firma digital para PDF con validez legal. |
| **Prisma** | El ORM del proyecto: traduce instrucciones sencillas a lenguaje de base de datos (SQL). |
| **Proxy (Vite)** | Reenvío que, en desarrollo, manda los pedidos `/api` del frontend hacia el backend. |
| **ReFirma** | Software oficial de la RENIEC para firmar PDFs con validez legal. |
| **Refresh token** | "Pase de renovación" de larga duración que permite obtener un token nuevo sin volver a iniciar sesión. |
| **Rol** | Nivel de permisos de un usuario: **ADMIN** (todo) u **OPERADOR** (documentos). |
| **Servicio** | El "trabajador experto" que ejecuta la lógica de negocio real. |
| **SQL** | Lenguaje que entienden las bases de datos. Prisma lo escribe por nosotros. |
| **SQLite / PostgreSQL** | Dos tipos de base de datos. SQLite (un archivo, para empezar) y PostgreSQL (robusta, para producción). |
| **Store (Zustand)** | "Pizarra compartida" de estado global en el frontend. |
| **Tailwind CSS** | Herramienta de estilos por medio de clases cortas (`bg-primary`, `text-lg`). |
| **TypeScript** | JavaScript con "tipos": avisa de errores antes de ejecutar. Archivos `.ts` / `.tsx`. |
| **Vite** | Empaquetador y servidor de desarrollo del frontend. |
| **Zustand** | Librería sencilla para manejar el estado global (las "pizarras"). |

---

> ✅ **Con esto tienes la base para mantener el proyecto.** Sigue leyendo `04-integracion-refirma.md` para la firma con RENIEC y `05-arquitectura.md` para la lista completa de endpoints y el modelo de datos.
