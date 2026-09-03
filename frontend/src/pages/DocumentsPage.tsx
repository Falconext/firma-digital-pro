/**
 * Página de documentos: el corazón de la plataforma.
 * Gestor documental con CARPETAS ANIDADAS: navega por carpetas (migas de pan),
 * crea/renombra/elimina carpetas, sube PDFs dentro de la carpeta actual, mueve
 * documentos entre carpetas, y firma con ReFirma.
 */
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  UploadCloud,
  Eye,
  Trash2,
  PenLine,
  Download,
  FileText,
  Mail,
  Folder,
  FolderPlus,
  FolderInput,
  Pencil,
  ChevronRight,
  Home,
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react';
import { http } from '@/lib/api';
import { signWithRefirma } from '@/lib/refirma';
import { validateSignature, uploadSignedVersion } from '@/lib/signature';
import { fileToBase64, formatDate } from '@/lib/utils';
import type {
  Carpeta,
  DocumentItem,
  FolderContents,
  Signatory,
  ValidationResult,
} from '@/types';
import { useUIStore } from '@/stores/ui.store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/Badge';
import { SignatureResult } from '@/components/ui/SignatureResult';

export function DocumentsPage() {
  const notify = useUIStore((s) => s.notify);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Navegación por carpetas ---
  const [folderId, setFolderId] = useState<number | null>(null); // null = raíz
  const [breadcrumb, setBreadcrumb] = useState<{ id: number; nombre: string }[]>([]);
  const [subcarpetas, setSubcarpetas] = useState<Carpeta[]>([]);

  // Estado de los modales
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewer, setViewer] = useState<{ open: boolean; src: string; name: string }>(
    { open: false, src: '', name: '' },
  );
  const [toDelete, setToDelete] = useState<DocumentItem | null>(null);
  const [signingId, setSigningId] = useState<number | null>(null);

  // Carpetas: crear / renombrar / eliminar / mover
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState<Carpeta | null>(null);
  const [renameName, setRenameName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<Carpeta | null>(null);
  const [moveTarget, setMoveTarget] = useState<DocumentItem | null>(null);
  const [moveFolderId, setMoveFolderId] = useState<number | ''>('');
  const [allFolders, setAllFolders] = useState<{ id: number; nombre: string; nivel: number }[]>([]);

  // Envío por correo al cliente (paso 6.7)
  const [emailTarget, setEmailTarget] = useState<DocumentItem | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailNombre, setEmailNombre] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Flujo (1): validador de firmas (standalone, como firmaperu.gob.pe)
  const [validateOpen, setValidateOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validateResult, setValidateResult] = useState<ValidationResult | null>(null);
  const [validateName, setValidateName] = useState('');
  const validateRef = useRef<HTMLInputElement>(null);

  // Flujo (1): re-subida de la versión ya firmada de un documento
  const [signedTarget, setSignedTarget] = useState<DocumentItem | null>(null);
  const [uploadingSigned, setUploadingSigned] = useState(false);
  const [signedResult, setSignedResult] = useState<ValidationResult | null>(null);
  const [signedName, setSignedName] = useState('');
  const signedRef = useRef<HTMLInputElement>(null);

  // Formulario de subida
  const [fileName, setFileName] = useState('');
  const [signatoryId, setSignatoryId] = useState<number | ''>('');
  const [base64, setBase64] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const searching = search.trim().length > 0;

  // --- Cargar contenido de la carpeta actual (o resultados de búsqueda) ---
  const loadContents = async (fid = folderId, value = search) => {
    setLoading(true);
    try {
      if (value.trim()) {
        // Modo búsqueda: documentos de TODAS las carpetas por nombre.
        const list = await http.get<DocumentItem[]>(
          `/file/listar?archivo=${encodeURIComponent(value.trim())}`,
        );
        setDocuments(list);
        setSubcarpetas([]);
        setBreadcrumb([]);
      } else {
        // Modo navegación: subcarpetas + documentos de la carpeta actual.
        const data = await http.get<FolderContents>(
          `/carpeta/contenido${fid != null ? `?padre=${fid}` : ''}`,
        );
        setSubcarpetas(data.subcarpetas);
        setDocuments(data.documentos);
        setBreadcrumb(data.breadcrumb);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    http.get<Signatory[]>('/firmante').then(setSignatories);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => loadContents(folderId, search), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, folderId]);

  const openFolder = (id: number | null) => {
    setSearch('');
    setFolderId(id);
  };

  // --- Carpetas: crear ---
  const submitNewFolder = async () => {
    if (!newFolderName.trim()) return notify('Escribe el nombre de la carpeta', 'error');
    try {
      await http.post('/carpeta', {
        nombre: newFolderName.trim(),
        parentId: folderId,
      });
      notify('Carpeta creada', 'success');
      setNewFolderOpen(false);
      setNewFolderName('');
      loadContents();
    } catch {
      notify('No se pudo crear la carpeta', 'error');
    }
  };

  // --- Carpetas: renombrar ---
  const submitRename = async () => {
    if (!renameTarget) return;
    if (!renameName.trim()) return notify('Escribe el nuevo nombre', 'error');
    try {
      await http.patch(`/carpeta/${renameTarget.id}`, { nombre: renameName.trim() });
      notify('Carpeta renombrada', 'success');
      setRenameTarget(null);
      loadContents();
    } catch {
      notify('No se pudo renombrar', 'error');
    }
  };

  // --- Carpetas: eliminar ---
  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      await http.del(`/carpeta/${folderToDelete.id}`);
      notify('Carpeta eliminada (los documentos volvieron a la raíz)', 'success');
      loadContents();
    } catch {
      notify('No se pudo eliminar la carpeta', 'error');
    } finally {
      setFolderToDelete(null);
    }
  };

  // --- Documentos: mover a otra carpeta ---
  const openMove = async (doc: DocumentItem) => {
    setMoveTarget(doc);
    setMoveFolderId(doc.folderId ?? '');
    // Cargamos el árbol completo y lo aplanamos para el selector.
    const tree = await http.get<Carpeta[]>('/carpeta/arbol');
    const flat: { id: number; nombre: string; nivel: number }[] = [];
    const walk = (nodos: Carpeta[], nivel: number) => {
      nodos.forEach((n) => {
        flat.push({ id: n.id, nombre: n.nombre, nivel });
        if (n.hijos?.length) walk(n.hijos, nivel + 1);
      });
    };
    walk(tree, 0);
    setAllFolders(flat);
  };

  const submitMove = async () => {
    if (!moveTarget) return;
    try {
      await http.patch(`/file/${moveTarget.id}`, {
        folderId: moveFolderId === '' ? null : Number(moveFolderId),
      });
      notify('Documento movido', 'success');
      setMoveTarget(null);
      loadContents();
    } catch {
      notify('No se pudo mover el documento', 'error');
    }
  };

  // --- Subir documento ---
  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      notify('Solo se permiten archivos PDF', 'error');
      return;
    }
    setSelectedName(file.name);
    if (!fileName) setFileName(file.name.replace(/\.pdf$/i, ''));
    setBase64(await fileToBase64(file));
  };

  const resetUploadForm = () => {
    setFileName('');
    setSignatoryId('');
    setBase64('');
    setSelectedName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const submitUpload = async () => {
    if (!fileName.trim()) return notify('Ingresa el concepto del documento', 'error');
    if (!signatoryId) return notify('Selecciona el firmante autorizado', 'error');
    if (!base64) return notify('Selecciona un archivo PDF', 'error');
    setLoading(true);
    try {
      await http.post('/file/create-new', {
        fileName: fileName.trim(),
        base64File: base64,
        signatoryId,
        folderId, // se guarda dentro de la carpeta abierta (null = raíz)
      });
      notify('Documento subido y sellado con código QR', 'success');
      setUploadOpen(false);
      resetUploadForm();
      loadContents();
    } catch {
      notify('No se pudo subir el documento', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- Ver documento ---
  const viewDocument = async (doc: DocumentItem) => {
    const res = await http.get<{ base64File: string }>(`/file/${doc.id}/contenido`);
    // Convertimos el PDF (base64) a un "Blob URL": es más confiable que incrustar
    // un data:URI gigante dentro del iframe (Chrome a veces lo bloquea).
    const b64 = res.base64File.replace(/^data:application\/pdf;base64,/, '');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    setViewer({ open: true, src: blobUrl, name: doc.fileName });
  };

  // --- Descargar documento ---
  // Usamos el cliente `http` (que adjunta el token JWT) en vez de un enlace
  // directo <a href>, porque la navegación normal del navegador NO envía la
  // cabecera Authorization y el backend responde 401 Unauthorized.
  const downloadDocument = async (doc: DocumentItem) => {
    try {
      const res = await http.get<{ base64File: string }>(`/file/${doc.id}/contenido`);
      const b64 = res.base64File.replace(/^data:application\/pdf;base64,/, '');
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${doc.fileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      notify('No se pudo descargar el documento.', 'error');
    }
  };

  // Libera la memoria del Blob URL al cerrar el visor
  const closeViewer = () => {
    if (viewer.src.startsWith('blob:')) URL.revokeObjectURL(viewer.src);
    setViewer({ open: false, src: '', name: '' });
  };

  // --- Firmar con ReFirma ---
  const signDocument = async (doc: DocumentItem) => {
    setSigningId(doc.id);
    try {
      await signWithRefirma(doc.id, (msg) => notify(msg, 'info'));
      notify('Documento firmado con ReFirma', 'success');
      loadContents();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Error al firmar', 'error');
    } finally {
      setSigningId(null);
    }
  };

  // --- Enviar por correo al cliente (paso 6.7) ---
  const openEmailModal = (doc: DocumentItem) => {
    setEmailTarget(doc);
    setEmailTo(doc.clienteEmail ?? '');
    setEmailNombre(doc.clienteNombre ?? '');
  };

  const submitEmail = async () => {
    if (!emailTarget) return;
    if (!emailTo.trim()) return notify('Ingresa el correo del cliente', 'error');
    setSendingEmail(true);
    try {
      await http.post(`/file/${emailTarget.id}/enviar-correo`, {
        email: emailTo.trim(),
        clienteNombre: emailNombre.trim() || undefined,
      });
      notify('Documento enviado al cliente por correo', 'success');
      setEmailTarget(null);
      loadContents();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'No se pudo enviar el correo', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  // --- Flujo (1): validar un PDF cualquiera (standalone) ---
  const onValidateFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') return notify('Solo se permiten archivos PDF', 'error');
    setValidateName(file.name);
    setValidateResult(null);
    setValidating(true);
    try {
      const base64 = await fileToBase64(file);
      setValidateResult(await validateSignature(base64));
    } catch {
      notify('No se pudo validar el documento', 'error');
    } finally {
      setValidating(false);
      if (validateRef.current) validateRef.current.value = '';
    }
  };

  const openValidate = () => {
    setValidateResult(null);
    setValidateName('');
    setValidateOpen(true);
  };

  // --- Flujo (1): subir la versión ya firmada de un documento ---
  const onSignedFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !signedTarget) return;
    if (file.type !== 'application/pdf') return notify('Solo se permiten archivos PDF', 'error');
    setSignedName(file.name);
    setSignedResult(null);
    setUploadingSigned(true);
    try {
      const base64 = await fileToBase64(file);
      const { validation } = await uploadSignedVersion(signedTarget.id, base64);
      setSignedResult(validation);
      notify('Firma válida: documento marcado como FIRMADO', 'success');
      loadContents();
    } catch (err) {
      // El backend rechaza PDFs sin firma o alterados con un mensaje claro.
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'No se pudo validar la firma del documento';
      notify(msg, 'error');
    } finally {
      setUploadingSigned(false);
      if (signedRef.current) signedRef.current.value = '';
    }
  };

  const openSignedUpload = (doc: DocumentItem) => {
    setSignedTarget(doc);
    setSignedResult(null);
    setSignedName('');
  };

  // --- Eliminar documento ---
  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await http.del(`/file/${toDelete.id}`);
      notify('Documento eliminado', 'success');
      loadContents();
    } catch {
      notify('No se pudo eliminar', 'error');
    } finally {
      setToDelete(null);
    }
  };

  const rows = useMemo(() => documents, [documents]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Documentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Organiza en carpetas, sube, firma y gestiona tus documentos PDF
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openValidate}>
            <ShieldCheck className="h-4 w-4" />
            Validar firma
          </Button>
          <Button variant="outline" onClick={() => { setNewFolderName(''); setNewFolderOpen(true); }}>
            <FolderPlus className="h-4 w-4" />
            Nueva carpeta
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <UploadCloud className="h-4 w-4" />
            Subir documento
          </Button>
        </div>
      </div>

      <Card className="p-4">
        {/* Migas de pan + búsqueda */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            <button
              onClick={() => openFolder(null)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-foreground hover:bg-muted"
            >
              <Home className="h-4 w-4 text-primary" />
              Inicio
            </button>
            {breadcrumb.map((b, i) => (
              <span key={b.id} className="flex items-center gap-1">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <button
                  onClick={() => openFolder(b.id)}
                  className={`rounded-lg px-2 py-1 hover:bg-muted ${
                    i === breadcrumb.length - 1
                      ? 'font-semibold text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {b.nombre}
                </button>
              </span>
            ))}
            {searching && (
              <span className="ml-1 text-muted-foreground">· resultados de búsqueda</span>
            )}
          </nav>

          <div className="w-full max-w-xs">
            <Input
              placeholder="Buscar por concepto…"
              icon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Subcarpetas (solo en modo navegación) */}
        {!searching && subcarpetas.length > 0 && (
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subcarpetas.map((c) => (
              <div
                key={c.id}
                className="group flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:border-primary hover:bg-muted/60"
              >
                <button
                  onClick={() => openFolder(c.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Folder className="h-8 w-8 shrink-0 text-primary" fill="currentColor" fillOpacity={0.15} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{c.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {(c._count?.hijos ?? 0)} carpeta(s) · {(c._count?.documents ?? 0)} doc.
                    </p>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <IconButton
                    title="Renombrar carpeta"
                    onClick={() => { setRenameTarget(c); setRenameName(c.nombre); }}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </IconButton>
                  <IconButton title="Eliminar carpeta" onClick={() => setFolderToDelete(c)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabla de documentos */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-3 font-semibold">Concepto</th>
                <th className="px-3 py-3 font-semibold">Firmante</th>
                <th className="px-3 py-3 font-semibold">Estado</th>
                <th className="px-3 py-3 font-semibold">Fecha</th>
                <th className="px-3 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-border/60 transition-colors hover:bg-muted/50"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <FileText className="h-4 w-4 text-primary" />
                      {doc.fileName}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {doc.signatory?.nombre ?? '—'}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {(doc.status === 'PENDIENTE' || doc.status === 'SELLADO') && (
                        <>
                          <IconButton
                            title="Firmar con ReFirma"
                            onClick={() => signDocument(doc)}
                            loading={signingId === doc.id}
                          >
                            <PenLine className="h-4 w-4 text-accent" />
                          </IconButton>
                          <IconButton
                            title="Subir versión firmada (validar firma real)"
                            onClick={() => openSignedUpload(doc)}
                          >
                            <BadgeCheck className="h-4 w-4 text-green-600" />
                          </IconButton>
                        </>
                      )}
                      {doc.status === 'FIRMADO' && (
                        <IconButton
                          title="Enviar al cliente por correo"
                          onClick={() => openEmailModal(doc)}
                        >
                          <Mail className="h-4 w-4 text-accent" />
                        </IconButton>
                      )}
                      <IconButton title="Mover a carpeta" onClick={() => openMove(doc)}>
                        <FolderInput className="h-4 w-4 text-muted-foreground" />
                      </IconButton>
                      <IconButton title="Ver documento" onClick={() => viewDocument(doc)}>
                        <Eye className="h-4 w-4 text-primary" />
                      </IconButton>
                      <IconButton title="Descargar" onClick={() => downloadDocument(doc)}>
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </IconButton>
                      <IconButton title="Eliminar" onClick={() => setToDelete(doc)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center text-muted-foreground">
                    {loading
                      ? 'Cargando…'
                      : !searching && subcarpetas.length > 0
                        ? 'Esta carpeta no tiene documentos (solo subcarpetas).'
                        : 'No hay documentos que mostrar.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: subir documento */}
      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Subir documento"
        size="md"
      >
        <div className="space-y-4">
          {breadcrumb.length > 0 && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Se guardará en: <strong className="text-foreground">{breadcrumb.map((b) => b.nombre).join(' › ')}</strong>
            </p>
          )}
          <Input
            label="Concepto del documento"
            placeholder="Ej: Certificado de inspección N° 001"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Firmante autorizado
            </label>
            <select
              value={signatoryId}
              onChange={(e) => setSignatoryId(e.target.value ? Number(e.target.value) : '')}
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary"
            >
              <option value="">Seleccionar…</option>
              {signatories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} — {s.cargo}
                </option>
              ))}
            </select>
          </div>

          {/* Zona de carga de archivo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Archivo PDF
            </label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors hover:border-primary"
            >
              <UploadCloud className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {selectedName || 'Haz clic para seleccionar un PDF'}
              </span>
              <span className="text-xs text-muted-foreground">Máximo 10 MB</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitUpload} loading={loading}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: nueva carpeta */}
      <Modal open={newFolderOpen} onClose={() => setNewFolderOpen(false)} title="Nueva carpeta" size="sm">
        <div className="space-y-4">
          {breadcrumb.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Se creará dentro de: <strong className="text-foreground">{breadcrumb.map((b) => b.nombre).join(' › ')}</strong>
            </p>
          )}
          <Input
            label="Nombre de la carpeta"
            placeholder="Ej: Reportes 2025"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitNewFolder()}
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>Cancelar</Button>
            <Button onClick={submitNewFolder}>Crear</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: renombrar carpeta */}
      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title="Renombrar carpeta" size="sm">
        <div className="space-y-4">
          <Input
            label="Nuevo nombre"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitRename()}
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancelar</Button>
            <Button onClick={submitRename}>Guardar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: mover documento a carpeta */}
      <Modal open={!!moveTarget} onClose={() => setMoveTarget(null)} title="Mover a carpeta" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Mover <strong className="text-foreground">{moveTarget?.fileName}</strong> a:
          </p>
          <select
            value={moveFolderId}
            onChange={(e) => setMoveFolderId(e.target.value ? Number(e.target.value) : '')}
            className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus:border-primary"
          >
            <option value="">📁 Inicio (raíz)</option>
            {allFolders.map((f) => (
              <option key={f.id} value={f.id}>
                {'  '.repeat(f.nivel)}📁 {f.nombre}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setMoveTarget(null)}>Cancelar</Button>
            <Button onClick={submitMove}>Mover</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: visor de PDF */}
      <Modal
        open={viewer.open}
        onClose={closeViewer}
        title={viewer.name}
        size="xl"
      >
        {viewer.src && (
          <iframe
            src={viewer.src}
            title={viewer.name}
            className="h-[70vh] w-full rounded-lg border border-border"
          />
        )}
      </Modal>

      {/* Modal: enviar documento firmado al cliente por correo */}
      <Modal
        open={!!emailTarget}
        onClose={() => setEmailTarget(null)}
        title="Enviar al cliente por correo"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se enviará <strong>{emailTarget?.fileName}</strong> (firmado) como adjunto PDF.
          </p>
          <Input
            label="Correo del cliente"
            type="email"
            placeholder="cliente@empresa.com"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
          />
          <Input
            label="Nombre del cliente (opcional)"
            placeholder="Ej: Juan Pérez"
            value={emailNombre}
            onChange={(e) => setEmailNombre(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEmailTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={submitEmail} loading={sendingEmail}>
              Enviar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: validador de firmas (standalone, como firmaperu.gob.pe) */}
      <Modal
        open={validateOpen}
        onClose={() => setValidateOpen(false)}
        title="Validar firma digital"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sube cualquier PDF para comprobar si tiene una firma digital embebida
            válida y ver los datos del firmante. Equivale al validador oficial de
            firmaperu.gob.pe (verifica la firma y la integridad del documento).
          </p>
          <button
            type="button"
            onClick={() => validateRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors hover:border-primary"
          >
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {validateName || 'Haz clic para seleccionar un PDF'}
            </span>
            <span className="text-xs text-muted-foreground">Se valida al seleccionar</span>
          </button>
          <input
            ref={validateRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onValidateFile}
          />
          {validating && (
            <p className="text-center text-sm text-muted-foreground">Validando firma…</p>
          )}
          {validateResult && <SignatureResult result={validateResult} />}
        </div>
      </Modal>

      {/* Modal: subir la versión ya firmada de un documento (flujo 1) */}
      <Modal
        open={!!signedTarget}
        onClose={() => setSignedTarget(null)}
        title="Subir versión firmada"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sube el PDF de <strong className="text-foreground">{signedTarget?.fileName}</strong>{' '}
            ya firmado con tu certificado (DNIe/token) en ReFirma. Se validará la
            firma antes de aceptarla; si es real y el documento no fue alterado,
            quedará marcado como <strong>FIRMADO</strong>.
          </p>
          <button
            type="button"
            onClick={() => signedRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors hover:border-primary"
          >
            <BadgeCheck className="h-8 w-8 text-green-600" />
            <span className="text-sm font-medium text-foreground">
              {signedName || 'Haz clic para seleccionar el PDF firmado'}
            </span>
            <span className="text-xs text-muted-foreground">Debe tener firma digital embebida</span>
          </button>
          <input
            ref={signedRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={onSignedFile}
          />
          {uploadingSigned && (
            <p className="text-center text-sm text-muted-foreground">Validando firma…</p>
          )}
          {signedResult && <SignatureResult result={signedResult} />}
          <div className="flex justify-end pt-1">
            <Button variant="outline" onClick={() => setSignedTarget(null)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmación de eliminación de documento */}
      <ConfirmDialog
        open={!!toDelete}
        message={`¿Seguro que deseas eliminar "${toDelete?.fileName}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />

      {/* Confirmación de eliminación de carpeta */}
      <ConfirmDialog
        open={!!folderToDelete}
        message={`¿Eliminar la carpeta "${folderToDelete?.nombre}" y sus subcarpetas? Los documentos que contenga NO se borran: volverán a la raíz.`}
        onConfirm={confirmDeleteFolder}
        onClose={() => setFolderToDelete(null)}
      />
    </div>
  );
}

/** Botón de ícono cuadrado para las acciones de la tabla. */
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
