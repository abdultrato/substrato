"use client"

import { usePathname } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import {
  isOperationalScope,
  readStoredWorkspaceScope,
  resolveWorkspaceScope,
  type WorkspaceScope,
  writeStoredWorkspaceScope,
} from "@/lib/workspaceScope"

export function useWorkspaceScope(): WorkspaceScope {
  const pathname = usePathname() || "/"
  const [storedScope, setStoredScope] = useState<WorkspaceScope | null | undefined>(undefined)

  useEffect(() => {
    setStoredScope(readStoredWorkspaceScope())
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
