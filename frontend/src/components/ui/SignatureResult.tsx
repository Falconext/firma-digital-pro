/**
 * Muestra el veredicto de validar una firma digital (como firmaperu.gob.pe):
 * si el PDF tiene firma embebida, si es válida, y los datos de cada firmante.
 */
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import type { ValidationResult } from '@/types';
import { formatDate } from '@/lib/utils';

export function SignatureResult({ result }: { result: ValidationResult }) {
  const ok = result.valid;
  const tone = !result.hasSignature
    ? 'neutral'
    : ok
      ? 'ok'
      : 'bad';

  const box = {
    ok: 'border-green-200 bg-green-50 text-green-800',
    bad: 'border-red-200 bg-red-50 text-red-800',
    neutral: 'border-amber-200 bg-amber-50 text-amber-800',
  }[tone];

  const Icon = tone === 'ok' ? ShieldCheck : tone === 'bad' ? ShieldX : ShieldAlert;

  return (
    <div className="space-y-3">
      <div className={`flex items-start gap-3 rounded-xl border p-3 ${box}`}>
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{result.summary}</p>
      </div>

      {result.signatures.map((s, i) => (
        <div key={i} className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-foreground">
              Firma #{i + 1}
              {s.subFilter ? ` · ${s.subFilter}` : ''}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                s.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {s.valid ? 'Válida' : 'No válida'}
            </span>
          </div>

          {s.error ? (
            <p className="text-xs text-red-600">No se pudo procesar: {s.error}</p>
          ) : (
            <>
              <dl className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                <Row label="Firmante" value={s.signerName} />
                <Row label="DNI" value={s.signerDni} />
                <Row label="Emitido por" value={s.issuer} />
                {s.signingTime && <Row label="Fecha de firma" value={formatDate(s.signingTime)} />}
                <Row
                  label="Vigencia cert."
                  value={`${formatDate(s.certValidFrom)} → ${formatDate(s.certValidTo)}`}
                />
              </dl>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Check ok={s.cryptoValid} label="Firma auténtica" />
                <Check ok={s.contentIntact} label="Contenido íntegro" />
                <Check ok={s.coversWholeDoc} label="Cubre todo el documento" />
                <Check ok={!s.certExpired} label={s.certExpired ? 'Certificado expirado' : 'Certificado vigente'} />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <>
      <dt className="col-span-1 text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words font-medium text-foreground">{value || '—'}</dd>
    </>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {ok ? '✓' : '✕'} {label}
    </span>
  );
}
