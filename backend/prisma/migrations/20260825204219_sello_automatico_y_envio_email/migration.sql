-- AlterTable
ALTER TABLE "documentos" ADD COLUMN "clienteEmail" TEXT;
ALTER TABLE "documentos" ADD COLUMN "clienteNombre" TEXT;
ALTER TABLE "documentos" ADD COLUMN "emailEnviadoAt" DATETIME;
ALTER TABLE "documentos" ADD COLUMN "sealedAt" DATETIME;
ALTER TABLE "documentos" ADD COLUMN "sealedKey" TEXT;
