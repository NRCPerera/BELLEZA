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
          50:  'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        accent: {
          50:  'var(--color-accent-50)',
          100: 'var(--color-accent-100)',
          200: 'var(--color-accent-200)',
          300: 'var(--color-accent-300)',
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
        },
        highlight: {
          50:  'var(--color-highlight-50)',
          100: 'var(--color-highlight-100)',
          200: 'var(--color-highlight-200)',
          300: 'var(--color-highlight-300)',
          400: 'var(--color-highlight-400)',
          500: 'var(--color-highlight-500)',
          600: 'var(--color-highlight-600)',
          700: 'var(--color-highlight-700)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          alt: 'var(--color-surface-alt)',
        },
        background: 'var(--color-background)',
        ink: {
          50:  'var(--color-ink-50)',
          100: 'var(--color-ink-100)',
          200: 'var(--color-ink-200)',
          500: 'var(--color-ink-500)',
          700: 'var(--color-ink-700)',
          900: 'var(--color-ink-900)',
        },
        champagne: {
          50:  'var(--color-background)',
          100: 'var(--color-highlight-100)',
          200: 'var(--color-highlight-200)',
          300: 'var(--color-highlight-300)',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
      },
      spacing: { 18: '4.5rem', 22: '5.5rem', 30: '7.5rem' },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        soft: '0 4px 20px rgba(75, 38, 56, 0.06)',
        float: '0 18px 45px rgba(75, 38, 56, 0.12)',
      },
    },
  },
  plugins: [],
}
