/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2fbf4',
          100: '#ddf6e2',
          200: '#bdeac8',
          300: '#8bd8a0',
          400: '#52bd72',
          500: '#2fa052',
          600: '#218341',
          700: '#1c6836',
          800: '#19532e',
          900: '#164527',
          950: '#072612',
        },
        sand: {
          50: '#fbf8f1',
          100: '#f4edde',
          200: '#e8d9bd',
          300: '#d9bf92',
          400: '#c9a066',
          500: '#bb8849',
          600: '#a5713c',
          700: '#895833',
          800: '#71492f',
          900: '#5d3d2a',
          950: '#331f15',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 30px -18px rgba(15, 23, 42, 0.35)',
      },
    },
  },
  plugins: [],
};
