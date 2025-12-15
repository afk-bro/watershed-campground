import type { Config } from 'tailwindcss';

/**
 * Tailwind v4 Config Fallback
 *
 * Primary theme is defined in app/globals.css via @theme inline.
 * This config provides IntelliSense support and plugin compatibility.
 */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        'brand-forest': '#06251c',
        'navbar-forest': '#042c21',
        'accent-gold': '#c8a75a',
        'accent-gold-dark': '#d4c08a',
        'accent-gold-muted': '#c8b37e',
        'accent-beige': '#e9dfc7',

        // Semantic Surfaces
        'surface-primary': '#06251c',
        'surface-secondary': '#083a2c',
        'surface-card': '#0a3f30',
        'surface-elevated': '#0d4538',

        // Semantic Text
        'text-primary': '#e9dfc7',
        'text-secondary': '#cbbfa5',
        'text-muted': '#a89a7f',
        'text-inverse': '#06251c',
        'text-accent': '#c8a75a',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'Cormorant Garamond', 'serif'],
        body: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        // Section Spacing
        'section-hero': '8rem',
        'section-xl': '6rem',
        'section-lg': '5rem',
        'section-md': '4rem',
        'section-sm': '3rem',

        // Content Spacing
        'content-xl': '4rem',
        'content-lg': '2.5rem',
        'content-md': '1.5rem',
        'content-sm': '1rem',
        'content-xs': '0.75rem',
      },
      borderColor: {
        subtle: 'rgba(200, 167, 90, 0.15)',
        DEFAULT: 'rgba(200, 167, 90, 0.25)',
        strong: 'rgba(200, 167, 90, 0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
