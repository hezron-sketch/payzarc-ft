/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  // hover: variants only apply on devices that can actually hover — a tap on
  // a phone otherwise leaves the hover lift/colour stuck until the next tap.
  future: { hoverOnlyWhenSupported: true },
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
          DEFAULT: "rgba(var(--danger-rgb), <alpha-value>)",
          foreground: "var(--white)",
        },
        border: "var(--border-subtle)",
        input: "var(--border-mid)",
        ring: "var(--gold)",
        // Extra brand-specific colors not covered by the semantic set above
        // rgba(channels, <alpha-value>) instead of var(--hex) so modifiers
        // like bg-gold/10 actually generate CSS — Tailwind can't add
        // alpha to an opaque var(), it silently drops those classes.
        gold: {
          DEFAULT: "rgba(var(--gold-rgb), <alpha-value>)",
          dark: "rgba(var(--gold-dark-rgb), <alpha-value>)",
        },
        success: "rgba(var(--green-rgb), <alpha-value>)",
        info: "rgba(var(--blue-rgb), <alpha-value>)",
        pink: "rgba(var(--pink-rgb), <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      fontFamily: {
        sans: ["Google Sans", "IBM Plex Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
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
        // Bigger rise than flow-fade-in, no scale — that one's sized for a
        // small inline form swap; this is for a full page's worth of
        // content, where a subtler zoom would barely read but a taller
        // rise clearly does, closer to "scrolled into place" than "faded in".
        "page-swap-in": {
          from: { opacity: 0, transform: "translateY(28px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        // Materialize rather than fade: scale + blur settle together so a
        // translucent surface reads as arriving, not just appearing.
        "popup-in": {
          from: { opacity: 0, transform: "scale(0.96)", filter: "blur(6px)" },
          to: { opacity: 1, transform: "scale(1)", filter: "blur(0)" },
        },
        // Value swaps (balance shown/hidden/loaded): a short blur settle
        // masks the old→new change instead of the digits snapping.
        "reveal-in": {
          from: { opacity: 0, filter: "blur(4px)" },
          to: { opacity: 1, filter: "blur(0)" },
        },
        "progress-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(var(--gold-rgb), 0.45)" },
          "50%": { boxShadow: "0 0 0 6px rgba(var(--gold-rgb), 0)" },
        },
      },
      // Apple's no-overshoot settle curve; same value as --ease-standard.
      transitionTimingFunction: {
        apple: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      // The UI's transition property list: everything a control animates on
      // hover/press/state, and never layout (width/height/margins) — the
      // explicit replacement for `transition-all`.
      transitionProperty: {
        ui: "color, background-color, border-color, outline-color, box-shadow, opacity, transform, scale, filter",
      },
      transitionDuration: {
        250: "250ms",
        400: "400ms",
      },
      animation: {
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.32,0.72,0,1)",
        "slide-in-left": "slide-in-left 0.3s cubic-bezier(0.32,0.72,0,1)",
        "flow-fade-in": "flow-fade-in 0.35s cubic-bezier(0.32,0.72,0,1)",
        // Same easing the old strip-slide used for panel motion — a smooth
        // decelerate-into-place curve, fitting for a full page settling in.
        "page-swap-in": "page-swap-in 0.45s cubic-bezier(0.22,1,0.36,1)",
        "popup-in": "popup-in 0.3s cubic-bezier(0.32,0.72,0,1)",
        // Trigger-anchored popovers (search results, notifications): the same
        // materialize, inside the 150–250ms dropdown budget, on the strong
        // ease-out. Pair with an origin-* class pointing at the trigger.
        "popover-in": "popup-in 0.2s cubic-bezier(0.23,1,0.32,1)",
        "reveal-in": "reveal-in 0.25s cubic-bezier(0.23,1,0.32,1)",
        "progress-pulse": "progress-pulse 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
