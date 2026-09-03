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
