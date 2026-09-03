/**
 * Estructura visual del panel: barra lateral (navegación) + contenido.
 * Es responsivo: en móvil la barra lateral se abre/cierra.
 */
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSignature,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/documentos', label: 'Documentos', icon: FileSignature },
  { to: '/firmantes', label: 'Firmantes', icon: Users },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      {/* Barra superior en móvil */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} aria-label="Abrir menú">
          <Menu className="h-6 w-6 text-primary" />
        </button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface transition-transform md:static md:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between px-6 py-5">
            <Brand />
            <button
              className="md:hidden"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-3">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-white shadow-soft'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Usuario + cerrar sesión */}
          <div className="border-t border-border p-3">
            <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                {user?.nombre?.[0] ?? 'U'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {user?.nombre} {user?.apellido}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.rol}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Fondo oscuro al abrir menú en móvil */}
        {open && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Contenido */}
        <main className="min-h-screen flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <span className="font-heading text-lg font-bold text-foreground">
        Firma Digital <span className="text-primary">Pro</span>
      </span>
    </div>
  );
}
