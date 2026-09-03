/**
 * Página de inicio de sesión.
 * Diseño de dos columnas: panel de marca (izquierda) + formulario (derecha).
 */
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, FileSignature, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function LoginPage() {
  const { login, loading } = useAuthStore();
  const notify = useUIStore((s) => s.notify);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      notify('Bienvenido a la plataforma', 'success');
      navigate('/');
    } catch {
      notify('Usuario o contraseña incorrectos', 'error');
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel de marca */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="font-heading text-xl font-bold">Firma Digital Pro</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-heading text-4xl font-bold leading-tight">
            Firma tus documentos con validez legal
          </h1>
          <p className="mt-4 text-white/80">
            Plataforma de firma digital integrada con <strong>ReFirma (RENIEC)</strong>.
            Segura, trazable y con la misma validez que una firma manuscrita.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              'Firma digital PAdES con certificado del DNIe o token',
              'Trazabilidad y auditoría de cada documento',
              'Gestión centralizada de firmantes y documentos',
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 text-white/90">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-300" />
                <span className="text-sm">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/60">
          © {new Date().getFullYear()} Firma Digital Pro
        </p>

        {/* Decoración de fondo */}
        <FileSignature className="absolute -bottom-10 -right-10 h-72 w-72 text-white/5" />
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h2 className="font-heading text-2xl font-bold text-foreground">
              Bienvenido de nuevo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              name="email"
              placeholder="admin@firmadigital.pe"
              icon={<Mail className="h-4 w-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Contraseña"
              type="password"
              name="password"
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Ingresar
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Acceso de prueba: admin@firmadigital.pe / Admin123!
          </p>
        </div>
      </div>
    </div>
  );
}
