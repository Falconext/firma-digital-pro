/**
 * Configuración de Tailwind CSS.
 * Aquí definimos la paleta de colores y tipografías de la marca
 * (generadas con el sistema de diseño "Soft UI Evolution").
 * Usar tokens semánticos (primary, accent...) en vez de colores sueltos
 * hace que todo se vea consistente y sea fácil de cambiar.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E40AF', // Azul institucional (confianza, seguridad)
          hover: '#1D3A9E',
          light: '#3B82F6',
        },
        accent: {
          DEFAULT: '#16A34A', // Verde acción (firmar, confirmar)
          hover: '#15803D',
        },
        surface: '#FFFFFF',
        background: '#EFF6FF', // Fondo azul muy claro
        foreground: '#1E3A8A',
        muted: '#E9EFF5',
        'muted-foreground': '#64748B',
        border: '#BFDBFE',
        destructive: '#DC2626',
        warning: '#D97706',
      },
      fontFamily: {
        // Lexend para títulos, Source Sans 3 para el cuerpo
        heading: ['Lexend', 'system-ui', 'sans-serif'],
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Sombras suaves (estilo Soft UI)
        soft: '0 1px 3px rgba(30, 64, 175, 0.06), 0 4px 12px rgba(30, 64, 175, 0.08)',
        'soft-lg': '0 8px 30px rgba(30, 64, 175, 0.12)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};
