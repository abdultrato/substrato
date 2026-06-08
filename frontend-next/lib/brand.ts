// Single source of truth for the brand mark used across the app
// (login, header, sidebar, ...). Always the asset at static/img/logo.png.
//
// The `?v=` tag is a cache-buster: the logo is served from a stable URL
// (proxied to Django) with weak caching, so browsers can hold a stale copy
// after the file is replaced. Bump LOGO_VERSION whenever static/img/logo.png
// changes to force clients to fetch the new image.
export const LOGO_VERSION = "3";
export const LOGO_SRC = `/static/img/logo.png?v=${LOGO_VERSION}`;
