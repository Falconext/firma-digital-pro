import { Module } from '@nestjs/common';
import { RefirmaController } from './refirma.controller';
import { RefirmaService } from './refirma.service';

@Module({
  controllers: [RefirmaController],
  providers: [RefirmaService],
  exports: [RefirmaService], // lo usa DocumentsModule para el sello automático al subir
})
export class RefirmaModule {}
