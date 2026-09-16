/**
 * Página del catálogo de servicios: los ensayos, inspecciones y demás ítems
 * que la empresa cotiza, con su código, método, precio de lista y unidad.
 * Solo el ADMIN crea/edita/deshabilita; el resto solo consulta.
 */
import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  FlaskConical,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { http } from '@/lib/api';
import type { CategoriaServicio, Service, TipoItem } from '@/types';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn, errorMessage, formatMoney } from '@/lib/utils';

export const CATEGORIAS: { value: CategoriaServicio; label: string }[] = [
  { value: 'ENSAYO_FISICOQUIMICO', label: 'Ensayo fisicoquímico' },
  { value: 'ENSAYO_MICROBIOLOGICO', label: 'Ensayo microbiológico' },
  { value: 'ENSAYO_SENSORIAL', label: 'Ensayo sensorial' },
  { value: 'INSPECCION', label: 'Inspección' },
  { value: 'MUESTREO', label: 'Muestreo' },
  { value: 'CONSULTORIA', label: 'Consultoría' },
  { value: 'CAPACITACION', label: 'Capacitación' },
  { value: 'OTRO', label: 'Otro' },
];

const TIPOS: { value: TipoItem; label: string }[] = [
  { value: 'SERVICIO', label: 'Servicio' },
  { value: 'PRODUCTO', label: 'Producto' },
];

const UNIDADES = ['muestra', 'ensayo', 'visita', 'hora', 'día', 'unidad'];

type FormState = {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: TipoItem;
  categoria: CategoriaServicio;
  metodo: string;
  acreditado: boolean;
  subcontratado: boolean;
  unidad: string;
  precio: string;
  moneda: string;
  tiempoEntregaDias: string;
};

const emptyForm: FormState = {
  codigo: '',
  nombre: '',
  descripcion: '',
  tipo: 'SERVICIO',
  categoria: 'ENSAYO_FISICOQUIMICO',
  metodo: '',
  acreditado: false,
  subcontratado: false,
  unidad: 'muestra',
  precio: '',
  moneda: 'PEN',
  tiempoEntregaDias: '',
};


export function ServicesPage() {
  const notify = useUIStore((s) => s.notify);
  const isAdmin = useAuthStore((s) => s.user?.rol === 'ADMIN');

  const [items, setItems] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState<CategoriaServicio | ''>('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [toDelete, setToDelete] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('buscar', search.trim());
    if (categoria) params.set('categoria', categoria);
    if (showInactive) params.set('todos', 'true');
    const qs = params.toString();
    setItems(await http.get<Service[]>(`/servicios${qs ? `?${qs}` : ''}`));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoria, showInactive]);

  const openNew = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s: Service) => {
    setForm({
      id: s.id,
      codigo: s.codigo,
      nombre: s.nombre,
      descripcion: s.descripcion ?? '',
      tipo: s.tipo,
      categoria: s.categoria,
      metodo: s.metodo ?? '',
      acreditado: s.acreditado,
      subcontratado: s.subcontratado ?? false,
      unidad: s.unidad,
      precio: String(s.precio),
      moneda: s.moneda,
      tiempoEntregaDias: s.tiempoEntregaDias != null ? String(s.tiempoEntregaDias) : '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    const precio = Number(form.precio);
    if (!form.codigo.trim() || !form.nombre.trim()) {
      return notify('Código y nombre son obligatorios', 'error');
    }
    if (form.precio === '' || isNaN(precio) || precio < 0) {
      return notify('Ingresa un precio válido', 'error');
    }
    setSaving(true);
    const payload = {
      codigo: form.codigo.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      tipo: form.tipo,
      categoria: form.categoria,
      metodo: form.metodo.trim() || null,
      acreditado: form.acreditado,
      subcontratado: form.subcontratado,
      unidad: form.unidad,
      precio: Math.round(precio * 100) / 100,
      moneda: form.moneda,
      tiempoEntregaDias: form.tiempoEntregaDias === '' ? null : Number(form.tiempoEntregaDias),
    };
    try {
      if (form.id) {
        await http.patch(`/servicios/${form.id}`, payload);
        notify('Servicio actualizado', 'success');
      } else {
        await http.post('/servicios', payload);
        notify('Servicio agregado al catálogo', 'success');
      }
      setModalOpen(false);
      load();
    } catch (e) {
      notify(errorMessage(e, 'No se pudo guardar el servicio'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await http.del(`/servicios/${toDelete.id}`);
      notify('Servicio deshabilitado', 'success');
      load();
    } catch (e) {
      notify(errorMessage(e, 'No se pudo deshabilitar'), 'error');
    } finally {
      setToDelete(null);
    }
  };

  const reactivate = async (s: Service) => {
    try {
      await http.patch(`/servicios/${s.id}`, { estado: true });
      notify('Servicio reactivado', 'success');
      load();
    } catch (e) {
      notify(errorMessage(e, 'No se pudo reactivar'), 'error');
    }
  };

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const catLabel = (c: CategoriaServicio) => CATEGORIAS.find((x) => x.value === c)?.label ?? c;
  const selectCls =
    'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Servicios</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de ensayos, inspecciones y servicios que se cotizan
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Nuevo servicio
          </Button>
        )}
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
              placeholder="Buscar por código, nombre o método…"
              icon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaServicio | '')}
            className={cn(selectCls, 'w-auto')}
          >
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Ver deshabilitados
          </label>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3 font-semibold">Código</th>
                <th className="px-3 py-3 font-semibold">Servicio</th>
                <th className="px-3 py-3 font-semibold">Categoría</th>
                <th className="px-3 py-3 font-semibold">Método</th>
                <th className="px-3 py-3 text-right font-semibold">Precio</th>
                <th className="px-3 py-3 font-semibold">Entrega</th>
                {isAdmin && <th className="px-3 py-3 text-right font-semibold">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr
                  key={s.id}
                  className={cn(
                    'border-b border-border/60 transition-colors hover:bg-muted/50',
                    !s.estado && 'opacity-60',
                  )}
                >
                  <td className="px-3 py-3 font-mono text-xs text-foreground">{s.codigo}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <FlaskConical className="h-4 w-4 shrink-0 text-primary" />
                      <span>{s.nombre}</span>
                      {s.acreditado && (
                        <span
                          title="Dentro del alcance de acreditación INACAL"
                          className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success"
                        >
                          <BadgeCheck className="h-3 w-3" /> Acreditado
                        </span>
                      )}
                      {s.tipo === 'PRODUCTO' && (
                        <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
                          Producto
                        </span>
                      )}
                    </div>
                    {!s.estado && (
                      <span className="pl-6 text-xs font-semibold text-destructive">Deshabilitado</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{catLabel(s.categoria)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{s.metodo || '—'}</td>
                  <td className="px-3 py-3 text-right">
                    <p className="font-semibold text-foreground">{formatMoney(s.precio, s.moneda)}</p>
                    <p className="text-xs text-muted-foreground">por {s.unidad}</p>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {s.tiempoEntregaDias != null ? `${s.tiempoEntregaDias} ${s.tiempoEntregaDias === 1 ? "día" : "días"}` : "—"}
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          title="Editar"
                          className="rounded-lg p-1.5 hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4 text-primary" />
                        </button>
                        {s.estado ? (
                          <button
                            onClick={() => setToDelete(s)}
                            title="Deshabilitar"
                            className="rounded-lg p-1.5 hover:bg-muted"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        ) : (
                          <button
                            onClick={() => reactivate(s)}
                            title="Reactivar"
                            className="rounded-lg p-1.5 hover:bg-muted"
                          >
                            <RotateCcw className="h-4 w-4 text-accent" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No hay servicios en el catálogo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal alta/edición */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Editar servicio' : 'Nuevo servicio'}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Código" placeholder="FQ-001" value={form.codigo} onChange={set('codigo')} />
          <div className="sm:col-span-2">
            <Input label="Nombre" placeholder="Ej: Recuento de aerobios mesófilos" value={form.nombre} onChange={set('nombre')} />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Tipo</label>
            <select value={form.tipo} onChange={set('tipo')} className={selectCls}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Categoría</label>
            <select value={form.categoria} onChange={set('categoria')} className={selectCls}>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <Input label="Método / norma (opcional)" placeholder="Ej: ISO 4833-1, AOAC 925.10" value={form.metodo} onChange={set('metodo')} />
          </div>
          <div className="flex flex-col gap-2 self-end pb-2 text-sm text-foreground">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.acreditado}
                onChange={(e) => setForm((f) => ({ ...f, acreditado: e.target.checked }))}
              />
              Acreditado INACAL (AC)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.subcontratado}
                onChange={(e) => setForm((f) => ({ ...f, subcontratado: e.target.checked }))}
              />
              Subcontratado (SUB)
            </label>
          </div>

          <Input label="Precio de lista" type="number" min="0" step="0.01" value={form.precio} onChange={set('precio')} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Moneda</label>
            <select value={form.moneda} onChange={set('moneda')} className={selectCls}>
              <option value="PEN">PEN (S/)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Unidad de cobro</label>
            <select value={form.unidad} onChange={set('unidad')} className={selectCls}>
              {UNIDADES.map((u) => (
                <option key={u} value={u}>por {u}</option>
              ))}
            </select>
          </div>

          <Input label="Entrega (días hábiles, opcional)" type="number" min="0" value={form.tiempoEntregaDias} onChange={set('tiempoEntregaDias')} />
          <div className="sm:col-span-3">
            <label className="mb-1.5 block text-sm font-medium text-foreground">Descripción (opcional)</label>
            <textarea
              value={form.descripcion}
              onChange={set('descripcion')}
              rows={2}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Guardar</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Deshabilitar servicio"
        confirmText="Deshabilitar"
        message={`¿Deshabilitar "${toDelete?.codigo} · ${toDelete?.nombre}"? Dejará de ofrecerse en nuevas cotizaciones; podrás reactivarlo después.`}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
