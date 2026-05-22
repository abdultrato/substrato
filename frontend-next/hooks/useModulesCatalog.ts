"use client"

import { useQuery } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api"
import {
  discoverModulesFromOpenApiSchema,
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

const MODULES_WITH_OPENAPI_FALLBACK = mergeModules(
  MODULES,
  discoverModulesFromOpenApiSchema()
)

async function fetchModulesCatalog(): Promise<ModuleGroup[]> {
  try {
    const apiRoot = await apiFetch<Record<string, unknown>>("/")
    const discovered = discoverModulesFromApiRoot(apiRoot || {})
    if (!discovered.length) return MODULES_WITH_OPENAPI_FALLBACK
    return mergeModules(MODULES_WITH_OPENAPI_FALLBACK, discovered)
  } catch {
    return MODULES_WITH_OPENAPI_FALLBACK
  }
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

  const baseModules = query.data ?? MODULES_WITH_OPENAPI_FALLBACK

  return {
    modules: filterModulesByWorkspaceScope(baseModules, effectiveScope),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
  }
}

