/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        background: "#09090b", // Zinc 950
        foreground: "#fafafa", // Zinc 50
        primary: {
          DEFAULT: "#2563eb", // Blue 600
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#27272a", // Zinc 800
          foreground: "#fafafa",
        },
        muted: {
          DEFAULT: "#27272a", // Zinc 800
          foreground: "#a1a1aa", // Zinc 400
        },
        accent: {
          DEFAULT: "#27272a", // Zinc 800
          foreground: "#fafafa",
        },
        destructive: {
          DEFAULT: "#ef4444", // Red 500
          foreground: "#fafafa",
        },
        border: "#27272a", // Zinc 800
        input: "#27272a", // Zinc 800
        ring: "#2563eb", // Blue 600
      },
    },
  },
  plugins: [],
};