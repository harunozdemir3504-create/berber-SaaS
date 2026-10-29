import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0d0a08",
        surface: "#1c1613",
        espresso: {
          950: "#0d0a08",
          900: "#14100d",
          800: "#1c1613",
          700: "#281f1a",
          600: "#362a23",
        },
        cognac: {
          300: "#e6ccb2",
          400: "#c88a53",
          500: "#b47b48",
          600: "#9a6334",
          700: "#8c5828",
        },
        champagne: "#e6ccb2",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        "bronze-glow": "0 10px 30px -5px rgba(200, 138, 83, 0.25), 0 0 18px -3px rgba(180, 123, 72, 0.18)",
        "bronze-glow-lg": "0 18px 48px -6px rgba(200, 138, 83, 0.35), 0 0 26px -4px rgba(180, 123, 72, 0.25)",
        "amber-glow": "0 10px 30px -5px rgba(200, 138, 83, 0.25), 0 0 18px -3px rgba(180, 123, 72, 0.18)",
        "amber-glow-lg": "0 18px 48px -6px rgba(200, 138, 83, 0.35), 0 0 26px -4px rgba(180, 123, 72, 0.25)",
        "orange-glow": "0 10px 30px -5px rgba(200, 138, 83, 0.25)",
        "orange-glow-lg": "0 18px 48px -6px rgba(200, 138, 83, 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
