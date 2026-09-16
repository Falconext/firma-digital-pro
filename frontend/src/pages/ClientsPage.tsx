/**
 * Página de clientes: personas (DNI) o empresas (RUC) a quienes se remiten
 * documentos firmados y se emiten cotizaciones.
 * Solo el ADMIN crea/edita/deshabilita; el resto solo consulta.
 */
import { useEffect, useState } from 'react';
import {
  Building2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  RotateCcw,
  Search,
  SearchCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { http } from '@/lib/api';
import { consultarIdentidad, puedeConsultar } from '@/lib/identidad';
import type { Client, TipoDocumento } from '@/types';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn, errorMessage, whatsappUrl } from '@/lib/utils';

const TIPOS: { value: TipoDocumento; label: string }[] = [
  { value: 'RUC', label: 'RUC (empresa)' },
  { value: 'DNI', label: 'DNI' },
  { value: 'CARNET_EXTRANJERIA', label: 'Carnet de extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

type FormState = {
  id?: number;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  nombre: string;
  contacto: string;
  correo: string;
  telefono: string;
  direccion: string;
};

const emptyForm: FormState = {
  tipoDocumento: 'RUC',
  numeroDocumento: '',
  nombre: '',
  contacto: '',
  correo: '',
  telefono: '',
  direccion: '',
};


export function ClientsPage() {
  const notify = useUIStore((s) => s.notify);
  const isAdmin = useAuthStore((s) => s.user?.rol === 'ADMIN');

  const [items, setItems] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [toDelete, setToDelete] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [consultaInfo, setConsultaInfo] = useState<string | null>(null);

  /** Consulta RENIEC (DNI) o SUNAT (RUC) y rellena nombre / dirección. */
  const consultar = async () => {
    const tipo = form.tipoDocumento;
    if (tipo !== 'DNI' && tipo !== 'RUC') return;
    if (!puedeConsultar(tipo, form.numeroDocumento)) {
      return notify(tipo === 'DNI' ? 'El DNI debe tener 8 dígitos' : 'El RUC debe tener 11 dígitos', 'error');
    }
    setConsultando(true);
    setConsultaInfo(null);
    try {
      const r = await consultarIdentidad(tipo, form.numeroDocumento);
      setForm((f) => ({
        ...f,
        numeroDocumento: r.numero,
        nombre: r.nombre || f.nombre,
        direccion: r.direccion || f.direccion,
      }));
      const extra =
        tipo === 'RUC' && (r.estado || r.condicion)
          ? ` · ${[r.estado, r.condicion].filter(Boolean).join(' / ')}`
          : '';
      setConsultaInfo(`${tipo === 'DNI' ? 'RENIEC' : 'SUNAT'}: ${r.nombre}${extra}`);
    } catch (e) {
      notify(errorMessage(e, 'No se pudo consultar'), 'error');
    } finally {
      setConsultando(false);
    }
  };

  const load = async (q = search, todos = showInactive) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('buscar', q.trim());
    if (todos) params.set('todos', 'true');
    const qs = params.toString();
    setItems(await http.get<Client[]>(`/clientes${qs ? `?${qs}` : ''}`));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  const openNew = () => {
    setForm(emptyForm);
    setConsultaInfo(null);
    setModalOpen(true);
  };

  const openEdit = (c: Client) => {
    setForm({
      id: c.id,
      tipoDocumento: c.tipoDocumento,
      numeroDocumento: c.numeroDocumento,
      nombre: c.nombre,
      contacto: c.contacto ?? '',
      correo: c.correo,
      telefono: c.telefono,
      direccion: c.direccion ?? '',
    });
    setConsultaInfo(null);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.numeroDocumento || !form.nombre || !form.correo || !form.telefono) {
      return notify('Completa los campos obligatorios', 'error');
    }
    setSaving(true);
    const payload = {
      tipoDocumento: form.tipoDocumento,
      numeroDocumento: form.numeroDocumento.trim(),
      nombre: form.nombre.trim(),
      contacto: form.contacto.trim() || null,
      correo: form.correo.trim(),
      telefono: form.telefono.trim(),
      direccion: form.direccion.trim() || undefined,
    };
    try {
      if (form.id) {
        await http.patch(`/clientes/${form.id}`, payload);
        notify('Cliente actualizado', 'success');
      } else {
        await http.post('/clientes', payload);
        notify('Cliente registrado', 'success');
      }
      setModalOpen(false);
      load();
    } catch (e) {
      notify(errorMessage(e, 'No se pudo guardar el cliente'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await http.del(`/clientes/${toDelete.id}`);
      notify('Cliente deshabilitado', 'success');
      load();
    } catch (e) {
      notify(errorMessage(e, 'No se pudo deshabilitar'), 'error');
    } finally {
      setToDelete(null);
    }
  };

  const reactivate = async (c: Client) => {
    try {
      await http.patch(`/clientes/${c.id}`, { estado: true });
      notify('Cliente reactivado', 'success');
      load();
    } catch (e) {
      notify(errorMessage(e, 'No se pudo reactivar'), 'error');
    }
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const tipoLabel = (t: TipoDocumento) => TIPOS.find((x) => x.value === t)?.label ?? t;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Empresas y personas a quienes se remiten documentos y cotizaciones
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openNew}>
            <UserPlus className="h-4 w-4" />
            Nuevo cliente
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
              placeholder="Buscar por nombre, documento o correo…"
              icon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>
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
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3 font-semibold">Cliente</th>
                <th className="px-3 py-3 font-semibold">Documento</th>
                <th className="px-3 py-3 font-semibold">Contacto</th>
                <th className="px-3 py-3 font-semibold">Dirección</th>
                {isAdmin && <th className="px-3 py-3 text-right font-semibold">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr
                  key={c.id}
                  className={cn(
                    'border-b border-border/60 transition-colors hover:bg-muted/50',
                    !c.estado && 'opacity-60',
                  )}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{c.nombre}</p>
                        {!c.estado && (
                          <span className="text-xs font-semibold text-destructive">Deshabilitado</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    <p className="text-xs">{tipoLabel(c.tipoDocumento)}</p>
                    <p className="font-mono text-foreground">{c.numeroDocumento}</p>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> {c.correo}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> {c.telefono}
                      {c.telefono && (
                        <a
                          href={whatsappUrl(c.telefono, `Estimado(a) ${c.contacto || c.nombre}, le saludamos cordialmente.`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Escribir por WhatsApp"
                          onClick={(e) => e.stopPropagation()}
                          className="ml-1 rounded-md p-0.5 text-success hover:bg-success-soft"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {c.direccion ? (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {c.direccion}
                      </p>
                    ) : (
                      '—'
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          title="Editar"
                          className="rounded-lg p-1.5 hover:bg-muted"
                        >
                          <Pencil className="h-4 w-4 text-primary" />
                        </button>
                        {c.estado ? (
                          <button
                            onClick={() => setToDelete(c)}
                            title="Deshabilitar"
                            className="rounded-lg p-1.5 hover:bg-muted"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        ) : (
                          <button
                            onClick={() => reactivate(c)}
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
                  <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No hay clientes registrados.
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
        title={form.id ? 'Editar cliente' : 'Nuevo cliente'}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Tipo de documento
            </label>
            <select
              value={form.tipoDocumento}
              onChange={set('tipoDocumento')}
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary"
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-end gap-2">
              <Input
                label="Número de documento"
                placeholder={form.tipoDocumento === 'RUC' ? '20123456789' : '12345678'}
                value={form.numeroDocumento}
                onChange={set('numeroDocumento')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    consultar();
                  }
                }}
              />
              {(form.tipoDocumento === 'DNI' || form.tipoDocumento === 'RUC') && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={consultar}
                  loading={consultando}
                  disabled={!puedeConsultar(form.tipoDocumento, form.numeroDocumento)}
                  title={form.tipoDocumento === 'DNI' ? 'Consultar en RENIEC' : 'Consultar en SUNAT'}
                >
                  <SearchCheck className="h-4 w-4" />
                  {form.tipoDocumento === 'DNI' ? 'RENIEC' : 'SUNAT'}
                </Button>
              )}
            </div>
            {consultaInfo && <p className="mt-1 text-xs text-success">{consultaInfo}</p>}
          </div>
          <div className="sm:col-span-2">
            <Input
              label={form.tipoDocumento === 'RUC' ? 'Razón social' : 'Nombre completo'}
              value={form.nombre}
              onChange={set('nombre')}
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              label="Persona de contacto (opcional)"
              placeholder="Ej: Ing. Juan Pérez, jefe de calidad"
              value={form.contacto}
              onChange={set('contacto')}
            />
          </div>
          <Input label="Correo" type="email" value={form.correo} onChange={set('correo')} />
          <Input label="Teléfono" value={form.telefono} onChange={set('telefono')} />
          <div className="sm:col-span-2">
            <Input
              label="Dirección (opcional)"
              value={form.direccion}
              onChange={set('direccion')}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={save} loading={saving}>
            Guardar
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Deshabilitar cliente"
        confirmText="Deshabilitar"
        message={`¿Deshabilitar a "${toDelete?.nombre}"? Sus documentos y cotizaciones se conservan; podrás reactivarlo después.`}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
