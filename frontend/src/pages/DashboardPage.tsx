/**
 * Página de inicio del panel: tarjetas de métricas + gráfico + últimos docs.
 */
import { useEffect, useState } from 'react';
import {
  FileText,
  FileSignature,
  Clock,
  Users,
  TrendingUp,
} from 'lucide-react';
import { http } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import type { DashboardSummary } from '@/types';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    http.get<DashboardSummary>('/dashboard/resumen').then(setData);
  }, []);

  const t = data?.totales;
  const maxMes = Math.max(1, ...(data?.firmadosPorMes.map((m) => m.firmados) ?? [1]));

  const stats = [
    { label: 'Total documentos', value: t?.total ?? 0, icon: FileText, color: 'text-primary bg-primary-soft' },
    { label: 'Firmados', value: t?.firmados ?? 0, icon: FileSignature, color: 'text-success bg-success-soft' },
    { label: 'Pendientes', value: t?.pendientes ?? 0, icon: Clock, color: 'text-warning bg-warning-soft' },
    { label: 'Firmantes activos', value: t?.firmantes ?? 0, icon: Users, color: 'text-info bg-info-soft' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="page-title">
          Hola, {user?.nombre ?? 'bienvenido'}
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumen general de la actividad del laboratorio
        </p>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Card
            key={s.label}
            className="animate-fade-in-up p-5 transition-shadow hover:shadow-soft-lg"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
              <div className={`inline-flex rounded-xl p-2 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="tabular mt-3 font-heading text-3xl font-bold text-foreground">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Gráfico de barras: documentos firmados por mes */}
        <Card className="p-6 lg:col-span-3">
          <div className="mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">
              Documentos firmados por mes
            </h2>
          </div>
          <div className="flex h-56 items-end gap-2">
            {data?.firmadosPorMes.map((m) => (
              <div key={m.mes} className="flex h-full flex-1 flex-col items-center gap-2">
                <div className="flex min-h-0 w-full flex-1 items-end rounded-t-lg bg-muted/40">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-primary to-primary-light/80 transition-all duration-500 hover:from-primary-hover hover:to-primary-light"
                    style={{ height: `${(m.firmados / maxMes) * 100}%`, minHeight: m.firmados ? 6 : 0 }}
                    title={`${m.firmados} firmados`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{m.mes}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Últimos documentos */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 font-heading font-semibold text-foreground">
            Últimos documentos
          </h2>
          <ul className="space-y-3">
            {data?.ultimosDocumentos.length ? (
              data.ultimosDocumentos.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {d.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(d.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                </li>
              ))
            ) : (
              <li className="text-sm text-muted-foreground">
                Aún no hay documentos.
              </li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
