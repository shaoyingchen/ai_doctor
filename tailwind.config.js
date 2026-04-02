/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#22c55e',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        accent: {
          blue: '#0ea5e9',
          purple: '#d946ef',
          yellow: '#eab308',
          red: '#ef4444',
        }
      },
      borderRadius: {
        'lg': '12px',
        'md': '10px',
        'sm': '8px',
        'xs': '6px',
      }
    },
  },
  plugins: [],
}