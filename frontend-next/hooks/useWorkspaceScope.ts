"use client"

import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import {
  isOperationalScope,
  readStoredWorkspaceScope,
  resolveWorkspaceScope,
  WORKSPACE_SCOPE_CHANGED_EVENT,
  type WorkspaceScope,
  writeStoredWorkspaceScope,
} from "@/lib/workspaceScope"

export function useWorkspaceScope(): WorkspaceScope {
  const pathname = usePathname() || "/"
  const [storedScope, setStoredScope] = useState<WorkspaceScope | null | undefined>(undefined)

  useEffect(() => {
    setStoredScope(readStoredWorkspaceScope())
    function onScopeChanged() {
      setStoredScope(readStoredWorkspaceScope())
    }
    window.addEventListener(WORKSPACE_SCOPE_CHANGED_EVENT, onScopeChanged)
    window.addEventListener("storage", onScopeChanged)
    return () => {
      window.removeEventListener(WORKSPACE_SCOPE_CHANGED_EVENT, onScopeChanged)
      window.removeEventListener("storage", onScopeChanged)
    }
  }, [])

  const activeScope = useMemo(
    () => resolveWorkspaceScope(pathname, storedScope ?? null),
    [pathname, storedScope]
  )

  useEffect(() => {
    if (storedScope === undefined) return
    if (!isOperationalScope(activeScope)) return
    if (storedScope === activeScope) return

    writeStoredWorkspaceScope(activeScope)
    setStoredScope(activeScope)
  }, [activeScope, storedScope])

  return activeScope
}
