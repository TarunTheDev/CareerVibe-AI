/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // New CareerVibe Design System
        'careervibe-orange': '#F97316',
        'careervibe-orange-dark': '#EA580C',
        'careervibe-orange-light': '#FFF7ED',
        'careervibe-amber': '#FB923C',
        'careervibe-green': '#22C55E',
        'careervibe-blue': '#3B82F6',
        'careervibe-purple': '#A855F7',
        'careervibe-surface': '#F9FAFB',
        'careervibe-border': '#E5E7EB',
        'careervibe-text-primary': '#111827',
        'careervibe-text-secondary': '#374151',
        'careervibe-text-tertiary': '#6B7280',

        // Legacy colors (keep for compatibility)
        cream:  '#F5F0E8',
        ink:    '#1A1612',
        rust:   '#C4522A',
        sage:   '#4A6741',
        gold:   '#D4A84B',
        mist:   '#E8EDE6',
        paper:  '#FAF7F2',
        void:   '#070B14',
        neon:   '#00D97E',
        cyber:  '#0EA5E9',
        matrix: '#0F1520',

        // Shadcn/ui colors
        border:       'hsl(var(--border))',
        input:        'hsl(var(--input))',
        ring:         'hsl(var(--ring))',
        background:   'hsl(var(--background))',
        foreground:   'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body:    ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
