// Single source of truth for the brand mark used across the app
// (login, header, sidebar, ...). Assets live in static/img/ (proxied to
// Django): logo.png (purple, favicon/PDF/admin), logo-preta.png (black,
// light theme) and logo-branca.png (white, dark theme). Theme switching in
// the app chrome happens via the --substrato-logo-url CSS variable in
// globals.css (:root -> preta, .dark -> branca).
//
// The `?v=` tag is a cache-buster: the logos are served from stable URLs
// with weak caching, so browsers can hold a stale copy after a file is
// replaced. Bump LOGO_VERSION whenever any of the images change — and keep
// the `?v=` in globals.css in sync.
export const LOGO_VERSION = "4";
export const LOGO_SRC = `/static/img/logo.png?v=${LOGO_VERSION}`;
export const LOGO_LIGHT_SRC = `/static/img/logo-preta.png?v=${LOGO_VERSION}`;
export const LOGO_DARK_SRC = `/static/img/logo-branca.png?v=${LOGO_VERSION}`;
