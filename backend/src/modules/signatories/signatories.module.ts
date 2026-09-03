import { Module } from '@nestjs/common';
import { SignatoriesController } from './signatories.controller';
import { SignatoriesService } from './signatories.service';

@Module({
  controllers: [SignatoriesController],
  providers: [SignatoriesService],
  exports: [SignatoriesService],
})
export class SignatoriesModule {}
