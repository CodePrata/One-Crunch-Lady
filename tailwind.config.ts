import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./emails/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        mobile: "375px",
        tablet: "768px",
        desktop: "1280px",
      },
      colors: {
        "hero-yellow": "#FFD700",
        "power-red": "#D32F2F",
        "cookie-brown": "#8D6E63",
        "flour-white": "#FAFAFA",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Arial", "sans-serif"],
        display: ["var(--font-bangers)", "Impact", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
