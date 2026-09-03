/**
 * Componente raíz: define las rutas de la aplicación.
 * - /login es pública.
 * - El resto están protegidas y usan el layout del panel.
 */
import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Toaster } from '@/components/ui/Toaster';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { SignatoriesPage } from '@/pages/SignatoriesPage';

export default function App() {
  const restore = useAuthStore((s) => s.restore);
  const [ready, setReady] = useState(false);

  // Al abrir la app, intenta restaurar la sesión con el token guardado.
  useEffect(() => {
    restore().finally(() => setReady(true));
  }, [restore]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/documentos"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DocumentsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/firmantes"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SignatoriesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
