import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { VerifyController } from './verify.controller';
import { RefirmaModule } from '../refirma/refirma.module';
import { MailModule } from '../../common/mail/mail.module';

@Module({
  imports: [RefirmaModule, MailModule],
  controllers: [DocumentsController, VerifyController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
