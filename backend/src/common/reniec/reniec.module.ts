import { Global, Module } from '@nestjs/common';
import { ReniecService } from './reniec.service';

/** Global: cualquier módulo puede inyectar ReniecService sin importarlo. */
@Global()
@Module({
  providers: [ReniecService],
  exports: [ReniecService],
})
export class ReniecModule {}
