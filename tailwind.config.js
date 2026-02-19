/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#6F4E37",
        "primary-dark": "#5a3e2b",
        "primary-light": "#8d6e5a",
        "accent-light": "#f4efe9",
        "neutral-text": "#181411",
        "neutral-border": "#e5e7eb",
        "cream": "#FAF5EF",
        "coffee-brown": "#4A3B32",
        "coffee-medium": "#887563",
        "coffee-light": "#E5E0DC",
        "gold-logo": "#d4af37",
        "gold": "#C6A257",
        "background-light": "#f8f7f6",
        "background-dark": "#211911",
        "surface-light": "#ffffff",
      },
      fontFamily: {
        "display": ["Plus Jakarta Sans", "sans-serif"],
        "sans": ["Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px"
      },
      boxShadow: {
        "soft": "0 4px 20px -2px rgba(184, 102, 20, 0.08)",
        "glow": "0 0 15px rgba(184, 102, 20, 0.3)"
      }
    },
  },
  plugins: [],
}
