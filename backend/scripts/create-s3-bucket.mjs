/**
 * Crea (idempotente) el bucket S3 de Firma Digital Pro con lectura pública.
 * Uso:  node scripts/create-s3-bucket.mjs
 * Lee credenciales desde backend/.env
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  S3Client,
  CreateBucketCommand,
  PutPublicAccessBlockCommand,
  PutBucketPolicyCommand,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

// --- Cargar .env de forma simple ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const region = (process.env.AWS_REGION || 'us-east-1').trim();
const Bucket = (process.env.AWS_S3_BUCKET_NAME || '').trim();
const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || '').trim();
const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || '').trim();

if (!Bucket || !accessKeyId || !secretAccessKey) {
  console.error('❌ Faltan AWS_S3_BUCKET_NAME / credenciales en .env');
  process.exit(1);
}

const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });

async function bucketExists() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`▶ Región: ${region}  |  Bucket: ${Bucket}`);

  // 1) Crear bucket (us-east-1 NO lleva LocationConstraint)
  if (await bucketExists()) {
    console.log('ℹ️  El bucket ya existe, continúo con la configuración.');
  } else {
    const input = { Bucket };
    if (region !== 'us-east-1') {
      input.CreateBucketConfiguration = { LocationConstraint: region };
    }
    await s3.send(new CreateBucketCommand(input));
    console.log('✅ Bucket creado.');
  }

  // 2) Deshabilitar el bloqueo de acceso público
  await s3.send(
    new PutPublicAccessBlockCommand({
      Bucket,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    }),
  );
  console.log('✅ Block Public Access deshabilitado.');

  // 3) Política de lectura pública de objetos
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadGetObject',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${Bucket}/*`,
      },
    ],
  };
  await s3.send(
    new PutBucketPolicyCommand({ Bucket, Policy: JSON.stringify(policy) }),
  );
  console.log('✅ Política de lectura pública aplicada.');

  // 4) Prueba: subir, verificar URL pública y borrar
  const testKey = 'documentos/_healthcheck.txt';
  await s3.send(
    new PutObjectCommand({
      Bucket,
      Key: testKey,
      Body: 'ok',
      ContentType: 'text/plain',
    }),
  );
  const url = `https://${Bucket}.s3.${region}.amazonaws.com/${testKey}`;
  console.log(`✅ Objeto de prueba subido: ${url}`);
  await s3.send(new GetObjectCommand({ Bucket, Key: testKey }));
  console.log('✅ Lectura vía SDK OK.');
  await s3.send(new DeleteObjectCommand({ Bucket, Key: testKey }));
  console.log('🗑️  Objeto de prueba eliminado.');

  console.log('\n🎉 Bucket listo:', Bucket);
  console.log('   URL base pública:', `https://${Bucket}.s3.${region}.amazonaws.com/`);
}

main().catch((err) => {
  console.error('❌ Error:', err.name, '-', err.message);
  process.exit(1);
});
