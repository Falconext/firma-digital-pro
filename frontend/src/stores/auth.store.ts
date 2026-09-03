/**
 * Store de autenticación: guarda el usuario logueado y las acciones
 * login / logout / restaurar sesión.
 */
import { create } from 'zustand';
import { http, tokenStore } from '@/lib/api';
import type { User } from '@/types';

interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const data = await http.post<LoginResponse>('/auth/login', {
        email,
        password,
      });
      tokenStore.set(data.token, data.refreshToken);
      set({ user: data.user });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await http.post('/auth/logout');
    } catch {
      // aunque falle, limpiamos localmente
    }
    tokenStore.clear();
    set({ user: null });
  },

  // Restaura la sesión al recargar la página (si hay token válido)
  restore: async () => {
    if (!tokenStore.get()) return;
    try {
      const user = await http.get<User>('/auth/me');
      set({ user });
    } catch {
      tokenStore.clear();
      set({ user: null });
    }
  },
}));
