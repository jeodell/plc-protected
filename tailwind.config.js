/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./**/*.{html,js}'],
  purge: [],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        plcOrange: '#E8881D',
        plcBlue: '#69B1BE',
        plcLightGreen: '#88C82F',
        plcDarkGreen: '#345B30',
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
