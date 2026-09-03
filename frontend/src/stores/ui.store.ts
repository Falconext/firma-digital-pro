/**
 * Store de UI: maneja las notificaciones "toast" (mensajes flotantes).
 * Zustand es una librería de estado global muy simple: creas un "store"
 * y lo usas con un hook en cualquier componente.
 */
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface UIState {
  toasts: Toast[];
  notify: (message: string, type?: ToastType) => void;
  dismiss: (id: number) => void;
}

let counter = 0;

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  notify: (message, type = 'info') => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    // Se cierra solo a los 4 segundos
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
