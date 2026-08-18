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
        // Legacy colors (kept for backwards compatibility)
        "primary": "var(--md-sys-color-primary, #6F4E37)",
        "primary-dark": "#5a3e2b",
        "primary-light": "#8d6e5a",
        "accent-light": "#f4efe9",
        "neutral-text": "var(--md-sys-color-on-surface, #1F1B18)",
        "neutral-border": "var(--md-sys-color-outline-variant, #D2C4B8)",
        "cream": "#FAF5EF",
        "coffee-brown": "#4A3B32",
        "coffee-medium": "#887563",
        "coffee-light": "#E5E0DC",
        "gold-logo": "#d4af37",
        "gold": "#C6A257",
        "background-light": "var(--md-sys-color-surface, #FAF8F5)",
        "background-dark": "#171310",
        "surface-light": "var(--md-sys-color-surface-container-lowest, #ffffff)",

        // Material Design 3 Token Mappings
        md: {
          primary: "var(--md-sys-color-primary)",
          "on-primary": "var(--md-sys-color-on-primary)",
          "primary-container": "var(--md-sys-color-primary-container)",
          "on-primary-container": "var(--md-sys-color-on-primary-container)",
          secondary: "var(--md-sys-color-secondary)",
          "on-secondary": "var(--md-sys-color-on-secondary)",
          "secondary-container": "var(--md-sys-color-secondary-container)",
          "on-secondary-container": "var(--md-sys-color-on-secondary-container)",
          tertiary: "var(--md-sys-color-tertiary)",
          "on-tertiary": "var(--md-sys-color-on-tertiary)",
          "tertiary-container": "var(--md-sys-color-tertiary-container)",
          "on-tertiary-container": "var(--md-sys-color-on-tertiary-container)",
          surface: "var(--md-sys-color-surface)",
          "on-surface": "var(--md-sys-color-on-surface)",
          "on-surface-variant": "var(--md-sys-color-on-surface-variant)",
          "surface-dim": "var(--md-sys-color-surface-dim)",
          "surface-bright": "var(--md-sys-color-surface-bright)",
          "surface-container-lowest": "var(--md-sys-color-surface-container-lowest)",
          "surface-container-low": "var(--md-sys-color-surface-container-low)",
          "surface-container": "var(--md-sys-color-surface-container)",
          "surface-container-high": "var(--md-sys-color-surface-container-high)",
          "surface-container-highest": "var(--md-sys-color-surface-container-highest)",
          outline: "var(--md-sys-color-outline)",
          "outline-variant": "var(--md-sys-color-outline-variant)",
          error: "var(--md-sys-color-error)",
          "error-container": "var(--md-sys-color-error-container)",
          "on-error": "var(--md-sys-color-on-error)",
          "on-error-container": "var(--md-sys-color-on-error-container)",
        }
      },
      fontFamily: {
        "display": ["Plus Jakarta Sans", "sans-serif"],
        "sans": ["Plus Jakarta Sans", "sans-serif"],
      },
      borderRadius: {
        "none": "0",
        "xs": "4px",
        "sm": "8px",
        "md": "12px",
        "lg": "16px",
        "xl": "28px",
        "full": "9999px"
      },
      boxShadow: {
        "md-1": "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
        "md-2": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
        "md-3": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
        "soft": "0 4px 20px -2px rgba(111, 78, 55, 0.08)",
        "glow": "0 0 15px rgba(111, 78, 55, 0.25)"
      },
      transitionTimingFunction: {
        "md-standard": "cubic-bezier(0.2, 0, 0, 1)",
        "md-decelerate": "cubic-bezier(0.05, 0.7, 0.1, 1)",
        "md-accelerate": "cubic-bezier(0.3, 0, 0.8, 0.15)",
      }
    },
  },
  plugins: [],
}
