/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0F111A",
        card: "#1A1C26",
        accent: {
          DEFAULT: "#8257E5",
          hover: "#936BE8",
          soft: "rgba(130,87,229,0.18)"
        },
        text: {
          DEFAULT: "#F8FAFC",
          primary: "#F8FAFC",
          secondary: "#94A3B8",
          muted: "#64748B"
        },
        surface: "#0F111A"
      },
      fontFamily: {
        sans: [
          "Inter",
          "Geist Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      borderRadius: {
        xl2: "12px"
      },
      boxShadow: {
        glow: "0 0 24px rgba(130,87,229,0.35)",
        "glow-sm": "0 0 12px rgba(130,87,229,0.25)",
        card: "0 8px 32px -12px rgba(0,0,0,0.45)"
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 1, 0.36, 1)"
      },
      keyframes: {
        "fade-in": {
          from: { opacity: 0, transform: "translateY(4px)" },
          to: { opacity: 1, transform: "translateY(0)" }
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        "fade-in": "fade-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.6s linear infinite"
      }
    }
  },
  plugins: []
};
