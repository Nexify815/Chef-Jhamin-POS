/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1A1F2C',
          dark: '#141821',
          light: '#1E2330',
          panel: '#222734',
        },
        teal: {
          DEFAULT: '#14B8A6',
          deep: '#0D9488',
          light: '#2DD4BF',
          muted: '#0EA893',
        },
        cream: '#E8ECF1',
        charcoal: '#1A1F2C',
        frosted: '#8A93A6',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        panel: '22px',
        blob: '60% 40% 70% 30% / 50% 60% 40% 50%',
      },
      boxShadow: {
        glass: '0 20px 40px rgba(0, 0, 0, 0.15)',
        'glass-sm': '0 8px 24px rgba(0, 0, 0, 0.1)',
        'glass-lg': '0 4px 16px rgba(0, 0, 0, 0.4), 0 12px 40px rgba(0, 0, 0, 0.35), 0 32px 80px rgba(10, 5, 2, 0.5)',
      },
    },
  },
  plugins: [],
};
