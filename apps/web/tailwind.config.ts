import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Onest', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        paper: '#F6F7F9',
        ink: { DEFAULT: '#172033', soft: '#3A4557' },
        muted: '#5B6576',
        faint: '#8A93A3',
        line: { DEFAULT: '#E3E6EB', strong: '#CDD2DA' },
        accent: { DEFAULT: '#1E4B8F', hover: '#183D75', soft: '#EAF0F9', ink: '#15386B' },
        gold: { DEFAULT: '#B8862B', soft: '#FBF3E3' },
        success: { DEFAULT: '#1F7A4D', soft: '#E7F4EC' },
        danger: { DEFAULT: '#B42318', soft: '#FDECEA' },
        warn: { DEFAULT: '#B54708', soft: '#FEF4E6' },
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        box: '12px',
        field: '8px',
      },
      boxShadow: {
        pop: '0 8px 30px -12px rgba(23, 32, 51, 0.25)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        rise: 'rise 180ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
