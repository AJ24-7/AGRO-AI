/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        agro: {
          light: "#e8f5e9",
          DEFAULT: "#2e7d32",
          dark: "#1b5e20",
          accent: "#66bb6a",
        },
      },
    },
  },
  plugins: [],
};
