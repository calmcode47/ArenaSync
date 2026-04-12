import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'arena-black': '#0a0a0f',
        'arena-dark': '#111118',
        'arena-card': '#1a1a24',
        'arena-border': '#2a2a38',
        'neon-blue': '#00d4ff',
        'neon-green': '#00ff88',
        'neon-orange': '#ff6b35',
        'neon-red': '#ff3355',
      },
      fontFamily: {
        display: ['Rajdhani', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
