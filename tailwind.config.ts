import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#2dd4d4",
          500: "#14b8b8",
          600: "#0d9496",
          700: "#0f7579",
          800: "#145e62",
          900: "#164e52",
        },
        ink: { DEFAULT: "#0f2a2e", soft: "#46636a", faint: "#7c959b" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,42,46,.04), 0 8px 24px -12px rgba(15,42,46,.12)",
        glow: "0 10px 40px -10px rgba(20,184,184,.45)",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "fade-up": "fade-up .6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
