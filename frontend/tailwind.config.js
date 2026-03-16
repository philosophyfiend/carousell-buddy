/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff5f3',
          100: '#ffe8e3',
          200: '#ffd0c7',
          300: '#ffada0',
          400: '#ff7a67',
          500: '#EE4D2D',
          600: '#d93a1c',
          700: '#b52d15',
          800: '#952716',
          900: '#7b2518',
          950: '#430f08',
        },
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 1.5s linear infinite',
      },
    },
  },
  plugins: [],
}
