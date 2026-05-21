"use client"

import { useQuery } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api"
import {
  MODULES,
  discoverModulesFromApiRoot,
  mergeModules,
  type ModuleGroup,
} from "@/lib/modules"
import { useWorkspaceScope } from "@/hooks/useWorkspaceScope"
import {
  filterModulesByWorkspaceScope,
  type WorkspaceScope,
} from "@/lib/workspaceScope"

async function fetchModulesCatalog(): Promise<ModuleGroup[]> {
  const apiRoot = await apiFetch<Record<string, unknown>>("/")
  const discovered = discoverModulesFromApiRoot(apiRoot || {})
  if (!discovered.length) return MODULES
  return mergeModules(MODULES, discovered)
}

export function useModulesCatalog(scope?: WorkspaceScope) {
  const inferredScope = useWorkspaceScope()
  const effectiveScope = scope ?? inferredScope

  const query = useQuery<ModuleGroup[]>({
    queryKey: ["modules-catalog"],
    queryFn: fetchModulesCatalog,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const baseModules = query.data ?? MODULES

  return {
    modules: filterModulesByWorkspaceScope(baseModules, effectiveScope),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
  }
}

