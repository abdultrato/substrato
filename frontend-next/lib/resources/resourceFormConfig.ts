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

const EDUCATION_INTERNAL_FIELDS = [
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

const EQUIPMENT_INTERNAL_FIELDS = [
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
  "status",
  "equipment_name",
  "equipment_serial_number",
  "incident_code",
  "incident_context",
  "maintenance_status",
  "maintenance_count",
  "latest_maintenance",
]

function normalizeEndpoint(endpoint: string): string {
  const p = String(endpoint || "").split("?")[0].split("#")[0]
  const withSlash = p.startsWith("/") ? p : `/${p}`
  return withSlash.replace(/\/+$/, "") + "/"
}

function educationBibliographyConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...EDUCATION_INTERNAL_FIELDS, "content_type"],
    somenteLeituraCampos: ["tenant"],
    ordenarCampos: ["tenant", "course", "author", "title", "body", "file_url", "external_url", "published"],
    labels: {
      tenant: "Inquilino (tenant)",
      course: "Disciplina/Curso",
      author: "Professor autor",
      title: "Título do módulo bibliográfico",
      body: "Resumo e orientação de estudo",
      file_url: "URL do ficheiro de referência",
      external_url: "Link externo da referência",
      published: "Publicado",
    },
    placeholders: {
      title: "Ex.: Referências de Física - 1º Trimestre",
      body: "Liste os livros, capítulos e observações para estudo.",
      file_url: "https://...",
      external_url: "https://...",
    },
    hints: {
      course: "Selecione a disciplina à qual o módulo de referência pertence.",
      file_url: "Use para anexar PDF/apontamentos hospedados no repositório documental.",
      external_url: "Use para bibliografia em plataformas externas.",
    },
    widgets: {
      body: "textarea",
    },
    etapas: [
      {
        titulo: "Disciplina",
        descricao: "Vinculação do módulo bibliográfico",
        campos: ["tenant", "course", "author"],
      },
      {
        titulo: "Referência",
        descricao: "Conteúdo e anexação",
        campos: ["title", "body", "file_url", "external_url"],
      },
      {
        titulo: "Publicação",
        descricao: "Disponibilização para os estudantes",
        campos: ["published"],
      },
    ],
    lembrarCampos: ["course", "author"],
  }
}

function educationThematicMapConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...EDUCATION_INTERNAL_FIELDS, "content_type"],
    somenteLeituraCampos: ["tenant"],
    ordenarCampos: ["tenant", "course", "author", "title", "body", "file_url", "external_url", "published"],
    labels: {
      tenant: "Inquilino (tenant)",
      course: "Disciplina/Curso",
      author: "Professor autor",
      title: "Título do mapa temático",
      body: "Estrutura temática detalhada",
      file_url: "URL do ficheiro do mapa",
      external_url: "Link externo do mapa",
      published: "Publicado",
    },
    placeholders: {
      title: "Ex.: Mapa Temático - Matemática 8ª Classe",
      body: "Organize unidades, tópicos, sequência, objetivos e carga horária.",
      file_url: "https://...",
      external_url: "https://...",
    },
    hints: {
      course: "Selecione a disciplina para estruturar o mapa temático.",
      body: "Inclua cronologia, unidades e metas pedagógicas por período.",
      file_url: "Opcional: anexe o mapa em formato digital (PDF/Doc).",
    },
    widgets: {
      body: "textarea",
    },
    etapas: [
      {
        titulo: "Disciplina",
        descricao: "Contexto e autoria",
        campos: ["tenant", "course", "author"],
      },
      {
        titulo: "Mapa",
        descricao: "Conteúdo temático e anexos",
        campos: ["title", "body", "file_url", "external_url"],
      },
      {
        titulo: "Publicação",
        descricao: "Disponibilidade no portal",
        campos: ["published"],
      },
    ],
    lembrarCampos: ["course", "author"],
  }
}

function educationExaminationConfig(): ResourceFormConfig {
  return {
    esconderCampos: EDUCATION_INTERNAL_FIELDS,
    somenteLeituraCampos: ["tenant", "max_attempts"],
    ordenarCampos: [
      "tenant",
      "course",
      "classroom",
      "title",
      "exam_type",
      "test_slot",
      "discipline_final_stage",
      "pass_mark",
      "max_score",
      "duration_minutes",
      "scheduled_for",
      "opens_at",
      "closes_at",
      "status",
      "published_at",
    ],
    labels: {
      tenant: "Inquilino (tenant)",
      course: "Disciplina/Curso",
      classroom: "Turma",
      title: "Título do exame",
      exam_type: "Tipo de exame",
      test_slot: "Número do teste (1-3)",
      discipline_final_stage: "Etapa do exame final da disciplina",
      pass_mark: "Nota mínima de aprovação",
      max_score: "Nota máxima",
      max_attempts: "Tentativas máximas (automático)",
      duration_minutes: "Duração (minutos)",
      scheduled_for: "Agendado para",
      opens_at: "Abre em",
      closes_at: "Fecha em",
      status: "Estado",
      published_at: "Publicado em",
    },
    hints: {
      exam_type:
        "REGULAR: fluxo padrão. TEST: até 3 tentativas por teste. DISCIPLINE_FINAL: etapas Normal/Recorrência/Especial. COURSE_FINAL: 1 tentativa por ano.",
      test_slot: "Obrigatório para TEST (slots 1, 2 e 3 por disciplina/turma).",
      discipline_final_stage: "Obrigatório no DISCIPLINE_FINAL.",
      max_attempts: "Definido automaticamente pelas regras do tipo de exame.",
      pass_mark: "Abaixo desta nota (< 10 por padrão), abre regras de nova tentativa.",
    },
    etapas: [
      {
        titulo: "Estrutura",
        descricao: "Disciplina, turma e tipo de exame",
        campos: ["tenant", "course", "classroom", "title", "exam_type", "test_slot", "discipline_final_stage"],
      },
      {
        titulo: "Critérios",
        descricao: "Nota de aprovação e limites",
        campos: ["pass_mark", "max_score", "max_attempts", "duration_minutes"],
      },
      {
        titulo: "Calendário",
        descricao: "Janela temporal e estado",
        campos: ["scheduled_for", "opens_at", "closes_at", "status", "published_at"],
      },
    ],
    lembrarCampos: ["course", "classroom", "exam_type", "pass_mark"],
  }
}

function educationExamAttemptConfig(): ResourceFormConfig {
  return {
    esconderCampos: EDUCATION_INTERNAL_FIELDS,
    somenteLeituraCampos: ["tenant", "requires_year_repeat"],
    ordenarCampos: [
      "tenant",
      "examination",
      "enrollment",
      "student",
      "attempt_number",
      "status",
      "started_at",
      "expires_at",
      "submitted_at",
      "time_limit_minutes_snapshot",
      "max_score_snapshot",
      "submission_payload",
      "score",
      "teacher_feedback",
      "graded_by",
      "graded_at",
      "requires_year_repeat",
    ],
    labels: {
      tenant: "Inquilino (tenant)",
      examination: "Exame",
      enrollment: "Matrícula",
      student: "Estudante",
      attempt_number: "Número da tentativa",
      status: "Estado",
      started_at: "Iniciado em",
      expires_at: "Expira em",
      submitted_at: "Submetido em",
      time_limit_minutes_snapshot: "Tempo limite (snapshot)",
      max_score_snapshot: "Nota máxima (snapshot)",
      submission_payload: "Conteúdo da resposta",
      score: "Nota obtida",
      teacher_feedback: "Feedback do professor",
      graded_by: "Avaliado por",
      graded_at: "Avaliado em",
      requires_year_repeat: "Obrigação de repetição de ano",
    },
    hints: {
      attempt_number:
        "Para TEST: até 3 tentativas em dias diferentes e apenas com nota anterior < nota mínima.",
      score:
        "No COURSE_FINAL, nota abaixo da aprovação ativa obrigatoriedade de repetição de ano.",
      requires_year_repeat: "Campo calculado automaticamente quando aplicável.",
    },
    widgets: {
      submission_payload: "textarea",
      teacher_feedback: "textarea",
    },
    etapas: [
      {
        titulo: "Tentativa",
        descricao: "Vinculação e numeração",
        campos: ["tenant", "examination", "enrollment", "student", "attempt_number", "status"],
      },
      {
        titulo: "Janela",
        descricao: "Tempos de execução",
        campos: ["started_at", "expires_at", "submitted_at", "time_limit_minutes_snapshot"],
      },
      {
        titulo: "Avaliação",
        descricao: "Nota e resultado",
        campos: ["max_score_snapshot", "submission_payload", "score", "teacher_feedback", "graded_by", "graded_at", "requires_year_repeat"],
      },
    ],
    lembrarCampos: ["examination", "enrollment", "student"],
  }
}

function educationDisciplineScheduleConfig(): ResourceFormConfig {
  return {
    esconderCampos: EDUCATION_INTERNAL_FIELDS,
    somenteLeituraCampos: ["tenant"],
    ordenarCampos: [
      "tenant",
      "course",
      "classroom",
      "item_type",
      "title",
      "description",
      "scheduled_date",
      "requires_attendance",
      "status",
      "completed_at",
      "linked_examination",
      "linked_assignment",
      "linked_content",
      "notes",
    ],
    labels: {
      tenant: "Inquilino (tenant)",
      course: "Disciplina/Curso",
      classroom: "Turma",
      item_type: "Tipo de item",
      title: "Título",
      description: "Descrição",
      scheduled_date: "Data de execução",
      requires_attendance: "Requer presença",
      status: "Estado",
      completed_at: "Concluído em",
      linked_examination: "Exame vinculado",
      linked_assignment: "Trabalho vinculado",
      linked_content: "Conteúdo vinculado",
      notes: "Observações",
    },
    hints: {
      status: "Se a data passar sem conclusão, o item passa para matéria em atraso.",
      requires_attendance: "Quando ativo, ausência do estudante marca progresso em atraso.",
    },
    widgets: {
      description: "textarea",
      notes: "textarea",
    },
    etapas: [
      {
        titulo: "Contexto",
        descricao: "Disciplina e turma",
        campos: ["tenant", "course", "classroom", "item_type"],
      },
      {
        titulo: "Planeamento",
        descricao: "Título, descrição e agenda",
        campos: ["title", "description", "scheduled_date", "requires_attendance"],
      },
      {
        titulo: "Vínculos",
        descricao: "Conexões com avaliação e conteúdos",
        campos: ["linked_examination", "linked_assignment", "linked_content", "status", "completed_at", "notes"],
      },
    ],
    lembrarCampos: ["course", "classroom", "item_type", "requires_attendance"],
  }
}

function educationScheduleProgressConfig(): ResourceFormConfig {
  return {
    esconderCampos: EDUCATION_INTERNAL_FIELDS,
    somenteLeituraCampos: ["tenant", "attendance_status_snapshot"],
    ordenarCampos: [
      "tenant",
      "schedule_item",
      "enrollment",
      "status",
      "completion_marked",
      "completed_at",
      "attendance_status_snapshot",
      "notes",
    ],
    labels: {
      tenant: "Inquilino (tenant)",
      schedule_item: "Item do cronograma",
      enrollment: "Matrícula",
      status: "Estado do progresso",
      completion_marked: "Marcar como concluído",
      completed_at: "Concluído em",
      attendance_status_snapshot: "Snapshot de presença",
      notes: "Observações",
    },
    hints: {
      completion_marked: "Ao marcar concluído, o estudante fica em sucesso para o item.",
      attendance_status_snapshot: "Preenchido automaticamente com base na chamada.",
    },
    widgets: {
      notes: "textarea",
    },
    etapas: [
      {
        titulo: "Referência",
        descricao: "Item do cronograma e matrícula",
        campos: ["tenant", "schedule_item", "enrollment"],
      },
      {
        titulo: "Progresso",
        descricao: "Estado e conclusão",
        campos: ["status", "completion_marked", "completed_at", "attendance_status_snapshot"],
      },
      {
        titulo: "Observações",
        campos: ["notes"],
      },
    ],
    lembrarCampos: ["schedule_item", "enrollment"],
  }
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

function equipmentMaintenanceConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant"],
    esconderCampos: EQUIPMENT_INTERNAL_FIELDS,
    ordenarCampos: [
      "tenant",
      "incident",
      "equipment",
      "maintenance_type",
      "type",
      "scheduled_date",
      "performed_date",
      "technician",
      "description",
    ],
    labels: {
      tenant: "Inquilino (tenant)",
      incident: "Ocorrência de origem",
      equipment: "Equipamento",
      maintenance_type: "Tipo de manutenção",
      type: "Recorrência/plano",
      scheduled_date: "Data programada",
      performed_date: "Data executada",
      technician: "Técnico responsável",
      description: "Trabalho realizado",
    },
    widgets: {
      description: "textarea",
    },
    etapas: [
      {
        titulo: "Origem",
        descricao: "Ocorrência e equipamento",
        campos: ["tenant", "incident", "equipment"],
      },
      {
        titulo: "Tipo",
        descricao: "Natureza e planeamento",
        campos: ["maintenance_type", "type", "scheduled_date", "performed_date"],
      },
      {
        titulo: "Execução",
        descricao: "Responsável e trabalho realizado",
        campos: ["technician", "description"],
      },
    ],
    lembrarCampos: ["technician"],
  }
}

function equipmentIncidentConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant", "requires_maintenance", "maintenance_requested_at", "maintenance_completed_at"],
    esconderCampos: EQUIPMENT_INTERNAL_FIELDS,
    ordenarCampos: [
      "tenant",
      "equipment",
      "date",
      "type",
      "description",
      "support_contact",
      "post_incident_actions",
      "requires_maintenance",
      "resolved",
    ],
    labels: {
      tenant: "Inquilino (tenant)",
      equipment: "Equipamento",
      date: "Data/hora da ocorrência",
      type: "Tipo de ocorrência",
      description: "Descrição da ocorrência",
      support_contact: "Contacto de assistência",
      post_incident_actions: "Ações após ocorrência",
      requires_maintenance: "Requer manutenção",
      resolved: "Resolvida",
    },
    widgets: {
      description: "textarea",
      post_incident_actions: "textarea",
    },
    etapas: [
      {
        titulo: "Ocorrência",
        descricao: "Equipamento, data e tipo",
        campos: ["tenant", "equipment", "date", "type"],
      },
      {
        titulo: "Detalhes",
        descricao: "Contexto operacional",
        campos: ["description", "support_contact", "post_incident_actions"],
      },
      {
        titulo: "Estado",
        descricao: "Seguimento da manutenção",
        campos: ["requires_maintenance", "resolved"],
      },
    ],
    lembrarCampos: ["equipment", "support_contact"],
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

  if (g === "education") {
    if (r === "bibliography" || ep === "/education/bibliography/") {
      return educationBibliographyConfig()
    }
    if (r === "thematic_map" || ep === "/education/thematic_map/") {
      return educationThematicMapConfig()
    }
    if (r === "examination" || ep === "/education/examination/") {
      return educationExaminationConfig()
    }
    if (r === "exam_attempt" || r === "examination_attempt" || ep === "/education/exam_attempt/" || ep === "/education/examination_attempt/") {
      return educationExamAttemptConfig()
    }
    if (r === "discipline_schedule" || ep === "/education/discipline_schedule/") {
      return educationDisciplineScheduleConfig()
    }
    if (r === "schedule_progress" || ep === "/education/schedule_progress/") {
      return educationScheduleProgressConfig()
    }
    return null
  }

  if (g === "equipment") {
    if (
      r === "maintenance" ||
      ep === "/maintenance/maintenance/"
    ) {
      return equipmentMaintenanceConfig()
    }
    if (
      r === "incident" ||
      ep === "/equipment/incident/"
    ) {
      return equipmentIncidentConfig()
    }
    return null
  }

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
