/**
 * Migra los PDFs que estaban en disco local (./storage) al bucket S3
 * y actualiza las keys en la base de datos con el prefijo "documentos/".
 * Idempotente: si una key ya tiene el prefijo, la salta.
 *
 * Uso: node scripts/migrate-local-to-s3.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const region = (process.env.AWS_REGION || 'us-east-1').trim();
const Bucket = (process.env.AWS_S3_BUCKET_NAME || '').trim();
const storageDir = join(root, (process.env.STORAGE_DIR || './storage').replace(/^\.\//, ''));
const PREFIX = 'documentos/';

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: (process.env.AWS_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || '').trim(),
  },
});
const prisma = new PrismaClient();

async function existsInS3(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// Sube un archivo local (si existe) a S3 y devuelve la nueva key con prefijo.
async function migrateKey(oldKey) {
  if (!oldKey) return oldKey;
  if (oldKey.startsWith(PREFIX)) return oldKey; // ya migrada
  const newKey = PREFIX + oldKey;
  const localPath = join(storageDir, oldKey);
  if (!existsSync(localPath)) {
    console.log(`   ⚠️  No existe en disco: ${oldKey} (dejo la key como está)`);
    return oldKey;
  }
  if (!(await existsInS3(newKey))) {
    await s3.send(
      new PutObjectCommand({
        Bucket,
        Key: newKey,
        Body: readFileSync(localPath),
        ContentType: 'application/pdf',
      }),
    );
    console.log(`   ⬆️  Subido: ${newKey}`);
  } else {
    console.log(`   ✓ Ya estaba en S3: ${newKey}`);
  }
  return newKey;
}

async function main() {
  const docs = await prisma.document.findMany({
    select: { id: true, storageKey: true, sealedKey: true, signedKey: true },
  });
  console.log(`Documentos a revisar: ${docs.length}\n`);

  for (const d of docs) {
    console.log(`# Documento ${d.id}`);
    const storageKey = await migrateKey(d.storageKey);
    const sealedKey = await migrateKey(d.sealedKey);
    const signedKey = await migrateKey(d.signedKey);
    await prisma.document.update({
      where: { id: d.id },
      data: { storageKey, sealedKey, signedKey },
    });
    console.log(`   💾 BD actualizada.\n`);
  }
  console.log('🎉 Migración completa.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
