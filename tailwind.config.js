/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'gov-deepblue': '#1e3a5f',
        'gov-navy': '#2c3e50',
        'gov-police': '#34495e',
        'gov-accent': '#e67e22',
        'gov-danger': '#c0392b',
        'gov-success': '#27ae60',
        'gov-bg': '#f5f6fa',
      },
      fontFamily: {
        song: [
          '"SimSun"',
          '"宋体"',
          '"Source Han Serif SC"',
          '"Noto Serif CJK SC"',
          'serif',
        ],
      },
    },
  },
  plugins: [],
};
