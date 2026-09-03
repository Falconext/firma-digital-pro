/**
 * Rutas de la integración ReFirma. Base: /api/refirma
 *
 *  POST /api/refirma/preparar/:id  -> devuelve los argumentos (Base64) para
 *                                     invocar ReFirma desde el navegador.
 *  POST /api/refirma/firmado/:id   -> recibe el PDF ya firmado y lo guarda.
 *  POST /api/refirma/sello/:id     -> estampa el sello visual + QR (proyecto original).
 */
import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { RefirmaService } from './refirma.service';
import { SignedDocumentDto } from './dto/refirma.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtUser,
} from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('refirma')
export class RefirmaController {
  constructor(
    private readonly service: RefirmaService,
    private readonly config: ConfigService,
  ) {}

  @Post('preparar/:id')
  prepare(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    // Base URL de la API para construir la URL de retorno del callback
    const apiBaseUrl = `${req.protocol}://${req.get('host')}/${req.baseUrl.replace(/^\//, '') || 'api'}`;
    return this.service.prepareSigning(id, apiBaseUrl);
  }

  @Post('firmado/:id')
  storeSigned(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SignedDocumentDto,
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
  ) {
    return this.service.storeSignedDocument(
      id,
      dto.signedBase64,
      user.id,
      req.ip,
    );
  }

  /**
   * Estampa el sello visual (QR + bloque de firmante) sobre el documento,
   * reproduciendo lo que hacía el proyecto original.
   */
  @Post('sello/:id')
  applySeal(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
  ) {
    // URL base a la que apuntará el QR de verificación.
    // En producción puedes fijarla con VERIFY_URL_BASE (ej: https://tu-dominio.pe/verificar)
    const verifyBase =
      this.config.get<string>('verifyUrlBase') ||
      `${req.protocol}://${req.get('host')}/api/verificar`;
    return this.service.applyVisualSeal(id, verifyBase, user.id, req.ip);
  }
}
