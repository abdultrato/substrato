import type { SessionUser } from "@/lib/session"
import {
  getAccessiblePlatformChoices,
  getDefaultWorkspaceHref,
  getPlatformChoiceHomeHref,
  type PlatformChoiceKey,
} from "@/lib/rbac"
import { readStoredWorkspaceScope, type WorkspaceScope } from "@/lib/workspaceScope"

const WORKSPACE_SCOPE_PLATFORM: Partial<Record<WorkspaceScope, PlatformChoiceKey>> = {
  healthcare: "health",
  education: "education",
  "transport-logistics": "erp-wms",
}

export function isWorkspaceChoicePath(path: string | null): boolean {
  if (!path) return false
  return path === "/workspaces" || path.startsWith("/workspaces?")
}

export function getSmartPostLoginTarget(sessionUser: SessionUser | null, explicitNext: string | null): string {
  if (explicitNext && !isWorkspaceChoicePath(explicitNext)) return explicitNext

  const platforms = getAccessiblePlatformChoices(sessionUser)
  const storedScope = readStoredWorkspaceScope()
  const storedPlatform = storedScope ? WORKSPACE_SCOPE_PLATFORM[storedScope] : null

  if (storedPlatform && platforms.some((platform) => platform.key === storedPlatform)) {
    return getPlatformChoiceHomeHref(sessionUser, storedPlatform)
  }

  if (platforms.length === 1) {
    return getPlatformChoiceHomeHref(sessionUser, platforms[0].key)
  }

  return getDefaultWorkspaceHref(sessionUser)
}
