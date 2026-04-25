const substratoPalette = {
  50: "#F6F3FF",
  100: "#EDE7FF",
  200: "#D9CCFF",
  300: "#B89FFF",
  400: "#903CFC",
  500: "#8430FC",
  600: "#7830F0",
  700: "#6024CC",
  800: "#4818A8",
  900: "#300C84",
  950: "#180054",
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      colors: {
        substrato: substratoPalette,
        slate: substratoPalette,
        gray: substratoPalette,
        background: "hsl(var(--background-hsl) / <alpha-value>)",
        foreground: "hsl(var(--foreground-hsl) / <alpha-value>)",
        "foreground-2": "hsl(var(--foreground-2-hsl) / <alpha-value>)",
        card: "hsl(var(--card-hsl) / <alpha-value>)",
        "card-foreground": "hsl(var(--card-foreground-hsl) / <alpha-value>)",
        muted: "hsl(var(--muted-hsl) / <alpha-value>)",
        "muted-2": "hsl(var(--muted-2-hsl) / <alpha-value>)",
        "muted-foreground": "hsl(var(--muted-foreground-hsl) / <alpha-value>)",
        border: "hsl(var(--border-hsl) / <alpha-value>)",
        ring: "hsl(var(--ring-hsl) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary-hsl) / <alpha-value>)",
          hover: "hsl(var(--primary-hover-hsl) / <alpha-value>)",
          soft: "hsl(var(--primary-soft-hsl) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground-hsl) / <alpha-value>)",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.985)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "scale-in": "scale-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        // Legacy aliases (keep existing class names)
        fadeIn: "fade-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        scaleIn: "scale-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [],
}
