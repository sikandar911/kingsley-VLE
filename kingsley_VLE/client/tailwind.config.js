/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf2f6',
          100: '#fce7ef',
          200: '#f9c3d5',
          300: '#f390b0',
          400: '#eb5a86',
          500: '#dc2d61',
          600: '#c41d4a',
          700: '#6B1D3E',
          800: '#5a1835',
          900: '#3d0f23',
        },
      },
    },
  },
  plugins: [],
}

