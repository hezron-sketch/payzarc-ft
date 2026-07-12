/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // shadcn's semantic tokens, pointed at Payzarc's existing brand
        // palette (Global.css :root) instead of shadcn's default
        // zinc/slate theme — the app's colors don't change, only how
        // components are built.
        background: "var(--bg)",
        foreground: "var(--white)",
        card: {
          DEFAULT: "var(--card2)",
          foreground: "var(--white)",
        },
        popover: {
          DEFAULT: "var(--card2)",
          foreground: "var(--white)",
        },
        primary: {
          DEFAULT: "var(--gold)",
          foreground: "#1a202c",
        },
        secondary: {
          DEFAULT: "var(--card)",
          foreground: "var(--white)",
        },
        muted: {
          DEFAULT: "var(--card)",
          foreground: "var(--soft)",
        },
        accent: {
          DEFAULT: "var(--card)",
          foreground: "var(--gold)",
        },
        destructive: {
          DEFAULT: "var(--danger)",
          foreground: "var(--white)",
        },
        border: "var(--border-subtle)",
        input: "var(--border-mid)",
        ring: "var(--gold)",
        // Extra brand-specific colors not covered by the semantic set above
        gold: {
          DEFAULT: "var(--gold)",
          dark: "var(--gold-dark)",
        },
        success: "var(--green)",
        info: "var(--blue)",
        pink: "var(--pink)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      // Bespoke motion the app relied on before the shadcn migration —
      // registered here instead of reinvented, so migrated components can
      // reach for animate-slide-in-right etc. the same way they'd reach for
      // tailwindcss-animate's built-ins.
      keyframes: {
        "slide-in-right": {
          from: { opacity: 0, transform: "translateX(16px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { opacity: 0, transform: "translateX(-16px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
        "flow-fade-in": {
          from: { opacity: 0, transform: "translateY(10px) scale(0.98)" },
          to: { opacity: 1, transform: "translateY(0) scale(1)" },
        },
        "popup-in": {
          from: { opacity: 0, transform: "translateY(12px) scale(0.98)" },
          to: { opacity: 1, transform: "translateY(0) scale(1)" },
        },
        "ticker-fade": {
          from: { opacity: 0, transform: "translateY(4px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "progress-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(236, 201, 75, 0.45)" },
          "50%": { boxShadow: "0 0 0 6px rgba(236, 201, 75, 0)" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.4,0,0.2,1)",
        "slide-in-left": "slide-in-left 0.3s cubic-bezier(0.4,0,0.2,1)",
        "flow-fade-in": "flow-fade-in 0.35s cubic-bezier(0.4,0,0.2,1)",
        "popup-in": "popup-in 0.25s cubic-bezier(0.22,1,0.36,1)",
        "ticker-fade": "ticker-fade 0.35s ease",
        "progress-pulse": "progress-pulse 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
