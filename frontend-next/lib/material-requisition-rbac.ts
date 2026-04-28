import { GROUPS } from "@/lib/rbac"
import { SessionUser } from "@/lib/session"

function normalizeGroupName(value: string): string {
  return (value || "")
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

const PHARMACY_BLOCKED_GROUPS = new Set([
  normalizeGroupName(GROUPS.ADMIN),
  normalizeGroupName(GROUPS.FARMACIA),
])

function normalizedUserGroups(user: SessionUser | null): string[] {
  return (user?.groups ?? []).map(normalizeGroupName).filter(Boolean)
}

export function isMaterialRequisitionPharmacyUser(user: SessionUser | null): boolean {
  if (!user) return false
  if (user.is_superuser) return true

  const groups = new Set(normalizedUserGroups(user))
  return (
    groups.has(normalizeGroupName(GROUPS.ADMIN)) ||
    groups.has(normalizeGroupName(GROUPS.FARMACIA))
  )
}

export function canCreateMaterialRequisition(user: SessionUser | null): boolean {
  if (!user) return false
  if (user.is_superuser) return true

  const groups = normalizedUserGroups(user)
  if (!groups.length) return false

  return groups.some((groupName) => !PHARMACY_BLOCKED_GROUPS.has(groupName))
}
