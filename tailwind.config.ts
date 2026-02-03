import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        muted: "#f0e9df",
        "muted-foreground": "#5d5a52",
        border: "#d7cdbf",
        background: "#fffaf4",
        foreground: "#1f1f1b",
        popover: "#fffaf4",
        "popover-foreground": "#1f1f1b",
        accent: "#e7f1ed",
        "accent-foreground": "#1f1f1b"
      }
    }
  },
  plugins: []
};

export default config;
