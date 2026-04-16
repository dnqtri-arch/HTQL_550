/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#d4a017',
          600: '#b8860b',
          700: '#92650a',
          800: '#6b4e0a',
          900: '#3d2a06',
        },
        panel: '#1a1408',
        panel2: '#241a0c',
      },
      fontSize: {
        xxs: ['0.65rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
}
