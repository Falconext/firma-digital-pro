/**
 * Seed = "sembrar" datos iniciales en la base de datos.
 * Crea un usuario administrador y algunos firmantes de ejemplo para
 * que puedas entrar a la plataforma la primera vez.
 *
 * Se ejecuta con:  npm run db:seed
 */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@firmadigital.pe';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

  // 1) Usuario administrador (idempotente: si ya existe, no lo duplica)
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      nombre: 'Administrador',
      apellido: 'General',
      email: adminEmail,
      password: passwordHash,
      rol: Role.ADMIN,
    },
  });
  console.log(`✔ Usuario admin listo: ${adminEmail} / ${adminPassword}`);

  // 2) Firmantes de ejemplo (los que en el proyecto original estaban "quemados")
  const firmantes = [
    {
      nombre: 'Ing. Blanca L. Roque Lima',
      dni: '41729763',
      cip: '167375',
      cargo: 'Gerente',
      empresa: 'Certificaciones Nacionales de Alimentos S.A.C.',
      motivo: 'Aprobación de Documento',
    },
    {
      nombre: 'Ing. Silvia A. Velásquez Rodriguez',
      dni: '41685564',
      cip: '167379',
      cargo: 'Supervisor de Inspecciones',
      empresa: 'Certificaciones Nacionales de Alimentos S.A.C.',
      motivo: 'Aprobación de Documento',
    },
  ];

  for (const f of firmantes) {
    const existe = await prisma.signatory.findFirst({ where: { dni: f.dni } });
    if (!existe) await prisma.signatory.create({ data: f });
  }
  console.log(`✔ ${firmantes.length} firmantes de ejemplo listos`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
