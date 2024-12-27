/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./static/**/*.{html,js}"],
  theme: {
    extend: {
      backgroundImage: {
        'wood-pattern': "url('assets/wood_pattern_rotated.png')",
      }
    },
  },
  plugins: [],
}