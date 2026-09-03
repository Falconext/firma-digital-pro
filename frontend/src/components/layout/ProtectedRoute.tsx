/**
 * Protege las rutas privadas: si no hay sesión, redirige al login.
 */
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { tokenStore } from '@/lib/api';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  // Hay token guardado o usuario en memoria => dejamos pasar.
  if (!user && !tokenStore.get()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
