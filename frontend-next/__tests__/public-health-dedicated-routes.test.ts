import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const resources = [
  { segment: "vaccines", key: "vaccine" },
  { segment: "lots", key: "lot" },
  { segment: "campaigns", key: "campaign" },
  { segment: "targets", key: "target" },
  { segment: "immunizations", key: "immunization" },
  { segment: "adverse-events", key: "adverse_event" },
  { segment: "notifications", key: "notification" },
] as const

const routeChecks = [
  { suffix: "new/page.tsx", component: "PublicHealthCreatePage" },
  { suffix: "[id]/page.tsx", component: "PublicHealthDetailPage" },
  { suffix: "[id]/edit/page.tsx", component: "PublicHealthEditPage" },
] as const

function filePath(relativePath: string) {
  return resolve(process.cwd(), relativePath)
}

function readRoute(relativePath: string) {
  return readFileSync(filePath(relativePath), "utf-8")
}

describe("public health dedicated routes", () => {
  it("uses dedicated list pages instead of generic resource redirects", () => {
    for (const resource of resources) {
      const source = readRoute(`app/public-health/${resource.segment}/page.tsx`)

      expect(source).toContain("PublicHealthListPage")
      expect(source).toContain(`resourceKey="${resource.key}"`)
      expect(source).not.toContain("redirect(")
      expect(source).not.toContain("/resources/public_health")
    }
  })

  it("provides create, detail and edit routes for every public health resource", () => {
    for (const resource of resources) {
      for (const check of routeChecks) {
        const routePath = `app/public-health/${resource.segment}/${check.suffix}`

        expect(existsSync(filePath(routePath))).toBe(true)

        const source = readRoute(routePath)
        expect(source).toContain(check.component)
        expect(source).toContain(`resourceKey="${resource.key}"`)
        expect(source).not.toContain("GeneratedResource")
        expect(source).not.toContain("/resources/public_health")
      }
    }
  })
})
