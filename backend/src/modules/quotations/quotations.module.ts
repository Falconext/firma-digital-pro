import { Module } from '@nestjs/common';
import { QuotationsController, QuotationsPublicController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { QuotationPdfService } from './quotation-pdf.service';
import { MailModule } from '../../common/mail/mail.module';
import { DocumentsModule } from '../documents/documents.module';
import { RefirmaModule } from '../refirma/refirma.module';

@Module({
  imports: [MailModule, DocumentsModule, RefirmaModule],
  controllers: [QuotationsPublicController, QuotationsController],
  providers: [QuotationsService, QuotationPdfService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
