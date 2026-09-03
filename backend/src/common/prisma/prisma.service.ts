/**
 * Servicio de Prisma: es el "puente" hacia la base de datos.
 * Cualquier módulo que necesite leer/escribir datos inyecta este servicio.
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Conecta a la base de datos al iniciar la aplicación
    await this.$connect();
  }
}
