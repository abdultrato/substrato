import { canonicalModuleGroupKey } from "@/lib/modules"

export type AutoFormStep = {
  titulo: string
  descricao?: string
  campos: string[]
}

export type ResourceFormConfig = {
  esconderCampos?: string[]
  somenteLeituraCampos?: string[]
  ordenarCampos?: string[]
  labels?: Record<string, string>
  placeholders?: Record<string, string>
  hints?: Record<string, string>
  widgets?: Record<string, "textarea">
  etapas?: AutoFormStep[]
  lembrarCampos?: string[]
}

const BLOODBANK_INTERNAL_FIELDS = [
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
]

function normalizeEndpoint(endpoint: string): string {
  const p = String(endpoint || "").split("?")[0].split("#")[0]
  const withSlash = p.startsWith("/") ? p : `/${p}`
  return withSlash.replace(/\/+$/, "") + "/"
}

function bloodbankDoacaoConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant"],
    esconderCampos: BLOODBANK_INTERNAL_FIELDS,
    labels: {
      tenant: "Inquilino (tenant)",
      donor: "Dador (ID)",
      donor_role: "Tipo de dador",
      bag_identifier: "Identificador da bolsa",
      blood_type: "Grupo sanguíneo",
      donation_type: "Tipo de doação",
      status: "Estado",
      screening_status: "Estado da triagem",
      collected_at: "Data/hora da colheita",
      processed_at: "Data/hora do processamento",
      volume_ml: "Volume (mL)",
      collected_by: "Colhido por (ID)",
      replacement_for: "Reposição para (ID)",

      donor_weight_kg: "Peso do dador (kg)",
      donor_height_cm: "Altura do dador (cm)",
      hemoglobin_g_dl: "Hemoglobina (g/dL)",
      blood_pressure_systolic: "Tensão arterial sistólica",
      blood_pressure_diastolic: "Tensão arterial diastólica",
      pulse_bpm: "Pulso (bpm)",
      temperature_c: "Temperatura (°C)",

      hiv_test: "Teste HIV",
      syphilis_rpr_test: "Teste sífilis (RPR)",
      hepatitis_b_hbsag_test: "Hepatite B (HBsAg)",
      hepatitis_c_anti_hcv_test: "Hepatite C (anti-HCV)",
      malaria_test: "Teste malária",
      test_notes: "Notas dos testes",

      contraindications: "Contraindicações",
      notes: "Observações",
    },
    placeholders: {
      tenant: "Ex.: 1",
      donor: "Ex.: 123",
      bag_identifier: "Ex.: BB-2026-000123",
      volume_ml: "Ex.: 450",
      donor_weight_kg: "Ex.: 70",
      hemoglobin_g_dl: "Ex.: 13.5",
      donor_height_cm: "Ex.: 170",
      blood_pressure_systolic: "Ex.: 120",
      blood_pressure_diastolic: "Ex.: 80",
      pulse_bpm: "Ex.: 72",
      temperature_c: "Ex.: 36.6",
      test_notes: "Notas adicionais sobre os testes...",
      contraindications: "Ex.: febre, anemia, medicação recente...",
      notes: "Observações gerais...",
    },
    hints: {
      tenant: "Herdado automaticamente do utilizador logado (se possível).",
      donor: "Informe o ID do dador/paciente/colaborador (conforme o seu modelo).",
      bag_identifier: "Código único da bolsa.",
      collected_by: "Opcional: ID do utilizador/técnico que realizou a colheita.",
      replacement_for: "Opcional: ID de uma doação relacionada (reposições).",
      test_notes: "Use para detalhes que não cabem nos campos de teste.",
    },
    widgets: {
      test_notes: "textarea",
      contraindications: "textarea",
      notes: "textarea",
    },
    etapas: [
      {
        titulo: "Básico",
        descricao: "Identificação, dador e dados gerais",
        campos: [
          "tenant",
          "donor",
          "donor_role",
          "bag_identifier",
          "blood_type",
          "donation_type",
          "status",
          "screening_status",
        ],
      },
      {
        titulo: "Colheita",
        descricao: "Data/hora, volume e responsável",
        campos: ["collected_at", "volume_ml", "collected_by", "replacement_for"],
      },
      {
        titulo: "Sinais vitais",
        descricao: "Medições do dador",
        campos: [
          "donor_weight_kg",
          "donor_height_cm",
          "hemoglobin_g_dl",
          "blood_pressure_systolic",
          "blood_pressure_diastolic",
          "pulse_bpm",
          "temperature_c",
        ],
      },
      {
        titulo: "Testes",
        descricao: "Resultados laboratoriais de triagem",
        campos: [
          "hiv_test",
          "syphilis_rpr_test",
          "hepatitis_b_hbsag_test",
          "hepatitis_c_anti_hcv_test",
          "malaria_test",
          "test_notes",
        ],
      },
      {
        titulo: "Notas",
        descricao: "Contraindicações e observações",
        campos: ["contraindications", "notes", "processed_at"],
      },
    ],
  }
}

function bloodbankArmazenamentoConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant"],
    esconderCampos: BLOODBANK_INTERNAL_FIELDS,
    labels: {
      tenant: "Inquilino (tenant)",
      name: "Nome",
      location: "Localização",
      capacity_units: "Capacidade (unidades)",
      temperature_min_c: "Temperatura mínima (°C)",
      temperature_max_c: "Temperatura máxima (°C)",
      is_active: "Ativo",
      last_validation_at: "Última validação",
      notes: "Observações",
    },
    placeholders: {
      tenant: "Ex.: 1",
      name: "Ex.: Armazém principal",
      location: "Ex.: Bloco A — Sala 2",
      capacity_units: "Ex.: 200",
      temperature_min_c: "Ex.: 2",
      temperature_max_c: "Ex.: 6",
      notes: "Observações sobre o armazenamento...",
    },
    hints: {
      tenant: "Herdado automaticamente do utilizador logado (se possível).",
      capacity_units: "Quantidade máxima de unidades que este armazenamento suporta.",
      temperature_min_c: "Defina limites conforme o protocolo.",
      temperature_max_c: "Defina limites conforme o protocolo.",
      last_validation_at: "Opcional: data/hora da última validação do equipamento.",
    },
    widgets: { notes: "textarea" },
    etapas: [
      {
        titulo: "Identificação",
        descricao: "Nome, localização e inquilino",
        campos: ["tenant", "name", "location"],
      },
      {
        titulo: "Capacidade",
        descricao: "Capacidade e temperatura",
        campos: ["capacity_units", "temperature_min_c", "temperature_max_c"],
      },
      {
        titulo: "Estado",
        descricao: "Atividade, validação e notas",
        campos: ["is_active", "last_validation_at", "notes"],
      },
    ],
  }
}

function bloodbankUnidadeConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant"],
    esconderCampos: BLOODBANK_INTERNAL_FIELDS,
    labels: {
      tenant: "Inquilino (tenant)",
      donation: "Doacao de origem (ID)",
      storage: "Armazenamento (ID)",
      reserved_for: "Reservada para (ID do paciente)",
      unit_number: "Numero da unidade",
      component_type: "Tipo de componente",
      blood_type: "Grupo sanguineo",
      volume_ml: "Volume (mL)",
      collected_at: "Data/hora da colheita",
      expires_at: "Data/hora de validade",
      status: "Estado da unidade",
      is_irradiated: "Unidade irradiada",
      notes: "Observacoes",
    },
    placeholders: {
      tenant: "Ex.: 1",
      donation: "Ex.: 10",
      storage: "Ex.: 2",
      reserved_for: "Ex.: 123",
      unit_number: "Ex.: U-2026-00045",
      volume_ml: "Ex.: 300",
      notes: "Observacoes da unidade...",
    },
    hints: {
      tenant: "Herdado automaticamente do utilizador logado (se possivel).",
      donation: "ID da doacao de origem da unidade.",
      storage: "ID do armazenamento onde a unidade se encontra.",
      reserved_for: "Obrigatorio quando o estado for Reservada (RES).",
      status: "Use Reservada (RES) apenas quando informar o paciente em reservado.",
      expires_at: "A validade deve ser posterior a data de colheita.",
    },
    widgets: { notes: "textarea" },
    etapas: [
      {
        titulo: "Origem",
        descricao: "Doacao e identificacao da unidade",
        campos: ["tenant", "donation", "unit_number", "component_type", "blood_type"],
      },
      {
        titulo: "Estado",
        descricao: "Armazenamento, reserva e estado operacional",
        campos: ["storage", "status", "reserved_for", "is_irradiated"],
      },
      {
        titulo: "Datas e volume",
        descricao: "Colheita, validade e volume",
        campos: ["collected_at", "expires_at", "volume_ml"],
      },
      {
        titulo: "Notas",
        descricao: "Observacoes adicionais da unidade",
        campos: ["notes"],
      },
    ],
    lembrarCampos: ["storage"],
  }
}

function bloodbankTransfusaoConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant"],
    esconderCampos: BLOODBANK_INTERNAL_FIELDS,
    labels: {
      tenant: "Inquilino (tenant)",
      recipient: "Paciente receptor (ID)",
      blood_unit: "Unidade de sangue (ID)",
      requested_by: "Solicitada por (ID do utilizador)",
      performed_by: "Executada por (ID do utilizador)",
      status: "Estado da transfusao",
      requested_at: "Data/hora da solicitacao",
      started_at: "Data/hora de inicio",
      finished_at: "Data/hora de termino",
      indication: "Indicacao clinica",
      reaction_notes: "Registo de reacao",
      notes: "Observacoes",
    },
    placeholders: {
      tenant: "Ex.: 1",
      recipient: "Ex.: 123",
      blood_unit: "Ex.: 456",
      requested_by: "Ex.: 8",
      performed_by: "Ex.: 8",
      indication: "Ex.: hemorragia aguda, anemia severa...",
      reaction_notes: "Registar reacoes durante/depois da transfusao...",
      notes: "Observacoes adicionais...",
    },
    hints: {
      tenant: "Herdado automaticamente do utilizador logado (se possivel).",
      blood_unit: "ID da unidade a ser transfundida.",
      status: "Se concluir (COM), informe tambem a data/hora de termino.",
      started_at: "Obrigatoria para estado Em andamento (INP).",
      finished_at: "Obrigatoria para estado Concluida (COM).",
    },
    widgets: {
      indication: "textarea",
      reaction_notes: "textarea",
      notes: "textarea",
    },
    etapas: [
      {
        titulo: "Base",
        descricao: "Paciente, unidade e estado",
        campos: ["tenant", "recipient", "blood_unit", "status"],
      },
      {
        titulo: "Execucao",
        descricao: "Dados temporais e profissionais",
        campos: ["requested_at", "started_at", "finished_at", "requested_by", "performed_by"],
      },
      {
        titulo: "Clinico",
        descricao: "Indicacao, reacoes e observacoes",
        campos: ["indication", "reaction_notes", "notes"],
      },
    ],
  }
}

function bloodbankMovimentoConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant"],
    esconderCampos: BLOODBANK_INTERNAL_FIELDS,
    labels: {
      tenant: "Inquilino (tenant)",
      unit: "Unidade movimentada (ID)",
      source_storage: "Armazenamento de origem (ID)",
      destination_storage: "Armazenamento de destino (ID)",
      movement_type: "Tipo de movimento",
      moved_at: "Data/hora da movimentacao",
      performed_by: "Executado por (ID do utilizador)",
      reason: "Motivo",
      notes: "Observacoes",
    },
    placeholders: {
      tenant: "Ex.: 1",
      unit: "Ex.: 456",
      source_storage: "Ex.: 2",
      destination_storage: "Ex.: 5",
      performed_by: "Ex.: 8",
      reason: "Ex.: Transferencia entre camaras frias",
      notes: "Detalhes da movimentacao...",
    },
    hints: {
      tenant: "Herdado automaticamente do utilizador logado (se possivel).",
      movement_type: "Transferencia (TRF) exige origem e destino diferentes.",
      source_storage: "Origem pode ficar vazia em entradas manuais.",
      destination_storage: "Destino pode ficar vazio para saidas/descartes.",
    },
    widgets: { notes: "textarea" },
    etapas: [
      {
        titulo: "Movimento",
        descricao: "Tipo de movimento e unidade",
        campos: ["tenant", "unit", "movement_type", "moved_at"],
      },
      {
        titulo: "Origem/Destino",
        descricao: "Armazenamentos envolvidos",
        campos: ["source_storage", "destination_storage", "performed_by"],
      },
      {
        titulo: "Motivo",
        descricao: "Justificativa operacional",
        campos: ["reason", "notes"],
      },
    ],
    lembrarCampos: ["source_storage", "destination_storage"],
  }
}

function bloodbankManutencaoConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant"],
    esconderCampos: BLOODBANK_INTERNAL_FIELDS,
    labels: {
      tenant: "Inquilino (tenant)",
      storage: "Armazenamento (ID)",
      maintenance_type: "Tipo de manutencao",
      status: "Estado da manutencao",
      scheduled_at: "Data/hora agendada",
      performed_at: "Data/hora executada",
      next_due_at: "Proxima manutencao prevista",
      technician_name: "Tecnico responsavel",
      findings: "Achados",
      actions_taken: "Acoes executadas",
      notes: "Observacoes",
    },
    placeholders: {
      tenant: "Ex.: 1",
      storage: "Ex.: 2",
      technician_name: "Ex.: Carlos M. (Eng. Clinica)",
      findings: "Descrever achados da manutencao...",
      actions_taken: "Descrever acoes executadas...",
      notes: "Observacoes adicionais...",
    },
    hints: {
      tenant: "Herdado automaticamente do utilizador logado (se possivel).",
      status: "Se Concluida (COM), informe data/hora executada.",
      next_due_at: "Use para planeamento preventivo.",
    },
    widgets: {
      findings: "textarea",
      actions_taken: "textarea",
      notes: "textarea",
    },
    etapas: [
      {
        titulo: "Planeamento",
        descricao: "Armazenamento e tipo de manutencao",
        campos: ["tenant", "storage", "maintenance_type", "status"],
      },
      {
        titulo: "Calendario",
        descricao: "Datas de execucao e proxima manutencao",
        campos: ["scheduled_at", "performed_at", "next_due_at"],
      },
      {
        titulo: "Execucao",
        descricao: "Tecnico, achados e acoes",
        campos: ["technician_name", "findings", "actions_taken", "notes"],
      },
    ],
    lembrarCampos: ["storage", "technician_name"],
  }
}

export function getResourceFormConfig(
  groupKey: string,
  resourceKey: string,
  endpoint: string
): ResourceFormConfig | null {
  const g = canonicalModuleGroupKey(groupKey)
  const r = String(resourceKey || "").toLowerCase()
  const ep = normalizeEndpoint(endpoint)

  if (g !== "bloodbank") return null

  if (r === "doacao" || ep === "/bloodbank/doacao/") {
    return bloodbankDoacaoConfig()
  }
  if (r === "armazenamento" || ep === "/bloodbank/armazenamento/") {
    return bloodbankArmazenamentoConfig()
  }
  if (r === "unidade" || ep === "/bloodbank/unidade/") {
    return bloodbankUnidadeConfig()
  }
  if (r === "transfusao" || ep === "/bloodbank/transfusao/") {
    return bloodbankTransfusaoConfig()
  }
  if (r === "movimentoestoque" || ep === "/bloodbank/movimentoestoque/") {
    return bloodbankMovimentoConfig()
  }
  if (r === "manutencaoarmazenamento" || ep === "/bloodbank/manutencaoarmazenamento/") {
    return bloodbankManutencaoConfig()
  }

  return null
}
