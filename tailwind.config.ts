// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0e17',
        surface: '#111827',
        panel: '#151c2c',
        'panel-header': '#1a2235',
        card: '#151c2c',
        border: '#1e2d45',
        primary: '#e8ecf1',
        secondary: '#8896ab',
        muted: '#556178',
        accent: '#3b82f6',
        cyan: '#22d3ee',
        live: '#10b981',
        danger: '#ef4444',
        success: '#10b981',
        cat: {
          brute: '#f59e0b',
          ddos: '#ef4444',
          malware: '#a78bfa',
          scan: '#22d3ee',
          web: '#10b981',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
