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
    extend: {},
  },

  plugins: [],
}
