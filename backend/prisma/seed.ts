/**
 * Seed = "sembrar" datos iniciales en la base de datos.
 * Crea un usuario administrador y algunos firmantes de ejemplo para
 * que puedas entrar a la plataforma la primera vez.
 *
 * Se ejecuta con:  npm run db:seed
 */
import { CategoriaServicio, PrismaClient, Role } from '@prisma/client';
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

  // 3) Catálogo de servicios de ejemplo (laboratorio de ensayos e inspecciones)
  const servicios = [
    { codigo: 'FQ-001', nombre: 'Humedad', categoria: CategoriaServicio.ENSAYO_FISICOQUIMICO, metodo: 'AOAC 925.10', acreditado: true, unidad: 'muestra', precio: 45, tiempoEntregaDias: 3 },
    { codigo: 'FQ-002', nombre: 'Proteínas (Kjeldahl)', categoria: CategoriaServicio.ENSAYO_FISICOQUIMICO, metodo: 'AOAC 2001.11', acreditado: true, unidad: 'muestra', precio: 80, tiempoEntregaDias: 5 },
    { codigo: 'FQ-003', nombre: 'Metales pesados (Pb, Cd, As, Hg)', categoria: CategoriaServicio.ENSAYO_FISICOQUIMICO, metodo: 'AOAC 999.10 / ICP-MS', acreditado: false, unidad: 'muestra', precio: 250, tiempoEntregaDias: 7 },
    { codigo: 'MB-001', nombre: 'Detección de Salmonella sp.', categoria: CategoriaServicio.ENSAYO_MICROBIOLOGICO, metodo: 'ISO 6579-1', acreditado: true, unidad: 'muestra', precio: 95, tiempoEntregaDias: 5 },
    { codigo: 'MB-002', nombre: 'Recuento de aerobios mesófilos', categoria: CategoriaServicio.ENSAYO_MICROBIOLOGICO, metodo: 'ISO 4833-1', acreditado: true, unidad: 'muestra', precio: 40, tiempoEntregaDias: 4 },
    { codigo: 'MB-003', nombre: 'Coliformes y E. coli', categoria: CategoriaServicio.ENSAYO_MICROBIOLOGICO, metodo: 'ISO 16649-2', acreditado: true, unidad: 'muestra', precio: 55, tiempoEntregaDias: 4 },
    { codigo: 'SE-001', nombre: 'Evaluación sensorial con panel entrenado', categoria: CategoriaServicio.ENSAYO_SENSORIAL, metodo: 'NTP-ISO 6658', acreditado: false, unidad: 'muestra', precio: 120, tiempoEntregaDias: 5 },
    { codigo: 'INS-001', nombre: 'Inspección higiénico-sanitaria', categoria: CategoriaServicio.INSPECCION, metodo: 'NTP ISO/IEC 17020', acreditado: true, unidad: 'visita', precio: 600, tiempoEntregaDias: 7 },
    { codigo: 'INS-002', nombre: 'Inspección de tanques GLP', categoria: CategoriaServicio.INSPECCION, metodo: 'NTP 321.123', acreditado: true, unidad: 'visita', precio: 850, tiempoEntregaDias: 7 },
    { codigo: 'MU-001', nombre: 'Muestreo técnico con cadena de custodia', categoria: CategoriaServicio.MUESTREO, metodo: null, acreditado: false, unidad: 'visita', precio: 150, tiempoEntregaDias: 1 },
    { codigo: 'CO-001', nombre: 'Consultoría en BPM / HACCP', categoria: CategoriaServicio.CONSULTORIA, metodo: null, acreditado: false, unidad: 'hora', precio: 90, tiempoEntregaDias: null },
  ];
  for (const sv of servicios) {
    await prisma.service.upsert({
      where: { codigo: sv.codigo },
      update: {},
      create: { ...sv, descripcion: null },
    });
  }
  console.log(`✔ ${servicios.length} servicios de ejemplo listos`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
