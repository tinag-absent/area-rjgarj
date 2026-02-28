import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(220, 30%, 8%)",
        foreground: "hsl(210, 20%, 90%)",
        card: "hsl(220, 25%, 12%)",
        primary: "hsl(180, 70%, 50%)",
        secondary: "hsl(215, 30%, 20%)",
        muted: "hsl(215, 30%, 15%)",
        "muted-foreground": "hsl(215, 20%, 60%)",
        accent: "hsl(180, 50%, 15%)",
        destructive: "hsl(0, 70%, 50%)",
        border: "hsl(215, 30%, 20%)",
        sidebar: "hsl(220, 30%, 6%)",
        "sidebar-primary": "hsl(180, 70%, 50%)",
        "sidebar-accent": "hsl(215, 30%, 15%)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
        display: ["var(--font-space-grotesk)", "sans-serif"],
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        fadeIn: "fadeIn 0.5s ease-in-out",
        scanline: "scanline 8s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
