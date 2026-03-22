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
  plugins: [],
}
