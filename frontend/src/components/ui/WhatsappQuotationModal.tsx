/**
 * Modal "Enviar cotización por WhatsApp".
 * No usa la API de WhatsApp: abre wa.me con el mensaje redactado (incluye un
 * enlace público al PDF) y, al confirmar, registra el envío en el backend
 * (la cotización pasa a ENVIADA). Se usa en el listado y en el editor.
 */
import { useEffect, useState } from 'react';
import { ExternalLink, MessageCircle } from 'lucide-react';
import { http } from '@/lib/api';
import { useUIStore } from '@/stores/ui.store';
import { errorMessage, formatMoney, whatsappUrl } from '@/lib/utils';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

interface Prefill {
  telefono: string;
  mensaje: string;
  enlace: string;
}

interface Props {
  /** Cotización a enviar; null = modal cerrado. */
  quotation: { id: number; numero: string; total: string | number; moneda: string; estado: string } | null;
  onClose: () => void;
  /** Recibe la cotización actualizada por el backend tras registrar el envío. */
  onSent: <T>(updated: T) => void;
}

export function WhatsappQuotationModal({ quotation, onClose, onSent }: Props) {
  const notify = useUIStore((s) => s.notify);
  const [telefono, setTelefono] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Al abrir, pedir al backend el teléfono del cliente, el texto sugerido y el enlace público.
  useEffect(() => {
    if (!quotation) return;
    let cancelled = false;
    setLoading(true);
    http
      .get<Prefill>(`/cotizaciones/${quotation.id}/whatsapp`)
      .then((p) => {
        if (cancelled) return;
        setTelefono(p.telefono);
        setMensaje(p.mensaje);
      })
      .catch((e) => {
        notify(errorMessage(e, 'No se pudo preparar el mensaje'), 'error');
        onClose();
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotation?.id]);

  const send = async () => {
    if (!quotation) return;
    // window.open debe ir antes del await para que el navegador no lo bloquee como popup.
    window.open(whatsappUrl(telefono, mensaje), '_blank', 'noopener');
    setBusy(true);
    try {
      const updated = await http.post(`/cotizaciones/${quotation.id}/whatsapp`, { telefono });
      onSent(updated);
      notify(`Cotización ${quotation.numero} registrada como enviada por WhatsApp`, 'success');
      onClose();
    } catch (e) {
      notify(errorMessage(e, 'No se pudo registrar el envío'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!quotation} onClose={onClose} title="Enviar cotización por WhatsApp" size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Se abrirá WhatsApp con el mensaje listo para <strong>{quotation?.numero}</strong> por{' '}
          {formatMoney(quotation?.total, quotation?.moneda)}. El mensaje incluye un enlace para descargar el PDF.
          {quotation?.estado === 'BORRADOR' && ' La cotización pasará a estado "Enviada".'}
        </p>
        <Input
          label="WhatsApp del cliente (con código de país)"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="51999999999"
          disabled={loading}
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Mensaje</label>
          <textarea
            rows={8}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={send} loading={busy} disabled={loading || !telefono.trim()}>
            <MessageCircle className="h-4 w-4" /> Abrir WhatsApp <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
