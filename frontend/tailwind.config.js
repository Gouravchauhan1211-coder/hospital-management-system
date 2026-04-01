/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Medical Blue
        primary: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
          950: '#082F49',
          DEFAULT: '#0EA5E9',
        },
        // Material Design 3 Surface Colors
        'surface-container-lowest': '#F7F2FA',
        'surface-container-low': '#F3EDF7',
        'surface-container': '#ECE6F0',
        'surface-container-high': '#E6E0E9',
        'surface-container-highest': '#D0BCFF',
        'on-surface': '#1C1B1F',
        'on-surface-variant': '#49454F',
        'outline-variant': '#CAC4D0',
        'primary-container': '#E8DEF8',
        'on-primary-container': '#21005D',
        'secondary-container': '#E8DEF8',
        'on-secondary-container': '#1D192B',
        'tertiary': '#7D5260',
        'tertiary-fixed': '#FFD8E4',
        'on-tertiary-fixed': '#31111D',
        'on-tertiary': '#FFFFFF',
        // Accent Colors
        accent: {
          cyan: '#06B6D4',
          teal: '#14B8A6',
          emerald: '#10B981',
        },
        // Glass Effect Colors - Medical Blue
        glass: {
          light: 'rgba(255, 255, 255, 0.8)',
          medium: 'rgba(255, 255, 255, 0.9)',
          heavy: 'rgba(255, 255, 255, 0.95)',
          border: 'rgba(14, 165, 233, 0.15)',
          'border-dark': 'rgba(14, 165, 233, 0.25)',
        },
        // Status Colors - Healthcare Standard
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        // Appointment Status Colors
        pending: '#F59E0B',
        confirmed: '#0EA5E9',
        completed: '#10B981',
        cancelled: '#EF4444',
        rescheduled: '#8B5CF6',
        'no-show': '#6B7280',
        // Background Colors
        background: {
          primary: '#F0F9FF',
          secondary: '#FFFFFF',
          card: 'rgba(255, 255, 255, 0.95)',
        },
        // Text Colors
        text: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
          light: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
      },
      boxShadow: {
        // Medical Blue Shadows
        'medical': '0 4px 20px rgba(14, 165, 233, 0.1)',
        'medical-lg': '0 8px 40px rgba(14, 165, 233, 0.15)',
        'medical-xl': '0 16px 60px rgba(14, 165, 233, 0.2)',
        // Neumorphic Shadows - Light Theme
        'neu-light': '8px 8px 16px rgba(14, 165, 233, 0.1), -8px -8px 16px rgba(255, 255, 255, 0.9)',
        'neu-dark': '8px 8px 16px rgba(0, 0, 0, 0.1), -8px -8px 16px rgba(255, 255, 255, 0.8)',
        'neu-inset': 'inset 4px 4px 8px rgba(14, 165, 233, 0.1), inset -4px -4px 8px rgba(255, 255, 255, 0.9)',
        // Glass Shadows
        'glass': '0 8px 32px rgba(14, 165, 233, 0.1)',
        'glass-lg': '0 16px 48px rgba(14, 165, 233, 0.15)',
        'glass-xl': '0 24px 64px rgba(14, 165, 233, 0.2)',
        // Soft shadows
        'soft': '0 4px 20px rgba(0, 0, 0, 0.05)',
        'soft-lg': '0 8px 40px rgba(0, 0, 0, 0.08)',
        // Card shadow
        'card': '0 2px 8px rgba(14, 165, 233, 0.08), 0 4px 16px rgba(14, 165, 233, 0.04)',
        'card-hover': '0 4px 12px rgba(14, 165, 233, 0.12), 0 8px 24px rgba(14, 165, 233, 0.08)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        // Medical Blue Gradients
        'gradient-primary': 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
        'gradient-accent': 'linear-gradient(135deg, #06B6D4 0%, #0EA5E9 100%)',
        'gradient-success': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'gradient-medical': 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #F0F9FF 100%)',
        'gradient-hero': 'linear-gradient(135deg, #0EA5E9 0%, #06B6D4 50%, #0284C7 100%)',
        // Background gradients
        'bg-light': 'linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 50%, #F0F9FF 100%)',
        'bg-dark': 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-slower': 'float 10s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s ease infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(14, 165, 233, 0.5)' },
        },
      },
    },
  },
  plugins: [],
}
