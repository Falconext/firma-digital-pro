/**
 * Página de inicio de sesión.
 * Diseño de dos columnas: panel de marca (izquierda, petróleo oscuro con
 * "burbujas" que evocan el matraz del logo) + formulario (derecha, claro,
 * con el logotipo de LENA).
 */
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, FileSignature, FlaskConical, Receipt } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const features = [
  {
    icon: FileSignature,
    title: 'Firma digital con validez legal',
    text: 'Integrada con ReFirma (RENIEC): certificados del DNIe y token.',
  },
  {
    icon: Receipt,
    title: 'Cotizaciones en minutos',
    text: 'Catálogo de ensayos, clientes y PDF listo para enviar por WhatsApp.',
  },
  {
    icon: ShieldCheck,
    title: 'Trazabilidad completa',
    text: 'Cada documento queda registrado, sellado y verificable.',
  },
];

export function LoginPage() {
  const { login, loading } = useAuthStore();
  const notify = useUIStore((s) => s.notify);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* ─── Panel de marca ─────────────────────────────────────────── */}
      <section
        aria-hidden="true"
        className="relative hidden flex-col justify-between overflow-hidden bg-primary-deep p-12 text-white lg:flex xl:p-16"
      >
        {/* Degradado de fondo */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-deep via-primary-deep to-primary" />
        {/* Halo cian y lima (colores del logo) */}
        <div className="absolute -left-40 top-1/3 h-[520px] w-[520px] rounded-full bg-primary-light/20 blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-[380px] w-[380px] rounded-full bg-accent/15 blur-3xl" />
        {/* Burbujas del matraz */}
        <Bubbles />

        <div className="relative z-10 flex items-center gap-3">
          <img src="/lena-logo-white.png" alt="" className="h-[4.5rem] w-auto" />
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/90 backdrop-blur">
            <FlaskConical className="h-3.5 w-3.5 text-accent" />
            Plataforma de gestión del laboratorio
          </p>
          <h1 className="font-heading text-4xl font-bold leading-[1.15] xl:text-[2.75rem]">
            Cotiza, firma y entrega tus
            <span className="text-primary-light"> informes de ensayo </span>
            con respaldo legal.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/75">
            Un solo lugar para clientes, servicios acreditados, cotizaciones y
            documentos firmados digitalmente.
          </p>

          <ul className="mt-10 space-y-5">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10">
                  <Icon className="h-5 w-5 text-primary-light" />
                </span>
                <div>
                  <p className="font-heading text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-sm text-white/65">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/50">
          © {new Date().getFullYear()} LENA · Laboratorio de Evaluación Nutricional de Alimentos
        </p>
      </section>

      {/* ─── Formulario ─────────────────────────────────────────────── */}
      <section className="relative flex items-center justify-center bg-background px-6 py-12">
        {/* Textura sutil de puntos (eco del logo) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(#c9dfe8 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />

        <div className="relative w-full max-w-[400px] animate-fade-in-up">
          <img
            src="/lena-logo.png"
            alt="LENA — Laboratorio de Evaluación Nutricional de Alimentos"
            className="mx-auto mb-8 h-24 w-auto lg:mx-0"
          />

          <div className="rounded-2xl border border-border bg-surface p-8 shadow-soft-lg">
            <div className="mb-7">
              <h2 className="font-heading text-2xl font-bold text-foreground">
                Iniciar sesión
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Ingresa tus credenciales para acceder al panel.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <Input
                label="Correo electrónico"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="nombre@lena.pe"
                icon={<Mail className="h-4 w-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="relative">
                <Input
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  icon={<Lock className="h-4 w-4" />}
                  className="pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-1 top-[30px] flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Ingresar al panel
              </Button>
            </form>
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Conexión segura · Acceso restringido al personal autorizado
          </p>
        </div>
      </section>
    </div>
  );
}

/** Burbujas decorativas que suben, como en el matraz del logotipo. */
function Bubbles() {
  const dots = [
    { x: 72, y: 78, r: 34, o: 0.16, d: 0 },
    { x: 66, y: 60, r: 18, o: 0.22, d: 1.2 },
    { x: 80, y: 52, r: 12, o: 0.28, d: 2.1 },
    { x: 60, y: 40, r: 8, o: 0.3, d: 0.6 },
    { x: 74, y: 30, r: 5, o: 0.35, d: 1.8 },
    { x: 86, y: 68, r: 7, o: 0.25, d: 2.6 },
  ];
  return (
    <div className="absolute inset-0">
      {dots.map((b, i) => (
        <span
          key={i}
          className="absolute animate-float rounded-full bg-primary-light"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: b.r * 2,
            height: b.r * 2,
            opacity: b.o,
            animationDelay: `${b.d}s`,
            animationDuration: `${6 + i * 0.7}s`,
          }}
        />
      ))}
      {/* Acento lima */}
      <span
        className="absolute right-[14%] top-[64%] h-5 w-5 animate-float rounded-full bg-accent"
        style={{ opacity: 0.55, animationDelay: '1.4s', animationDuration: '7.5s' }}
      />
    </div>
  );
}
