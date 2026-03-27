/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['Cinzel', 'Georgia', 'serif'],
        mono:    ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      colors: {
        gold: {
          300: '#fcd98a',
          400: '#d4a843',
          500: '#b8860b',
          600: '#a06e08',
        },
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('pointer-fine', '@media (pointer: fine)')
      addVariant('pointer-coarse', '@media (pointer: coarse)')
    },
  ],
}
