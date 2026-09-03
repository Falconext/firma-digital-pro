/**
 * Página de firmantes: administra las personas que firman documentos.
 * Reemplaza el arreglo "quemado" del proyecto original por datos reales.
 */
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { UserPlus, Pencil, Trash2, IdCard, PenLine, X } from 'lucide-react';
import { http } from '@/lib/api';
import type { Signatory } from '@/types';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type FormState = {
  id?: number;
  nombre: string;
  dni: string;
  cip: string;
  cargo: string;
  empresa: string;
  motivo: string;
  firmaImagen: string; // base64 de la imagen de firma (opcional)
};

const emptyForm: FormState = {
  nombre: '',
  dni: '',
  cip: '',
  cargo: '',
  empresa: '',
  motivo: 'Aprobación de Documento',
  firmaImagen: '',
};

export function SignatoriesPage() {
  const notify = useUIStore((s) => s.notify);
  const isAdmin = useAuthStore((s) => s.user?.rol === 'ADMIN');

  const [items, setItems] = useState<Signatory[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [toDelete, setToDelete] = useState<Signatory | null>(null);
  const [saving, setSaving] = useState(false);
  const firmaRef = useRef<HTMLInputElement>(null);

  const load = () => http.get<Signatory[]>('/firmante').then(setItems);
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s: Signatory) => {
    setForm({
      id: s.id,
      nombre: s.nombre,
      dni: s.dni,
      cip: s.cip ?? '',
      cargo: s.cargo,
      empresa: s.empresa,
      motivo: s.motivo,
      firmaImagen: s.firmaImagen ?? '',
    });
    setModalOpen(true);
  };

  // Carga una imagen PNG/JPG de firma y la convierte a base64 (data URL)
  const onFirmaChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      return notify('La firma debe ser una imagen PNG o JPG', 'error');
    }
    const reader = new FileReader();
    reader.onload = () =>
      setForm((f) => ({ ...f, firmaImagen: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!form.nombre || !form.dni || !form.cargo || !form.empresa) {
      return notify('Completa los campos obligatorios', 'error');
    }
    setSaving(true);
    try {
      if (form.id) {
        await http.patch(`/firmante/${form.id}`, form);
        notify('Firmante actualizado', 'success');
      } else {
        await http.post('/firmante', form);
        notify('Firmante agregado', 'success');
      }
      setModalOpen(false);
      load();
    } catch {
      notify('No se pudo guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await http.del(`/firmante/${toDelete.id}`);
      notify('Firmante eliminado', 'success');
      load();
    } catch {
      notify('No se pudo eliminar', 'error');
    } finally {
      setToDelete(null);
    }
  };

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Firmantes</h1>
          <p className="text-sm text-muted-foreground">
            Personas autorizadas a firmar documentos
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openNew}>
            <UserPlus className="h-4 w-4" />
            Nuevo firmante
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 font-semibold text-primary">
                {s.nombre[0]}
              </div>
              {isAdmin && (
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(s)}
                    title="Editar"
                    className="rounded-lg p-1.5 hover:bg-muted"
                  >
                    <Pencil className="h-4 w-4 text-primary" />
                  </button>
                  <button
                    onClick={() => setToDelete(s)}
                    title="Eliminar"
                    className="rounded-lg p-1.5 hover:bg-muted"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              )}
            </div>
            <h3 className="font-semibold text-foreground">{s.nombre}</h3>
            <p className="text-sm text-muted-foreground">{s.cargo}</p>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <IdCard className="h-3.5 w-3.5" /> DNI: {s.dni}
                {s.cip ? ` · CIP: ${s.cip}` : ''}
              </p>
              <p className="truncate">{s.empresa}</p>
            </div>
            {s.firmaImagen && (
              <img
                src={s.firmaImagen}
                alt={`Firma de ${s.nombre}`}
                className="mt-3 h-12 w-auto rounded border border-border bg-white object-contain p-1"
              />
            )}
          </Card>
        ))}
        {!items.length && (
          <p className="text-sm text-muted-foreground">Aún no hay firmantes.</p>
        )}
      </div>

      {/* Modal alta/edición */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Editar firmante' : 'Nuevo firmante'}
        size="md"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Nombre completo" value={form.nombre} onChange={set('nombre')} />
          </div>
          <Input label="DNI / RUC" value={form.dni} onChange={set('dni')} />
          <Input label="CIP (opcional)" value={form.cip} onChange={set('cip')} />
          <Input label="Cargo" value={form.cargo} onChange={set('cargo')} />
          <Input label="Empresa" value={form.empresa} onChange={set('empresa')} />
          <div className="sm:col-span-2">
            <Input label="Motivo de firma" value={form.motivo} onChange={set('motivo')} />
          </div>

          {/* Imagen de la firma manuscrita (opcional) */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Imagen de la firma (PNG/JPG, opcional)
            </label>
            {form.firmaImagen ? (
              <div className="flex items-center gap-4 rounded-xl border border-border p-3">
                <img
                  src={form.firmaImagen}
                  alt="Firma"
                  className="h-16 w-auto rounded bg-white object-contain"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, firmaImagen: '' }))}
                  className="flex items-center gap-1 text-sm text-destructive hover:underline"
                >
                  <X className="h-4 w-4" /> Quitar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => firmaRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-primary"
              >
                <PenLine className="h-5 w-5 text-primary" />
                Subir imagen de la rúbrica
              </button>
            )}
            <input
              ref={firmaRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={onFirmaChange}
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
        message={`¿Eliminar al firmante "${toDelete?.nombre}"?`}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
