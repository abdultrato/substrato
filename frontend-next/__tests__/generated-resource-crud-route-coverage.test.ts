import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { hasOpenApiMethod } from "@/lib/openapi/writeContract"

type ListRouteTarget = {
  file: string
  routePath: string
  routeDir: string
  endpoint: string
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      walk(full, acc)
      continue
    }
    acc.push(full)
  }
  return acc
}

function normalizeRoutePath(value: string): string {
  const clean = String(value || "").replace(/\\/g, "/").replace(/\/page\.tsx$/, "")
  if (!clean || clean === ".") return "/"
  return `/${clean}`.replace(/\/+/g, "/").replace(/\/$/, "") || "/"
}

function routePathForFile(file: string): string {
  const appRoot = resolve(process.cwd(), "app")
  const rel = relative(appRoot, file)
  return normalizeRoutePath(rel)
}

function collectGeneratedListRoutes(): ListRouteTarget[] {
  const appRoot = resolve(process.cwd(), "app")
  const files = walk(appRoot).filter((file) => file.endsWith("page.tsx"))
  const re = /GeneratedResourceListPage\s+endpoint="([^"]+)"/g
  const targets: ListRouteTarget[] = []

  for (const file of files) {
    const relativeFile = relative(process.cwd(), file).replace(/\\/g, "/")
    if (relativeFile.startsWith("app/resources/")) continue

    const content = readFileSync(file, "utf-8")
    for (const match of content.matchAll(re)) {
      targets.push({
        file: relativeFile,
        routePath: routePathForFile(file),
        routeDir: dirname(file),
        endpoint: match[1],
      })
    }
  }

  return targets
}

function detailEndpoint(endpoint: string): string {
  return `${String(endpoint || "").replace(/\/$/, "")}/{id}/`
}

describe("generated resource CRUD route coverage", () => {
  it("adds create, detail and edit pages whenever the OpenAPI contract supports them", () => {
    const missing: string[] = []

    for (const target of collectGeneratedListRoutes()) {
      const detail = detailEndpoint(target.endpoint)

      if (hasOpenApiMethod(target.endpoint, "post") && !existsSync(join(target.routeDir, "new", "page.tsx"))) {
        missing.push(`${target.file}: missing ${target.routePath}/new for ${target.endpoint}`)
      }

      if (hasOpenApiMethod(detail, "get") && !existsSync(join(target.routeDir, "[id]", "page.tsx"))) {
        missing.push(`${target.file}: missing ${target.routePath}/[id] for ${detail}`)
      }

      const canEdit = hasOpenApiMethod(detail, "put") || hasOpenApiMethod(detail, "patch")
      if (canEdit && !existsSync(join(target.routeDir, "[id]", "edit", "page.tsx"))) {
        missing.push(`${target.file}: missing ${target.routePath}/[id]/edit for ${detail}`)
      }
    }

    expect(missing).toEqual([])
  })
})
