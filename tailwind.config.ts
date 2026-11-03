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
        background: "#09090b",
        surface: "#141417",
        espresso: {
          950: "#09090b",
          900: "#121215",
          800: "#18181c",
          700: "#242429",
          600: "#303036",
        },
        cognac: {
          300: "#f3e8dc",
          400: "#dfc39e",
          500: "#d4af7a",
          600: "#c59960",
          700: "#ab8046",
        },
        champagne: "#f3e8dc",
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
