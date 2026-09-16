-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERADOR');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDIENTE', 'SELLADO', 'FIRMADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('DNI', 'RUC', 'CARNET_EXTRANJERIA', 'PASAPORTE');

-- CreateEnum
CREATE TYPE "TipoItem" AS ENUM ('SERVICIO', 'PRODUCTO');

-- CreateEnum
CREATE TYPE "CategoriaServicio" AS ENUM ('ENSAYO_FISICOQUIMICO', 'ENSAYO_MICROBIOLOGICO', 'ENSAYO_SENSORIAL', 'INSPECCION', 'MUESTREO', 'CONSULTORIA', 'CAPACITACION', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA', 'ANULADA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Role" NOT NULL DEFAULT 'OPERADOR',
    "imagenPerfil" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "firmantes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "cip" TEXT,
    "cargo" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "motivo" TEXT NOT NULL DEFAULT 'Aprobación de Documento',
    "firmaImagen" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "firmantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carpetas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carpetas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sealedKey" TEXT,
    "signedKey" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "hash" TEXT,
    "sealedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signerName" TEXT,
    "signerDni" TEXT,
    "signerIssuer" TEXT,
    "signatureValid" BOOLEAN,
    "signatureInfo" TEXT,
    "clienteId" INTEGER,
    "clienteEmail" TEXT,
    "clienteNombre" TEXT,
    "emailEnviadoAt" TIMESTAMP(3),
    "folderId" INTEGER,
    "signatoryId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER,
    "detail" TEXT,
    "ip" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "tipoDocumento" "TipoDocumento" NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "correo" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" TEXT,
    "imagenPerfil" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoItem" NOT NULL DEFAULT 'SERVICIO',
    "categoria" "CategoriaServicio" NOT NULL DEFAULT 'OTRO',
    "metodo" TEXT,
    "acreditado" BOOLEAN NOT NULL DEFAULT false,
    "subcontratado" BOOLEAN NOT NULL DEFAULT false,
    "unidad" TEXT NOT NULL DEFAULT 'muestra',
    "precio" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "tiempoEntregaDias" INTEGER,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizaciones" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'BORRADOR',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validezDias" INTEGER NOT NULL DEFAULT 15,
    "vencimiento" TIMESTAMP(3),
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "aplicaIgv" BOOLEAN NOT NULL DEFAULT true,
    "igvPorcentaje" DECIMAL(65,30) NOT NULL DEFAULT 18,
    "subtotal" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "descuento" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "igv" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "condiciones" TEXT,
    "codigoServicio" TEXT,
    "servicioSolicitado" TEXT,
    "contramuestra" BOOLEAN NOT NULL DEFAULT false,
    "entregable" TEXT,
    "tiempoEntrega" TEXT,
    "responsableId" INTEGER,
    "enviadaAt" TIMESTAMP(3),
    "enviadaA" TEXT,
    "documentoId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_items" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "servicioId" INTEGER,
    "codigo" TEXT,
    "actividad" TEXT,
    "descripcion" TEXT NOT NULL,
    "documentoNormativo" TEXT,
    "propio" BOOLEAN NOT NULL DEFAULT true,
    "acreditado" BOOLEAN NOT NULL DEFAULT false,
    "unidad" TEXT NOT NULL DEFAULT 'unidad',
    "cantidad" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "precioUnitario" DECIMAL(65,30) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cotizacion_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_tipoDocumento_numeroDocumento_key" ON "clientes"("tipoDocumento", "numeroDocumento");

-- CreateIndex
CREATE UNIQUE INDEX "servicios_codigo_key" ON "servicios"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "cotizaciones_numero_key" ON "cotizaciones"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "cotizaciones_documentoId_key" ON "cotizaciones"("documentoId");

-- AddForeignKey
ALTER TABLE "carpetas" ADD CONSTRAINT "carpetas_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "carpetas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "carpetas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_signatoryId_fkey" FOREIGN KEY ("signatoryId") REFERENCES "firmantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "firmantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_items" ADD CONSTRAINT "cotizacion_items_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "cotizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_items" ADD CONSTRAINT "cotizacion_items_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

