/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#ea580c', // Main orange (darker, richer)
          600: '#d97706',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        secondary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#dc2626', // Main red
          600: '#b91c1c', // More sophisticated red
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#7f1d1d',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Warmer gold tone
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        industrial: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-industrial': 'linear-gradient(135deg, #ea580c 0%, #b91c1c 100%)',
        'gradient-industrial-soft': 'linear-gradient(135deg, #fff7ed 0%, #fef2f2 100%)',
        'grid-pattern': 'linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid-pattern': '40px 40px',
      },
      boxShadow: {
        'industrial': '0 4px 6px -1px rgba(234, 88, 12, 0.1), 0 2px 4px -1px rgba(185, 28, 28, 0.06)',
        'industrial-lg': '0 10px 15px -3px rgba(234, 88, 12, 0.15), 0 4px 6px -2px rgba(185, 28, 28, 0.1)',
        'industrial-xl': '0 20px 25px -5px rgba(234, 88, 12, 0.2), 0 10px 10px -5px rgba(185, 28, 28, 0.15)',
      }
    },
  },
  plugins: [],
}
