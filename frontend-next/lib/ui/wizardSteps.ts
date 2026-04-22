import { bloodbankResourceKeyFromEndpoint } from "@/lib/ui/fieldLabels"
import type { FormField } from "@/lib/openapi/formBuilder"

export type WizardStep = {
  key: string
  title: string
  description?: string
  fields: string[]
}

function keepExisting(fields: FormField[], names: string[]): string[] {
  const set = new Set(fields.map((f) => f.name))
  return names.filter((n) => set.has(n))
}

function isLongTextField(name: string): boolean {
  return new Set([
    "notes",
    "findings",
    "actions_taken",
    "indication",
    "description",
    "reason",
  ]).has(name)
}

export function wizardStepsFor(endpoint: string, writableFields: FormField[]): WizardStep[] | null {
  const resourceKey = bloodbankResourceKeyFromEndpoint(endpoint)
  if (!resourceKey) return null

  // Bloodbank: curated steps for the most important flows.
  if (resourceKey === "armazenamento") {
    return [
      {
        key: "basico",
        title: "Dados básicos",
        description: "Identifique o armazenamento e onde fica.",
        fields: keepExisting(writableFields, ["name", "location", "is_active"]),
      },
      {
        key: "capacidade",
        title: "Capacidade e temperatura",
        description: "Defina limites e capacidade operacional.",
        fields: keepExisting(writableFields, ["capacity_units", "temperature_min_c", "temperature_max_c"]),
      },
      {
        key: "validacao",
        title: "Validação e observações",
        description: "Informações complementares.",
        fields: keepExisting(writableFields, ["last_validation_at", "notes"]),
      },
    ].filter((s) => s.fields.length)
  }

  if (resourceKey === "manutencaoarmazenamento") {
    return [
      {
        key: "planeamento",
        title: "Planeamento",
        description: "O que será feito e em qual armazenamento.",
        fields: keepExisting(writableFields, ["storage", "maintenance_type", "status"]),
      },
      {
        key: "datas",
        title: "Datas",
        description: "Quando está agendado e quando foi executado.",
        fields: keepExisting(writableFields, ["scheduled_at", "performed_at", "next_due_at"]),
      },
      {
        key: "execucao",
        title: "Execução",
        description: "Responsável, achados e ações realizadas.",
        fields: keepExisting(writableFields, ["technician_name", "findings", "actions_taken", "notes"]),
      },
    ].filter((s) => s.fields.length)
  }

  // Default (other bloodbank endpoints): required first, then the rest split by size.
  const required = writableFields.filter((f) => f.required).map((f) => f.name)
  const optional = writableFields.filter((f) => !f.required).map((f) => f.name)

  const optionalShort = optional.filter((n) => !isLongTextField(n))
  const optionalLong = optional.filter((n) => isLongTextField(n))

  const steps: WizardStep[] = [
    { key: "obrigatorio", title: "Obrigatório", description: "Preencha os campos essenciais.", fields: required },
    { key: "detalhes", title: "Detalhes", description: "Complete os dados adicionais.", fields: optionalShort },
    { key: "observacoes", title: "Observações", description: "Texto livre e notas.", fields: optionalLong },
  ].filter((s) => s.fields.length)

  // Keep at least 2 steps if possible.
  if (steps.length <= 1) return null
  return steps
}

