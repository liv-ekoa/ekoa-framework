/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Taken from the Ekoa deck (the lizard on the leaf): warm cream paper,
        // moss and olive greens, terracotta clay as the one warm accent.
        // Every text pairing below was checked for WCAG AA contrast.
        white: '#FDFBF7', // card surface, a touch warmer than pure white
        ink: { DEFAULT: '#1E231B', soft: '#464B3D', mute: '#67685A' },
        paper: { DEFAULT: '#F8F5EE', deep: '#EFEADF', line: '#DCD6C8' },
        moss: { DEFAULT: '#4E5D46', 800: '#36412F', 700: '#43503B', 600: '#5B6B51' },
        leaf: { DEFAULT: '#5B6A3A', 600: '#4A5730', 100: '#E5E8D3', 50: '#F1F2E7' },
        sage: { DEFAULT: '#768156', 100: '#E9EBDD' },
        clay: { DEFAULT: '#CC7A4E', 600: '#A85A32', 700: '#8C4726', 100: '#F5E6DA', 50: '#FBF3EC' },
        lesson: { DEFAULT: '#8B6A4E', 600: '#6B4E36', 100: '#EFE6DB' },
        sky: { DEFAULT: '#3F6B77', 100: '#E0EAEA' },
        alert: { DEFAULT: '#AE3426', 100: '#F7DFDA' },
        shadow: '#161815',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Karla Variable"', 'Karla', 'system-ui', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
      },
      fontSize: {
        // Modular scale (ratio ~1.25) on a 17px body.
        xs: ['0.8125rem', { lineHeight: '1.25rem' }],
        sm: ['0.9375rem', { lineHeight: '1.4rem' }],
        base: ['1.0625rem', { lineHeight: '1.65rem' }],
        lg: ['1.25rem', { lineHeight: '1.8rem' }],
        xl: ['1.5625rem', { lineHeight: '2rem' }],
        '2xl': ['1.953rem', { lineHeight: '2.3rem' }],
        '3xl': ['2.441rem', { lineHeight: '2.7rem' }],
        '4xl': ['3.052rem', { lineHeight: '3.2rem' }],
        '5xl': ['3.815rem', { lineHeight: '3.9rem' }],
        '6xl': ['4.768rem', { lineHeight: '4.6rem' }],
      },
      letterSpacing: { label: '0.14em' },
      borderRadius: { tag: '6px', field: '10px', panel: '18px' },
      maxWidth: { prose: '68ch', page: '1200px' },
    },
  },
  plugins: [],
};
