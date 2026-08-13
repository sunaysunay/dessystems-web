/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        des: { orange: '#F97316', blue: '#2563EB' },
      },
    },
  },
  plugins: [],
};
