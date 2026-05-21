import { describe, expect, it } from "vitest"

import {
  createInternalNavigationIntent,
  getPathFromSameOriginHref,
  normalizeNavigationPath,
  serializeInternalNavigationIntent,
  shouldShowRestrictionNotice,
} from "@/lib/accessRedirect"

describe("access redirect routing intent", () => {
  it("normalizes path and query consistently", () => {
    expect(normalizeNavigationPath("/education/")).toBe("/education")
    expect(normalizeNavigationPath("/education/?tab=1")).toBe("/education?tab=1")
    expect(normalizeNavigationPath("education/student")).toBe("/education/student")
    expect(normalizeNavigationPath("https://app.local/education/student/?page=2")).toBe(
      "/education/student?page=2",
    )
  })

  it("treats missing or invalid intent as manual path access", () => {
    expect(
      shouldShowRestrictionNotice({
        currentPath: "/patients",
        intentRaw: null,
      }),
    ).toBe(true)

    expect(
      shouldShowRestrictionNotice({
        currentPath: "/patients",
        intentRaw: "{\"invalid\":true}",
      }),
    ).toBe(true)
  })

  it("keeps access-denied hidden for recent internal navigation", () => {
    const now = 10_000
    const intent = createInternalNavigationIntent("/patients", now - 500)
    const intentRaw = serializeInternalNavigationIntent(intent)

    expect(
      shouldShowRestrictionNotice({
        currentPath: "/patients",
        intentRaw,
        nowMs: now,
      }),
    ).toBe(false)
  })

  it("shows access-denied when intent is stale or path mismatched", () => {
    const now = 20_000
    const intent = createInternalNavigationIntent("/patients", now - 20_000)
    const staleRaw = serializeInternalNavigationIntent(intent)

    expect(
      shouldShowRestrictionNotice({
        currentPath: "/patients",
        intentRaw: staleRaw,
        nowMs: now,
      }),
    ).toBe(true)

    const mismatchRaw = serializeInternalNavigationIntent(
      createInternalNavigationIntent("/healthcare", now - 100),
    )

    expect(
      shouldShowRestrictionNotice({
        currentPath: "/patients",
        intentRaw: mismatchRaw,
        nowMs: now,
      }),
    ).toBe(true)
  })

  it("accepts relative and same-origin href and blocks cross-origin href", () => {
    expect(getPathFromSameOriginHref("/education/resources?page=2", "https://app.substrato.local")).toBe(
      "/education/resources?page=2",
    )
    expect(
      getPathFromSameOriginHref(
        "https://app.substrato.local/healthcare?x=1",
        "https://app.substrato.local",
      ),
    ).toBe("/healthcare?x=1")
    expect(
      getPathFromSameOriginHref(
        "https://outro-dominio.local/healthcare",
        "https://app.substrato.local",
      ),
    ).toBeNull()
  })
})
