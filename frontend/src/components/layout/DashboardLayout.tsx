/**
 * Estructura visual del panel: barra lateral (navegación) + cabecera + contenido.
 * Es responsivo: en móvil la barra lateral se abre/cierra.
 */
import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSignature,
  Users,
  Building2,
  FlaskConical,
  Receipt,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };

/** Navegación agrupada por área de trabajo. */
const sections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Principal',
    items: [
      { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
      { to: '/documentos', label: 'Documentos', icon: FileSignature },
      { to: '/firmantes', label: 'Firmantes', icon: Users },
    ],
  },
  {
    title: 'Comercial',
    items: [
      { to: '/clientes', label: 'Clientes', icon: Building2 },
      { to: '/servicios', label: 'Servicios', icon: FlaskConical },
      { to: '/cotizaciones', label: 'Cotizaciones', icon: Receipt },
    ],
  },
];

const allItems = sections.flatMap((s) => s.items);

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Título de la sección actual (para la cabecera). Ej: /cotizaciones/5 -> Cotizaciones
  const current =
    allItems.find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to))) ?? allItems[0];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = `${user?.nombre?.[0] ?? ''}${user?.apellido?.[0] ?? ''}`.toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Barra superior en móvil */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-primary hover:bg-primary-soft"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      <div className="flex">
        {/* ─── Sidebar ─────────────────────────────────────────────── */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col border-r border-border bg-surface transition-transform duration-300 ease-out',
            'md:sticky md:top-0 md:h-screen md:translate-x-0',
            open ? 'translate-x-0 shadow-soft-lg' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between px-6 pb-4 pt-6">
            <Brand />
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-4 pt-2" aria-label="Navegación principal">
            {sections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                  {section.title}
                </p>
                <ul className="space-y-1">
                  {section.items.map(({ to, label, icon: Icon, end }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={end}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200',
                            isActive
                              ? 'bg-primary-soft text-primary'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {/* Indicador lateral cian en el ítem activo */}
                            <span
                              className={cn(
                                'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-light transition-opacity',
                                isActive ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            <Icon
                              className={cn(
                                'h-5 w-5 transition-colors',
                                isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                              )}
                            />
                            <span className="flex-1">{label}</span>
                            <ChevronRight
                              className={cn(
                                'h-4 w-4 text-primary/60 transition-opacity',
                                isActive ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Usuario + cerrar sesión */}
          <div className="border-t border-border p-4">
            <div className="rounded-2xl bg-gradient-to-br from-primary-deep to-primary p-3.5 text-white shadow-soft">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 font-heading text-sm font-bold ring-2 ring-primary-light/70">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {user?.nombre} {user?.apellido}
                  </p>
                  <p className="truncate text-xs text-white/70">
                    {roleLabels[user?.rol ?? ''] ?? user?.rol}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        {/* Fondo oscuro al abrir menú en móvil */}
        {open && (
          <div
            className="fixed inset-0 z-30 bg-primary-deep/50 backdrop-blur-[2px] md:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* ─── Contenido ───────────────────────────────────────────── */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          {/* Cabecera de escritorio */}
          <header className="sticky top-0 z-20 hidden h-16 items-center justify-between border-b border-border bg-surface/80 px-8 backdrop-blur md:flex">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">LENA</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
              <span className="font-semibold text-foreground">{current.label}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground lg:inline-flex">
                <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_0_3px_rgba(185,216,109,0.3)]" />
                {new Date().toLocaleDateString('es-PE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </span>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft font-heading text-xs font-bold text-primary"
                title={`${user?.nombre ?? ''} ${user?.apellido ?? ''}`}
              >
                {initials}
              </div>
            </div>
          </header>

          <main className="flex-1 p-5 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <NavLink to="/" className="flex items-center gap-3" aria-label="Ir al inicio">
      <img src="/lena-mark.png" alt="LENA" className="h-11 w-auto" />
      <span className="sr-only">Laboratorio de Evaluación Nutricional de Alimentos</span>
    </NavLink>
  );
}
