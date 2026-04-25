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
    },
  },

  plugins: [],
}
