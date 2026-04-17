import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: "#0a0a0f",
        card: "#12121a",
        accent: "#7c3aed"
      }
    }
  },
  plugins: []
} satisfies Config;
