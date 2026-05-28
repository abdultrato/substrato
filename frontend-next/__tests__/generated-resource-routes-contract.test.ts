import { createRequire } from "module"
import { readdirSync, readFileSync, statSync } from "fs"
import { join, relative, resolve } from "path"

import { describe, expect, it } from "vitest"

import { hasOpenApiMethod } from "@/lib/openapi/writeContract"

const require = createRequire(import.meta.url)
const createNextConfig = require("../next.config.js")

type GeneratedPageKind = "List" | "Create" | "Detail" | "Edit"
type RedirectRoute = { source: string; destination: string; permanent: boolean }
type GeneratedRouteTarget = {
  file: string
  routePath: string
  endpoint: string
  kind: GeneratedPageKind
}

function walk(dir: string, acc: string[] = []): string[] {
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
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

function collectGeneratedRouteTargets(): GeneratedRouteTarget[] {
  const appRoot = resolve(process.cwd(), "app")
  const files = walk(appRoot).filter((file) => file.endsWith("page.tsx"))
  const targets: GeneratedRouteTarget[] = []
  const re = /GeneratedResource(List|Create|Detail|Edit)Page\s+endpoint="([^"]+)"/g

  for (const file of files) {
    const content = readFileSync(file, "utf-8")
    for (const match of content.matchAll(re)) {
      targets.push({
        file: relative(process.cwd(), file).replace(/\\/g, "/"),
        routePath: routePathForFile(file),
        endpoint: match[2],
        kind: match[1] as GeneratedPageKind,
      })
    }
  }

  return targets
}

function contractEndpointFor(target: GeneratedRouteTarget): string {
  const detail = target.kind === "Detail" || target.kind === "Edit"
  const clean = String(target.endpoint || "").replace(/\/$/, "")
  return `${clean}/${detail ? "{id}/" : ""}`
}

function hasOpenApiContract(target: GeneratedRouteTarget): boolean {
  const endpoint = contractEndpointFor(target)
  if (target.kind === "List" || target.kind === "Detail") return hasOpenApiMethod(endpoint, "get")
  if (target.kind === "Create") return hasOpenApiMethod(endpoint, "post")
  return hasOpenApiMethod(endpoint, "put") || hasOpenApiMethod(endpoint, "patch")
}

function routePatternMatches(source: string, routePath: string): boolean {
  const normalizedSource = source.replace(/\/$/, "")
  const normalizedRoute = routePath.replace(/\/$/, "")

  if (normalizedSource.endsWith("/:path*")) {
    const base = normalizedSource.replace(/\/:path\*$/, "")
    return normalizedRoute === base || normalizedRoute.startsWith(`${base}/`)
  }

  const sourceSegments = normalizedSource.split("/").filter(Boolean)
  const routeSegments = normalizedRoute.split("/").filter(Boolean)
  if (sourceSegments.length !== routeSegments.length) return false

  return sourceSegments.every((segment, index) => {
    if (segment.startsWith(":")) return true
    return segment === routeSegments[index]
  })
}

async function redirects(): Promise<RedirectRoute[]> {
  const config = createNextConfig("phase-production-build")
  return await config.redirects()
}

describe("generated resource route contracts", () => {
  it("keeps generated pages active only when OpenAPI exposes the backing method", { timeout: 30000 }, async () => {
    const targets = collectGeneratedRouteTargets()
    const redirectRules = await redirects()
    const failures = targets
      .filter((target) => !hasOpenApiContract(target))
      .filter((target) => !redirectRules.some((route) => routePatternMatches(route.source, target.routePath)))
      .map(
        (target) =>
          `${target.file}: ${target.kind} ${target.endpoint} sem contrato ${contractEndpointFor(target)} nem redirect`
      )

    expect(targets.length).toBeGreaterThan(0)
    expect(failures).toEqual([])
  })
})
