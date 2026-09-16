/**
 * Tipos compartidos del frontend.
 * Describen la "forma" de los datos que vienen del backend.
 */

export type Rol = 'ADMIN' | 'OPERADOR';
export type DocumentStatus = 'PENDIENTE' | 'SELLADO' | 'FIRMADO' | 'ANULADO';

export interface User {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: Rol;
  imagenPerfil?: string | null;
  estado?: boolean;
}

export interface Signatory {
  id: number;
  nombre: string;
  dni: string;
  cip?: string | null;
  cargo: string;
  empresa: string;
  motivo: string;
  firmaImagen?: string | null;
  estado: boolean;
}

export type TipoDocumento = 'DNI' | 'RUC' | 'CARNET_EXTRANJERIA' | 'PASAPORTE';

/** Cliente: persona (DNI) o empresa (RUC) a quien se remiten documentos. */
export interface Client {
  id: number;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  /** Nombre completo o razón social. */
  nombre: string;
  /** Persona de contacto. */
  contacto?: string | null;
  correo: string;
  telefono: string;
  direccion?: string | null;
  imagenPerfil?: string | null;
  estado: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: { documents: number };
}

/** Resultado de consultar un DNI (RENIEC) o RUC (SUNAT). */
export interface IdentidadResult {
  tipo: 'DNI' | 'RUC';
  numero: string;
  /** Nombre completo (DNI) o razón social (RUC). */
  nombre: string;
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  direccion?: string | null;
  estado?: string | null;
  condicion?: string | null;
  ubigeo?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
}

export interface DocumentItem {
  id: number;
  fileName: string;
  status: DocumentStatus;
  hash?: string | null;
  sealedAt?: string | null;
  signedAt?: string | null;
  signatory?: Signatory | null;
  signatoryId?: number | null;
  folderId?: number | null;
  clienteId?: number | null;
  cliente?: Client | null;
  clienteEmail?: string | null;
  clienteNombre?: string | null;
  emailEnviadoAt?: string | null;
  createdAt: string;
  // Datos extraídos de la firma digital embebida (flujo de re-subida).
  signerName?: string | null;
  signerDni?: string | null;
  signerIssuer?: string | null;
  signatureValid?: boolean | null;
}

export type TipoItem = 'SERVICIO' | 'PRODUCTO';
export type CategoriaServicio =
  | 'ENSAYO_FISICOQUIMICO'
  | 'ENSAYO_MICROBIOLOGICO'
  | 'ENSAYO_SENSORIAL'
  | 'INSPECCION'
  | 'MUESTREO'
  | 'CONSULTORIA'
  | 'CAPACITACION'
  | 'OTRO';

/** Ítem del catálogo que se cotiza (ensayo, inspección, consultoría…). */
export interface Service {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  tipo: TipoItem;
  categoria: CategoriaServicio;
  metodo?: string | null;
  acreditado: boolean;
  /** true = lo ejecuta un tercero (SUB). */
  subcontratado?: boolean;
  unidad: string;
  /** Prisma serializa Decimal como string; convertir con Number(). */
  precio: string | number;
  moneda: string;
  tiempoEntregaDias?: number | null;
  estado: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type EstadoCotizacion =
  | 'BORRADOR'
  | 'ENVIADA'
  | 'ACEPTADA'
  | 'RECHAZADA'
  | 'VENCIDA'
  | 'ANULADA';

export interface QuotationItem {
  id?: number;
  servicioId?: number | null;
  codigo?: string | null;
  /** Columna ACTIVIDAD (servicio). */
  actividad?: string | null;
  /** Columna DESCRIPCIÓN (producto / muestra). */
  descripcion: string;
  documentoNormativo?: string | null;
  /** PRO (true) / SUB (false). */
  propio?: boolean;
  /** AC (true) / NA (false). */
  acreditado?: boolean;
  unidad: string;
  cantidad: string | number;
  precioUnitario: string | number;
  total: string | number;
  orden?: number;
  servicio?: { id: number; codigo: string; estado: boolean } | null;
}

/** Cotización completa (detalle). Los montos vienen como string (Decimal). */
export interface Quotation {
  id: number;
  numero: string;
  clienteId: number;
  cliente: Client;
  estado: EstadoCotizacion;
  fecha: string;
  validezDias: number;
  vencimiento?: string | null;
  moneda: string;
  aplicaIgv: boolean;
  igvPorcentaje: string | number;
  subtotal: string | number;
  descuento: string | number;
  igv: string | number;
  total: string | number;
  observaciones?: string | null;
  condiciones?: string | null;
  codigoServicio?: string | null;
  servicioSolicitado?: string | null;
  contramuestra?: boolean;
  entregable?: string | null;
  tiempoEntrega?: string | null;
  responsableId?: number | null;
  responsable?: { id: number; nombre: string; cargo: string; firmaImagen?: string | null } | null;
  enviadaAt?: string | null;
  enviadaA?: string | null;
  documentoId?: number | null;
  documento?: { id: number; fileName?: string; status: DocumentStatus; signedAt?: string | null } | null;
  createdBy?: { id: number; nombre: string; apellido: string };
  items: QuotationItem[];
  createdAt: string;
  updatedAt?: string;
}

/** Fila del listado de cotizaciones (sin ítems). */
export interface QuotationRow {
  id: number;
  numero: string;
  estado: EstadoCotizacion;
  fecha: string;
  vencimiento?: string | null;
  moneda: string;
  total: string | number;
  enviadaAt?: string | null;
  documentoId?: number | null;
  documento?: { id: number; status: DocumentStatus } | null;
  cliente: { id: number; nombre: string; tipoDocumento: TipoDocumento; numeroDocumento: string; correo: string; telefono: string };
  _count?: { items: number };
  createdAt: string;
}

/** Detalle de una firma digital embebida encontrada en un PDF. */
export interface SignatureInfo {
  signerName: string | null;
  signerId: string | null;
  signerDni: string | null;
  issuer: string | null;
  country: string | null;
  signingTime: string | null;
  certValidFrom: string;
  certValidTo: string;
  certExpired: boolean;
  subFilter: string | null;
  cryptoValid: boolean;
  contentIntact: boolean;
  coversWholeDoc: boolean;
  valid: boolean;
  error?: string;
}

/** Veredicto de validar un PDF (como firmaperu.gob.pe). */
export interface ValidationResult {
  hasSignature: boolean;
  valid: boolean;
  modifiedAfterSigning: boolean;
  signatures: SignatureInfo[];
  summary: string;
}

export interface Carpeta {
  id: number;
  nombre: string;
  parentId?: number | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: { hijos: number; documents: number };
  hijos?: Carpeta[];
}

/** Contenido de una carpeta: subcarpetas + documentos + migas de pan. */
export interface FolderContents {
  carpeta: Carpeta | null;
  breadcrumb: { id: number; nombre: string }[];
  subcarpetas: Carpeta[];
  documentos: DocumentItem[];
}

export interface DashboardSummary {
  totales: {
    total: number;
    firmados: number;
    pendientes: number;
    firmantes: number;
  };
  ultimosDocumentos: DocumentItem[];
  firmadosPorMes: { mes: string; firmados: number }[];
}

/** Respuesta estándar del backend: { code, data, message, status } */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
  status: number;
}
