/**
 * Módulo raíz. NestJS arma la aplicación como un árbol de "módulos".
 * Aquí importamos todos los módulos de funcionalidad del sistema.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { PdfModule } from './common/pdf/pdf.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SignatoriesModule } from './modules/signatories/signatories.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { FoldersModule } from './modules/folders/folders.module';
import { RefirmaModule } from './modules/refirma/refirma.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ClientsModule } from './modules/clients/clients.module';

@Module({
  imports: [
    // Carga el .env y la configuración de forma global (disponible en toda la app)
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule, // Conexión a la base de datos (compartida)
    StorageModule, // Guardado de archivos PDF en disco (compartido)
    PdfModule, // Estampado de sello visual + QR sobre PDFs (compartido)
    AuthModule, // Login, refresh token, sesión
    UsersModule, // CRUD de usuarios
    SignatoriesModule, // CRUD de firmantes
    DocumentsModule, // CRUD de documentos PDF
    FoldersModule, // Carpetas anidadas para organizar documentos
    RefirmaModule, // Integración con ReFirma (RENIEC)
    DashboardModule, // Métricas del panel
    ClientsModule, // CRUD de clientes
  ],
})
export class AppModule {}
