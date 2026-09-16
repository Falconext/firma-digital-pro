/**
 * Servicio de cotizaciones.
 *
 * Flujo típico:
 *   1. Se crea en BORRADOR con cliente + ítems (del catálogo o líneas libres).
 *      Los totales se calculan aquí y se guardan congelados.
 *   2. Se genera el PDF (vista previa) y se envía al cliente por correo
 *      -> pasa a ENVIADA.
 *   3. El cliente responde -> ACEPTADA / RECHAZADA (o VENCIDA / ANULADA).
 *   4. Opcional: "generar documento" convierte el PDF en un Documento de la
 *      plataforma (sellado con QR) para firmarlo digitalmente y remitirlo.
 */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EstadoCotizacion, Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { DocumentsService } from '../documents/documents.service';
import { RefirmaService } from '../refirma/refirma.service';
import { QuotationPdfService } from './quotation-pdf.service';
import {
  CreateQuotationDto,
  GenerateDocumentDto,
  QuotationItemDto,
  SendQuotationDto,
  SendWhatsappDto,
  UpdateQuotationDto,
} from './dto/quotation.dto';

const IGV = 18;

const CONDICIONES_DEFAULT =
  'Precios expresados en soles (S/). Forma de pago: 50% a la aceptación y 50% contra entrega del informe. ' +
  'Los plazos de entrega se cuentan en días hábiles desde la recepción de las muestras. ' +
  'Los resultados se emiten en informe de ensayo firmado digitalmente.';

/** Include estándar para devolver una cotización completa. */
const fullInclude = {
  cliente: true,
  items: { orderBy: { orden: 'asc' as const }, include: { servicio: { select: { id: true, codigo: true, estado: true } } } },
  documento: { select: { id: true, fileName: true, status: true, signedAt: true } },
  responsable: { select: { id: true, nombre: true, cargo: true, firmaImagen: true } },
  createdBy: { select: { id: true, nombre: true, apellido: true } },
} satisfies Prisma.QuotationInclude;

/** Campos "de formato" que se copian tal cual del DTO (crear / editar / duplicar). */
function formatFields(dto: {
  codigoServicio?: string | null;
  servicioSolicitado?: string | null;
  contramuestra?: boolean;
  entregable?: string | null;
  tiempoEntrega?: string | null;
  responsableId?: number | null;
}) {
  return {
    ...(dto.codigoServicio !== undefined ? { codigoServicio: dto.codigoServicio } : {}),
    ...(dto.servicioSolicitado !== undefined ? { servicioSolicitado: dto.servicioSolicitado } : {}),
    ...(dto.contramuestra !== undefined ? { contramuestra: dto.contramuestra } : {}),
    ...(dto.entregable !== undefined ? { entregable: dto.entregable } : {}),
    ...(dto.tiempoEntrega !== undefined ? { tiempoEntrega: dto.tiempoEntrega } : {}),
    ...(dto.responsableId !== undefined ? { responsableId: dto.responsableId } : {}),
  };
}

@Injectable()
export class QuotationsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private pdf: QuotationPdfService,
    private documents: DocumentsService,
    private refirma: RefirmaService,
    private config: ConfigService,
  ) {}

  // ------------------------------------------------------------------
  //  Consultas
  // ------------------------------------------------------------------

  /**
   * Lista cotizaciones (más recientes primero).
   * @param buscar   por número o nombre del cliente
   * @param estado   filtra por estado
   * @param clienteId filtra por cliente
   */
  findAll(buscar?: string, estado?: string, clienteId?: number) {
    const where: Prisma.QuotationWhereInput = {};
    if (estado && estado in EstadoCotizacion) where.estado = estado as EstadoCotizacion;
    if (clienteId) where.clienteId = clienteId;
    if (buscar?.trim()) {
      const q = buscar.trim();
      where.OR = [
        { numero: { contains: q } },
        { cliente: { nombre: { contains: q } } },
        { cliente: { numeroDocumento: { contains: q } } },
      ];
    }
    return this.prisma.quotation.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombre: true, tipoDocumento: true, numeroDocumento: true, correo: true, telefono: true } },
        documento: { select: { id: true, status: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const q = await this.prisma.quotation.findUnique({ where: { id }, include: fullInclude });
    if (!q) throw new NotFoundException('Cotización no encontrada');
    return q;
  }

  /** Resumen para el panel: cantidad y monto por estado. */
  async summary() {
    const rows = await this.prisma.quotation.groupBy({
      by: ['estado'],
      _count: { _all: true },
      _sum: { total: true },
    });
    const porEstado: Record<string, { cantidad: number; monto: number }> = {};
    for (const r of rows) {
      porEstado[r.estado] = { cantidad: r._count._all, monto: Number(r._sum.total ?? 0) };
    }
    return porEstado;
  }

  // ------------------------------------------------------------------
  //  Alta / edición
  // ------------------------------------------------------------------

  async create(userId: number, dto: CreateQuotationDto) {
    await this.ensureClient(dto.clienteId);
    if (dto.responsableId != null) await this.ensureSignatory(dto.responsableId);
    const items = await this.buildItems(dto.items);
    const totals = this.computeTotals(items, dto.descuento ?? 0, dto.aplicaIgv ?? true);
    const fecha = new Date();
    const validezDias = dto.validezDias ?? 15;

    // El correlativo puede chocar si dos usuarios crean a la vez: reintentamos.
    for (let intento = 0; intento < 3; intento++) {
      const numero = await this.nextNumero(fecha);
      try {
        const created = await this.prisma.quotation.create({
          data: {
            numero,
            clienteId: dto.clienteId,
            fecha,
            validezDias,
            vencimiento: addDays(fecha, validezDias),
            moneda: dto.moneda ?? 'PEN',
            aplicaIgv: dto.aplicaIgv ?? true,
            igvPorcentaje: IGV,
            observaciones: dto.observaciones ?? null,
            condiciones: dto.condiciones ?? CONDICIONES_DEFAULT,
            createdById: userId,
            ...formatFields(dto),
            ...totals,
            items: { create: items },
          },
          include: fullInclude,
        });
        await this.audit('COTIZACION_CREADA', created.id, `Cotización ${numero} creada`, userId);
        return created;
      } catch (e) {
        if (!this.isUniqueError(e) || intento === 2) throw e;
      }
    }
    throw new ConflictException('No se pudo asignar un número de cotización');
  }

  /** Edita una cotización. Solo en BORRADOR; los ítems (si vienen) se reemplazan. */
  async update(id: number, dto: UpdateQuotationDto, userId?: number) {
    const actual = await this.findOne(id);
    if (actual.estado !== EstadoCotizacion.BORRADOR) {
      throw new BadRequestException(
        'Solo se puede editar una cotización en borrador. Duplícala para crear una nueva versión.',
      );
    }
    if (dto.clienteId != null) await this.ensureClient(dto.clienteId);
    if (dto.responsableId != null) await this.ensureSignatory(dto.responsableId);

    const items = dto.items ? await this.buildItems(dto.items) : null;
    const baseItems =
      items ??
      actual.items.map((it) => ({
        cantidad: Number(it.cantidad),
        precioUnitario: Number(it.precioUnitario),
        total: Number(it.total),
      }));
    const totals = this.computeTotals(
      baseItems,
      dto.descuento ?? Number(actual.descuento),
      dto.aplicaIgv ?? actual.aplicaIgv,
    );
    const validezDias = dto.validezDias ?? actual.validezDias;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.quotationItem.deleteMany({ where: { cotizacionId: id } });
      }
      return tx.quotation.update({
        where: { id },
        data: {
          ...(dto.clienteId != null ? { clienteId: dto.clienteId } : {}),
          validezDias,
          vencimiento: addDays(actual.fecha, validezDias),
          ...(dto.moneda ? { moneda: dto.moneda } : {}),
          ...(dto.aplicaIgv != null ? { aplicaIgv: dto.aplicaIgv } : {}),
          ...(dto.descuento != null ? { descuento: dto.descuento } : {}),
          ...(dto.observaciones !== undefined ? { observaciones: dto.observaciones } : {}),
          ...(dto.condiciones !== undefined ? { condiciones: dto.condiciones } : {}),
          ...formatFields(dto),
          ...totals,
          ...(items ? { items: { create: items } } : {}),
        },
        include: fullInclude,
      });
    });
    await this.audit('COTIZACION_EDITADA', id, `Cotización ${updated.numero} editada`, userId);
    return updated;
  }

  /** Cambia el estado (ENVIADA, ACEPTADA, RECHAZADA, VENCIDA, ANULADA, o volver a BORRADOR). */
  async changeStatus(id: number, estado: EstadoCotizacion, userId?: number) {
    const actual = await this.findOne(id);
    if (actual.estado === EstadoCotizacion.ANULADA && estado !== EstadoCotizacion.ANULADA) {
      throw new BadRequestException('Una cotización anulada no puede cambiar de estado.');
    }
    if (estado === EstadoCotizacion.BORRADOR && actual.estado !== EstadoCotizacion.ENVIADA) {
      throw new BadRequestException('Solo una cotización enviada puede volver a borrador.');
    }
    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        estado,
        ...(estado === EstadoCotizacion.ENVIADA && !actual.enviadaAt ? { enviadaAt: new Date() } : {}),
      },
      include: fullInclude,
    });
    await this.audit('COTIZACION_ESTADO', id, `Cotización ${updated.numero}: ${actual.estado} → ${estado}`, userId);
    return updated;
  }

  /** Crea un nuevo BORRADOR copiando cliente, ítems y condiciones. */
  async duplicate(id: number, userId: number) {
    const src = await this.findOne(id);
    return this.create(userId, {
      clienteId: src.clienteId,
      validezDias: src.validezDias,
      moneda: src.moneda,
      aplicaIgv: src.aplicaIgv,
      descuento: Number(src.descuento),
      observaciones: src.observaciones,
      condiciones: src.condiciones,
      codigoServicio: src.codigoServicio,
      servicioSolicitado: src.servicioSolicitado,
      contramuestra: src.contramuestra,
      entregable: src.entregable,
      tiempoEntrega: src.tiempoEntrega,
      responsableId: src.responsableId,
      items: src.items.map((it) => ({
        servicioId: it.servicioId,
        codigo: it.codigo,
        actividad: it.actividad,
        descripcion: it.descripcion,
        documentoNormativo: it.documentoNormativo,
        propio: it.propio,
        acreditado: it.acreditado,
        unidad: it.unidad,
        cantidad: Number(it.cantidad),
        precioUnitario: Number(it.precioUnitario),
      })),
    });
  }

  /** Elimina definitivamente. Solo borradores; el resto se ANULA. */
  async remove(id: number, userId?: number) {
    const q = await this.findOne(id);
    if (q.estado !== EstadoCotizacion.BORRADOR) {
      throw new BadRequestException('Solo se puede eliminar un borrador. Usa "Anular" para las demás.');
    }
    await this.prisma.quotation.delete({ where: { id } });
    await this.audit('COTIZACION_ELIMINADA', id, `Borrador ${q.numero} eliminado`, userId);
    return { id, deleted: true };
  }

  // ------------------------------------------------------------------
  //  PDF, correo y paso a documento firmable
  // ------------------------------------------------------------------

  async pdfBuffer(id: number): Promise<{ numero: string; buffer: Buffer }> {
    const q = await this.findOne(id);
    const bytes = await this.pdf.build(q);
    return { numero: q.numero, buffer: Buffer.from(bytes) };
  }

  async pdfBase64(id: number) {
    const { numero, buffer } = await this.pdfBuffer(id);
    return { numero, base64File: `data:application/pdf;base64,${buffer.toString('base64')}` };
  }

  /** Envía el PDF al cliente y marca la cotización como ENVIADA. */
  async send(id: number, dto: SendQuotationDto, userId?: number, ip?: string) {
    const q = await this.findOne(id);
    if (q.estado === EstadoCotizacion.ANULADA) {
      throw new BadRequestException('No se puede enviar una cotización anulada.');
    }
    const to = dto.email ?? q.cliente.correo;
    const { buffer } = await this.pdfBuffer(id);
    const moneda = q.moneda === 'USD' ? '$' : 'S/';

    await this.mail.sendQuotation({
      to,
      clienteNombre: q.cliente.nombre,
      numero: q.numero,
      totalTexto: `${moneda} ${Number(q.total).toFixed(2)}`,
      vencimientoTexto: q.vencimiento ? q.vencimiento.toLocaleDateString('es-PE') : '—',
      empresa: this.config.get<string>('empresa.nombre') ?? 'Firma Digital Pro',
      mensaje: dto.mensaje,
      pdfBuffer: buffer,
    });

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        enviadaAt: new Date(),
        enviadaA: to,
        ...(q.estado === EstadoCotizacion.BORRADOR ? { estado: EstadoCotizacion.ENVIADA } : {}),
      },
      include: fullInclude,
    });
    await this.audit('COTIZACION_ENVIADA', id, `Cotización ${q.numero} enviada a ${to}`, userId, ip);
    return updated;
  }

  // ------------------------------------------------------------------
  //  WhatsApp (click-to-chat) y enlace público de descarga
  // ------------------------------------------------------------------

  /**
   * Token que autoriza descargar el PDF sin iniciar sesión (se incluye en el
   * mensaje de WhatsApp). Es un HMAC del id con el secreto JWT: no se guarda
   * en BD y no se puede adivinar sin el secreto.
   */
  publicToken(id: number): string {
    const secret = this.config.get<string>('jwt.secret') ?? 'dev-secret';
    return createHmac('sha256', secret).update(`cotizacion:${id}`).digest('hex').slice(0, 32);
  }

  /** PDF para el enlace público. Rechaza tokens inválidos y cotizaciones anuladas. */
  async pdfPublic(id: number, token: string) {
    const expected = this.publicToken(id);
    const ok =
      token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    if (!ok) throw new NotFoundException('Enlace inválido');
    const q = await this.findOne(id);
    if (q.estado === EstadoCotizacion.ANULADA) throw new NotFoundException('Cotización anulada');
    return this.pdfBuffer(id);
  }

  /**
   * Datos para armar el mensaje de WhatsApp: teléfono del cliente, texto
   * sugerido y enlace público al PDF. El front abre wa.me con esto.
   */
  async whatsappPrefill(id: number, publicBase: string) {
    const q = await this.findOne(id);
    if (q.estado === EstadoCotizacion.ANULADA) {
      throw new BadRequestException('No se puede enviar una cotización anulada.');
    }
    const empresa = this.config.get<string>('empresa.nombre') ?? 'Firma Digital Pro';
    const moneda = q.moneda === 'USD' ? '$' : 'S/';
    const enlace = `${publicBase}/${id}/${this.publicToken(id)}`;
    const vence = q.vencimiento ? q.vencimiento.toLocaleDateString('es-PE') : null;
    const mensaje = [
      `Estimado(a) ${q.cliente.contacto || q.cliente.nombre}, le saludamos de ${empresa.replace(/\.$/, '')}.`,
      ``,
      `Le enviamos la cotización *${q.numero}* por ${moneda} ${Number(q.total).toFixed(2)}` +
        (vence ? `, válida hasta el ${vence}.` : '.'),
      ``,
      `Puede descargarla aquí: ${enlace}`,
      ``,
      `Quedamos atentos a cualquier consulta.`,
    ].join('\n');
    return { telefono: normalizePhone(q.cliente.telefono), mensaje, enlace };
  }

  /** Registra el envío por WhatsApp (el mensaje lo manda el usuario desde su WhatsApp). */
  async registerWhatsapp(id: number, dto: SendWhatsappDto, userId?: number, ip?: string) {
    const q = await this.findOne(id);
    if (q.estado === EstadoCotizacion.ANULADA) {
      throw new BadRequestException('No se puede enviar una cotización anulada.');
    }
    const telefono = normalizePhone(dto.telefono);
    if (telefono.length < 8) throw new BadRequestException('Número de WhatsApp inválido.');
    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        enviadaAt: new Date(),
        enviadaA: `WhatsApp +${telefono}`,
        ...(q.estado === EstadoCotizacion.BORRADOR ? { estado: EstadoCotizacion.ENVIADA } : {}),
      },
      include: fullInclude,
    });
    await this.audit('COTIZACION_ENVIADA', id, `Cotización ${q.numero} enviada por WhatsApp a +${telefono}`, userId, ip);
    return updated;
  }

  /**
   * Convierte la cotización en un Documento de la plataforma: genera el PDF,
   * lo registra con firmante y cliente, y lo sella con QR (listo para firmar
   * con ReFirma y remitir). Una cotización solo puede tener un documento.
   */
  async generateDocument(id: number, dto: GenerateDocumentDto, verifyBaseUrl: string, userId: number, ip?: string) {
    const q = await this.findOne(id);
    if (q.documentoId) {
      throw new ConflictException('Esta cotización ya tiene un documento generado.');
    }
    if (q.estado === EstadoCotizacion.ANULADA) {
      throw new BadRequestException('No se puede generar el documento de una cotización anulada.');
    }
    const { buffer } = await this.pdfBuffer(id);

    const doc = await this.documents.create(userId, {
      fileName: `Cotización ${q.numero} - ${q.cliente.nombre}`,
      base64File: buffer.toString('base64'),
      signatoryId: dto.signatoryId,
      folderId: dto.folderId ?? null,
      clienteId: q.clienteId,
    });
    await this.refirma.autoSealOnUpload(doc.id, verifyBaseUrl, userId, ip);

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: { documentoId: doc.id },
      include: fullInclude,
    });
    await this.audit('COTIZACION_DOCUMENTO', id, `Documento #${doc.id} generado desde ${q.numero}`, userId, ip);
    return updated;
  }

  // ------------------------------------------------------------------
  //  Helpers
  // ------------------------------------------------------------------

  /** Normaliza los ítems: completa código/unidad/precio desde el catálogo y calcula el total por línea. */
  private async buildItems(items: QuotationItemDto[]) {
    const ids = items.map((i) => i.servicioId).filter((v): v is number => v != null);
    const servicios = ids.length
      ? await this.prisma.service.findMany({ where: { id: { in: ids } } })
      : [];
    const byId = new Map(servicios.map((s) => [s.id, s]));

    return items.map((it, idx) => {
      const sv = it.servicioId != null ? byId.get(it.servicioId) : undefined;
      if (it.servicioId != null && !sv) {
        throw new BadRequestException(`El servicio #${it.servicioId} no existe.`);
      }
      const cantidad = round2(it.cantidad);
      const precioUnitario = round2(it.precioUnitario);
      const actividad = (it.actividad ?? sv?.nombre ?? '').trim() || null;
      const descripcion = (it.descripcion ?? '').trim();
      if (!actividad && !descripcion) {
        throw new BadRequestException(`El ítem #${idx + 1} necesita actividad o descripción.`);
      }
      return {
        servicioId: sv?.id ?? null,
        codigo: it.codigo ?? sv?.codigo ?? null,
        actividad,
        descripcion,
        documentoNormativo: (it.documentoNormativo ?? sv?.metodo ?? '').trim() || null,
        propio: it.propio ?? (sv ? !sv.subcontratado : true),
        acreditado: it.acreditado ?? sv?.acreditado ?? false,
        unidad: it.unidad ?? sv?.unidad ?? 'unidad',
        cantidad,
        precioUnitario,
        total: round2(cantidad * precioUnitario),
        orden: idx,
      };
    });
  }

  private computeTotals(items: { total: number }[], descuento: number, aplicaIgv: boolean) {
    const subtotal = round2(items.reduce((acc, it) => acc + Number(it.total), 0));
    const desc = Math.min(round2(descuento), subtotal);
    const base = round2(subtotal - desc);
    const igv = aplicaIgv ? round2(base * (IGV / 100)) : 0;
    return { subtotal, descuento: desc, igv, total: round2(base + igv) };
  }

  /** Correlativo COT-AAAA-NNNN (por año). */
  private async nextNumero(fecha: Date) {
    const year = fecha.getFullYear();
    const prefix = `COT-${year}-`;
    const last = await this.prisma.quotation.findFirst({
      where: { numero: { startsWith: prefix } },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const n = last ? parseInt(last.numero.slice(prefix.length), 10) + 1 : 1;
    return `${prefix}${String(n).padStart(4, '0')}`;
  }

  private async ensureClient(clienteId: number) {
    const c = await this.prisma.client.findUnique({ where: { id: clienteId } });
    if (!c || !c.estado) throw new BadRequestException('El cliente no existe o está inactivo.');
    return c;
  }

  private async ensureSignatory(id: number) {
    const f = await this.prisma.signatory.findUnique({ where: { id } });
    if (!f || !f.estado) throw new BadRequestException('El responsable (firmante) no existe o está inactivo.');
    return f;
  }

  private isUniqueError(e: unknown) {
    return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
  }

  private audit(action: string, entityId: number, detail: string, userId?: number, ip?: string) {
    return this.prisma.auditLog.create({
      data: { action, entity: 'Quotation', entityId, detail, userId, ip },
    });
  }
}

/**
 * Deja solo dígitos con código de país (formato que espera wa.me).
 * Un celular peruano de 9 dígitos recibe el prefijo 51.
 */
export function normalizePhone(raw: string): string {
  let d = (raw ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 9 && d.startsWith('9')) d = `51${d}`;
  return d;
}

function round2(n: number) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
