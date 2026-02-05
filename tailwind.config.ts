import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // <--- Arreglado (sin corchetes)
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [], // <--- Quitamos el plugin que daba error para evitar problemas
};
export default config;