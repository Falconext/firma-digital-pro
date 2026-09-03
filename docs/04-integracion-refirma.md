# 04 · Integración con ReFirma (RENIEC)

> **Para quién es este documento:** para el **equipo técnico** que debe entender, configurar y llevar a **producción** la firma digital con ReFirma. Explica qué es ReFirma, el flujo completo de firma, los listeners oficiales del Invoker, cómo se arman los argumentos en el backend y cómo pasar del **MODO DEMO** al modo real.

> ⚠️ **Nota crítica desde el inicio:** los **nombres exactos de los campos JSON** que espera el ReFirma Invoker **dependen de la versión que RENIEC haya licenciado a cada entidad**. Este proyecto trae una estructura estándar, documentada y aislada en un solo lugar, **pensada para ser ajustada** según el *"Manual de Integración ReFirma Invoker"* oficial que RENIEC entrega. No asumas que los nombres de campo de este documento son los definitivos para tu instalación: **valídalos siempre con el manual de tu versión.**

---

## Índice

1. [¿Qué es ReFirma? Firma PAdES e IOFE](#1-qué-es-refirma-firma-pades-e-iofe)
2. [Los 3 actores del flujo de firma](#2-los-3-actores-del-flujo-de-firma)
3. [Diagrama del proceso completo](#3-diagrama-del-proceso-completo)
4. [Los 4 listeners oficiales del ReFirma Invoker](#4-los-4-listeners-oficiales-del-refirma-invoker)
5. [Cómo se arman los argumentos en el backend](#5-cómo-se-arman-los-argumentos-en-el-backend)
6. [El MODO DEMO y cómo pasar a producción](#6-el-modo-demo-y-cómo-pasar-a-producción)
7. [Requisitos en la PC del usuario](#7-requisitos-en-la-pc-del-usuario)
8. [Cómo se guarda y verifica el documento firmado](#8-cómo-se-guarda-y-verifica-el-documento-firmado)
9. [Referencias y checklist de puesta en producción](#9-referencias-y-checklist-de-puesta-en-producción)

---

## 1. ¿Qué es ReFirma? Firma PAdES e IOFE

**ReFirma** es el software oficial del **Estado Peruano (RENIEC)** para realizar **firmas digitales** sobre documentos PDF con **validez legal**. No es una simple imagen de una firma pegada en el PDF: es una firma **criptográfica** que:

- Vincula el documento a la **identidad** del firmante (mediante su certificado digital).
- Garantiza la **integridad**: si el PDF se modifica después de firmado, la firma se invalida.
- Aporta **no repudio**: el firmante no puede negar haber firmado.

Conceptos clave:

| Término | Significado |
| --- | --- |
| **PAdES** | *PDF Advanced Electronic Signatures*. Es el estándar técnico internacional para incrustar firmas digitales **dentro** de un archivo PDF, de forma que sean verificables. Es el formato que produce ReFirma. |
| **IOFE** | *Infraestructura Oficial de Firma Electrónica* del Perú. Es el marco legal y técnico del Estado que otorga a la firma digital la **misma validez que una firma manuscrita** (Ley N.º 27269 y su reglamento). |
| **Certificado digital** | Documento electrónico que acredita la identidad del firmante. En Perú puede provenir del **DNIe** (DNI electrónico) o de un **token** de firma emitido por una Entidad de Certificación acreditada. |
| **ReFirma Invoker** | El componente que permite **invocar** a ReFirma desde una página web. Es el "puente" entre el navegador y el programa ReFirma instalado en la PC. |

**Idea central que hay que interiorizar:** **el navegador NUNCA firma el documento.** La firma la realiza el aplicativo **ReFirma instalado en la PC del usuario**, usando su certificado y su PIN, que nunca salen de su equipo. Nuestra aplicación web solo **orquesta** el proceso: prepara el documento, invoca a ReFirma y recibe el resultado ya firmado.

---

## 2. Los 3 actores del flujo de firma

El proceso involucra tres partes que colaboran. Es fundamental tener claro **qué hace cada una**:

| Actor | Dónde vive | Responsabilidad | Archivo principal |
| --- | --- | --- | --- |
| **1. La Web (Frontend)** | Navegador del usuario | Pide los argumentos de firma al backend, **invoca** al ReFirma Invoker y recibe el PDF firmado para enviarlo de vuelta. | `frontend/src/lib/refirma.ts` |
| **2. El Backend (NestJS)** | Servidor | **Arma los argumentos** de firma (qué firmar, cómo se ve la firma, a dónde devolver el resultado) y **guarda y verifica** el PDF firmado. | `backend/src/modules/refirma/refirma.service.ts` |
| **3. ReFirma** | PC del usuario | **Firma realmente** el PDF usando el certificado (DNIe/token) y el PIN del firmante. | *(software de RENIEC instalado localmente)* |

La comunicación entre la Web y ReFirma en la PC se hace típicamente por un **canal local**: una conexión **WebSocket** a `ws://127.0.0.1` (la dirección de la propia máquina), o mediante la librería JavaScript que entrega RENIEC (por ejemplo `clientclickonce.js`). Como es una conexión a la **propia computadora del usuario**, el certificado y el PIN nunca viajan por internet.

---

## 3. Diagrama del proceso completo

```
   ┌─────────────┐         ┌──────────────────┐        ┌────────────────────┐
   │  Usuario    │         │   FRONTEND (Web) │        │   BACKEND (NestJS) │
   │ (navegador) │         │  lib/refirma.ts  │        │ refirma.service.ts │
   └──────┬──────┘         └────────┬─────────┘        └─────────┬──────────┘
          │                         │                            │
          │ 1. clic en "Firmar"     │                            │
          │────────────────────────>│                            │
          │                         │ 2. POST /refirma/preparar/:id
          │                         │───────────────────────────>│
          │                         │                            │ 3. Lee el PDF del
          │                         │                            │    storage, arma los
          │                         │                            │    argumentos (JSON)
          │                         │                            │    y los codifica en
          │                         │                            │    Base64.
          │                         │  4. { argumentsBase64 }    │
          │                         │<───────────────────────────│
          │                         │                            │
          │            ┌────────────┴───────────────┐            │
          │            │  5. Invoca al ReFirma       │            │
          │            │     Invoker (ws://127.0.0.1)│            │
          │            └────────────┬───────────────┘            │
          │                         │                            │
   ┌──────┴───────────────────────────────────────┐             │
   │        ReFirma en la PC del usuario           │             │
   │  6. getArguments  → recibe los argumentos     │             │
   │  7. El usuario elige su CERTIFICADO (DNIe/    │             │
   │     token) e ingresa su PIN.                  │             │
   │  8. ReFirma FIRMA el PDF (formato PAdES).     │             │
   │  9. invokerOk → devuelve el PDF firmado       │             │
   │     (o invokerCancel si el usuario cancela).  │             │
   └──────┬────────────────────────────────────────┘             │
          │                         │                            │
          │                         │ 10. PDF firmado (Base64)   │
          │                         │────────────────────────────│
          │                         │ 11. POST /refirma/firmado/:id
          │                         │───────────────────────────>│
          │                         │                            │ 12. Guarda el PDF firmado,
          │                         │                            │     calcula SHA-256,
          │                         │                            │     marca status=FIRMADO
          │                         │                            │     y registra AUDITORÍA.
          │                         │  13. documento firmado     │
          │                         │<───────────────────────────│
          │  14. "Documento firmado"│                            │
          │<────────────────────────│                            │
```

**Resumen del flujo:** la web pide los argumentos (pasos 2-4) → invoca a ReFirma (paso 5) → ReFirma firma con el certificado del usuario (pasos 6-9) → la web devuelve el PDF firmado al backend (pasos 10-11) → el backend lo guarda, lo verifica y lo audita (paso 12).

---

## 4. Los 4 listeners oficiales del ReFirma Invoker

Un **listener** ("escucha") es una función que reacciona a un **evento** del Invoker. El ReFirma Invoker de RENIEC define **cuatro** listeners que la aplicación web debe implementar. Estos son los nombres oficiales del componente:

| # | Listener | Cuándo se dispara | Qué debe hacer nuestra web |
| --- | --- | --- | --- |
| 1 | **`getArguments`** | El Invoker está listo y **solicita los argumentos** de firma. | Entregarle el JSON de argumentos (codificado en Base64) que preparó el backend. |
| 2 | **`sendArguments`** | Momento de **enviar los argumentos** al Invoker. | Transmitir los argumentos al componente (por ejemplo, `ws.send(argumentsBase64)`). |
| 3 | **`invokerOk`** | La firma **terminó con éxito**. | Recibir el PDF firmado (Base64) y enviarlo al backend (`POST /refirma/firmado/:id`). |
| 4 | **`invokerCancel`** | El usuario **canceló** o hubo un **error** (no eligió certificado, PIN incorrecto, ReFirma no instalado, etc.). | Detener el proceso y avisar al usuario con un mensaje claro. |

> ℹ️ Según la versión, estos listeners pueden exponerse como **eventos de un objeto JavaScript** que RENIEC provee, o como **mensajes de un WebSocket**. En el esquema WebSocket de este proyecto, `sendArguments` corresponde a `ws.onopen → ws.send(...)`, `invokerOk` corresponde a `ws.onmessage` (llega el PDF firmado), e `invokerCancel` corresponde a `ws.onerror`. **Confirma el mecanismo exacto en tu Manual de Integración.**

### Cómo están hoy en el código (esquema WebSocket)

En `frontend/src/lib/refirma.ts`, la función `invokeRealRefirma()` implementa el esquema típico con WebSocket local. Extracto real del proyecto:

```typescript
function invokeRealRefirma(argumentsBase64, onStatus) {
  return new Promise((resolve, reject) => {
    onStatus?.('Abriendo ReFirma… elige tu certificado y firma.');
    const ws = new WebSocket('ws://127.0.0.1:48596');
    ws.onopen    = () => ws.send(argumentsBase64);      // sendArguments
    ws.onmessage = (event) => {                          // invokerOk
      resolve(String(event.data));  // el PDF firmado (Base64)
      ws.close();
    };
    ws.onerror   = () => reject(new Error(               // invokerCancel
      'No se pudo conectar con ReFirma. Verifica que esté instalado y abierto.',
    ));
  });
}
```

> ⚠️ El **puerto `48596`** y el **hecho de que `onmessage` devuelva directamente el PDF** son **supuestos de ejemplo**. Ajusta el puerto, el protocolo de mensajes y el formato de respuesta según tu versión del Invoker. En algunas versiones, en lugar de un WebSocket, se incluye un `<script>` con la librería de RENIEC y se registran los cuatro listeners como *callbacks* sobre un objeto global.

---

## 5. Cómo se arman los argumentos en el backend

El backend es responsable de construir el objeto de **argumentos de firma**. Esto ocurre en `backend/src/modules/refirma/refirma.service.ts`, principalmente en el método **`buildInvokerArguments()`**, que es llamado por `prepareSigning()`.

### `prepareSigning(documentId, apiBaseUrl)` — preparar la firma

1. Busca el documento en la base de datos (incluyendo su firmante).
2. Valida que exista y que **no esté ya firmado** (si lo está, lanza error).
3. Lee el PDF original desde el storage y lo convierte a **Base64**.
4. Define la **apariencia** de la firma visible (página, posición X/Y, tamaño, motivo, nombre del firmante).
5. Llama a `buildInvokerArguments()` para armar el objeto de argumentos.
6. **Codifica todo el JSON en Base64** (RENIEC exige que los argumentos viajen así) y lo devuelve como `argumentsBase64`.

### `buildInvokerArguments()` — el objeto de argumentos

Este es el método que **debes ajustar** según tu manual. Estructura estándar actual del proyecto:

```typescript
private buildInvokerArguments(documentId, pdfBase64, appearance, apiBaseUrl) {
  return {
    operacion: 'sign',                          // "sign" (firmar) o "validate"
    documento: pdfBase64,                        // el PDF a firmar, en Base64
    nombreDocumento: `documento-${documentId}.pdf`,
    firmaVisible: {                              // apariencia de la firma sobre el PDF
      pagina: appearance.pagina,                 // página donde va la firma
      posicionX: appearance.x,                   // posición horizontal (puntos PDF)
      posicionY: appearance.y,                   // posición vertical (puntos PDF)
      ancho: appearance.ancho,
      alto: appearance.alto,
      motivo: appearance.motivo,                 // ej. "Aprobación de Documento"
      texto: appearance.firmante,                // nombre visible del firmante
    },
    urlRetorno: `${apiBaseUrl}/refirma/firmado/${documentId}`, // callback (paso 5)
    vigenciaHoras: 24,                           // vigencia del pedido de firma
  };
}
```

**Qué representa cada campo:**

| Campo | Significado | Ajustable |
| --- | --- | --- |
| `operacion` | Acción a realizar: firmar (`sign`) o validar (`validate`). | El nombre del campo y sus valores pueden variar. |
| `documento` | El PDF a firmar, en Base64. | El nombre del campo puede ser distinto (`file`, `pdf`, etc.). |
| `nombreDocumento` | Nombre lógico del documento. | Opcional según versión. |
| `firmaVisible` | Cómo se dibuja la firma sobre el PDF (posición, tamaño, texto). | La estructura y nombres de subcampos casi seguro difieren por versión. |
| `urlRetorno` | URL a la que ReFirma devolverá el PDF firmado (el *callback*). | El nombre del campo puede ser `callbackUrl`, `urlCallback`, etc. |
| `vigenciaHoras` | Tiempo de validez del pedido de firma. | Opcional. |

> 🔧 **Ventaja de diseño:** toda la construcción de argumentos está **centralizada en un único método** (`buildInvokerArguments`). Cuando adaptes el proyecto a tu versión de ReFirma, **solo tocas ese método** y el resto del sistema sigue funcionando igual. Ese es exactamente el objetivo de haberlo aislado ahí.

La **apariencia** de la firma (posición y tamaño) se define en `prepareSigning()` con valores por defecto:

```typescript
const appearance = {
  pagina: 1, x: 380, y: 60, ancho: 180, alto: 90,
  motivo: doc.signatory?.motivo ?? 'Aprobación de Documento',
  firmante: doc.signatory?.nombre ?? 'Firmante',
};
```

Si necesitas que la firma se ubique en otro lugar del PDF, cambia estos valores (coordenadas en "puntos PDF", donde el origen suele estar en la esquina inferior izquierda).

---

## 6. El MODO DEMO y cómo pasar a producción

### ¿Qué es el MODO DEMO?

El proyecto incluye un **modo de demostración** que **simula** la firma sin necesidad de tener ReFirma instalado. Es ideal para:

- Capacitar a usuarios sin depender de certificados.
- Probar todo el flujo de la interfaz en un ambiente de pruebas.
- Desarrollar el frontend sin bloquearse por la integración local.

Se controla con **una sola constante** al inicio de `frontend/src/lib/refirma.ts`:

```typescript
// Cambia a false cuando el ReFirma Invoker real esté disponible en las PCs.
const DEMO_MODE = true;
```

Cuando `DEMO_MODE = true`, la función `signWithRefirma()` llama a `simulateSigning()`, que espera un instante y devuelve el **mismo PDF** como si estuviera firmado (sin firma real, sin validez legal). Cuando `DEMO_MODE = false`, llama a `invokeRealRefirma()`, que invoca al Invoker real.

> ⚠️ El MODO DEMO **NO produce una firma con validez legal**. Es únicamente para demostración y práctica. Nunca lo uses para documentos oficiales.

### Pasos para pasar a producción (firma real)

1. **Obtén de RENIEC el ReFirma Invoker y su Manual de Integración** correspondiente a tu entidad/versión.
2. **Instala ReFirma** en las PCs de los usuarios que van a firmar (ver requisitos, sección 7).
3. En `frontend/src/lib/refirma.ts`, cambia la constante a:
   ```typescript
   const DEMO_MODE = false;
   ```
4. **Ajusta `invokeRealRefirma()`** en ese mismo archivo según tu manual: el mecanismo (WebSocket vs librería JS de RENIEC), el **puerto**, el **protocolo de mensajes** y el **formato del PDF firmado** que devuelve. Implementa correctamente los cuatro listeners (`getArguments`, `sendArguments`, `invokerOk`, `invokerCancel`).
5. **Ajusta `buildInvokerArguments()`** en `backend/src/modules/refirma/refirma.service.ts` para que los **nombres de los campos JSON** coincidan exactamente con los que exige tu versión del Invoker (según el manual).
6. **Sirve la aplicación por HTTPS.** Es **obligatorio**: los navegadores modernos restringen la comunicación con componentes locales y ciertas APIs desde páginas no seguras (ver `06-implementacion-despliegue.md`).
7. **Prueba de extremo a extremo** con un certificado real (DNIe o token) en un ambiente controlado (marcha blanca) antes de liberar a todos los usuarios.

---

## 7. Requisitos en la PC del usuario

Para firmar de verdad, **cada computadora** desde la que se firme debe tener:

| Requisito | Detalle |
| --- | --- |
| **ReFirma instalado** | El aplicativo/Invoker oficial de RENIEC, instalado y en ejecución. |
| **Certificado digital vigente** | Del **DNIe** (DNI electrónico) o un **token** de firma emitido por una Entidad de Certificación acreditada. Debe estar **vigente** (no vencido ni revocado). |
| **Lector de tarjetas** | Si se usa DNIe, un **lector de smart card** conectado y con sus controladores (drivers) instalados. Si se usa token USB, el token conectado. |
| **PIN del certificado** | La clave personal del certificado, que el usuario ingresa en ReFirma. Es intransferible. |
| **Navegador compatible** | Chrome o Edge actualizados. La página debe cargarse por **HTTPS** en producción. |
| **Permisos de firewall/antivirus** | La conexión local (ej. `ws://127.0.0.1:<puerto>`) no debe estar bloqueada por el firewall o el antivirus. |

> 💡 Un buen paso de "marcha blanca" es verificar, en una PC piloto, que ReFirma abre correctamente al hacer clic en "Firmar" y que el certificado aparece en la lista. Documenta el puerto y cualquier permiso especial que haya que habilitar, para replicarlo en las demás máquinas.

---

## 8. Cómo se guarda y verifica el documento firmado

Cuando ReFirma devuelve el PDF firmado, la web lo envía al backend con `POST /refirma/firmado/:id`. Esto ejecuta el método **`storeSignedDocument()`** en `refirma.service.ts`, que:

1. Verifica que el documento exista.
2. **Guarda el PDF firmado** en el storage (con prefijo `firmado-`), separado del original.
3. **Calcula su huella `SHA-256`** (una "huella digital" única del archivo). Si el PDF cambiara aunque sea un byte, la huella sería distinta: sirve para comprobar **integridad**.
4. Actualiza el documento en la base de datos: guarda `signedKey` (nombre del archivo firmado), `hash` (la huella), pone `status = FIRMADO` y registra `signedAt` (fecha/hora de firma).
5. **Registra un evento en la bitácora de auditoría** (`AuditLog`): acción `DOCUMENTO_FIRMADO`, qué documento, qué usuario, desde qué IP y con qué huella SHA-256.

Esta auditoría es especialmente importante en un sistema de firma digital: deja **rastro trazable** de quién firmó qué, cuándo y desde dónde. El documento **original** se conserva por separado del **firmado**, y las descargas/previsualizaciones sirven siempre la versión firmada cuando existe.

---

## 9. Referencias y checklist de puesta en producción

### Referencias útiles

- **Manual de Integración ReFirma Invoker** — documento oficial que RENIEC entrega a cada entidad. **Es la fuente de verdad** para los nombres de campos, puertos y listeners. Prevalece sobre cualquier ejemplo de este documento.
- Repositorios de referencia de la comunidad (ejemplos de integración; **no oficiales**, úsalos solo como guía):
  - `github.com/gobiernodigitalperu/invoker`
  - `github.com/jumanor/refirmainvoker`

### Checklist para producción

- [ ] Obtenido el ReFirma Invoker y su Manual de Integración de la versión licenciada.
- [ ] ReFirma instalado y probado en al menos una PC piloto.
- [ ] `DEMO_MODE = false` en `frontend/src/lib/refirma.ts`.
- [ ] `invokeRealRefirma()` ajustado (mecanismo, puerto, listeners, formato de respuesta).
- [ ] `buildInvokerArguments()` ajustado (nombres de campos JSON según el manual).
- [ ] Apariencia de la firma (posición/tamaño) validada sobre PDFs reales.
- [ ] Aplicación servida por **HTTPS**.
- [ ] Certificado(s) de prueba (DNIe/token) validados en marcha blanca.
- [ ] Firewall/antivirus permiten la conexión local al Invoker.
- [ ] Verificado que el documento firmado se guarda, obtiene su SHA-256 y queda en auditoría.
- [ ] Capacitación a usuarios finales sobre el uso del certificado y el PIN.

> ✅ Con estos ajustes, el mismo flujo que hoy funciona en MODO DEMO operará con **firma digital real de validez legal**. Recuerda: **el único cambio conceptual** es reemplazar la simulación por la invocación real y **alinear los nombres de los campos** con tu manual de RENIEC.
