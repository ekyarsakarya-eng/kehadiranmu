/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./*.js"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'header': ['Montserrat', 'sans-serif'],
        'sans': ['Inter', 'sans-serif']
      },
      colors: {
        'primary': '#800000',
      }
    }
  },
  plugins: []
}
