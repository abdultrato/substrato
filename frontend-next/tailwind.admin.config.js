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
  // The Django admin (and Jazzmin) already ships with its own base CSS.
  // Disable preflight to avoid fighting Bootstrap / admin defaults.
  corePlugins: { preflight: false },

  // We only use Tailwind here via `@apply` in a dedicated CSS file.
  // Keep content empty to avoid bundling the entire Next.js utility set.
  content: [],

  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        substrato: substratoPalette,
        slate: substratoPalette,
        gray: substratoPalette,
      },
      // Sombras modernas em camadas (contacto + ambiente difusa), em sincronia
      // com os tokens --shadow-* de frontend-next/app/globals.css.
      boxShadow: {
        sm: '0 1px 2px rgba(15, 23, 42, 0.05), 0 2px 8px -2px rgba(15, 23, 42, 0.06)',
        DEFAULT: '0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 12px -2px rgba(15, 23, 42, 0.07)',
        md: '0 2px 4px rgba(15, 23, 42, 0.04), 0 8px 20px -6px rgba(15, 23, 42, 0.09)',
        lg: '0 4px 10px rgba(15, 23, 42, 0.05), 0 20px 48px -12px rgba(15, 23, 42, 0.14)',
        xl: '0 8px 16px -6px rgba(15, 23, 42, 0.07), 0 32px 72px -16px rgba(15, 23, 42, 0.18)',
        '2xl': '0 12px 24px -8px rgba(15, 23, 42, 0.08), 0 48px 96px -24px rgba(15, 23, 42, 0.24)',
      },
    },
  },

  plugins: [],
}
