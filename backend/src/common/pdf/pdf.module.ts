import { Global, Module } from '@nestjs/common';
import { SealService } from './seal.service';
import { PdfSignatureService } from './pdf-signature.service';

@Global()
@Module({
  providers: [SealService, PdfSignatureService],
  exports: [SealService, PdfSignatureService],
})
export class PdfModule {}
