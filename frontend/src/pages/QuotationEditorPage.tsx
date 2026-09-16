/**
 * Editor / detalle de una cotización.
 *   /cotizaciones/nueva  -> crea un borrador
 *   /cotizaciones/:id    -> edita (solo BORRADOR) o muestra en modo lectura
 *
 * Reproduce las secciones del formato impreso: datos del solicitante (cliente),
 * datos del servicio (código, servicio solicitado y tabla de actividades),
 * nota (contramuestra, validez, entregable, tiempo de entrega) y responsable
 * de atención al cliente. Desde aquí también se previsualiza el PDF, se
 * envía por correo, se cambia el estado, se duplica y se genera el Documento
 * sellado con QR para firmarlo con ReFirma.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  Check,
  Copy,
  Eye,
  FileSignature,
  Mail,
  MessageCircle,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { http } from '@/lib/api';
import type { Client, Quotation, Service, Signatory } from '@/types';
import { useUIStore } from '@/stores/ui.store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WhatsappQuotationModal } from '@/components/ui/WhatsappQuotationModal';
import { QuotationBadge } from '@/components/ui/QuotationBadge';
import { cn, errorMessage, formatDateOnly, formatMoney } from '@/lib/utils';

const IGV = 18;

type Line = {
  key: number;
  servicioId: number | null;
  codigo: string;
  actividad: string;
  descripcion: string;
  documentoNormativo: string;
  propio: boolean;
  acreditado: boolean;
  unidad: string;
  cantidad: string;
  precioUnitario: string;
};

type Form = {
  clienteId: number | '';
  codigoServicio: string;
  servicioSolicitado: string;
  validezDias: string;
  moneda: string;
  aplicaIgv: boolean;
  descuento: string;
  contramuestra: boolean;
  entregable: string;
  tiempoEntrega: string;
  responsableId: number | '';
  observaciones: string;
  condiciones: string;
};

const emptyForm: Form = {
  clienteId: '',
  codigoServicio: '',
  servicioSolicitado: '',
  validezDias: '15',
  moneda: 'PEN',
  aplicaIgv: true,
  descuento: '0',
  contramuestra: false,
  entregable: '',
  tiempoEntrega: '',
  responsableId: '',
  observaciones: '',
  condiciones: '',
};

let lineKey = 1;
const newLine = (partial: Partial<Line> = {}): Line => ({
  key: lineKey++,
  servicioId: null,
  codigo: '',
  actividad: '',
  descripcion: '',
  documentoNormativo: '',
  propio: true,
  acreditado: false,
  unidad: 'unidad',
  cantidad: '1',
  precioUnitario: '0',
  ...partial,
});

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const selectCls =
  'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary disabled:opacity-60';
const cellInput =
  'h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus:border-primary disabled:border-transparent disabled:bg-transparent';
const cellSelect =
  'h-9 w-full rounded-lg border border-border bg-surface px-1 text-xs font-semibold text-foreground focus:border-primary disabled:border-transparent disabled:bg-transparent';
const cellTextarea =
  'w-full resize-none rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-primary disabled:border-transparent disabled:bg-transparent';

export function QuotationEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'nueva';
  const navigate = useNavigate();
  const notify = useUIStore((s) => s.notify);

  const [q, setQ] = useState<Quotation | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [lines, setLines] = useState<Line[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [serviceToAdd, setServiceToAdd] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Modales
  const [pdfSrc, setPdfSrc] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [docOpen, setDocOpen] = useState(false);
  const [docSignatory, setDocSignatory] = useState<number | ''>('');
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
    confirmText?: string;
  } | null>(null);

  const editable = isNew || q?.estado === 'BORRADOR';

  // ---------- carga ----------
  useEffect(() => {
    http.get<Client[]>('/clientes').then(setClients).catch(() => setClients([]));
    http.get<Service[]>('/servicios').then(setServices).catch(() => setServices([]));
    http.get<Signatory[]>('/firmante').then(setSignatories).catch(() => setSignatories([]));
  }, []);

  useEffect(() => {
    if (isNew) {
      setQ(null);
      setForm(emptyForm);
      setLines([]);
      return;
    }
    http
      .get<Quotation>(`/cotizaciones/${id}`)
      .then((data) => {
        setQ(data);
        setForm({
          clienteId: data.clienteId,
          codigoServicio: data.codigoServicio ?? '',
          servicioSolicitado: data.servicioSolicitado ?? '',
          validezDias: String(data.validezDias),
          moneda: data.moneda,
          aplicaIgv: data.aplicaIgv,
          descuento: String(Number(data.descuento)),
          contramuestra: !!data.contramuestra,
          entregable: data.entregable ?? '',
          tiempoEntrega: data.tiempoEntrega ?? '',
          responsableId: data.responsableId ?? '',
          observaciones: data.observaciones ?? '',
          condiciones: data.condiciones ?? '',
        });
        setLines(
          data.items.map((it) =>
            newLine({
              servicioId: it.servicioId ?? null,
              codigo: it.codigo ?? '',
              actividad: it.actividad ?? '',
              descripcion: it.descripcion ?? '',
              documentoNormativo: it.documentoNormativo ?? '',
              propio: it.propio ?? true,
              acreditado: it.acreditado ?? false,
              unidad: it.unidad,
              cantidad: String(Number(it.cantidad)),
              precioUnitario: String(Number(it.precioUnitario)),
            }),
          ),
        );
      })
      .catch(() => {
        notify('Cotización no encontrada', 'error');
        navigate('/cotizaciones');
      });
  }, [id, isNew, navigate, notify]);

  // ---------- totales (mismo cálculo que el servidor) ----------
  const totals = useMemo(() => {
    const subtotal = round2(
      lines.reduce((acc, l) => acc + round2(Number(l.cantidad) * Number(l.precioUnitario) || 0), 0),
    );
    const desc = Math.min(round2(Number(form.descuento) || 0), subtotal);
    const base = round2(subtotal - desc);
    const igv = form.aplicaIgv ? round2(base * (IGV / 100)) : 0;
    return { subtotal, descuento: desc, igv, total: round2(base + igv) };
  }, [lines, form.descuento, form.aplicaIgv]);

  const selectedClient = clients.find((c) => c.id === form.clienteId) ?? q?.cliente ?? null;

  // ---------- ítems ----------
  const addService = () => {
    const sv = services.find((s) => s.id === serviceToAdd);
    if (!sv) return;
    setLines((ls) => [
      ...ls,
      newLine({
        servicioId: sv.id,
        codigo: sv.codigo,
        actividad: sv.nombre,
        documentoNormativo: sv.metodo ?? '',
        propio: !sv.subcontratado,
        acreditado: sv.acreditado,
        unidad: sv.unidad,
        precioUnitario: String(Number(sv.precio)),
      }),
    ]);
    // Sugerimos el servicio solicitado con el primer ítem agregado.
    setForm((f) => ({
      ...f,
      servicioSolicitado: f.servicioSolicitado || sv.nombre.toUpperCase(),
      codigoServicio: f.codigoServicio || sv.codigo,
    }));
    setServiceToAdd('');
  };

  const addFreeLine = () => setLines((ls) => [...ls, newLine()]);

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const removeLine = (key: number) => setLines((ls) => ls.filter((l) => l.key !== key));

  // ---------- guardar ----------
  const save = async () => {
    if (!form.clienteId) return notify('Selecciona el cliente', 'error');
    if (!lines.length) return notify('Agrega al menos un ítem', 'error');
    for (const [i, l] of lines.entries()) {
      if (!l.actividad.trim() && !l.descripcion.trim()) {
        return notify(`El ítem #${i + 1} necesita actividad o descripción`, 'error');
      }
      if (!(Number(l.cantidad) > 0)) return notify(`Cantidad inválida en el ítem #${i + 1}`, 'error');
      if (!(Number(l.precioUnitario) >= 0)) return notify(`Precio inválido en el ítem #${i + 1}`, 'error');
    }
    const payload = {
      clienteId: form.clienteId,
      codigoServicio: form.codigoServicio.trim() || null,
      servicioSolicitado: form.servicioSolicitado.trim() || null,
      validezDias: Number(form.validezDias) || 15,
      moneda: form.moneda,
      aplicaIgv: form.aplicaIgv,
      descuento: round2(Number(form.descuento) || 0),
      contramuestra: form.contramuestra,
      entregable: form.entregable.trim() || null,
      tiempoEntrega: form.tiempoEntrega.trim() || null,
      responsableId: form.responsableId || null,
      observaciones: form.observaciones.trim() || null,
      condiciones: form.condiciones.trim() || null,
      items: lines.map((l) => ({
        servicioId: l.servicioId,
        codigo: l.codigo.trim() || null,
        actividad: l.actividad.trim() || null,
        descripcion: l.descripcion.trim() || null,
        documentoNormativo: l.documentoNormativo.trim() || null,
        propio: l.propio,
        acreditado: l.acreditado,
        unidad: l.unidad.trim() || 'unidad',
        cantidad: round2(Number(l.cantidad)),
        precioUnitario: round2(Number(l.precioUnitario)),
      })),
    };
    setSaving(true);
    try {
      if (isNew) {
        const created = await http.post<Quotation>('/cotizaciones', payload);
        notify(`Cotización ${created.numero} creada`, 'success');
        navigate(`/cotizaciones/${created.id}`, { replace: true });
      } else {
        const updated = await http.patch<Quotation>(`/cotizaciones/${id}`, payload);
        setQ(updated);
        notify('Cotización guardada', 'success');
      }
    } catch (e) {
      notify(errorMessage(e, 'No se pudo guardar la cotización'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ---------- acciones ----------
  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    try {
      await fn();
    } catch (e) {
      notify(errorMessage(e, 'La operación falló'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const previewPdf = () =>
    run('pdf', async () => {
      const res = await http.get<{ base64File: string }>(`/cotizaciones/${id}/pdf`);
      setPdfSrc(res.base64File);
    });

  const openEmail = () => {
    setEmailTo(q?.cliente.correo ?? '');
    setEmailMsg('');
    setEmailOpen(true);
  };

  const sendEmail = () =>
    run('email', async () => {
      const updated = await http.post<Quotation>(`/cotizaciones/${id}/enviar`, {
        email: emailTo.trim() || undefined,
        mensaje: emailMsg.trim() || undefined,
      });
      setQ(updated);
      setEmailOpen(false);
      notify(`Cotización enviada a ${emailTo}`, 'success');
    });

  const changeStatus = (estado: string) =>
    run(estado, async () => {
      const updated = await http.patch<Quotation>(`/cotizaciones/${id}/estado`, { estado });
      setQ(updated);
      notify(`Estado cambiado a ${estado.toLowerCase()}`, 'success');
    });

  const duplicate = () =>
    run('dup', async () => {
      const nueva = await http.post<Quotation>(`/cotizaciones/${id}/duplicar`);
      notify(`Borrador ${nueva.numero} creado`, 'success');
      navigate(`/cotizaciones/${nueva.id}`);
    });

  const generateDocument = () =>
    run('doc', async () => {
      if (!docSignatory) throw new Error('Selecciona el firmante');
      const updated = await http.post<Quotation>(`/cotizaciones/${id}/documento`, {
        signatoryId: docSignatory,
      });
      setQ(updated);
      setDocOpen(false);
      notify('Documento generado y sellado con QR. Ya puedes firmarlo en Documentos.', 'success');
    });

  const deleteDraft = () =>
    run('del', async () => {
      await http.del(`/cotizaciones/${id}`);
      notify('Borrador eliminado', 'success');
      navigate('/cotizaciones');
    });

  const set =
    (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  // ---------- render ----------
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/cotizaciones')}
            className="mt-1 rounded-lg p-1.5 hover:bg-muted"
            title="Volver"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                {isNew ? 'Nueva cotización' : (q?.numero ?? '…')}
              </h1>
              {q && <QuotationBadge estado={q.estado} />}
            </div>
            <p className="text-sm text-muted-foreground">
              {isNew
                ? 'Se guardará como borrador; podrás enviarla cuando esté lista.'
                : q
                  ? `Emitida el ${formatDateOnly(q.fecha)} · válida hasta ${formatDateOnly(q.vencimiento)}` +
                    (q.enviadaAt
                      ? ` · enviada${q.enviadaA ? ` a ${q.enviadaA}` : ''} el ${formatDateOnly(q.enviadaAt)}`
                      : '')
                  : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isNew && (
            <>
              <Button variant="outline" onClick={previewPdf} loading={busy === 'pdf'}>
                <Eye className="h-4 w-4" /> Ver PDF
              </Button>
              {q?.estado !== 'ANULADA' && (
                <Button variant="outline" onClick={openEmail}>
                  <Mail className="h-4 w-4" /> Enviar por correo
                </Button>
              )}
              {q?.estado !== 'ANULADA' && (
                <Button variant="outline" onClick={() => setWaOpen(true)}>
                  <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
                </Button>
              )}
              <Button variant="outline" onClick={duplicate} loading={busy === 'dup'}>
                <Copy className="h-4 w-4" /> Duplicar
              </Button>
            </>
          )}
          {editable && (
            <Button onClick={save} loading={saving}>
              <Save className="h-4 w-4" /> {isNew ? 'Crear borrador' : 'Guardar'}
            </Button>
          )}
        </div>
      </div>

      {/* Barra de estado / acciones de ciclo de vida */}
      {q && q.estado !== 'BORRADOR' && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            {q.estado === 'ANULADA'
              ? 'Esta cotización está anulada. Puedes duplicarla para crear una nueva.'
              : 'Esta cotización ya fue emitida y no se puede editar. Duplícala para crear una nueva versión.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {q.estado === 'ENVIADA' && (
              <>
                <Button size="sm" variant="accent" onClick={() => changeStatus('ACEPTADA')} loading={busy === 'ACEPTADA'}>
                  <Check className="h-4 w-4" /> Marcar aceptada
                </Button>
                <Button size="sm" variant="outline" onClick={() => changeStatus('RECHAZADA')} loading={busy === 'RECHAZADA'}>
                  <X className="h-4 w-4" /> Rechazada
                </Button>
                <Button size="sm" variant="ghost" onClick={() => changeStatus('BORRADOR')} loading={busy === 'BORRADOR'}>
                  Volver a borrador
                </Button>
              </>
            )}
            {q.estado !== 'ANULADA' && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() =>
                  setConfirm({
                    title: 'Anular cotización',
                    confirmText: 'Anular',
                    message: `¿Anular ${q.numero}? Quedará registrada pero no podrá enviarse ni aceptarse.`,
                    action: () => changeStatus('ANULADA'),
                  })
                }
              >
                <Ban className="h-4 w-4" /> Anular
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="space-y-6 lg:col-span-2">
          {/* I. Solicitante */}
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-foreground">I. Datos del solicitante</h2>
            <select
              value={form.clienteId}
              onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value ? Number(e.target.value) : '' }))}
              disabled={!editable}
              className={selectCls}
            >
              <option value="">Seleccionar cliente…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} — {c.tipoDocumento} {c.numeroDocumento}
                </option>
              ))}
            </select>
            {selectedClient && (
              <div className="mt-3 grid gap-1 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-foreground">{selectedClient.tipoDocumento}:</span>{' '}
                  {selectedClient.numeroDocumento}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Contacto:</span> {selectedClient.contacto || '—'}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Correo:</span> {selectedClient.correo}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Celular:</span> {selectedClient.telefono}
                </p>
                {selectedClient.direccion && (
                  <p className="sm:col-span-2">
                    <span className="font-semibold text-foreground">Dirección:</span> {selectedClient.direccion}
                  </p>
                )}
              </div>
            )}
            {!clients.length && editable && (
              <p className="mt-2 text-xs text-warning">
                No hay clientes registrados. Regístralos primero en la sección Clientes.
              </p>
            )}
          </Card>

          {/* II. Datos del servicio */}
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-foreground">II. Datos del servicio</h2>
              {editable && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={serviceToAdd}
                    onChange={(e) => setServiceToAdd(e.target.value ? Number(e.target.value) : '')}
                    className={cn(selectCls, 'h-9 w-auto max-w-[360px]')}
                  >
                    <option value="">Agregar del catálogo…</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.codigo} · {s.nombre} · {formatMoney(s.precio, s.moneda)}/{s.unidad}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={addService} disabled={!serviceToAdd}>
                    <Plus className="h-4 w-4" /> Agregar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={addFreeLine}>
                    Línea libre
                  </Button>
                </div>
              )}
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-3">
              <Input
                label="Código de servicio"
                placeholder="Ej: 17020"
                value={form.codigoServicio}
                onChange={set('codigoServicio')}
                disabled={!editable}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Servicio solicitado"
                  placeholder="Ej: CERTIFICADO DE INSPECCIÓN DE LOTE"
                  value={form.servicioSolicitado}
                  onChange={set('servicioSolicitado')}
                  disabled={!editable}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2 font-semibold">#</th>
                    <th className="px-2 py-2 font-semibold">Actividad</th>
                    <th className="px-2 py-2 font-semibold">Descripción</th>
                    <th className="px-2 py-2 font-semibold">Documento normativo</th>
                    <th className="px-2 py-2 text-center font-semibold">Pro/Sub</th>
                    <th className="px-2 py-2 text-center font-semibold">AC/NA</th>
                    <th className="px-2 py-2 text-right font-semibold">Cant.</th>
                    <th className="px-2 py-2 text-right font-semibold">P. unit.</th>
                    <th className="px-2 py-2 text-right font-semibold">Total</th>
                    {editable && <th className="px-2 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.key} className="border-b border-border/60 align-top">
                      <td className="px-2 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="w-[200px] px-2 py-1.5">
                        <textarea
                          rows={2}
                          className={cellTextarea}
                          value={l.actividad}
                          onChange={(e) => updateLine(l.key, { actividad: e.target.value })}
                          disabled={!editable}
                          placeholder="Ej: Inspección de lote por muestreo"
                        />
                      </td>
                      <td className="w-[160px] px-2 py-1.5">
                        <textarea
                          rows={2}
                          className={cellTextarea}
                          value={l.descripcion}
                          onChange={(e) => updateLine(l.key, { descripcion: e.target.value })}
                          disabled={!editable}
                          placeholder="Producto / muestra"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <textarea
                          rows={2}
                          className={cellTextarea}
                          value={l.documentoNormativo}
                          onChange={(e) => updateLine(l.key, { documentoNormativo: e.target.value })}
                          disabled={!editable}
                          placeholder="Norma / método de referencia"
                        />
                      </td>
                      <td className="w-20 px-1 py-1.5">
                        <select
                          className={cellSelect}
                          value={l.propio ? 'PRO' : 'SUB'}
                          onChange={(e) => updateLine(l.key, { propio: e.target.value === 'PRO' })}
                          disabled={!editable}
                        >
                          <option value="PRO">PRO</option>
                          <option value="SUB">SUB</option>
                        </select>
                      </td>
                      <td className="w-20 px-1 py-1.5">
                        <select
                          className={cellSelect}
                          value={l.acreditado ? 'AC' : 'NA'}
                          onChange={(e) => updateLine(l.key, { acreditado: e.target.value === 'AC' })}
                          disabled={!editable}
                        >
                          <option value="AC">AC</option>
                          <option value="NA">NA</option>
                        </select>
                      </td>
                      <td className="w-20 px-1 py-1.5">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          className={cn(cellInput, 'text-right')}
                          value={l.cantidad}
                          onChange={(e) => updateLine(l.key, { cantidad: e.target.value })}
                          disabled={!editable}
                        />
                      </td>
                      <td className="w-24 px-1 py-1.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={cn(cellInput, 'text-right')}
                          value={l.precioUnitario}
                          onChange={(e) => updateLine(l.key, { precioUnitario: e.target.value })}
                          disabled={!editable}
                        />
                      </td>
                      <td className="w-24 px-2 py-2 text-right font-semibold text-foreground">
                        {formatMoney(round2(Number(l.cantidad) * Number(l.precioUnitario) || 0), form.moneda)}
                      </td>
                      {editable && (
                        <td className="w-10 px-1 py-1.5">
                          <button
                            onClick={() => removeLine(l.key)}
                            className="rounded-lg p-1.5 hover:bg-muted"
                            title="Quitar"
                            aria-label="Quitar ítem"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {!lines.length && (
                    <tr>
                      <td colSpan={10} className="px-2 py-8 text-center text-sm text-muted-foreground">
                        Aún no hay ítems. Agrega servicios del catálogo o una línea libre.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Pro = Propio / Sub = Subcontratado / AC = Acreditado / NA = No acreditado
            </p>
          </Card>

          {/* III. Nota + observaciones / condiciones */}
          <Card className="space-y-4 p-5">
            <h2 className="font-semibold text-foreground">III. Nota</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-2 self-end pb-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={form.contramuestra}
                  onChange={(e) => setForm((f) => ({ ...f, contramuestra: e.target.checked }))}
                  disabled={!editable}
                />
                Cliente solicita muestra dirimente / contramuestra
              </label>
              <Input
                label="Tiempo de entrega"
                placeholder="Ej: 10 días"
                value={form.tiempoEntrega}
                onChange={set('tiempoEntrega')}
                disabled={!editable}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Entregable"
                  placeholder="Ej: CERTIFICADO DE INSPECCIÓN DE LOTE"
                  value={form.entregable}
                  onChange={set('entregable')}
                  disabled={!editable}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Observaciones (se imprimen en la nota)</label>
              <textarea
                rows={2}
                value={form.observaciones}
                onChange={set('observaciones')}
                disabled={!editable}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary disabled:opacity-60"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Cláusulas adicionales (se agregan a las cláusulas estándar)
              </label>
              <textarea
                rows={2}
                value={form.condiciones}
                onChange={set('condiciones')}
                disabled={!editable}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary disabled:opacity-60"
              />
            </div>
          </Card>
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          <Card className="space-y-4 p-5">
            <h2 className="font-semibold text-foreground">Parámetros</h2>
            <Input
              label="Validez (días)"
              type="number"
              min="1"
              value={form.validezDias}
              onChange={set('validezDias')}
              disabled={!editable}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Moneda</label>
              <select value={form.moneda} onChange={set('moneda')} disabled={!editable} className={selectCls}>
                <option value="PEN">PEN (S/)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
            <Input
              label="Descuento (monto)"
              type="number"
              min="0"
              step="0.01"
              value={form.descuento}
              onChange={set('descuento')}
              disabled={!editable}
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.aplicaIgv}
                onChange={(e) => setForm((f) => ({ ...f, aplicaIgv: e.target.checked }))}
                disabled={!editable}
              />
              Aplicar IGV ({IGV}%)
            </label>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Responsable de atención al cliente
              </label>
              <select
                value={form.responsableId}
                onChange={(e) => setForm((f) => ({ ...f, responsableId: e.target.value ? Number(e.target.value) : '' }))}
                disabled={!editable}
                className={selectCls}
              >
                <option value="">Sin responsable</option>
                {signatories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} — {s.cargo}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Su rúbrica se imprime al pie de la cotización.</p>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold text-foreground">Totales</h2>
            <dl className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatMoney(totals.subtotal, form.moneda)} />
              {totals.descuento > 0 && <Row label="Descuento" value={`- ${formatMoney(totals.descuento, form.moneda)}`} />}
              {form.aplicaIgv && <Row label={`IGV (${IGV}%)`} value={formatMoney(totals.igv, form.moneda)} />}
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold text-primary">
                <dt>Total</dt>
                <dd>{formatMoney(totals.total, form.moneda)}</dd>
              </div>
            </dl>
          </Card>

          {!isNew && q && (
            <Card className="p-5">
              <h2 className="mb-2 font-semibold text-foreground">Documento para firma</h2>
              {q.documento ? (
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    Generado como documento <strong className="text-foreground">#{q.documento.id}</strong>{' '}
                    ({q.documento.status.toLowerCase()}).
                  </p>
                  <Button size="sm" variant="outline" onClick={() => navigate('/documentos')}>
                    <FileSignature className="h-4 w-4" /> Ir a Documentos
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    Convierte esta cotización en un PDF sellado con QR para firmarla digitalmente con ReFirma.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setDocOpen(true)} disabled={q.estado === 'ANULADA'}>
                    <FileSignature className="h-4 w-4" /> Generar documento
                  </Button>
                </div>
              )}
            </Card>
          )}

          {!isNew && q?.estado === 'BORRADOR' && (
            <Button
              variant="ghost"
              className="w-full text-destructive"
              onClick={() =>
                setConfirm({
                  title: 'Eliminar borrador',
                  message: `¿Eliminar definitivamente el borrador ${q.numero}?`,
                  action: deleteDraft,
                })
              }
            >
              <Trash2 className="h-4 w-4" /> Eliminar borrador
            </Button>
          )}
        </div>
      </div>

      {/* Modal: PDF */}
      <Modal open={!!pdfSrc} onClose={() => setPdfSrc('')} title={`Cotización ${q?.numero ?? ''}`} size="xl">
        <iframe title="PDF" src={pdfSrc} className="h-[80vh] w-full rounded-xl border border-border" />
      </Modal>

      {/* Modal: correo */}
      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} title="Enviar cotización por correo" size="md">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se enviará <strong>{q?.numero}</strong> en PDF por {formatMoney(q?.total, q?.moneda)}.
            {q?.estado === 'BORRADOR' && ' La cotización pasará a estado "Enviada".'}
          </p>
          <Input label="Correo del cliente" type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Mensaje adicional (opcional)</label>
            <textarea
              rows={3}
              value={emailMsg}
              onChange={(e) => setEmailMsg(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancelar</Button>
            <Button onClick={sendEmail} loading={busy === 'email'}>
              <Mail className="h-4 w-4" /> Enviar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: WhatsApp */}
      <WhatsappQuotationModal
        quotation={waOpen && q ? q : null}
        onClose={() => setWaOpen(false)}
        onSent={(updated) => setQ(updated as Quotation)}
      />

      {/* Modal: generar documento */}
      <Modal open={docOpen} onClose={() => setDocOpen(false)} title="Generar documento para firma" size="md">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se creará un documento en la sección Documentos con el PDF de esta cotización, sellado con QR y
            asociado al cliente. Luego podrás firmarlo con ReFirma y remitirlo.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Firmante autorizado</label>
            <select
              value={docSignatory}
              onChange={(e) => setDocSignatory(e.target.value ? Number(e.target.value) : '')}
              className={selectCls}
            >
              <option value="">Seleccionar…</option>
              {signatories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} — {s.cargo}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDocOpen(false)}>Cancelar</Button>
            <Button onClick={generateDocument} loading={busy === 'doc'} disabled={!docSignatory}>
              <FileSignature className="h-4 w-4" /> Generar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        confirmText={confirm?.confirmText ?? 'Eliminar'}
        message={confirm?.message ?? ''}
        onConfirm={async () => {
          const a = confirm?.action;
          setConfirm(null);
          if (a) await a();
        }}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
