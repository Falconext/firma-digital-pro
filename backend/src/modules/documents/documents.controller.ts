/**
 * Rutas de documentos. Base: /api/file
 * (mantenemos el prefijo "file" por compatibilidad con el frontend original).
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
import { DocumentsService } from './documents.service';
import {
  CreateDocumentDto,
  SendSignedEmailDto,
  UpdateDocumentDto,
  UploadSignedDto,
  ValidateSignatureDto,
} from './dto/document.dto';
import { RefirmaService } from '../refirma/refirma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUser,
} from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('file')
export class DocumentsController {
  constructor(
    private readonly service: DocumentsService,
    private readonly refirma: RefirmaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Paso 6.2-6.4 del procedimiento: sube el PDF y, apenas se almacena,
   * estampa automáticamente el sello visual (QR + bloque de firmante).
   */
  @Post('create-new')
  async create(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateDocumentDto,
    @Req() req: Request,
  ) {
    const doc = await this.service.create(user.id, dto);
    const verifyBase = this.verifyUrlBase(req);
    return this.refirma.autoSealOnUpload(doc.id, verifyBase, user.id, req.ip);
  }

  /**
   * FLUJO (1) — Validar la firma de cualquier PDF (como firmaperu.gob.pe).
   * No almacena nada: solo responde el veredicto y los datos del firmante.
   */
  @Post('validar')
  validate(@Body() dto: ValidateSignatureDto) {
    return this.service.validateSignature(dto.base64File);
  }

  /**
   * FLUJO (1) — Subir la versión ya firmada (con firma digital embebida).
   * Valida la firma antes de aceptarla y marca el documento como FIRMADO.
   */
  @Post(':id/subir-firmado')
  uploadSigned(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadSignedDto,
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
  ) {
    return this.service.uploadSignedVersion(id, dto.signedBase64, user.id, req.ip);
  }

  @Get('listar')
  findAll(
    @Query('archivo') archivo?: string,
    @Query('carpeta') carpeta?: string,
  ) {
    return this.service.findAll(archivo, carpeta);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  /** Devuelve el PDF en base64 para previsualizarlo en el navegador. */
  @Get(':id/contenido')
  getContent(@Param('id', ParseIntPipe) id: number) {
    return this.service.getFileBase64(id);
  }

  /** Descarga el PDF como archivo. */
  @Get(':id/descargar')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const { doc, buffer } = await this.service.getFileBuffer(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${doc.fileName}.pdf"`,
    });
    res.send(buffer);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDocumentDto) {
    return this.service.update(id, dto);
  }

  /** Paso 6.7: remite el documento ya firmado al cliente por correo. */
  @Post(':id/enviar-correo')
  sendEmail(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendSignedEmailDto,
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
  ) {
    return this.service.sendSignedEmail(id, dto, this.verifyUrlBase(req), user.id, req.ip);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  private verifyUrlBase(req: Request): string {
    return (
      this.config.get<string>('verifyUrlBase') ||
      `${req.protocol}://${req.get('host')}/api/verificar`
    );
  }
}
