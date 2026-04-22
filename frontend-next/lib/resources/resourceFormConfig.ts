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

function normalizeEndpoint(endpoint: string): string {
  const p = String(endpoint || "").split("?")[0].split("#")[0]
  const withSlash = p.startsWith("/") ? p : `/${p}`
  return withSlash.replace(/\/+$/, "") + "/"
}

function bloodbankDoacaoConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant"],
    esconderCampos: [
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
    ],
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
    esconderCampos: [
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
    ],
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

export function getResourceFormConfig(
  groupKey: string,
  resourceKey: string,
  endpoint: string
): ResourceFormConfig | null {
  const g = String(groupKey || "").toLowerCase()
  const r = String(resourceKey || "").toLowerCase()
  const ep = normalizeEndpoint(endpoint)

  if (g === "banco_sangue" && (r === "doacao" || ep === "/bloodbank/doacao/")) {
    return bloodbankDoacaoConfig()
  }
  if (
    g === "banco_sangue" &&
    (r === "armazenamento" || ep === "/bloodbank/armazenamento/")
  ) {
    return bloodbankArmazenamentoConfig()
  }

  return null
}
