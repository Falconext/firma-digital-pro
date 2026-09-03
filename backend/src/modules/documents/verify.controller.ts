/**
 * Verificación pública de documentos. Base: /api/verificar/:id
 *
 * Es la página que se abre al ESCANEAR el código QR de un documento firmado.
 * Es PÚBLICA (sin login) porque cualquiera que reciba el documento debe poder
 * comprobar su autenticidad. Muestra los datos del documento, su firmante y su
 * huella SHA-256, con un enlace para ver el PDF.
 */
import { Controller, Get, Param, ParseIntPipe, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('verificar')
export class VerifyController {
  constructor(private prisma: PrismaService) {}

  @Get(':id')
  async verify(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { signatory: true },
    });

    if (!doc || doc.status !== 'FIRMADO') {
      return res.status(404).send(
        pagina(`
          <div class="card">
            <h1 class="err">Documento no válido</h1>
            <p>No se encontró un documento firmado con este código.</p>
          </div>`),
      );
    }

    const fecha = doc.signedAt
      ? new Date(doc.signedAt).toLocaleString('es-PE')
      : '—';

    // Si el documento se firmó con firma digital embebida (flujo de re-subida),
    // mostramos los datos REALES extraídos del certificado del firmante.
    const firmaReal = doc.signatureValid === true;
    const filasFirmaDigital = firmaReal
      ? `
            <tr><td>Firmante (certificado)</td><td>${escape(doc.signerName ?? '—')}</td></tr>
            <tr><td>DNI</td><td>${escape(doc.signerDni ?? '—')}</td></tr>
            <tr><td>Emitido por</td><td>${escape(doc.signerIssuer ?? '—')}</td></tr>`
      : '';

    return res.send(
      pagina(`
        <div class="card">
          <div class="check">✓</div>
          <h1>Documento verificado</h1>
          <p class="sub">Este documento fue firmado en Firma Digital Pro.</p>
          ${firmaReal ? '<p class="chip">🔐 Firma digital válida (certificado verificado)</p>' : ''}
          <table>
            <tr><td>Documento</td><td>${escape(doc.fileName)}</td></tr>
            <tr><td>Firmante asignado</td><td>${escape(doc.signatory?.nombre ?? '—')}</td></tr>
            <tr><td>Cargo</td><td>${escape(doc.signatory?.cargo ?? '—')}</td></tr>
            <tr><td>Motivo</td><td>${escape(doc.signatory?.motivo ?? '—')}</td></tr>${filasFirmaDigital}
            <tr><td>Fecha de firma</td><td>${fecha}</td></tr>
            <tr><td>Huella SHA-256</td><td class="hash">${doc.hash ?? '—'}</td></tr>
          </table>
          <a class="btn" href="/api/file/${doc.id}/descargar">Ver / descargar documento</a>
        </div>`),
    );
  }
}

// --- Plantilla HTML mínima e inline (sin dependencias externas) ---
function pagina(contenido: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Verificación de documento</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#EFF6FF;margin:0;padding:24px;color:#1E3A8A}
    .card{max-width:520px;margin:32px auto;background:#fff;border:1px solid #BFDBFE;border-radius:18px;padding:28px;box-shadow:0 8px 30px rgba(30,64,175,.12)}
    h1{font-size:22px;margin:8px 0}.err{color:#DC2626}
    .sub{color:#64748B;margin-top:0}
    .check{width:52px;height:52px;border-radius:50%;background:#16A34A;color:#fff;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:bold}
    .chip{display:inline-block;background:#DCFCE7;color:#166534;border:1px solid #86EFAC;border-radius:999px;padding:6px 12px;font-size:13px;font-weight:600;margin:4px 0 0}
    table{width:100%;border-collapse:collapse;margin:18px 0}
    td{padding:8px 6px;border-bottom:1px solid #E9EFF5;font-size:14px;vertical-align:top}
    td:first-child{color:#64748B;width:38%}
    .hash{font-family:monospace;font-size:11px;word-break:break-all}
    .btn{display:inline-block;background:#1E40AF;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600}
  </style></head><body>${contenido}</body></html>`;
}

function escape(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  );
}
