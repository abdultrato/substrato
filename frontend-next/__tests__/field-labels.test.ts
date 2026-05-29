import { describe, expect, it } from "vitest"

import { buildFormSpec } from "@/lib/openapi/formBuilder"
import { fieldLabel } from "@/lib/ui/fieldLabels"

describe("field labels", () => {
  it("traduz campos comuns de identidade e auditoria para português", () => {
    expect(fieldLabel({ name: "first_name", title: "First name" })).toBe("Nome próprio")
    expect(fieldLabel({ name: "last_name", title: "Last name" })).toBe("Apelido")
    expect(fieldLabel({ name: "updated_by", title: "Updated by" })).toBe("Atualizado por")
    expect(fieldLabel({ name: "created_at", title: "Created at" })).toBe("Criado em")
  })

  it("traduz padrões relacionais sem expor nomes técnicos em inglês", () => {
    expect(fieldLabel({ name: "patient_name", title: "Patient name" })).toBe("Nome do paciente")
    expect(fieldLabel({ name: "invoice_code", title: "Invoice code" })).toBe("Código da fatura")
    expect(fieldLabel({ name: "vehicle_plate", title: "Vehicle plate" })).toBe("Matrícula do veículo")
    expect(fieldLabel({ name: "owner_phone", title: "Owner phone" })).toBe("Telefone do proprietário")
  })

  it("traduz métricas clínicas, transporte e valores com unidades", () => {
    expect(fieldLabel({ name: "blood_pressure_systolic" })).toBe("Pressão arterial sistólica")
    expect(fieldLabel({ name: "heart_rate_bpm" })).toBe("Frequência cardíaca (bpm)")
    expect(fieldLabel({ name: "actual_distance_km" })).toBe("Distância real (km)")
    expect(fieldLabel({ name: "duration_minutes" })).toBe("Duração (minutos)")
  })

  it("gera rótulos portugueses nos formulários construídos por OpenAPI", () => {
    const spec = buildFormSpec("/therapy/prescription_link/", "post")
    const labelsByName = new Map(spec?.fields.map((field) => [field.name, field.label]))

    expect(labelsByName.get("prescription_item")).toBe("Item de prescrição")
    expect(labelsByName.get("plan")).toBe("Plano")
  })
})
