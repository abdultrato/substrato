import { describe, expect, it } from "vitest"

import {
  filterModulesByWorkspaceScope,
  inferWorkspaceScopeFromPath,
  isPathAllowedForScope,
  resolveWorkspaceScope,
  workspaceHomeForScope,
} from "@/lib/workspaceScope"

describe("workspace scope", () => {
  it("infers scope from explicit education and healthcare routes", () => {
    expect(inferWorkspaceScopeFromPath("/education")).toBe("education")
    expect(inferWorkspaceScopeFromPath("/education/resources")).toBe("education")
    expect(inferWorkspaceScopeFromPath("/healthcare")).toBe("healthcare")
  })

  it("keeps healthcare as fallback when route is non-neutral and no selection exists", () => {
    expect(inferWorkspaceScopeFromPath("/patients")).toBe("healthcare")
    expect(resolveWorkspaceScope("/patients", null)).toBe("healthcare")
  })

  it("preserves stored selection on non-explicit routes", () => {
    expect(resolveWorkspaceScope("/patients", "education")).toBe("education")
    expect(resolveWorkspaceScope("/modules", "education")).toBe("education")
  })

  it("switches scope on explicit workspace routes", () => {
    expect(resolveWorkspaceScope("/healthcare", "education")).toBe("healthcare")
    expect(resolveWorkspaceScope("/education", "healthcare")).toBe("education")
  })

  it("filters modules catalog by selected workspace", () => {
    const modules = [
      { key: "education", label: "Educação", resources: [] },
      { key: "clinical", label: "Clínico", resources: [] },
      { key: "billing", label: "Faturamento", resources: [] },
    ]

    expect(filterModulesByWorkspaceScope(modules, "education").map((m) => m.key)).toEqual(["education"])
    expect(filterModulesByWorkspaceScope(modules, "healthcare").map((m) => m.key)).toEqual([
      "clinical",
      "billing",
    ])
  })

  it("enforces path access based on selected workspace", () => {
    expect(isPathAllowedForScope("/resources", "education")).toBe(true)
    expect(isPathAllowedForScope("/education/student", "education")).toBe(true)
    expect(isPathAllowedForScope("/patients", "education")).toBe(false)
    expect(isPathAllowedForScope("/education/student", "healthcare")).toBe(false)
    expect(isPathAllowedForScope("/patients", "healthcare")).toBe(true)
  })

  it("returns the correct workspace home route", () => {
    expect(workspaceHomeForScope("education")).toBe("/education")
    expect(workspaceHomeForScope("healthcare")).toBe("/healthcare")
    expect(workspaceHomeForScope("neutral")).toBe("/workspaces")
  })
})
