type LabelsByField = Record<string, string>

const INTERNAL_FIELDS = new Set([
  "id",
  "created_at",
  "updated_at",
  "custom_id",
  "deleted",
  "deleted_at",
  "version",
  "created_by",
  "updated_by",
  "deleted_by",
  "tenant",
])

const COMMON_LABELS: LabelsByField = {
  name: "Nome",
  description: "Descrição",
  notes: "Observações",
  location: "Localização",
  status: "Estado",
  is_active: "Ativo",
  active: "Ativo",
  created_at: "Criado em",
  updated_at: "Atualizado em",
}

const BLOODBANK_LABELS: Record<string, LabelsByField> = {
  armazenamento: {
    name: "Nome",
    location: "Localização",
    capacity_units: "Capacidade (unidades)",
    temperature_min_c: "Temperatura mínima (°C)",
    temperature_max_c: "Temperatura máxima (°C)",
    is_active: "Ativo",
    last_validation_at: "Última validação",
    notes: "Observações",
  },
  manutencaoarmazenamento: {
    storage: "Armazenamento",
    maintenance_type: "Tipo de manutenção",
    status: "Estado",
    scheduled_at: "Agendada para",
    performed_at: "Executada em",
    next_due_at: "Próxima manutenção",
    technician_name: "Técnico responsável",
    findings: "Achados",
    actions_taken: "Ações executadas",
    notes: "Observações",
  },
  doacao: {
    bag_identifier: "Bolsa (identificador)",
    donor: "Doador",
    donor_role: "Tipo de doador",
    donation_type: "Tipo de doação",
    blood_type: "Tipo sanguíneo",
    status: "Estado",
    screening_status: "Triagem",
    collected_at: "Coleta",
    processed_at: "Processamento",
    volume_ml: "Volume (mL)",
    notes: "Observações",
  },
  unidade: {
    unit_number: "Número da unidade",
    component_type: "Componente",
    status: "Estado",
    donation: "Doação",
    storage: "Armazenamento",
    reserved_for: "Reservada para",
    collected_at: "Coleta",
    expires_at: "Validade",
    notes: "Observações",
  },
  transfusao: {
    recipient: "Paciente",
    blood_unit: "Unidade",
    status: "Estado",
    requested_at: "Solicitada em",
    started_at: "Iniciada em",
    finished_at: "Concluída em",
    indication: "Indicação",
    notes: "Observações",
  },
  movimentoestoque: {
    movement_type: "Tipo de movimento",
    unit: "Unidade",
    source_storage: "Origem",
    destination_storage: "Destino",
    moved_at: "Movimentado em",
    reason: "Motivo",
    notes: "Observações",
  },
}

function normalizeEndpoint(endpoint?: string): string {
  const raw = String(endpoint || "")
  return raw.split("?")[0].split("#")[0]
}

export function bloodbankResourceKeyFromEndpoint(endpoint?: string): string | null {
  const e = normalizeEndpoint(endpoint)
  // Matches both collection and detail endpoints:
  // - /bloodbank/armazenamento/
  // - /bloodbank/armazenamento/123/
  const m = e.match(/\/bloodbank\/([^/]+)(?:\/|$)/)
  return m?.[1] || null
}

export function isInternalField(name: string): boolean {
  return INTERNAL_FIELDS.has(String(name || ""))
}

function humanizeSnakeCase(name: string): string {
  const s = String(name || "").trim()
  if (!s) return ""
  const parts = s.split("_").filter(Boolean)
  const words = parts.map((p) => {
    if (p === "id") return "ID"
    if (p === "ml") return "mL"
    if (p === "c") return "°C"
    return p
  })
  const title = words
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
  return title || s
}

export function fieldLabel(opts: {
  endpoint?: string
  name: string
  title?: string
}): string {
  const name = String(opts.name || "")
  const title = typeof opts.title === "string" ? opts.title.trim() : ""

  const resourceKey = bloodbankResourceKeyFromEndpoint(opts.endpoint)
  if (resourceKey && BLOODBANK_LABELS[resourceKey]?.[name]) {
    return BLOODBANK_LABELS[resourceKey][name]
  }

  if (COMMON_LABELS[name]) return COMMON_LABELS[name]

  // If OpenAPI provides a real label, prefer it.
  if (title && title.toLowerCase() !== name.toLowerCase()) return title

  return humanizeSnakeCase(name)
}
