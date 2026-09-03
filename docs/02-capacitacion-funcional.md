# 02 · Capacitación Funcional — Manual de Usuario

> **Para quién es este documento:** para todas las personas que usarán la plataforma **Firma Digital Pro** en su día a día (operadores y administradores). No necesitas saber nada de programación ni de computadoras avanzadas. Aquí te explicamos, paso a paso y con lenguaje sencillo, cómo hacer cada tarea.

---

## Índice

1. [¿Qué es Firma Digital Pro?](#1-qué-es-firma-digital-pro)
2. [Antes de empezar: lo que necesitas](#2-antes-de-empezar-lo-que-necesitas)
3. [Iniciar sesión](#3-iniciar-sesión)
4. [Conocer el panel (la pantalla principal)](#4-conocer-el-panel-la-pantalla-principal)
5. [El Panel de Control (Dashboard)](#5-el-panel-de-control-dashboard)
6. [Subir un documento PDF](#6-subir-un-documento-pdf)
7. [Buscar un documento](#7-buscar-un-documento)
8. [Ver (previsualizar) un documento](#8-ver-previsualizar-un-documento)
9. [Firmar un documento con ReFirma](#9-firmar-un-documento-con-refirma)
10. [Descargar un documento](#10-descargar-un-documento)
11. [Eliminar un documento](#11-eliminar-un-documento)
12. [Administrar firmantes](#12-administrar-firmantes)
13. [Cerrar sesión](#13-cerrar-sesión)
14. [Roles: Administrador y Operador](#14-roles-administrador-y-operador)
15. [Preguntas frecuentes (FAQ)](#15-preguntas-frecuentes-faq)
16. [Solución de problemas comunes](#16-solución-de-problemas-comunes)

---

## 1. ¿Qué es Firma Digital Pro?

Firma Digital Pro es una plataforma web (se usa desde el navegador de internet, como Chrome o Edge) que permite **firmar documentos PDF de forma digital y con validez legal**.

A diferencia de imprimir un documento, firmarlo con lapicero y volverlo a escanear, aquí la firma se hace **electrónicamente** usando tu certificado digital (por ejemplo, el del **DNI electrónico – DNIe** o un **token** de firma). Esta firma tiene la **misma validez legal** que una firma manuscrita, porque usa **ReFirma**, el software oficial de la **RENIEC** (el Registro Nacional de Identificación del Estado Peruano).

En términos simples, la plataforma te permite:

- Guardar tus documentos PDF en un solo lugar, ordenados y seguros.
- Firmarlos digitalmente con validez legal.
- Saber en todo momento cuáles están firmados y cuáles están pendientes.
- Descargar el documento ya firmado.
- Llevar un registro (auditoría) de quién firmó qué y cuándo.

---

## 2. Antes de empezar: lo que necesitas

| Necesitas | Detalle |
| --- | --- |
| Un navegador moderno | Google Chrome o Microsoft Edge (recomendados). |
| Tus credenciales | El correo y la contraseña que te entregó el administrador. |
| Conexión a internet | Para acceder a la plataforma. |
| Para **firmar de verdad** (producción) | Tener instalado el programa **ReFirma** en tu computadora, tu **certificado digital** (DNIe o token) y, si aplica, un **lector de tarjetas**. |

> 💡 **Nota sobre el "MODO DEMO":** la plataforma puede venir configurada en un modo de **demostración** que *simula* la firma. Sirve para aprender a usar el sistema sin necesidad de tener ReFirma instalado. En ese modo, el documento se marca como "firmado" pero **no** lleva una firma digital real. Para firmas con validez legal, el equipo técnico debe activar el modo de producción (ver el documento `04-integracion-refirma.md`).

---

## 3. Iniciar sesión

1. Abre tu navegador y escribe la dirección de la plataforma (por ejemplo `https://firma.tu-entidad.pe` o, en pruebas, `http://localhost:5173`).
2. Verás la pantalla de bienvenida, con un formulario a la derecha.
3. Escribe tu **correo electrónico** (ejemplo: `admin@firmadigital.pe`).
4. Escribe tu **contraseña** (ejemplo de prueba: `Admin123!`).
5. Haz clic en el botón azul **Ingresar**.

Si los datos son correctos, entrarás directamente al **Panel de Control**. Si te equivocaste, aparecerá un mensaje que dice *"Usuario o contraseña incorrectos"*: revisa que no tengas activadas las mayúsculas (Bloq Mayús) y vuelve a intentarlo.

> 🔒 **Tu sesión se mantiene abierta** un tiempo por seguridad. Si dejas la plataforma inactiva mucho rato, es posible que te pida ingresar de nuevo. Esto es normal y protege tu información.

---

## 4. Conocer el panel (la pantalla principal)

Una vez dentro, verás dos zonas:

- **Barra lateral izquierda:** es el menú de navegación. Tiene tres opciones principales:
  - **Inicio** — el panel de control con las estadísticas.
  - **Documentos** — donde subes, firmas y gestionas tus PDFs.
  - **Firmantes** — donde se administran las personas autorizadas a firmar.
  - Abajo de todo, tu **nombre**, tu **rol** y el botón **Cerrar sesión**.
- **Zona central (contenido):** cambia según la opción que elijas en el menú.

> 📱 **En celular o tablet:** la barra lateral se oculta. Toca el ícono de menú (tres líneas ☰) arriba a la izquierda para abrirla.

---

## 5. El Panel de Control (Dashboard)

Al entrar (opción **Inicio**), verás un resumen visual de la actividad:

- **Tarjetas de números** en la parte superior:
  - **Total documentos:** cuántos documentos hay en total.
  - **Firmados:** cuántos ya tienen firma.
  - **Pendientes:** cuántos aún no se han firmado.
  - **Firmantes activos:** cuántas personas autorizadas para firmar hay registradas.
- **Gráfico de barras "Documentos firmados por mes":** muestra cuántos documentos se firmaron cada mes, para ver la tendencia de trabajo.
- **Lista "Últimos documentos":** los 5 documentos más recientes, con su estado (firmado o pendiente).

Esta pantalla es solo informativa: te da una foto rápida de la situación. No necesitas hacer nada aquí; sirve para tener control de un vistazo.

---

## 6. Subir un documento PDF

Para incorporar un documento nuevo a la plataforma:

1. En el menú lateral, haz clic en **Documentos**.
2. Arriba a la derecha, haz clic en el botón **Subir documento**.
3. Se abrirá una ventana (modal). Completa los campos:
   - **Concepto del documento:** un nombre claro para identificarlo. Ejemplo: *"Certificado de inspección N.º 001"*. (Si no escribes uno, la plataforma tomará el nombre del archivo).
   - **Firmante sugerido (opcional):** puedes elegir de la lista quién será la persona que firmará este documento. Es opcional, pero recomendable, porque así la firma saldrá con sus datos.
   - **Archivo PDF:** haz clic en el recuadro punteado que dice *"Haz clic para seleccionar un PDF"* y elige el archivo desde tu computadora. **Solo se aceptan archivos en formato PDF** (máximo 10 MB).
4. Cuando el nombre del archivo aparezca en el recuadro, haz clic en **Guardar**.
5. Verás un mensaje verde de confirmación: *"Documento subido correctamente"*, y el documento aparecerá en la lista con estado **PENDIENTE**.

> ⚠️ Si intentas subir un archivo que no es PDF (por ejemplo, una imagen o un Word), la plataforma lo rechazará con el mensaje *"Solo se permiten archivos PDF"*. Convierte primero tu documento a PDF.

---

## 7. Buscar un documento

En la pantalla **Documentos** hay una barra de búsqueda (con un ícono de lupa) que dice *"Buscar por concepto…"*.

1. Escribe una parte del nombre o concepto del documento.
2. La lista se filtra **automáticamente** mientras escribes (espera un instante después de teclear).
3. Para ver todos otra vez, borra el texto de la barra.

La búsqueda encuentra documentos cuyo **concepto** contenga el texto que escribiste, sin importar mayúsculas o minúsculas.

---

## 8. Ver (previsualizar) un documento

Para revisar el contenido de un documento sin descargarlo:

1. En la lista de documentos, ubica el que te interesa.
2. En la columna **Acciones** (a la derecha), haz clic en el ícono del **ojo** 👁 (*Ver documento*).
3. Se abrirá una ventana grande mostrando el PDF directamente en pantalla.
4. Cuando termines, cierra la ventana (con la X o haciendo clic fuera de ella).

Si el documento ya está firmado, la previsualización te mostrará la **versión firmada**.

---

## 9. Firmar un documento con ReFirma

Este es el paso más importante de la plataforma. La firma se hace con **ReFirma**, el programa oficial de la RENIEC, usando tu certificado digital.

### ¿Qué pasa "por detrás"?

Es útil entender el proceso, porque involucra a tu computadora directamente:

1. Tú haces clic en **Firmar** dentro de la plataforma web.
2. La plataforma prepara el documento y le pide a **ReFirma** (el programa instalado en tu PC) que lo firme.
3. **ReFirma se abre en tu computadora** y te pide seleccionar tu **certificado digital**. Aquí es donde entra tu **DNIe** (insertado en el lector de tarjetas) o tu **token de firma** (conectado por USB).
4. Es posible que ReFirma te pida el **PIN** o clave de tu certificado. Esta clave es personal e intransferible: solo tú la conoces.
5. ReFirma **estampa la firma digital** en el PDF y se lo devuelve a la plataforma.
6. La plataforma guarda el documento firmado y lo marca como **FIRMADO**.

### Pasos en pantalla

1. En **Documentos**, ubica el documento que quieres firmar (debe estar en estado **PENDIENTE**).
2. En la columna **Acciones**, haz clic en el ícono del **lapicero** ✍ (*Firmar con ReFirma*). Este ícono solo aparece en documentos que **aún no están firmados**.
3. Verás mensajes de estado que te van indicando el avance:
   - *"Preparando documento para firma…"*
   - *"Abriendo ReFirma… elige tu certificado y firma."*
   - *"Guardando documento firmado…"*
   - *"¡Documento firmado correctamente!"*
4. Sigue las instrucciones que aparezcan en la ventana de **ReFirma** (elegir certificado, ingresar PIN, confirmar).
5. Al terminar, el documento cambiará su estado a **FIRMADO** (verás una etiqueta de color distinto) y se registrará automáticamente en la **auditoría** (quién firmó y cuándo).

> 🧪 **En MODO DEMO:** la plataforma *simula* la firma sin abrir ReFirma. Verás el mensaje *"MODO DEMO: simulando firma con ReFirma…"* y el documento pasará a FIRMADO en unos segundos. Recuerda: en este modo la firma **no** tiene validez legal; es solo para practicar.

### ¿Se puede volver a firmar?

No. Un documento que ya está **FIRMADO** no se puede volver a firmar (el ícono de firmar desaparece). Esto protege la integridad del documento.

---

## 10. Descargar un documento

Para guardar una copia del documento en tu computadora:

1. En la lista de documentos, ubica el que quieres.
2. En **Acciones**, haz clic en el ícono de la **flecha hacia abajo** ⬇ (*Descargar*).
3. El archivo PDF se descargará automáticamente a tu carpeta de descargas.

Si el documento está firmado, se descargará la **versión firmada** (la que tiene validez legal). Si aún está pendiente, se descargará el original sin firma.

---

## 11. Eliminar un documento

> ⚠️ **Cuidado:** eliminar un documento es una acción **permanente**. No se puede deshacer y también se borra el archivo firmado, si lo tuviera.

1. En la lista, ubica el documento.
2. En **Acciones**, haz clic en el ícono del **tacho de basura** 🗑 (*Eliminar*).
3. Aparecerá un mensaje de confirmación: *"¿Seguro que deseas eliminar…? Esta acción no se puede deshacer."*
4. Si estás seguro, confirma. Si no, cancela.
5. Verás el mensaje *"Documento eliminado"* y desaparecerá de la lista.

---

## 12. Administrar firmantes

Los **firmantes** son las personas cuya firma se estampa en los documentos (por ejemplo, un gerente o un supervisor que aprueba certificados). Registrarlos aquí permite que sus datos aparezcan correctamente en la firma.

### Ver la lista de firmantes

1. En el menú lateral, haz clic en **Firmantes**.
2. Verás tarjetas con la información de cada firmante: nombre, cargo, DNI, CIP (si tiene) y empresa.

### Agregar un firmante (solo Administradores)

1. En la pantalla **Firmantes**, haz clic en **Nuevo firmante** (arriba a la derecha).
2. Completa los datos en la ventana:
   - **Nombre completo** (obligatorio)
   - **DNI / RUC** (obligatorio)
   - **CIP** (opcional — número de colegiatura, si aplica)
   - **Cargo** (obligatorio — ejemplo: *Gerente*)
   - **Empresa** (obligatorio)
   - **Motivo de firma** (ejemplo: *Aprobación de Documento*)
3. Haz clic en **Guardar**.

### Editar un firmante (solo Administradores)

1. En la tarjeta del firmante, haz clic en el ícono del **lapicero** ✏ (*Editar*).
2. Cambia los datos que necesites.
3. Haz clic en **Guardar**.

### Eliminar un firmante (solo Administradores)

1. En la tarjeta del firmante, haz clic en el ícono del **tacho** 🗑 (*Eliminar*).
2. Confirma en el mensaje que aparece.

> ℹ️ Al eliminar un firmante, este deja de aparecer en las listas, pero sus datos se conservan internamente para no perder el historial de los documentos que ya firmó.

---

## 13. Cerrar sesión

Cuando termines de trabajar, especialmente en una computadora compartida, cierra tu sesión:

1. En la parte inferior de la barra lateral, haz clic en **Cerrar sesión**.
2. Volverás a la pantalla de inicio de sesión.

Esto protege tu cuenta y tu información.

---

## 14. Roles: Administrador y Operador

La plataforma tiene dos tipos de usuario. Tu rol define qué puedes hacer:

| Acción | Administrador | Operador |
| --- | :---: | :---: |
| Iniciar sesión y ver el panel | ✅ | ✅ |
| Subir, ver, buscar, descargar documentos | ✅ | ✅ |
| Firmar documentos con ReFirma | ✅ | ✅ |
| Eliminar documentos | ✅ | ✅ |
| Ver la lista de firmantes | ✅ | ✅ |
| **Crear / editar / eliminar firmantes** | ✅ | ❌ |
| **Administrar usuarios de la plataforma** | ✅ | ❌ |

En resumen: el **Operador** trabaja con documentos (subir y firmar), mientras que el **Administrador** además gestiona firmantes y usuarios.

---

## 15. Preguntas frecuentes (FAQ)

**¿Necesito instalar algo en mi computadora?**
Para usar la plataforma, no: funciona en el navegador. Pero para **firmar de verdad** (no en modo demo), sí necesitas tener instalado **ReFirma** y contar con tu certificado digital (DNIe o token) y su lector.

**¿La firma tiene validez legal?**
Sí, cuando se usa el modo de producción con ReFirma real. La firma es de tipo **PAdES** bajo el marco de la **IOFE** del Estado Peruano, con la misma validez que una firma manuscrita. En **MODO DEMO** no tiene validez legal (es solo para practicar).

**¿Qué es el "MODO DEMO"?**
Es un modo de práctica que *simula* la firma sin necesidad de ReFirma. Sirve para aprender a usar la plataforma. Lo activa/desactiva el equipo técnico.

**¿Puedo firmar cualquier archivo?**
Solo archivos **PDF**. Si tu documento está en Word, Excel u otro formato, conviértelo a PDF antes de subirlo.

**¿Puedo firmar un documento dos veces?**
No. Una vez firmado, el documento queda protegido y no se puede volver a firmar desde la plataforma.

**¿Dónde queda guardado el documento firmado?**
En la plataforma. Puedes descargarlo cuando quieras con el botón de descarga, y siempre obtendrás la versión firmada.

**Olvidé mi contraseña, ¿qué hago?**
Contacta al **Administrador** de la plataforma. Él puede actualizar tu contraseña.

**¿Qué es el "PIN" que me pide ReFirma?**
Es la clave personal de tu certificado digital (DNIe o token). Es distinta a la contraseña con la que entras a la plataforma. Solo tú la conoces y nunca debes compartirla.

**¿Puedo usar la plataforma desde mi celular?**
Sí para ver documentos, buscar y consultar el panel. Sin embargo, **la firma real requiere una computadora** con ReFirma y el lector/token conectados.

---

## 16. Solución de problemas comunes

| Problema | Posible causa | Qué hacer |
| --- | --- | --- |
| *"Usuario o contraseña incorrectos"* al ingresar | Datos mal escritos o mayúsculas activadas | Revisa el correo y la contraseña; desactiva Bloq Mayús. Si persiste, pide al administrador que verifique tu cuenta. |
| Me saca de la sesión y me pide entrar de nuevo | La sesión expiró por seguridad | Vuelve a iniciar sesión. Es normal tras inactividad. |
| *"Solo se permiten archivos PDF"* | El archivo no es PDF | Convierte tu documento a PDF y vuelve a subirlo. |
| El documento no se sube | Archivo muy grande o conexión inestable | Verifica que el PDF pese menos de 10 MB y revisa tu conexión a internet. |
| Al firmar, no se abre ReFirma | ReFirma no está instalado o no está abierto | Instala/abre ReFirma. Aparecerá el mensaje *"No se pudo conectar con ReFirma. Verifica que esté instalado y abierto."* Contacta al equipo técnico si continúa. |
| ReFirma no reconoce mi certificado | El DNIe/token no está conectado o el lector falla | Verifica que la tarjeta/token esté bien insertado y que el lector funcione. Prueba reconectarlo. |
| No veo el botón de firmar en un documento | El documento ya está **FIRMADO** | Es correcto: no se puede firmar dos veces. |
| No puedo crear ni editar firmantes | Tu rol es **Operador** | Solo los **Administradores** administran firmantes. Solicita el cambio al administrador. |
| La página se ve en blanco o rara | Caché del navegador | Recarga con `Ctrl + F5`. Si sigue, prueba en Chrome/Edge actualizado. |

> 🆘 Si un problema persiste, anota **qué estabas haciendo**, **qué mensaje apareció** y contacta al **equipo de soporte técnico** de tu entidad. Cuanta más información des, más rápido se resuelve.
