/**
 * ==========================================================================
 *  Servicio de correo (Resend)
 * ==========================================================================
 *  Paso 6.7 del procedimiento IT-AC-01: una vez firmado el documento, se
 *  remite al cliente correspondiente por correo electrónico.
 * ==========================================================================
 */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendSignedDocumentParams {
  to: string;
  clienteNombre?: string | null;
  fileName: string;
  pdfBuffer: Buffer;
  verifyUrl: string;
}

interface SendQuotationParams {
  to: string;
  clienteNombre?: string | null;
  numero: string;
  totalTexto: string;
  vencimientoTexto: string;
  empresa: string;
  mensaje?: string | null;
  pdfBuffer: Buffer;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendSignedDocument(params: SendSignedDocumentParams): Promise<void> {
    const apiKey = this.config.get<string>('resend.apiKey');
    if (!apiKey) {
      throw new BadRequestException(
        'Correo no configurado. Agrega RESEND_API_KEY en el .env del backend.',
      );
    }

    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const fromEmail =
      this.config.get<string>('resend.fromEmail') || 'onboarding@resend.dev';

    const saludo = params.clienteNombre ? `Hola ${params.clienteNombre},` : 'Hola,';
    const html = `
      <div style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
        <p>${saludo}</p>
        <p>Adjuntamos el documento <strong>${params.fileName}</strong>, firmado digitalmente.</p>
        <p>Puedes verificar su autenticidad escaneando el código QR del PDF, o visitando:
          <br /><a href="${params.verifyUrl}">${params.verifyUrl}</a>
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
          Enviado automáticamente por Firma Digital Pro.
        </p>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: `Firma Digital Pro <${fromEmail}>`,
      to: params.to,
      subject: `Documento firmado: ${params.fileName}`,
      html,
      attachments: [
        {
          filename: `${params.fileName}.pdf`,
          content: params.pdfBuffer,
        },
      ],
    });

    if (error) {
      throw new BadRequestException(`Error al enviar correo: ${error.message}`);
    }

    this.logger.log(`Correo con documento firmado enviado a ${params.to}`);
  }

  /** Envía una cotización en PDF al cliente. */
  async sendQuotation(params: SendQuotationParams): Promise<void> {
    const apiKey = this.config.get<string>('resend.apiKey');
    if (!apiKey) {
      throw new BadRequestException(
        'Correo no configurado. Agrega RESEND_API_KEY en el .env del backend.',
      );
    }

    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const fromEmail =
      this.config.get<string>('resend.fromEmail') || 'onboarding@resend.dev';

    const saludo = params.clienteNombre ? `Estimados ${params.clienteNombre},` : 'Estimados señores,';
    const extra = params.mensaje
      ? `<p>${escapeHtml(params.mensaje).replace(/\n/g, '<br />')}</p>`
      : '';
    const html = `
      <div style="font-family: sans-serif; color: #1f2937; line-height: 1.5;">
        <p>${saludo}</p>
        <p>Adjuntamos la cotización <strong>${params.numero}</strong> por un total de
          <strong>${params.totalTexto}</strong>, válida hasta el ${params.vencimientoTexto}.</p>
        ${extra}
        <p>Quedamos atentos a cualquier consulta.</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
          ${params.empresa} · Enviado desde Firma Digital Pro.
        </p>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: `${params.empresa} <${fromEmail}>`,
      to: params.to,
      subject: `Cotización ${params.numero} - ${params.empresa}`,
      html,
      attachments: [{ filename: `${params.numero}.pdf`, content: params.pdfBuffer }],
    });

    if (error) {
      throw new BadRequestException(`Error al enviar correo: ${error.message}`);
    }
    this.logger.log(`Cotización ${params.numero} enviada a ${params.to}`);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );
}
