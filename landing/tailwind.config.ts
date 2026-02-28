import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0A0A0A',
        surface: '#161616',
        border:  '#222222',
        green:   '#44D62C',
        yellow:  '#FFB800',
        red:     '#FF4444',
        text:    '#F5F5F5',
        muted:   '#888888',
      },
      fontFamily: {
        display: ['var(--font-outfit)', 'sans-serif'],
        body:    ['var(--font-dm-sans)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
