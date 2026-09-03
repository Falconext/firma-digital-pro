-- CreateTable
CREATE TABLE "carpetas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "parentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "carpetas_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "carpetas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_documentos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sealedKey" TEXT,
    "signedKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "hash" TEXT,
    "sealedAt" DATETIME,
    "signedAt" DATETIME,
    "clienteEmail" TEXT,
    "clienteNombre" TEXT,
    "emailEnviadoAt" DATETIME,
    "folderId" INTEGER,
    "signatoryId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "documentos_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "carpetas" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "documentos_signatoryId_fkey" FOREIGN KEY ("signatoryId") REFERENCES "firmantes" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "documentos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_documentos" ("clienteEmail", "clienteNombre", "createdAt", "createdById", "emailEnviadoAt", "fileName", "hash", "id", "sealedAt", "sealedKey", "signatoryId", "signedAt", "signedKey", "status", "storageKey", "updatedAt") SELECT "clienteEmail", "clienteNombre", "createdAt", "createdById", "emailEnviadoAt", "fileName", "hash", "id", "sealedAt", "sealedKey", "signatoryId", "signedAt", "signedKey", "status", "storageKey", "updatedAt" FROM "documentos";
DROP TABLE "documentos";
ALTER TABLE "new_documentos" RENAME TO "documentos";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
