/**
 * Configuración de Tailwind CSS.
 * Paleta derivada del logotipo de LENA (Laboratorio de Evaluación Nutricional
 * de Alimentos): petróleo #006389, cian #3BC6EE y lima #B9D86D.
 * Usar tokens semánticos (primary, accent, success...) en vez de colores sueltos
 * hace que todo se vea consistente y sea fácil de cambiar.
 * Todos los pares texto/fondo cumplen contraste WCAG AA (≥ 4.5:1).
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#006389', // Petróleo del logo (marca, botones, navegación)
          hover: '#00516F',
          deep: '#00425C', // Fondos oscuros (panel de login, sidebar activo)
          light: '#3BC6EE', // Cian del logo (acentos, indicadores, brillos)
          soft: '#E3F4FA', // Cian muy claro (fondos de ícono, filas activas)
        },
        accent: {
          DEFAULT: '#B9D86D', // Lima del logo (acción principal: firmar, confirmar)
          hover: '#A9CC55',
          foreground: '#0B3346', // Texto sobre lima (8.3:1)
        },
        surface: '#FFFFFF',
        background: '#F4F9FB', // Fondo general con leve tinte cian
        foreground: '#0B3346', // Texto principal (petróleo muy oscuro)
        muted: '#E8F1F5',
        'muted-foreground': '#4F7382', // 5.1:1 sobre blanco
        border: '#D5E5EC',
        destructive: { DEFAULT: '#DC2626', hover: '#B91C1C', soft: '#FEE2E2' },
        warning: { DEFAULT: '#B45309', soft: '#FEF3C7' },
        success: { DEFAULT: '#3F7D20', soft: '#EEF6DC' }, // Verde afín al lima
        info: { DEFAULT: '#00516F', soft: '#E3F4FA' },
      },
      fontFamily: {
        // Plus Jakarta Sans (geométrica, afín al logotipo) para títulos; Inter para cuerpo
        heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Sombras suaves teñidas de petróleo
        soft: '0 1px 2px rgba(0, 66, 92, 0.05), 0 4px 14px rgba(0, 66, 92, 0.07)',
        'soft-lg': '0 12px 36px rgba(0, 66, 92, 0.14)',
        glow: '0 0 0 4px rgba(59, 198, 238, 0.25)',
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
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.35s ease-out both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
