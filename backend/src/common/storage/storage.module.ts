import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { S3Service } from './s3.service';

@Global()
@Module({
  providers: [S3Service, StorageService],
  exports: [StorageService, S3Service],
})
export class StorageModule {}
