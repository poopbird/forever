import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Extend rose with romantic shades (merges with Tailwind's built-in rose)
        rose: {
          deep: '#7B1E3C',
          medium: '#A83258',
          blush: '#FDE8ED',
        },
        gold: {
          warm: '#C9964A',
          light: '#E8C97B',
        },
        cream: {
          DEFAULT: '#FDF8F0',
          dark: '#F5EDE0',
        },
        ink: {
          DEFAULT: '#3D2C2C',
          light: '#6B4F4F',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Lato', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwind-scrollbar')],
};

export default config;
