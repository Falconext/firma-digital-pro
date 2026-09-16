/**
 * Configuración central de la aplicación.
 * Lee las variables del archivo .env y las agrupa en un objeto tipado,
 * para no andar leyendo process.env por todo el código.
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim()),
  storageDir: process.env.STORAGE_DIR ?? './storage',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  /** Datos de la empresa emisora (cabecera de cotizaciones y correos). */
  empresa: {
    nombre: process.env.EMPRESA_NOMBRE ?? 'Certificaciones Nacionales de Alimentos S.A.C.',
    ruc: process.env.EMPRESA_RUC ?? '',
    direccion: process.env.EMPRESA_DIRECCION ?? '',
    telefono: process.env.EMPRESA_TELEFONO ?? '',
    email: process.env.EMPRESA_EMAIL ?? '',
    web: process.env.EMPRESA_WEB ?? '',
    /** Ruta a un PNG/JPG con el logo (relativa al cwd del backend). Vacío = solo texto. */
    logo: process.env.EMPRESA_LOGO ?? './assets/logo.png',
    /** Cuentas bancarias para el pago del servicio (separadas por "|"). */
    cuentas: (process.env.EMPRESA_CUENTAS ?? '').split('|').map((c) => c.trim()).filter(Boolean),
    cuentaDetraccion: process.env.EMPRESA_CUENTA_DETRACCION ?? '',
  },
  /** Bloque "Atención al cliente" de la cotización. */
  atencion: {
    contacto: process.env.ATENCION_CONTACTO ?? '',
    correo: process.env.ATENCION_CORREO ?? '',
    celular: process.env.ATENCION_CELULAR ?? '',
  },
  /** Texto de la sección "Cláusulas" de la cotización. */
  cotizacionClausulas:
    process.env.COTIZACION_CLAUSULAS ??
    'Se adjunta Anexo N° 01 Cláusulas para el desarrollo del Servicio.',
  /** Base de la URL pública de verificación (QR). Vacío = se deduce del request. */
  verifyUrlBase: process.env.VERIFY_URL_BASE ?? '',
  /** Token de apiperu.dev para consultar DNI (RENIEC) y RUC (SUNAT). */
  reniec: {
    token: process.env.RENIEC_TOKEN ?? '',
    baseUrl: process.env.RENIEC_API_URL ?? 'https://apiperu.dev/api',
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL,
  },
});
