/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99, 102, 241, .24), 0 18px 60px rgba(15, 23, 42, .2)',
      },
      animation: {
        'slide-in': 'slideIn .24s ease-out',
        'soft-pulse': 'softPulse 1.8s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        softPulse: {
          '0%, 100%': { opacity: 0.55 },
          '50%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
