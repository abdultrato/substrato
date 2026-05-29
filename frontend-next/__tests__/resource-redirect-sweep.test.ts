import { createRequire } from "node:module"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { describe, expect, it } from "vitest"

type RedirectRoute = { source: string; destination: string; permanent: boolean }

const require = createRequire(import.meta.url)
const createNextConfig = require("../next.config.js")

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

describe("module resource routes", () => {
  it("does not keep module pages that redirect back to /resources", () => {
    const appRoot = resolve(process.cwd(), "app")
    const resourceRedirectPattern = /\bredirect\s*\(\s*["'`]\/resources(?:\/|["'`])/
    const offenders = walk(appRoot)
      .filter((file) => file.endsWith("page.tsx"))
      .filter((file) => resourceRedirectPattern.test(readFileSync(file, "utf-8")))
      .map((file) => relative(process.cwd(), file).replace(/\\/g, "/"))

    expect(offenders).toEqual([])
  })

  it("does not configure redirects back to generic /resources routes", async () => {
    const config = createNextConfig("phase-production-build")
    const redirects = (await config.redirects()) as RedirectRoute[]
    const offenders = redirects
      .filter((route) => route.destination === "/resources" || route.destination.startsWith("/resources/"))
      .map((route) => `${route.source} -> ${route.destination}`)

    expect(offenders).toEqual([])
  })
})
