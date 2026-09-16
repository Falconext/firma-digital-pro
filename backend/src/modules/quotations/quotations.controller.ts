/**
 * Rutas de cotizaciones. Base: /api/cotizaciones
 * Cualquier usuario autenticado (ADMIN u OPERADOR) puede cotizar.
 *
 *  GET    /cotizaciones                 lista (?buscar= ?estado= ?clienteId=)
 *  GET    /cotizaciones/resumen         totales por estado (panel)
 *  GET    /cotizaciones/:id             detalle con ítems
 *  GET    /cotizaciones/:id/pdf         PDF en base64 (vista previa)
 *  GET    /cotizaciones/:id/descargar   PDF como descarga
 *  POST   /cotizaciones                 crear borrador
 *  PATCH  /cotizaciones/:id             editar borrador
 *  PATCH  /cotizaciones/:id/estado      cambiar estado
 *  POST   /cotizaciones/:id/enviar      enviar por correo (-> ENVIADA)
 *  GET    /cotizaciones/:id/whatsapp    teléfono, mensaje sugerido y enlace público
 *  POST   /cotizaciones/:id/whatsapp    registrar envío por WhatsApp (-> ENVIADA)
 *  GET    /cotizaciones/publico/:id/:token   PDF sin login (enlace del WhatsApp)
 *  POST   /cotizaciones/:id/duplicar    nueva versión en borrador
 *  POST   /cotizaciones/:id/documento   generar Documento sellado para firma
 *  DELETE /cotizaciones/:id             eliminar (solo borrador)
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { QuotationsService } from './quotations.service';
import {
  ChangeQuotationStatusDto,
  CreateQuotationDto,
  GenerateDocumentDto,
  SendQuotationDto,
  SendWhatsappDto,
  UpdateQuotationDto,
} from './dto/quotation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('cotizaciones')
export class QuotationsController {
  constructor(
    private readonly service: QuotationsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  findAll(
    @Query('buscar') buscar?: string,
    @Query('estado') estado?: string,
    @Query('clienteId') clienteId?: string,
  ) {
    return this.service.findAll(buscar, estado, clienteId ? Number(clienteId) : undefined);
  }

  @Get('resumen')
  summary() {
    return this.service.summary();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(':id/pdf')
  pdf(@Param('id', ParseIntPipe) id: number) {
    return this.service.pdfBase64(id);
  }

  @Get(':id/descargar')
  async download(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { numero, buffer } = await this.service.pdfBuffer(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${numero}.pdf"`,
    });
    res.send(buffer);
  }

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateQuotationDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuotationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.update(id, dto, user.id);
  }

  @Patch(':id/estado')
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeQuotationStatusDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.changeStatus(id, dto.estado, user.id);
  }

  @Post(':id/enviar')
  send(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendQuotationDto,
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
  ) {
    return this.service.send(id, dto, user.id, req.ip);
  }

  @Get(':id/whatsapp')
  whatsappPrefill(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.service.whatsappPrefill(id, this.publicBase(req));
  }

  @Post(':id/whatsapp')
  registerWhatsapp(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendWhatsappDto,
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
  ) {
    return this.service.registerWhatsapp(id, dto, user.id, req.ip);
  }

  @Post(':id/duplicar')
  duplicate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.service.duplicate(id, user.id);
  }

  @Post(':id/documento')
  generateDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GenerateDocumentDto,
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
  ) {
    const verifyBase =
      this.config.get<string>('verifyUrlBase') ||
      `${req.protocol}://${req.get('host')}/api/verificar`;
    return this.service.generateDocument(id, dto, verifyBase, user.id, req.ip);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user.id);
  }

  /** Base del enlace público de descarga (misma lógica que la URL de verificación QR). */
  private publicBase(req: Request): string {
    const verify = this.config.get<string>('verifyUrlBase');
    const origin = verify ? verify.replace(/\/api\/verificar\/?$/, '') : `${req.protocol}://${req.get('host')}`;
    return `${origin}/api/cotizaciones/publico`;
  }
}

/** Descarga pública del PDF (sin JWT): el enlace que viaja en el WhatsApp. */
@Controller('cotizaciones/publico')
export class QuotationsPublicController {
  constructor(private readonly service: QuotationsService) {}

  @Get(':id/:token')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Param('token') token: string,
    @Res() res: Response,
  ) {
    const { numero, buffer } = await this.service.pdfPublic(id, token);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${numero}.pdf"`,
      'Cache-Control': 'private, no-store',
    });
    res.send(buffer);
  }
}
