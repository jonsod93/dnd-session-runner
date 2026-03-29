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
        'pulse-glow-orange': 'pulseGlowOrange 2.5s ease-in-out infinite',
        'pulse-glow-blue': 'pulseGlowBlue 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlowOrange: {
          '0%, 100%': { boxShadow: 'inset 0 0 8px rgba(255,107,53,0.2), 6px 6px 12px rgba(16,18,22,0.9), -6px -6px 12px rgba(55,60,72,0.7)' },
          '50%': { boxShadow: 'inset 0 0 18px rgba(255,107,53,0.45), 6px 6px 12px rgba(16,18,22,0.9), -6px -6px 12px rgba(55,60,72,0.7)' },
        },
        pulseGlowBlue: {
          '0%, 100%': { boxShadow: 'inset 0 0 8px rgba(96,165,250,0.15), 6px 6px 12px rgba(16,18,22,0.9), -6px -6px 12px rgba(55,60,72,0.7)' },
          '50%': { boxShadow: 'inset 0 0 16px rgba(96,165,250,0.35), 6px 6px 12px rgba(16,18,22,0.9), -6px -6px 12px rgba(55,60,72,0.7)' },
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
        // Neumorphic shadows
        'neu-raised': '1.5px 1.5px 3px #0e0e0e, -1.5px -1.5px 3px rgba(95, 94, 94, 0.4), inset 0px 0px 0px #0e0e0e, inset 0px 0px 0px rgba(95, 94, 94, 0.4)',
        'neu-raised-sm': '1px 1px 2px #0e0e0e, -1px -1px 2px rgba(95, 94, 94, 0.4), inset 0px 0px 0px #0e0e0e, inset 0px 0px 0px rgba(95, 94, 94, 0.4)',
        'neu-pressed': '0px 0px 0px #0e0e0e, 0px 0px 0px rgba(95, 94, 94, 0.25), inset 2px 2px 3px #0e0e0e, inset -2px -2px 3px rgba(95, 94, 94, 0.4)',
        'neu-pressed-deep': '0px 0px 0px #0e0e0e, 0px 0px 0px rgba(95, 94, 94, 0.25), inset 2px 2px 4px #0e0e0e, inset -2px -2px 4px rgba(95, 94, 94, 0.4)',
        'neu-flat': '1px 1px 2px #0e0e0e, -1px -1px 2px rgba(95, 94, 94, 0.4), inset 0px 0px 0px #0e0e0e, inset 0px 0px 0px rgba(95, 94, 94, 0.4)',
        'neu-glow-orange': 'inset 0 0 8px rgba(255,107,53,0.2), 1.5px 1.5px 3px #0e0e0e, -1.5px -1.5px 3px rgba(95, 94, 94, 0.4)',
        'neu-glow-blue': 'inset 0 0 8px rgba(96,165,250,0.2), 1.5px 1.5px 3px #0e0e0e, -1.5px -1.5px 3px rgba(95, 94, 94, 0.4)',
        'neu-glow-red': 'inset 0 0 8px rgba(248,113,113,0.15), 1px 1px 3px #0e0e0e, -1px -1px 3px rgba(95, 94, 94, 0.4)',
        'neu-glow-green': 'inset 0 0 8px rgba(74,222,128,0.15), 1px 1px 3px #0e0e0e, -1px -1px 3px rgba(95, 94, 94, 0.4)',
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
