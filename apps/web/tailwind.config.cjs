/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f7ff",
          100: "#ebf0ff",
          200: "#d6e0ff",
          300: "#b3c7ff",
          400: "#80a3ff",
          500: "#4d7fff",
          600: "#1a5cff",
          700: "#0040e6",
          800: "#0032b3",
          900: "#002480",
        },
      },
    },
  },
  plugins: [],
}
