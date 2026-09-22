/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        accent: '#ec4899',
        'bg-base': '#0f0f13',
        'bg-surface': '#18181f',
        'bg-card': '#1e1e28',
        'text-primary': '#f1f1f5',
        'text-muted': '#8b8ba0',
        'score-vector': '#818cf8',
        'score-bm25': '#f472b6',
        'score-hybrid': '#34d399',
        border: 'rgba(255,255,255,0.07)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        pulse: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200%' },
          '100%': { backgroundPosition: '200%' },
        },
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'status-pulse': 'pulse 2s ease-in-out infinite',
        'dot-bounce': 'bounce 0.6s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite linear',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
