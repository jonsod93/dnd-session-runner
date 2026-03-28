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
          300: '#ffb44a',
          400: '#e87830',
          500: '#c86020',
          600: '#aa4a15',
        },
        accent: {
          green: '#4ade80',
          red: '#f87171',
          blue: '#60a5fa',
          amber: '#fbbf24',
          teal: '#2dd4bf',
        },
        danger: {
          DEFAULT: '#f87171',
          muted: '#dc2626',
        },
        surface: {
          0: '#0a0a0c',
          1: '#111114',
          2: '#18181c',
          3: '#202024',
          4: '#28282c',
        },
      },
      boxShadow: {
        'neon-gold': '0 0 12px rgba(232, 120, 48, 0.4), 0 0 4px rgba(232, 120, 48, 0.2)',
        'neon-gold-strong': '0 0 24px rgba(232, 120, 48, 0.55), 0 0 8px rgba(232, 120, 48, 0.3)',
        'neon-blue': '0 0 12px rgba(96, 165, 250, 0.3), 0 0 4px rgba(96, 165, 250, 0.15)',
        'neon-red': '0 0 12px rgba(248, 113, 113, 0.3), 0 0 4px rgba(248, 113, 113, 0.15)',
        'neon-green': '0 0 12px rgba(74, 222, 128, 0.3), 0 0 4px rgba(74, 222, 128, 0.15)',
        'glass': '0 8px 32px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.08) inset',
        'glass-lg': '0 24px 80px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.08) inset',
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
