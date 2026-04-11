import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0e17',
        surface: '#111827',
        card: '#1F2937',
        border: '#2a3a4a',
        primary: '#F9FAFB',
        secondary: '#9CA3AF',
        accent: '#3B82F6',
        danger: '#EF4444',
        success: '#10B981',
        cat: {
          brute: '#FF6B35',
          ddos: '#E63946',
          malware: '#9B5DE5',
          scan: '#00B4D8',
          web: '#06D6A0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
