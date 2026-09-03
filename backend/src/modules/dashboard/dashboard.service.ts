/**
 * Servicio del dashboard: calcula los números que se muestran en el panel
 * (totales, documentos firmados vs pendientes, actividad reciente).
 */
import { Injectable } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const [total, firmados, pendientes, firmantes, ultimos] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.document.count({ where: { status: DocumentStatus.FIRMADO } }),
      this.prisma.document.count({
        where: { status: DocumentStatus.PENDIENTE },
      }),
      this.prisma.signatory.count({ where: { estado: true } }),
      this.prisma.document.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { signatory: true },
      }),
    ]);

    // Documentos firmados por mes (últimos 6 meses) para el gráfico
    const porMes = await this.firmadosPorMes();

    return {
      totales: { total, firmados, pendientes, firmantes },
      ultimosDocumentos: ultimos,
      firmadosPorMes: porMes,
    };
  }

  /** Agrupa los documentos firmados por mes (para el gráfico de barras). */
  private async firmadosPorMes() {
    const docs = await this.prisma.document.findMany({
      where: { status: DocumentStatus.FIRMADO, signedAt: { not: null } },
      select: { signedAt: true },
    });

    const meses = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic',
    ];
    const conteo: Record<string, number> = {};
    for (const d of docs) {
      if (!d.signedAt) continue;
      const etiqueta = meses[d.signedAt.getMonth()];
      conteo[etiqueta] = (conteo[etiqueta] ?? 0) + 1;
    }
    return meses.map((m) => ({ mes: m, firmados: conteo[m] ?? 0 }));
  }
}
