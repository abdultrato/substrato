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

// Resources whose list page is a dedicated custom page (not the generic PublicHealthListPage).
const CUSTOM_LIST_KEYS = new Set<string>(["lot", "vaccine", "campaign"])
// Individual create/detail/edit routes that are dedicated custom pages, keyed by `${key}:${suffix}`.
const CUSTOM_ROUTES = new Set<string>([
  "lot:new/page.tsx",
  "lot:[id]/page.tsx",
  "lot:[id]/edit/page.tsx",
  "vaccine:[id]/page.tsx",
  "vaccine:[id]/edit/page.tsx",
])

function filePath(relativePath: string) {
  return resolve(process.cwd(), relativePath)
}

function readRoute(relativePath: string) {
  return readFileSync(filePath(relativePath), "utf-8")
}

describe("public health dedicated routes", () => {
  it("renders the hub dashboard with the normalized card contract", () => {
    const source = readFileSync(filePath("components/public-health/PublicHealthHubPage.tsx"), "utf-8")

    expect(source).toContain("dashboard.cards.map")
    expect(source).toContain("normalizeCard")
    expect(source).toContain("buildLegacyCards")
    expect(source).not.toContain("QueuePanel")
    expect(source).not.toContain("PANEL_THEMES")
  })

  it("uses dedicated list pages instead of generic resource redirects", () => {
    for (const resource of resources) {
      const source = readRoute(`app/public-health/${resource.segment}/page.tsx`)

      if (CUSTOM_LIST_KEYS.has(resource.key)) {
        expect(source).toContain(`/public_health/${resource.key}/`)
        expect(source).not.toContain("resourceKey=")
      } else {
        expect(source).toContain("PublicHealthListPage")
        expect(source).toContain(`resourceKey="${resource.key}"`)
      }
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
        // Some routes use dedicated custom create/detail/edit pages instead of the generic resource pages.
        if (CUSTOM_ROUTES.has(`${resource.key}:${check.suffix}`)) {
          expect(source).toContain(`/public_health/${resource.key}/`)
          expect(source).not.toContain("resourceKey=")
        } else {
          expect(source).toContain(check.component)
          expect(source).toContain(`resourceKey="${resource.key}"`)
        }
        expect(source).not.toContain("GeneratedResource")
        expect(source).not.toContain("/resources/public_health")
      }
    }
  })
})
