/**
 * ==========================================================================
 *  Consulta de identidad: RENIEC (DNI) y SUNAT (RUC)
 * ==========================================================================
 *  Portado de falconext-mype. Usa el proveedor apiperu.dev, que expone los
 *  padrones de RENIEC y SUNAT vía REST con un token Bearer (RENIEC_TOKEN).
 *
 *  Se usa para AUTOCOMPLETAR el nombre / razón social (y dirección en RUC)
 *  al registrar clientes y firmantes, evitando errores de tipeo.
 *
 *  Si el token no está configurado, el servicio responde 503 con un mensaje
 *  claro; el resto de la plataforma sigue funcionando (el registro manual no
 *  depende de esta consulta).
 * ==========================================================================
 */
import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TipoConsulta = 'DNI' | 'RUC';

/** Resultado normalizado, igual para DNI y RUC. */
export interface IdentidadResult {
  tipo: TipoConsulta;
  numero: string;
  /** Nombre completo (DNI) o razón social (RUC). */
  nombre: string;
  /** Solo DNI. */
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  /** Solo RUC. */
  direccion?: string | null;
  estado?: string | null; // ACTIVO / BAJA…
  condicion?: string | null; // HABIDO / NO HABIDO…
  ubigeo?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
}

@Injectable()
export class ReniecService {
  private readonly logger = new Logger(ReniecService.name);

  constructor(private config: ConfigService) {}

  /** ¿Hay token configurado? (el frontend lo usa para mostrar u ocultar el botón) */
  isEnabled(): boolean {
    return !!this.config.get<string>('reniec.token');
  }

  /**
   * Consulta un DNI (8 dígitos) o RUC (11 dígitos) y devuelve los datos
   * normalizados. Lanza 400 si el número no es válido, 404 si no existe,
   * 503 si no hay token y 502 si el proveedor falla.
   */
  async consultar(tipoRaw: string, numeroRaw: string): Promise<IdentidadResult> {
    const tipo = String(tipoRaw ?? '').trim().toUpperCase() as TipoConsulta;
    if (tipo !== 'DNI' && tipo !== 'RUC') {
      throw new BadRequestException('La consulta automática solo está disponible para DNI y RUC.');
    }
    const numero = String(numeroRaw ?? '').replace(/\D/g, '');
    if (tipo === 'DNI' && numero.length !== 8) {
      throw new BadRequestException('El DNI debe tener 8 dígitos.');
    }
    if (tipo === 'RUC' && numero.length !== 11) {
      throw new BadRequestException('El RUC debe tener 11 dígitos.');
    }

    const token = this.config.get<string>('reniec.token');
    if (!token) {
      throw new ServiceUnavailableException(
        'Consulta RENIEC/SUNAT no configurada. Agrega RENIEC_TOKEN en el .env del backend.',
      );
    }

    const base = (this.config.get<string>('reniec.baseUrl') ?? 'https://apiperu.dev/api').replace(/\/$/, '');
    const url = tipo === 'DNI' ? `${base}/dni` : `${base}/ruc`;
    const body = tipo === 'DNI' ? { dni: numero } : { ruc: numero };

    let payload: any;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      payload = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = payload?.message ?? `HTTP ${res.status}`;
        this.logger.warn(`apiperu ${tipo} ${numero}: ${msg}`);
        if (res.status === 404) throw new NotFoundException(`${tipo} ${numero} no encontrado.`);
        throw new BadGatewayException(`No se pudo consultar ${tipo === 'DNI' ? 'RENIEC' : 'SUNAT'}: ${msg}`);
      }
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof BadGatewayException) throw e;
      this.logger.warn(`apiperu ${tipo} ${numero}: ${(e as Error).message}`);
      throw new BadGatewayException(
        `No se pudo conectar con el servicio de consulta ${tipo === 'DNI' ? 'RENIEC' : 'SUNAT'}.`,
      );
    }

    // apiperu responde { success, data: {...} }; si success=false, no hay datos.
    const d = payload?.data;
    if (!payload?.success || !d) {
      throw new NotFoundException(
        payload?.message ?? `${tipo} ${numero} no encontrado en ${tipo === 'DNI' ? 'RENIEC' : 'SUNAT'}.`,
      );
    }

    return tipo === 'DNI' ? this.mapDni(numero, d) : this.mapRuc(numero, d);
  }

  private mapDni(numero: string, d: any): IdentidadResult {
    const nombres = d.nombres ?? null;
    const apellidoPaterno = d.apellido_paterno ?? null;
    const apellidoMaterno = d.apellido_materno ?? null;
    // Preferimos "Nombres Apellidos"; apiperu trae nombre_completo como
    // "APELLIDOS, NOMBRES", así que solo lo usamos (reordenado) como respaldo.
    let nombre = [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean).join(' ').trim();
    if (!nombre && d.nombre_completo) {
      const [ap, nom] = String(d.nombre_completo).split(',').map((x: string) => x.trim());
      nombre = nom ? `${nom} ${ap}` : ap;
    }
    return {
      tipo: 'DNI',
      numero,
      nombre: titleCase(nombre),
      nombres,
      apellidoPaterno,
      apellidoMaterno,
      ubigeo: d.ubigeo_reniec ?? d.ubigeo ?? null,
      departamento: d.departamento ?? null,
      provincia: d.provincia ?? null,
      distrito: d.distrito ?? null,
    };
  }

  private mapRuc(numero: string, d: any): IdentidadResult {
    return {
      tipo: 'RUC',
      numero,
      nombre: d.nombre_o_razon_social ?? d.razon_social ?? '',
      direccion: d.direccion_completa ?? d.direccion ?? null,
      estado: d.estado ?? null,
      condicion: d.condicion ?? null,
      ubigeo: d.ubigeo_sunat ?? d.ubigeo ?? null,
      departamento: d.departamento ?? null,
      provincia: d.provincia ?? null,
      distrito: d.distrito ?? null,
    };
  }
}

/** "JUAN PEREZ GOMEZ" -> "Juan Perez Gomez" (RENIEC devuelve todo en mayúsculas). */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length <= 2 && ['de', 'la', 'del', 'y'].includes(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}
