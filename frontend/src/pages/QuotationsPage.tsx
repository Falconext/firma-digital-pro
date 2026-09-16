/**
 * Listado de cotizaciones: buscar, filtrar por estado, abrir, ver PDF,
 * duplicar, anular y eliminar borradores. La creación/edición vive en
 * QuotationEditorPage (/cotizaciones/nueva y /cotizaciones/:id).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ban,
  Copy,
  Eye,
  FileSignature,
  MessageCircle,
  Plus,
  Receipt,
  Search,
  Trash2,
} from 'lucide-react';
import { http } from '@/lib/api';
import type { EstadoCotizacion, QuotationRow } from '@/types';
import { useUIStore } from '@/stores/ui.store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WhatsappQuotationModal } from '@/components/ui/WhatsappQuotationModal';
import { QuotationBadge, QUOTATION_LABELS } from '@/components/ui/QuotationBadge';
import { cn, errorMessage, formatDateOnly, formatMoney } from '@/lib/utils';

const ESTADOS = Object.keys(QUOTATION_LABELS) as EstadoCotizacion[];

export function QuotationsPage() {
  const notify = useUIStore((s) => s.notify);
  const navigate = useNavigate();

  const [items, setItems] = useState<QuotationRow[]>([]);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState<EstadoCotizacion | ''>('');
  const [viewer, setViewer] = useState<{ open: boolean; src: string; name: string }>({
    open: false,
    src: '',
    name: '',
  });
  const [toCancel, setToCancel] = useState<QuotationRow | null>(null);
  const [toWhatsapp, setToWhatsapp] = useState<QuotationRow | null>(null);
  const [toDelete, setToDelete] = useState<QuotationRow | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('buscar', search.trim());
    if (estado) params.set('estado', estado);
    const qs = params.toString();
    setItems(await http.get<QuotationRow[]>(`/cotizaciones${qs ? `?${qs}` : ''}`));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  const viewPdf = async (q: QuotationRow) => {
    setBusyId(q.id);
    try {
      const res = await http.get<{ base64File: string }>(`/cotizaciones/${q.id}/pdf`);
      setViewer({ open: true, src: res.base64File, name: q.numero });
    } catch (e) {
      notify(errorMessage(e, 'No se pudo generar el PDF'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const duplicate = async (q: QuotationRow) => {
    setBusyId(q.id);
    try {
      const nueva = await http.post<{ id: number; numero: string }>(`/cotizaciones/${q.id}/duplicar`);
      notify(`Borrador ${nueva.numero} creado a partir de ${q.numero}`, 'success');
      navigate(`/cotizaciones/${nueva.id}`);
    } catch (e) {
      notify(errorMessage(e, 'No se pudo duplicar'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const confirmCancel = async () => {
    if (!toCancel) return;
    try {
      await http.patch(`/cotizaciones/${toCancel.id}/estado`, { estado: 'ANULADA' });
      notify(`Cotización ${toCancel.numero} anulada`, 'success');
      load();
    } catch (e) {
      notify(errorMessage(e, 'No se pudo anular'), 'error');
    } finally {
      setToCancel(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await http.del(`/cotizaciones/${toDelete.id}`);
      notify(`Borrador ${toDelete.numero} eliminado`, 'success');
      load();
    } catch (e) {
      notify(errorMessage(e, 'No se pudo eliminar'), 'error');
    } finally {
      setToDelete(null);
    }
  };

  const vencida = (q: QuotationRow) =>
    q.estado === 'ENVIADA' && q.vencimiento && new Date(q.vencimiento) < new Date();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Cotizaciones</h1>
          <p className="text-sm text-muted-foreground">
            Propuestas económicas emitidas a los clientes
          </p>
        </div>
        <Button onClick={() => navigate('/cotizaciones/nueva')}>
          <Plus className="h-4 w-4" />
          Nueva cotización
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
          >
            <Input
              placeholder="Buscar por número o cliente…"
              icon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoCotizacion | '')}
            className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {QUOTATION_LABELS[e]}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3 font-semibold">Número</th>
                <th className="px-3 py-3 font-semibold">Cliente</th>
                <th className="px-3 py-3 font-semibold">Fecha</th>
                <th className="px-3 py-3 font-semibold">Vence</th>
                <th className="px-3 py-3 text-right font-semibold">Total</th>
                <th className="px-3 py-3 font-semibold">Estado</th>
                <th className="px-3 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr
                  key={q.id}
                  className="cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/50"
                  onClick={() => navigate(`/cotizaciones/${q.id}`)}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Receipt className="h-4 w-4 text-primary" />
                      <span className="font-mono">{q.numero}</span>
                    </div>
                    {q.documento && (
                      <p className="mt-0.5 flex items-center gap-1 pl-6 text-xs text-muted-foreground">
                        <FileSignature className="h-3 w-3" />
                        Documento #{q.documento.id} ({q.documento.status.toLowerCase()})
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-foreground">{q.cliente.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {q.cliente.tipoDocumento} {q.cliente.numeroDocumento}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{formatDateOnly(q.fecha)}</td>
                  <td className={cn('px-3 py-3', vencida(q) ? 'font-semibold text-warning' : 'text-muted-foreground')}>
                    {formatDateOnly(q.vencimiento)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-foreground">
                    {formatMoney(q.total, q.moneda)}
                  </td>
                  <td className="px-3 py-3">
                    <QuotationBadge estado={q.estado} />
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <IconButton title="Ver PDF" onClick={() => viewPdf(q)} loading={busyId === q.id}>
                        <Eye className="h-4 w-4 text-primary" />
                      </IconButton>
                      {q.estado !== 'ANULADA' && (
                        <IconButton title="Enviar por WhatsApp" onClick={() => setToWhatsapp(q)}>
                          <MessageCircle className="h-4 w-4 text-success" />
                        </IconButton>
                      )}
                      <IconButton title="Duplicar (nueva versión)" onClick={() => duplicate(q)}>
                        <Copy className="h-4 w-4 text-primary" />
                      </IconButton>
                      {q.estado === 'BORRADOR' ? (
                        <IconButton title="Eliminar borrador" onClick={() => setToDelete(q)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </IconButton>
                      ) : (
                        q.estado !== 'ANULADA' && (
                          <IconButton title="Anular" onClick={() => setToCancel(q)}>
                            <Ban className="h-4 w-4 text-destructive" />
                          </IconButton>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No hay cotizaciones. Crea la primera con "Nueva cotización".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Visor de PDF */}
      <Modal
        open={viewer.open}
        onClose={() => setViewer({ open: false, src: '', name: '' })}
        title={`Cotización ${viewer.name}`}
        size="xl"
      >
        <iframe title={viewer.name} src={viewer.src} className="h-[75vh] w-full rounded-xl border border-border" />
      </Modal>

      <WhatsappQuotationModal
        quotation={toWhatsapp}
        onClose={() => setToWhatsapp(null)}
        onSent={() => load()}
      />

      <ConfirmDialog
        open={!!toCancel}
        title="Anular cotización"
        confirmText="Anular"
        message={`¿Anular la cotización ${toCancel?.numero}? Quedará registrada pero no podrá enviarse ni aceptarse.`}
        onConfirm={confirmCancel}
        onClose={() => setToCancel(null)}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar borrador"
        message={`¿Eliminar definitivamente el borrador ${toDelete?.numero}?`}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
  loading,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={loading}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted disabled:opacity-50"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}
