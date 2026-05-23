/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Ethiopian flag colors (unchanged — intentional national colors)
        eth: {
          green: '#078930',
          yellow: '#FCDD09',
          red:   '#DA121A',
        },

        // Primary brand palette — warm manuscript gold
        // Base accent: hsl(45, 60%, 45%) = #B8952E
        brand: {
          50:  '#FDF9EE',  // hsl(45, 60%, 97%) — parchment white
          100: '#F7EDD1',  // hsl(45, 58%, 90%) — warm cream
          200: '#EDD9A3',  // hsl(45, 58%, 80%) — light gold cream
          300: '#DFBD6C',  // hsl(44, 60%, 65%) — soft gold
          400: '#CFA03D',  // hsl(44, 62%, 53%) — medium gold
          500: '#C09430',  // hsl(44, 60%, 47%) — rich gold
          600: '#B8952E',  // hsl(45, 60%, 45%) — muted manuscript gold ← accent
          700: '#8F711E',  // hsl(43, 65%, 34%) — dark gold
          800: '#6A5216',  // hsl(41, 65%, 25%) — deep amber brown
          900: '#43340D',  // hsl(39, 65%, 16%) — very dark brown
          950: '#251D07',  // hsl(39, 65%, 9%)  — near black warm
        },

        // Warm neutral — replaces cool gray throughout
        // Base text: hsl(25, 30%, 20%) = #42301F
        // Base bg:   hsl(30, 20%, 96%) = #F7F5F2
        gray: {
          50:  '#F9F7F4',  // hsl(30, 20%, 96%) — parchment/linen base
          100: '#F2EDE6',  // hsl(28, 22%, 92%)
          200: '#E6DDD3',  // hsl(27, 18%, 86%)
          300: '#CCB9A8',  // hsl(26, 20%, 73%)
          400: '#AC9080',  // hsl(25, 20%, 59%)
          500: '#8B7060',  // hsl(25, 20%, 46%)
          600: '#6E564A',  // hsl(16, 20%, 36%)
          700: '#54423A',  // hsl(16, 18%, 28%)
          800: '#3A2D26',  // hsl(20, 22%, 19%)
          900: '#2A1F18',  // hsl(24, 26%, 13%)
          950: '#19110B',  // hsl(26, 32%, 8%)
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
