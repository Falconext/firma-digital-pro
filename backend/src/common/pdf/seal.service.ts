/**
 * ==========================================================================
 *  Servicio de Sello Visual (QR + bloque de firmante)
 * ==========================================================================
 *  Reproduce lo que hacía el proyecto original: estampar sobre el PDF, en la
 *  última página, dos elementos:
 *    1) Un código QR (enlace de verificación del documento).
 *    2) Un bloque con los datos del firmante (Motivo, Cargo, DNI, CIP, Empresa).
 *
 *  IMPORTANTE: este "sello visual" NO es una firma criptográfica PAdES.
 *  Es una representación gráfica. La firma con validez legal la produce
 *  ReFirma (ver módulo refirma). Ambos pueden convivir: primero se estampa
 *  el sello visual y luego, opcionalmente, ReFirma agrega la firma digital.
 * ==========================================================================
 */
import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as QRCode from 'qrcode';

export interface SignerBlock {
  nombre: string;
  motivo: string;
  cargo: string;
  dni: string;
  cip?: string | null;
  empresa: string;
  /** Imagen PNG de la rúbrica en base64 (opcional). */
  firmaImagen?: string | null;
}

@Injectable()
export class SealService {
  /**
   * Estampa el QR y el bloque de firmante en la última página del PDF.
   * @param pdfBytes  PDF original (Buffer)
   * @param signer    datos del firmante a mostrar
   * @param verifyUrl URL que codificará el QR (verificación / descarga)
   * @returns         PDF resultante (Uint8Array)
   */
  async applyVisualSeal(
    pdfBytes: Buffer,
    signer: SignerBlock,
    verifyUrl: string,
  ): Promise<Uint8Array> {
    const pdf = await PDFDocument.load(pdfBytes);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    // Generamos el QR como PNG (Data URL) y lo incrustamos
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 300,
    });
    const qrImage = await pdf.embedPng(qrDataUrl);

    const pages = pdf.getPages();
    const page = pages[pages.length - 1]; // última página
    const { width } = page.getSize();

    const gris = rgb(0.15, 0.15, 0.15);
    const azul = rgb(0.12, 0.25, 0.69);
    const tenue = rgb(0.4, 0.4, 0.4);

    // ------------------------------------------------------------------
    //  Preparamos el contenido del bloque de firmante y medimos su ancho,
    //  para poder CENTRAR todo el conjunto (QR + bloque) horizontalmente.
    // ------------------------------------------------------------------
    const qrSize = 110;
    const gap = 20; // separación QR ↔ bloque

    const lineas: Array<[string, string]> = [
      ['Motivo:', signer.motivo],
      ['Cargo:', signer.cargo],
      ['DNI:', signer.dni],
      ...(signer.cip ? ([['CIP:', signer.cip]] as Array<[string, string]>) : []),
      ['Empresa:', signer.empresa],
    ];

    // Ancho del bloque = la línea más ancha (nombre o etiqueta+valor)
    let blockWidth = fontBold.widthOfTextAtSize(signer.nombre, 10);
    for (const [etiqueta, valor] of lineas) {
      const w =
        fontBold.widthOfTextAtSize(etiqueta, 8) +
        4 +
        font.widthOfTextAtSize(this.truncar(valor, 42), 8);
      if (w > blockWidth) blockWidth = w;
    }

    // Conjunto centrado en la página
    const groupWidth = qrSize + gap + blockWidth;
    const groupX = Math.max(40, (width - groupWidth) / 2);
    const qrX = groupX;
    const qrY = 46; // margen inferior (deja sitio a la leyenda)
    const textX = qrX + qrSize + gap;

    // --- QR ---
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    // --- Bloque de firmante, alineado por su parte superior con el QR ---
    let textY = qrY + qrSize - 6;

    // --- Imagen de la firma manuscrita (si el firmante la tiene) ---
    if (signer.firmaImagen) {
      try {
        const img = await this.embedSignature(pdf, signer.firmaImagen);
        if (img) {
          const firmaW = 130;
          const firmaH = 55;
          page.drawImage(img, {
            x: textX,
            y: textY + 6, // justo encima del nombre
            width: firmaW,
            height: firmaH,
          });
          textY -= firmaH; // el bloque de texto baja para no encimarse
        }
      } catch {
        // Si la imagen es inválida, seguimos sin firma gráfica (no rompemos el sello).
      }
    }

    // Nombre del firmante (título)
    page.drawText(signer.nombre, {
      x: textX,
      y: textY,
      size: 10,
      font: fontBold,
      color: azul,
    });
    textY -= 15;

    for (const [etiqueta, valor] of lineas) {
      page.drawText(etiqueta, {
        x: textX,
        y: textY,
        size: 8,
        font: fontBold,
        color: gris,
      });
      const etiquetaAncho = fontBold.widthOfTextAtSize(etiqueta, 8);
      page.drawText(this.truncar(valor, 42), {
        x: textX + etiquetaAncho + 4,
        y: textY,
        size: 8,
        font,
        color: gris,
      });
      textY -= 12;
    }

    // Leyenda de verificación bajo el QR
    page.drawText('Verifique este documento escaneando el código QR', {
      x: qrX,
      y: qrY - 12,
      size: 6.5,
      font,
      color: tenue,
    });

    // Marca discreta de la plataforma
    page.drawText('Firmado en Firma Digital Pro', {
      x: textX,
      y: qrY - 12,
      size: 6.5,
      font,
      color: tenue,
    });

    return pdf.save();
  }

  private truncar(texto: string, max: number): string {
    return texto.length > max ? texto.slice(0, max - 1) + '…' : texto;
  }

  /** Incrusta una imagen de firma (PNG o JPG) en base64 dentro del PDF. */
  private async embedSignature(pdf: PDFDocument, base64: string) {
    const clean = base64.replace(/^data:image\/\w+;base64,/, '');
    const bytes = Buffer.from(clean, 'base64');
    // Detectamos el formato por su firma binaria (PNG empieza con 0x89 0x50).
    const esPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    return esPng ? pdf.embedPng(bytes) : pdf.embedJpg(bytes);
  }
}
