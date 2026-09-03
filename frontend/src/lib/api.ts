/**
 * Cliente HTTP central (axios).
 * - Agrega automáticamente el token JWT a cada petición.
 * - Si el token expiró (error 401), intenta refrescarlo una vez y reintenta.
 * - Desenvuelve la respuesta estándar del backend { code, data, message }.
 *
 * Toda la comunicación con el backend pasa por aquí: un solo lugar para
 * autenticación, errores y URLs. Esto es "buena práctica": no repetir fetch
 * por todos lados.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types';

const TOKEN_KEY = 'fdp_token';
const REFRESH_KEY = 'fdp_refresh';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (token: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// --- Interceptor de PETICIÓN: adjunta el token ---
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Interceptor de RESPUESTA: refresca token si expiró ---
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Si es 401 y aún no reintentamos, intentamos refrescar el token
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const newToken = await refreshToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original); // reintenta la petición original
      }
      // No se pudo refrescar: cerramos sesión
      tokenStore.clear();
      if (location.pathname !== '/login') location.href = '/login';
    }
    return Promise.reject(error);
  },
);

async function refreshToken(): Promise<string | null> {
  // Evita disparar varios refresh a la vez
  if (refreshing) return refreshing;
  const refresh = tokenStore.getRefresh();
  if (!refresh) return null;

  refreshing = axios
    .post<ApiResponse<{ token: string; refreshToken: string }>>(
      `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
      { refreshToken: refresh },
    )
    .then((res) => {
      const { token, refreshToken } = res.data.data;
      tokenStore.set(token, refreshToken);
      return token;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

/**
 * Helpers que devuelven directamente el "data" del backend (ya desenvuelto).
 * Así en los componentes escribimos:  const docs = await http.get('/file/listar')
 */
export const http = {
  get: async <T>(url: string) =>
    (await api.get<ApiResponse<T>>(url)).data.data,
  post: async <T>(url: string, body?: unknown) =>
    (await api.post<ApiResponse<T>>(url, body)).data.data,
  patch: async <T>(url: string, body?: unknown) =>
    (await api.patch<ApiResponse<T>>(url, body)).data.data,
  del: async <T>(url: string) =>
    (await api.delete<ApiResponse<T>>(url)).data.data,
};

export default api;
