import { describe, expect, it } from "vitest"
import { getAccessGrantedRoleLabel } from "@/lib/rbac"

describe("getAccessGrantedRoleLabel", () => {
  it("maps the main access profiles to the expected role labels", () => {
    expect(getAccessGrantedRoleLabel({ groups: ["Administrador"] } as any)).toBe("administrador")
    expect(getAccessGrantedRoleLabel({ groups: ["Recepcionista"] } as any)).toBe("recepcionista")
    expect(getAccessGrantedRoleLabel({ groups: ["Contabilidade"] } as any)).toBe("contabilista")
    expect(getAccessGrantedRoleLabel({ groups: ["Técnico de Laboratório"] } as any)).toBe("laboratorista")
    expect(getAccessGrantedRoleLabel({ groups: ["Enfermeiro"] } as any)).toBe("enfermeiro")
  })

  it("returns null for profiles without a mapped role", () => {
    expect(getAccessGrantedRoleLabel({ groups: ["Professor"] } as any)).toBeNull()
  })
})
