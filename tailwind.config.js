/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // wellyourworld.com-inspired: fresh greens + warm earth neutrals
        brand: {
          50: '#f1f8f3',
          100: '#dcefe1',
          200: '#bbdfc6',
          300: '#8fc8a3',
          400: '#5fab7b',
          500: '#3d8f5c',
          600: '#2f7d4f', // primary accent
          700: '#266340',
          800: '#214f35',
          900: '#1c412d',
        },
        earth: {
          50: '#faf7f2',
          100: '#f1e9dc',
          200: '#e3d3bd',
          300: '#d0b694',
          400: '#bd996f',
        },
        ink: {
          DEFAULT: '#1f2421',
          soft: '#3f4742',
        },
      },
      fontFamily: {
        sans: [
          'Nunito',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '1rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(31, 36, 33, 0.08), 0 6px 20px rgba(31, 36, 33, 0.06)',
      },
    },
  },
  plugins: [],
};
