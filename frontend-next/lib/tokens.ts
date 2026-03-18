// Tokens agora são mantidos em cookies HttpOnly pelo backend.
// Mantemos helpers no‑op para compatibilidade futura, caso precise migrar novamente.
export function getAccessToken(): string | null {
  return null
}

export function getRefreshToken(): string | null {
  return null
}

export function setTokens(_: { access?: string; refresh?: string }) {
  // noop
}

export function clearTokens() {
  // noop
}
