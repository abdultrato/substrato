import type { SessionUser } from "@/lib/session"

function asInt(value: any): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null
}

/**
 * Extrai o ID do inquilino/tenant a partir do utilizador logado.
 * Mantém compatibilidade com vários formatos do backend.
 */
export function getTenantIdFromUser(user: SessionUser | null | undefined): number | null {
  if (!user) return null
  const u = user as any

  // Flat fields
  const flatCandidates = [
    u.tenant,
    u.tenant_id,
    u.tenantId,
    u.inquilino,
    u.inquilino_id,
    u.inquilinoId,
  ]
  for (const c of flatCandidates) {
    const v = asInt(c)
    if (v) return v
  }

  // Nested objects
  const nestedCandidates = [
    u.tenant?.id,
    u.tenant?.pk,
    u.inquilino?.id,
    u.inquilino?.pk,
  ]
  for (const c of nestedCandidates) {
    const v = asInt(c)
    if (v) return v
  }

  return null
}

