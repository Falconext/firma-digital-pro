-- AlterTable
ALTER TABLE "documentos" ADD COLUMN "signatureInfo" TEXT;
ALTER TABLE "documentos" ADD COLUMN "signatureValid" BOOLEAN;
ALTER TABLE "documentos" ADD COLUMN "signerDni" TEXT;
ALTER TABLE "documentos" ADD COLUMN "signerIssuer" TEXT;
ALTER TABLE "documentos" ADD COLUMN "signerName" TEXT;
