import { canonicalModuleGroupKey } from "@/lib/modules"
import { canonicalCollectionPath } from "@/lib/openapi/endpointResolver"
import {
  educationResourceKeyFromEndpoint,
  normalizeEducationEndpoint,
  normalizeEducationResourceKey,
} from "@/lib/education/ui"

export type AutoFormStep = {
  titulo: string
  descricao?: string
  campos: string[]
}

export type ResourceFormConfig = {
  esconderCampos?: string[]
  /** Visibilidade condicional: o campo (chave) só aparece quando o campo
   *  controlador tiver o valor indicado (ex.: checkbox marcado). */
  mostrarSe?: Record<string, { campo: string; igualA?: any }>
  somenteLeituraCampos?: string[]
  /** Somente-leitura condicional: o campo (chave) fica bloqueado quando o campo
   *  controlador tiver o valor `igualA`; se `igualA` for omitido, basta o campo
   *  controlador ter um valor preenchido (ex.: bloquear saldo quando há vínculo). */
  somenteLeituraSe?: Record<string, { campo: string; igualA?: any }>
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

const DENTAL_INTERNAL_FIELDS = [
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
]

const NURSING_INTERNAL_FIELDS = [
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
]

const WAREHOUSE_INTERNAL_FIELDS = [
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
]

const WAREHOUSE_DERIVED_FIELDS = [
  "lines",
  "suggestions",
  "warehouse_label",
  "category_label",
  "item_sku",
  "current_stock",
  "expired",
  "location_code",
  "reserved_quantity",
  "available_quantity",
  "received_quantity",
  "pending_quantity",
  "pending_reservation_quantity",
  "pending_shipment_quantity",
  "shipped_quantity",
  "system_quantity",
  "variance",
  "purchase_order_number",
  "posted_at",
  "generated_at",
  "confirmed_at",
  "allocated_at",
  "started_at",
  "completed_at",
  "reserved_at",
  "released_at",
  "consumed_at",
  "shipped_at",
]

function normalizeEndpoint(endpoint: string): string {
  const p = String(endpoint || "").split("?")[0].split("#")[0]
  const withSlash = p.startsWith("/") ? p : `/${p}`
  return withSlash.replace(/\/+$/, "") + "/"
}

const EDUCATION_COMMON_LABELS: Record<string, string> = {
  tenant: "Instituição",
  user: "Utilizador",
  student: "Estudante",
  teacher: "Professor",
  course: "Curso",
  classroom: "Turma",
  enrollment: "Matrícula",
  student_code: "Código do estudante",
  teacher_code: "Código do professor",
  guardian_name: "Encarregado de educação",
  birth_date: "Data de nascimento",
  specialty: "Especialidade",
  name: "Nome",
  code: "Código",
  title: "Título",
  description: "Descrição",
  instructions: "Instruções",
  body: "Conteúdo",
  content_text: "Texto da submissão",
  submission_payload: "Conteúdo da resposta",
  notes: "Observações",
  status: "Estado",
  academic_year: "Ano letivo",
  capacity: "Capacidade",
  homeroom_teacher: "Diretor de turma",
  workload_hours: "Carga horária",
  enrolled_on: "Matriculado em",
  closed_on: "Encerrado em",
  attendance_date: "Data da presença",
  component: "Componente de avaliação",
  score: "Nota obtida",
  max_score: "Nota máxima",
  weight: "Peso",
  published_at: "Publicado em",
  published: "Publicado",
  scheduled_for: "Agendado para",
  opens_at: "Abre em",
  closes_at: "Fecha em",
  due_at: "Prazo de entrega",
  duration_minutes: "Duração (minutos)",
  pass_mark: "Nota mínima de aprovação",
  max_attempts: "Tentativas máximas",
  max_submissions: "Submissões máximas",
  allow_late_submission: "Permitir submissão fora do prazo",
  allow_multiple_submissions: "Permitir várias submissões",
  work_category: "Categoria do trabalho",
  exam_type: "Tipo de exame",
  test_slot: "Número do teste",
  discipline_final_stage: "Etapa do exame final",
  question_count: "Número de questões",
  random_seed: "Semente aleatória",
  submitted_at: "Submetido em",
  attachment_url: "URL do anexo",
  attempt_number: "Número da tentativa",
  started_at: "Iniciado em",
  expires_at: "Expira em",
  time_limit_minutes_snapshot: "Tempo limite registado",
  max_score_snapshot: "Nota máxima registada",
  teacher_feedback: "Feedback do professor",
  graded_by: "Avaliado por",
  graded_at: "Avaliado em",
  requires_year_repeat: "Requer repetição de ano",
  file_url: "URL do ficheiro",
  external_url: "Link externo",
  author: "Professor autor",
  content_type: "Tipo de conteúdo",
  category: "Categoria",
  level: "Nível",
  item_type: "Tipo de item",
  scheduled_date: "Data programada",
  requires_attendance: "Requer presença",
  completed_at: "Concluído em",
  linked_examination: "Exame vinculado",
  linked_assignment: "Trabalho vinculado",
  linked_content: "Conteúdo vinculado",
  schedule_item: "Item do cronograma",
  completion_marked: "Marcar como concluído",
  attendance_status_snapshot: "Estado de presença registado",
}

const EDUCATION_COMMON_PLACEHOLDERS: Record<string, string> = {
  user: "Ex.: ID do utilizador",
  student: "Ex.: ID do estudante",
  teacher: "Ex.: ID do professor",
  course: "Ex.: ID do curso",
  classroom: "Ex.: ID da turma",
  enrollment: "Ex.: ID da matrícula",
  student_code: "Ex.: EST-2026-0001",
  teacher_code: "Ex.: PROF-2026-0001",
  guardian_name: "Ex.: Maria da Silva",
  specialty: "Ex.: Matemática",
  name: "Ex.: Matemática 8ª Classe",
  code: "Ex.: MAT-8",
  title: "Ex.: Avaliação do 1º trimestre",
  description: "Descreva o objetivo, contexto e regras principais.",
  instructions: "Descreva as instruções que o estudante deve seguir.",
  body: "Escreva o conteúdo que ficará disponível para a turma.",
  content_text: "Escreva a resposta ou resumo submetido pelo estudante.",
  submission_payload: "Registe o conteúdo da resposta avaliada.",
  notes: "Observações relevantes para este registo.",
  academic_year: "Ex.: 2026",
  capacity: "Ex.: 35",
  workload_hours: "Ex.: 120",
  component: "Ex.: Teste 1, Trabalho prático ou Exame final",
  score: "Ex.: 14",
  max_score: "Ex.: 20",
  weight: "Ex.: 1",
  pass_mark: "Ex.: 10",
  duration_minutes: "Ex.: 90",
  max_submissions: "Ex.: 1",
  question_count: "Ex.: 20",
  random_seed: "Ex.: 20260526",
  attachment_url: "https://...",
  file_url: "https://...",
  external_url: "https://...",
  teacher_feedback: "Escreva feedback claro para o estudante.",
  category: "Ex.: Cognitiva, prática ou transversal",
  level: "Ex.: Básico, intermédio ou avançado",
}

const EDUCATION_TEXT_WIDGETS: Record<string, "textarea"> = {
  description: "textarea",
  instructions: "textarea",
  body: "textarea",
  content_text: "textarea",
  submission_payload: "textarea",
  teacher_feedback: "textarea",
  notes: "textarea",
}

function educationBaseConfig(config: ResourceFormConfig): ResourceFormConfig {
  return {
    esconderCampos: [...EDUCATION_INTERNAL_FIELDS, ...(config.esconderCampos || [])],
    somenteLeituraCampos: ["tenant", ...(config.somenteLeituraCampos || [])],
    labels: { ...EDUCATION_COMMON_LABELS, ...(config.labels || {}) },
    placeholders: { ...EDUCATION_COMMON_PLACEHOLDERS, ...(config.placeholders || {}) },
    hints: {
      tenant: "A instituição é preenchida automaticamente pelo contexto da sessão.",
      ...(config.hints || {}),
    },
    widgets: { ...EDUCATION_TEXT_WIDGETS, ...(config.widgets || {}) },
    ordenarCampos: config.ordenarCampos,
    etapas: config.etapas,
    lembrarCampos: config.lembrarCampos,
  }
}

function educationBibliographyConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...EDUCATION_INTERNAL_FIELDS, "content_type"],
    somenteLeituraCampos: ["tenant"],
    ordenarCampos: ["tenant", "course", "author", "title", "body", "file_url", "external_url", "published"],
    labels: {
      tenant: "Instituição",
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
      tenant: "Instituição",
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
      tenant: "Instituição",
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
    placeholders: {
      title: "Ex.: Exame final de Matemática",
      pass_mark: "Ex.: 10",
      max_score: "Ex.: 20",
      duration_minutes: "Ex.: 90",
      test_slot: "Ex.: 1",
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
      tenant: "Instituição",
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
    placeholders: {
      attempt_number: "Ex.: 1",
      time_limit_minutes_snapshot: "Ex.: 90",
      max_score_snapshot: "Ex.: 20",
      submission_payload: "Registe a resposta submetida pelo estudante.",
      score: "Ex.: 14",
      teacher_feedback: "Escreva feedback claro para o estudante.",
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
      tenant: "Instituição",
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
    placeholders: {
      title: "Ex.: Aula de introdução ao tema",
      description: "Descreva o conteúdo, objetivo ou atividade prevista.",
      notes: "Observações sobre execução, atrasos ou dependências.",
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
      tenant: "Instituição",
      schedule_item: "Item do cronograma",
      enrollment: "Matrícula",
      status: "Estado do progresso",
      completion_marked: "Marcar como concluído",
      completed_at: "Concluído em",
      attendance_status_snapshot: "Snapshot de presença",
      notes: "Observações",
    },
    placeholders: {
      notes: "Registe observações sobre o progresso do estudante.",
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

function educationStudentConfig(): ResourceFormConfig {
  return educationBaseConfig({
    ordenarCampos: ["tenant", "user", "student_code", "birth_date", "guardian_name", "status", "notes"],
    labels: {
      student_code: "Código do estudante",
      status: "Estado do estudante",
      notes: "Observações do estudante",
    },
    hints: {
      user: "Associe este perfil ao utilizador que representa o estudante.",
      student_code: "Código interno usado para localizar rapidamente o estudante.",
      guardian_name: "Nome do encarregado de educação ou responsável.",
    },
    etapas: [
      {
        titulo: "Identificação",
        descricao: "Utilizador, código e dados pessoais",
        campos: ["tenant", "user", "student_code", "birth_date"],
      },
      {
        titulo: "Responsável",
        descricao: "Encarregado de educação e estado do perfil",
        campos: ["guardian_name", "status", "notes"],
      },
    ],
    lembrarCampos: ["status"],
  })
}

function educationTeacherConfig(): ResourceFormConfig {
  return educationBaseConfig({
    ordenarCampos: ["tenant", "user", "teacher_code", "specialty", "status"],
    labels: {
      status: "Estado do professor",
    },
    hints: {
      user: "Associe este perfil ao utilizador que terá permissões de professor.",
      teacher_code: "Código interno do docente.",
      specialty: "Área principal de lecionação.",
    },
    etapas: [
      {
        titulo: "Identificação",
        descricao: "Utilizador e código do professor",
        campos: ["tenant", "user", "teacher_code"],
      },
      {
        titulo: "Perfil docente",
        descricao: "Especialidade e estado",
        campos: ["specialty", "status"],
      },
    ],
    lembrarCampos: ["specialty", "status"],
  })
}

function educationCourseConfig(): ResourceFormConfig {
  return educationBaseConfig({
    ordenarCampos: ["tenant", "name", "code", "description", "workload_hours", "status"],
    labels: {
      name: "Nome do curso",
      code: "Código do curso",
      status: "Estado do curso",
    },
    hints: {
      code: "Use um código curto e único para relatórios, pautas e filtros.",
      workload_hours: "Carga horária total prevista para o curso ou disciplina.",
    },
    etapas: [
      {
        titulo: "Curso",
        descricao: "Nome, código e descrição",
        campos: ["tenant", "name", "code", "description"],
      },
      {
        titulo: "Configuração",
        descricao: "Carga horária e estado",
        campos: ["workload_hours", "status"],
      },
    ],
    lembrarCampos: ["status"],
  })
}

function educationClassroomConfig(): ResourceFormConfig {
  return educationBaseConfig({
    ordenarCampos: ["tenant", "course", "name", "academic_year", "capacity", "homeroom_teacher"],
    labels: {
      name: "Nome da turma",
      capacity: "Capacidade da turma",
    },
    hints: {
      course: "Curso ou disciplina principal associada à turma.",
      academic_year: "Ano letivo em que a turma está ativa.",
      homeroom_teacher: "Professor responsável pela turma, quando aplicável.",
    },
    etapas: [
      {
        titulo: "Turma",
        descricao: "Curso, nome e ano letivo",
        campos: ["tenant", "course", "name", "academic_year"],
      },
      {
        titulo: "Gestão",
        descricao: "Capacidade e professor responsável",
        campos: ["capacity", "homeroom_teacher"],
      },
    ],
    lembrarCampos: ["course", "academic_year"],
  })
}

function educationEnrollmentConfig(): ResourceFormConfig {
  return educationBaseConfig({
    ordenarCampos: ["tenant", "student", "classroom", "status", "enrolled_on", "closed_on"],
    labels: {
      status: "Estado da matrícula",
    },
    hints: {
      student: "Estudante que será vinculado à turma.",
      classroom: "Turma onde o estudante ficará matriculado.",
      closed_on: "Preencha apenas quando a matrícula for encerrada.",
    },
    etapas: [
      {
        titulo: "Vínculo",
        descricao: "Estudante e turma",
        campos: ["tenant", "student", "classroom"],
      },
      {
        titulo: "Estado",
        descricao: "Situação e datas da matrícula",
        campos: ["status", "enrolled_on", "closed_on"],
      },
    ],
    lembrarCampos: ["classroom", "status"],
  })
}

function educationAttendanceConfig(): ResourceFormConfig {
  return educationBaseConfig({
    ordenarCampos: ["tenant", "enrollment", "attendance_date", "status", "notes"],
    labels: {
      status: "Estado da presença",
    },
    hints: {
      enrollment: "Matrícula do estudante para a aula ou atividade.",
      attendance_date: "Data em que a presença foi registada.",
    },
    etapas: [
      {
        titulo: "Presença",
        descricao: "Matrícula, data e estado",
        campos: ["tenant", "enrollment", "attendance_date", "status"],
      },
      {
        titulo: "Observações",
        campos: ["notes"],
      },
    ],
    lembrarCampos: ["attendance_date", "status"],
  })
}

function educationGradeConfig(): ResourceFormConfig {
  return educationBaseConfig({
    ordenarCampos: [
      "tenant",
      "enrollment",
      "teacher",
      "component",
      "assignment_submission",
      "examination_attempt",
      "score",
      "max_score",
      "weight",
      "published_at",
    ],
    labels: {
      assignment_submission: "Submissão de trabalho",
      examination_attempt: "Tentativa de exame",
    },
    hints: {
      component: "Identifique a componente avaliada, por exemplo Teste 1 ou Trabalho prático.",
      score: "Nota obtida pelo estudante.",
      weight: "Peso da componente no cálculo final, quando aplicável.",
    },
    etapas: [
      {
        titulo: "Referência",
        descricao: "Matrícula, professor e componente",
        campos: ["tenant", "enrollment", "teacher", "component"],
      },
      {
        titulo: "Avaliação",
        descricao: "Origem da nota e pontuação",
        campos: ["assignment_submission", "examination_attempt", "score", "max_score", "weight"],
      },
      {
        titulo: "Publicação",
        campos: ["published_at"],
      },
    ],
    lembrarCampos: ["teacher", "component", "max_score"],
  })
}

function educationAssignmentConfig(): ResourceFormConfig {
  return educationBaseConfig({
    ordenarCampos: [
      "tenant",
      "course",
      "classroom",
      "teacher",
      "title",
      "instructions",
      "work_category",
      "max_score",
      "opens_at",
      "due_at",
      "allow_late_submission",
      "allow_multiple_submissions",
      "max_submissions",
      "status",
      "published_at",
    ],
    labels: {
      title: "Título do trabalho",
      status: "Estado do trabalho",
    },
    hints: {
      due_at: "Após este prazo, a submissão só será aceite se estiver autorizada.",
      max_submissions: "Número máximo de submissões permitidas por estudante.",
      instructions: "Escreva instruções suficientes para o estudante executar o trabalho sem ambiguidade.",
    },
    etapas: [
      {
        titulo: "Contexto",
        descricao: "Disciplina, turma e professor",
        campos: ["tenant", "course", "classroom", "teacher"],
      },
      {
        titulo: "Trabalho",
        descricao: "Título, instruções e categoria",
        campos: ["title", "instructions", "work_category", "max_score"],
      },
      {
        titulo: "Prazos",
        descricao: "Janela de submissão e regras",
        campos: ["opens_at", "due_at", "allow_late_submission", "allow_multiple_submissions", "max_submissions", "status", "published_at"],
      },
    ],
    lembrarCampos: ["course", "classroom", "teacher", "max_score"],
  })
}

function educationSubmissionConfig(): ResourceFormConfig {
  return educationBaseConfig({
    ordenarCampos: [
      "tenant",
      "assignment",
      "enrollment",
      "student",
      "attempt_number",
      "submitted_at",
      "status",
      "content_text",
      "attachment_url",
      "max_score_snapshot",
      "score",
      "teacher_feedback",
      "graded_by",
      "graded_at",
    ],
    labels: {
      assignment: "Trabalho",
      status: "Estado da submissão",
    },
    hints: {
      attempt_number: "Número da tentativa do estudante para este trabalho.",
      content_text: "Resposta textual enviada pelo estudante.",
      teacher_feedback: "Feedback visível para o estudante após avaliação.",
    },
    etapas: [
      {
        titulo: "Submissão",
        descricao: "Trabalho, matrícula e estudante",
        campos: ["tenant", "assignment", "enrollment", "student", "attempt_number", "submitted_at", "status"],
      },
      {
        titulo: "Conteúdo",
        descricao: "Resposta e anexo",
        campos: ["content_text", "attachment_url"],
      },
      {
        titulo: "Avaliação",
        descricao: "Nota e feedback",
        campos: ["max_score_snapshot", "score", "teacher_feedback", "graded_by", "graded_at"],
      },
    ],
    lembrarCampos: ["assignment", "enrollment", "student"],
  })
}

function educationContentConfig(): ResourceFormConfig {
  return educationBaseConfig({
    esconderCampos: ["content_type"],
    ordenarCampos: ["tenant", "course", "author", "title", "body", "file_url", "external_url", "published"],
    labels: {
      title: "Título do conteúdo",
      body: "Conteúdo de aprendizagem",
    },
    hints: {
      course: "Curso ou disciplina onde este conteúdo será publicado.",
      file_url: "Use quando o material estiver anexado como ficheiro.",
      external_url: "Use quando o conteúdo estiver numa plataforma externa.",
    },
    etapas: [
      {
        titulo: "Contexto",
        descricao: "Curso e autoria",
        campos: ["tenant", "course", "author"],
      },
      {
        titulo: "Conteúdo",
        descricao: "Título, corpo e anexos",
        campos: ["title", "body", "file_url", "external_url"],
      },
      {
        titulo: "Publicação",
        campos: ["published"],
      },
    ],
    lembrarCampos: ["course", "author"],
  })
}

function educationRandomTestConfig(): ResourceFormConfig {
  return educationBaseConfig({
    ordenarCampos: [
      "tenant",
      "course",
      "classroom",
      "enrollment",
      "student",
      "teacher",
      "title",
      "scheduled_for",
      "opens_at",
      "closes_at",
      "duration_minutes",
      "question_count",
      "random_seed",
      "status",
      "notes",
    ],
    labels: {
      title: "Título do teste",
      status: "Estado do teste",
    },
    hints: {
      enrollment: "Opcional quando o teste for para toda a turma.",
      student: "Opcional quando o teste for para toda a turma.",
      random_seed: "Mantém a geração reprodutível quando preenchida.",
    },
    etapas: [
      {
        titulo: "Alvo",
        descricao: "Curso, turma e estudante",
        campos: ["tenant", "course", "classroom", "enrollment", "student", "teacher"],
      },
      {
        titulo: "Teste",
        descricao: "Título e configuração",
        campos: ["title", "duration_minutes", "question_count", "random_seed"],
      },
      {
        titulo: "Agenda",
        descricao: "Datas, estado e observações",
        campos: ["scheduled_for", "opens_at", "closes_at", "status", "notes"],
      },
    ],
    lembrarCampos: ["course", "classroom", "teacher", "duration_minutes"],
  })
}

function educationSkillConfig(): ResourceFormConfig {
  return educationBaseConfig({
    ordenarCampos: ["tenant", "course", "name", "code", "category", "level", "description", "status"],
    labels: {
      name: "Nome da competência",
      code: "Código da competência",
      status: "Estado da competência",
    },
    hints: {
      course: "Curso ou disciplina ao qual a competência pertence.",
      level: "Nível pedagógico esperado para a competência.",
    },
    etapas: [
      {
        titulo: "Competência",
        descricao: "Curso, nome e código",
        campos: ["tenant", "course", "name", "code"],
      },
      {
        titulo: "Classificação",
        descricao: "Categoria, nível e estado",
        campos: ["category", "level", "description", "status"],
      },
    ],
    lembrarCampos: ["course", "category", "level", "status"],
  })
}

const WAREHOUSE_COMMON_LABELS: Record<string, string> = {
  tenant: "Instituição",
  name: "Nome",
  code: "Código",
  status: "Estado",
  notes: "Observações",
  address: "Endereço",
  warehouse: "Armazém",
  warehouse_type: "Tipo de armazém",
  warehouse_label: "Armazém",
  parent: "Localização superior",
  location: "Localização",
  location_type: "Tipo de localização",
  source_location: "Localização de origem",
  destination_location: "Localização de destino",
  default_location: "Localização padrão",
  preferred_location: "Localização preferencial",
  source_location_code: "Código da origem",
  location_code: "Código da localização",
  barcode: "Código de barras",
  category: "Categoria",
  category_label: "Categoria",
  pharmacy_product: "Produto de farmácia",
  item: "Item",
  item_type: "Tipo de item",
  item_sku: "SKU do item",
  sku: "SKU",
  unit_of_measure: "Unidade de medida",
  reorder_point: "Ponto de reposição",
  reorder_quantity: "Quantidade de reposição",
  external_reference: "Referência externa",
  current_stock: "Estoque atual",
  lot: "Lote",
  lot_number: "Número do lote",
  expiration_date: "Data de validade",
  received_at: "Recebido em",
  unit_cost: "Custo unitário",
  quantity: "Quantidade",
  reserved_quantity: "Quantidade reservada",
  available_quantity: "Quantidade disponível",
  ordered_quantity: "Quantidade pedida",
  received_quantity: "Quantidade recebida",
  pending_quantity: "Quantidade pendente",
  recommended_quantity: "Quantidade recomendada",
  estimated_unit_cost: "Custo unitário estimado",
  counted_quantity: "Quantidade contada",
  system_quantity: "Quantidade no sistema",
  variance: "Diferença",
  movement_type: "Tipo de movimento",
  reference_document: "Documento de referência",
  reason: "Motivo",
  posted_at: "Lançado em",
  order_number: "Número do pedido",
  supplier_name: "Fornecedor",
  supplier_document: "Documento do fornecedor",
  ordered_at: "Pedido em",
  expected_at: "Previsão de recebimento",
  purchase_order: "Pedido de compra",
  purchase_order_line: "Linha do pedido de compra",
  receipt: "Recebimento",
  receipt_number: "Número do recebimento",
  plan: "Plano de reposição",
  plan_number: "Número do plano",
  generated_at: "Gerado em",
  purchase_order_number: "Número do pedido de compra",
  customer_name: "Cliente",
  customer_document: "Documento do cliente",
  customer_reference: "Referência do cliente",
  requested_ship_date: "Data solicitada de expedição",
  priority: "Prioridade",
  sales_order: "Pedido de venda",
  sales_order_line: "Linha do pedido de venda",
  pending_reservation_quantity: "Quantidade pendente de reserva",
  pending_shipment_quantity: "Quantidade pendente de expedição",
  shipped_quantity: "Quantidade expedida",
  unit_price: "Preço unitário",
  confirmed_at: "Confirmado em",
  allocated_at: "Alocado em",
  shipped_at: "Expedido em",
  reservation: "Reserva",
  pick_list: "Lista de separação",
  pick_number: "Número da separação",
  quantity_to_pick: "Quantidade a separar",
  quantity_picked: "Quantidade separada",
  started_at: "Iniciado em",
  completed_at: "Concluído em",
  shipment: "Expedição",
  shipment_number: "Número da expedição",
  carrier_name: "Transportadora",
  tracking_number: "Código de rastreio",
  transfer: "Transferência",
  transfer_number: "Número da transferência",
  cycle_count: "Inventário cíclico",
  count_number: "Número do inventário",
  counted_at: "Contado em",
}

const WAREHOUSE_COMMON_PLACEHOLDERS: Record<string, string> = {
  name: "Ex.: Abastecimento de material clínico",
  code: "Ex.: ARM-CENTRAL",
  address: "Ex.: Rua principal, bloco logístico",
  warehouse: "Ex.: ID do armazém",
  parent: "Ex.: ID da localização superior",
  location: "Ex.: ID da localização",
  source_location: "Ex.: ID da localização de origem",
  destination_location: "Ex.: ID da localização de destino",
  default_location: "Ex.: ID da localização padrão",
  preferred_location: "Ex.: ID da localização preferencial",
  barcode: "Ex.: 5600000000012",
  category: "Ex.: ID da categoria",
  pharmacy_product: "Ex.: ID do produto de farmácia",
  item: "Ex.: ID do item",
  sku: "Ex.: MED-LUVAS-M",
  unit_of_measure: "Ex.: un, cx, kg ou L",
  reorder_point: "Ex.: 20",
  reorder_quantity: "Ex.: 100",
  external_reference: "Ex.: Código do fornecedor ou ERP externo",
  lot: "Ex.: ID do lote",
  lot_number: "Ex.: LOT-2026-001",
  unit_cost: "Ex.: 125.50",
  quantity: "Ex.: 10",
  ordered_quantity: "Ex.: 50",
  recommended_quantity: "Ex.: 80",
  estimated_unit_cost: "Ex.: 125.50",
  counted_quantity: "Ex.: 42",
  reference_document: "Ex.: Guia, fatura ou requisição",
  reason: "Explique o motivo operacional deste movimento.",
  notes: "Observações úteis para auditoria e seguimento.",
  order_number: "Ex.: PO-2026-0001",
  supplier_name: "Ex.: Fornecedor Central, Lda.",
  supplier_document: "Ex.: NUIT ou número fiscal",
  purchase_order: "Ex.: ID do pedido de compra",
  purchase_order_line: "Ex.: ID da linha do pedido de compra",
  receipt: "Ex.: ID do recebimento",
  receipt_number: "Ex.: GR-2026-0001",
  plan: "Ex.: ID do plano de reposição",
  plan_number: "Ex.: RPL-2026-0001",
  customer_name: "Ex.: Cliente ou setor requisitante",
  customer_document: "Ex.: NUIT, BI ou referência fiscal",
  customer_reference: "Ex.: Requisição interna, contrato ou nota",
  priority: "Ex.: 1 para maior prioridade",
  sales_order: "Ex.: ID do pedido de venda",
  sales_order_line: "Ex.: ID da linha do pedido de venda",
  unit_price: "Ex.: 150.00",
  reservation: "Ex.: ID da reserva",
  pick_list: "Ex.: ID da lista de separação",
  pick_number: "Ex.: PICK-2026-0001",
  quantity_to_pick: "Ex.: 10",
  quantity_picked: "Ex.: 10",
  shipment: "Ex.: ID da expedição",
  shipment_number: "Ex.: SHIP-2026-0001",
  carrier_name: "Ex.: Transportadora ou motorista",
  tracking_number: "Ex.: TRK-2026-0001",
  transfer: "Ex.: ID da transferência",
  transfer_number: "Ex.: TRF-2026-0001",
  cycle_count: "Ex.: ID do inventário cíclico",
  count_number: "Ex.: CNT-2026-0001",
}

const WAREHOUSE_TEXT_WIDGETS: Record<string, "textarea"> = {
  address: "textarea",
  notes: "textarea",
  reason: "textarea",
}

function warehouseResourceKeyFromEndpoint(endpoint: string): string {
  const match = normalizeEndpoint(endpoint).match(/^\/warehouse\/([^/]+)\//)
  return match?.[1] || ""
}

function warehouseBaseConfig(config: ResourceFormConfig): ResourceFormConfig {
  return {
    esconderCampos: [
      ...WAREHOUSE_INTERNAL_FIELDS,
      ...WAREHOUSE_DERIVED_FIELDS,
      ...(config.esconderCampos || []),
    ],
    somenteLeituraCampos: config.somenteLeituraCampos,
    labels: { ...WAREHOUSE_COMMON_LABELS, ...(config.labels || {}) },
    placeholders: { ...WAREHOUSE_COMMON_PLACEHOLDERS, ...(config.placeholders || {}) },
    hints: {
      warehouse: "Use o ID do armazém cadastrado no ERP/WMS.",
      location: "Use o ID da localização física dentro do armazém.",
      item: "Use o ID do item de estoque cadastrado.",
      lot: "Opcional quando o item não é controlado por lote.",
      status: "O estado controla o ciclo operacional e pode ser atualizado por ações do fluxo.",
      ...(config.hints || {}),
    },
    widgets: { ...WAREHOUSE_TEXT_WIDGETS, ...(config.widgets || {}) },
    ordenarCampos: config.ordenarCampos,
    etapas: config.etapas,
    lembrarCampos: config.lembrarCampos,
  }
}

function warehouseConfigForResource(resourceKey: string, endpoint: string): ResourceFormConfig {
  const key = resourceKey || warehouseResourceKeyFromEndpoint(endpoint)

  switch (key) {
    case "warehouse":
      return warehouseBaseConfig({
        ordenarCampos: ["name", "code", "warehouse_type", "address", "status"],
        labels: {
          name: "Nome do armazém",
          code: "Código do armazém",
          status: "Estado do armazém",
        },
        etapas: [
          {
            titulo: "Identificação",
            descricao: "Nome, código e tipo do armazém",
            campos: ["name", "code", "warehouse_type"],
          },
          {
            titulo: "Endereço e estado",
            descricao: "Localização administrativa e disponibilidade",
            campos: ["address", "status"],
          },
        ],
        lembrarCampos: ["warehouse_type", "status"],
      })
    case "storage_location":
      return warehouseBaseConfig({
        ordenarCampos: ["warehouse", "parent", "name", "code", "location_type", "barcode", "status"],
        labels: {
          name: "Nome da localização",
          code: "Código da localização",
          status: "Estado da localização",
        },
        etapas: [
          {
            titulo: "Hierarquia",
            descricao: "Armazém e localização superior",
            campos: ["warehouse", "parent"],
          },
          {
            titulo: "Localização",
            descricao: "Nome, código físico e tipo",
            campos: ["name", "code", "location_type", "barcode", "status"],
          },
        ],
        lembrarCampos: ["warehouse", "location_type", "status"],
      })
    case "item_category":
      return warehouseBaseConfig({
        ordenarCampos: ["name", "code", "status"],
        labels: {
          name: "Nome da categoria",
          code: "Código da categoria",
          status: "Estado da categoria",
        },
        etapas: [
          {
            titulo: "Categoria",
            descricao: "Identificação da família de itens",
            campos: ["name", "code", "status"],
          },
        ],
        lembrarCampos: ["status"],
      })
    case "item":
      return warehouseBaseConfig({
        ordenarCampos: [
          "category",
          "pharmacy_product",
          "name",
          "sku",
          "item_type",
          "unit_of_measure",
          "barcode",
          "reorder_point",
          "reorder_quantity",
          "external_reference",
          "status",
        ],
        labels: {
          name: "Nome do item",
          status: "Estado do item",
        },
        etapas: [
          {
            titulo: "Classificação",
            descricao: "Categoria, origem e tipo do item",
            campos: ["category", "pharmacy_product", "item_type", "status"],
          },
          {
            titulo: "Identificação",
            descricao: "Nome, SKU, unidade e código de barras",
            campos: ["name", "sku", "unit_of_measure", "barcode", "external_reference"],
          },
          {
            titulo: "Reposição",
            descricao: "Parâmetros mínimos de abastecimento",
            campos: ["reorder_point", "reorder_quantity"],
          },
        ],
        lembrarCampos: ["category", "item_type", "unit_of_measure", "status"],
      })
    case "lot":
      return warehouseBaseConfig({
        ordenarCampos: ["item", "lot_number", "expiration_date", "received_at", "unit_cost", "status"],
        labels: {
          status: "Estado do lote",
        },
        etapas: [
          {
            titulo: "Lote",
            descricao: "Item, número do lote e validade",
            campos: ["item", "lot_number", "expiration_date"],
          },
          {
            titulo: "Recebimento",
            descricao: "Data, custo e estado",
            campos: ["received_at", "unit_cost", "status"],
          },
        ],
        lembrarCampos: ["item", "status"],
      })
    case "stock_level":
      return warehouseBaseConfig({
        ordenarCampos: ["item", "lot", "location"],
        etapas: [
          {
            titulo: "Posição de estoque",
            descricao: "Item, lote e localização controlados pelo saldo",
            campos: ["item", "lot", "location"],
          },
        ],
        lembrarCampos: ["item", "location"],
      })
    case "stock_movement":
      return warehouseBaseConfig({
        ordenarCampos: [
          "name",
          "movement_type",
          "item",
          "lot",
          "quantity",
          "unit_cost",
          "source_location",
          "destination_location",
          "reference_document",
          "reason",
          "status",
        ],
        labels: {
          name: "Descrição do movimento",
          status: "Estado do movimento",
        },
        etapas: [
          {
            titulo: "Movimento",
            descricao: "Tipo, item, lote e quantidade",
            campos: ["name", "movement_type", "item", "lot", "quantity", "unit_cost"],
          },
          {
            titulo: "Localizações",
            descricao: "Origem, destino e documento",
            campos: ["source_location", "destination_location", "reference_document"],
          },
          {
            titulo: "Justificação",
            descricao: "Motivo, observações e estado",
            campos: ["reason", "status"],
          },
        ],
        lembrarCampos: ["movement_type", "item", "source_location", "destination_location"],
      })
    case "purchase_order":
      return warehouseBaseConfig({
        ordenarCampos: [
          "name",
          "order_number",
          "supplier_name",
          "supplier_document",
          "ordered_at",
          "expected_at",
          "status",
          "notes",
        ],
        labels: {
          name: "Nome do pedido de compra",
          status: "Estado do pedido",
        },
        etapas: [
          {
            titulo: "Pedido",
            descricao: "Número, nome e fornecedor",
            campos: ["name", "order_number", "supplier_name", "supplier_document"],
          },
          {
            titulo: "Prazos",
            descricao: "Datas e estado do abastecimento",
            campos: ["ordered_at", "expected_at", "status"],
          },
          {
            titulo: "Observações",
            descricao: "Notas internas para compra e auditoria",
            campos: ["notes"],
          },
        ],
        lembrarCampos: ["supplier_name", "supplier_document", "status"],
      })
    case "purchase_order_line":
      return warehouseBaseConfig({
        ordenarCampos: ["purchase_order", "item", "ordered_quantity", "unit_cost"],
        etapas: [
          {
            titulo: "Linha de compra",
            descricao: "Pedido, item, quantidade e custo",
            campos: ["purchase_order", "item", "ordered_quantity", "unit_cost"],
          },
        ],
        lembrarCampos: ["purchase_order", "item"],
      })
    case "goods_receipt":
      return warehouseBaseConfig({
        ordenarCampos: ["name", "receipt_number", "purchase_order", "warehouse", "default_location", "received_at", "notes"],
        labels: {
          name: "Nome do recebimento",
        },
        etapas: [
          {
            titulo: "Recebimento",
            descricao: "Número, pedido de compra e data",
            campos: ["name", "receipt_number", "purchase_order", "received_at"],
          },
          {
            titulo: "Destino físico",
            descricao: "Armazém e localização padrão",
            campos: ["warehouse", "default_location"],
          },
          {
            titulo: "Observações",
            descricao: "Notas de conferência e entrada",
            campos: ["notes"],
          },
        ],
        lembrarCampos: ["warehouse", "default_location"],
      })
    case "goods_receipt_line":
      return warehouseBaseConfig({
        ordenarCampos: [
          "receipt",
          "purchase_order_line",
          "item",
          "lot",
          "lot_number",
          "expiration_date",
          "quantity",
          "unit_cost",
          "location",
        ],
        etapas: [
          {
            titulo: "Vínculo",
            descricao: "Recebimento, linha de compra e item",
            campos: ["receipt", "purchase_order_line", "item"],
          },
          {
            titulo: "Lote e quantidade",
            descricao: "Lote, validade, quantidade e custo",
            campos: ["lot", "lot_number", "expiration_date", "quantity", "unit_cost"],
          },
          {
            titulo: "Localização",
            descricao: "Destino físico da entrada",
            campos: ["location"],
          },
        ],
        lembrarCampos: ["receipt", "item", "location"],
      })
    case "replenishment_plan":
      return warehouseBaseConfig({
        ordenarCampos: ["name", "plan_number", "warehouse", "supplier_name", "notes"],
        labels: {
          name: "Nome do plano de reposição",
        },
        etapas: [
          {
            titulo: "Plano",
            descricao: "Número, nome e escopo do cálculo",
            campos: ["name", "plan_number", "warehouse"],
          },
          {
            titulo: "Compra",
            descricao: "Fornecedor preferencial e notas",
            campos: ["supplier_name", "notes"],
          },
        ],
        lembrarCampos: ["warehouse", "supplier_name"],
      })
    case "replenishment_suggestion":
      return warehouseBaseConfig({
        ordenarCampos: ["plan", "item", "warehouse", "recommended_quantity", "estimated_unit_cost", "status"],
        labels: {
          status: "Estado da sugestão",
        },
        etapas: [
          {
            titulo: "Sugestão",
            descricao: "Plano, item e armazém",
            campos: ["plan", "item", "warehouse"],
          },
          {
            titulo: "Quantidade",
            descricao: "Quantidade recomendada, custo e estado",
            campos: ["recommended_quantity", "estimated_unit_cost", "status"],
          },
        ],
        lembrarCampos: ["plan", "item", "warehouse"],
      })
    case "sales_order":
      return warehouseBaseConfig({
        ordenarCampos: [
          "name",
          "order_number",
          "customer_name",
          "customer_document",
          "customer_reference",
          "requested_ship_date",
          "priority",
          "status",
          "notes",
        ],
        labels: {
          name: "Nome do pedido de venda",
          status: "Estado do pedido",
        },
        etapas: [
          {
            titulo: "Pedido",
            descricao: "Número, nome e cliente",
            campos: ["name", "order_number", "customer_name", "customer_document", "customer_reference"],
          },
          {
            titulo: "Expedição",
            descricao: "Data solicitada, prioridade e estado",
            campos: ["requested_ship_date", "priority", "status"],
          },
          {
            titulo: "Observações",
            descricao: "Notas comerciais e operacionais",
            campos: ["notes"],
          },
        ],
        lembrarCampos: ["customer_name", "priority", "status"],
      })
    case "sales_order_line":
      return warehouseBaseConfig({
        ordenarCampos: ["sales_order", "item", "lot", "preferred_location", "ordered_quantity", "unit_price"],
        etapas: [
          {
            titulo: "Linha de venda",
            descricao: "Pedido, item, lote e localização preferencial",
            campos: ["sales_order", "item", "lot", "preferred_location"],
          },
          {
            titulo: "Quantidade e preço",
            descricao: "Quantidade pedida e valor unitário",
            campos: ["ordered_quantity", "unit_price"],
          },
        ],
        lembrarCampos: ["sales_order", "item", "preferred_location"],
      })
    case "stock_reservation":
      return warehouseBaseConfig({
        ordenarCampos: ["sales_order", "sales_order_line", "item", "lot", "location", "quantity", "status"],
        labels: {
          status: "Estado da reserva",
        },
        etapas: [
          {
            titulo: "Pedido",
            descricao: "Pedido de venda e linha associada",
            campos: ["sales_order", "sales_order_line"],
          },
          {
            titulo: "Reserva",
            descricao: "Item, lote, localização e quantidade",
            campos: ["item", "lot", "location", "quantity", "status"],
          },
        ],
        lembrarCampos: ["sales_order", "sales_order_line", "item", "location"],
      })
    case "pick_list":
      return warehouseBaseConfig({
        ordenarCampos: ["sales_order", "name", "pick_number", "notes"],
        labels: {
          name: "Nome da lista de separação",
        },
        etapas: [
          {
            titulo: "Separação",
            descricao: "Pedido de venda, número e identificação",
            campos: ["sales_order", "name", "pick_number"],
          },
          {
            titulo: "Observações",
            descricao: "Notas para a equipe do armazém",
            campos: ["notes"],
          },
        ],
        lembrarCampos: ["sales_order"],
      })
    case "pick_list_line":
      return warehouseBaseConfig({
        ordenarCampos: [
          "pick_list",
          "sales_order_line",
          "reservation",
          "item",
          "lot",
          "source_location",
          "quantity_to_pick",
          "quantity_picked",
        ],
        etapas: [
          {
            titulo: "Origem",
            descricao: "Lista, pedido, reserva e localização",
            campos: ["pick_list", "sales_order_line", "reservation", "source_location"],
          },
          {
            titulo: "Item",
            descricao: "Item, lote e quantidades de separação",
            campos: ["item", "lot", "quantity_to_pick", "quantity_picked"],
          },
        ],
        lembrarCampos: ["pick_list", "source_location", "item"],
      })
    case "shipment":
      return warehouseBaseConfig({
        ordenarCampos: ["sales_order", "name", "shipment_number", "carrier_name", "tracking_number", "notes"],
        labels: {
          name: "Nome da expedição",
        },
        etapas: [
          {
            titulo: "Expedição",
            descricao: "Pedido de venda, número e identificação",
            campos: ["sales_order", "name", "shipment_number"],
          },
          {
            titulo: "Transporte",
            descricao: "Transportadora, rastreio e notas",
            campos: ["carrier_name", "tracking_number", "notes"],
          },
        ],
        lembrarCampos: ["sales_order", "carrier_name"],
      })
    case "shipment_line":
      return warehouseBaseConfig({
        ordenarCampos: ["shipment", "sales_order_line", "reservation", "item", "lot", "source_location", "quantity"],
        etapas: [
          {
            titulo: "Origem",
            descricao: "Expedição, linha de venda e reserva",
            campos: ["shipment", "sales_order_line", "reservation"],
          },
          {
            titulo: "Item expedido",
            descricao: "Item, lote, localização e quantidade",
            campos: ["item", "lot", "source_location", "quantity"],
          },
        ],
        lembrarCampos: ["shipment", "item", "source_location"],
      })
    case "stock_transfer":
      return warehouseBaseConfig({
        ordenarCampos: ["name", "transfer_number", "source_location", "destination_location", "notes"],
        labels: {
          name: "Nome da transferência",
        },
        etapas: [
          {
            titulo: "Transferência",
            descricao: "Número e identificação do movimento interno",
            campos: ["name", "transfer_number"],
          },
          {
            titulo: "Localizações",
            descricao: "Origem, destino e observações",
            campos: ["source_location", "destination_location", "notes"],
          },
        ],
        lembrarCampos: ["source_location", "destination_location"],
      })
    case "stock_transfer_line":
      return warehouseBaseConfig({
        ordenarCampos: ["transfer", "item", "lot", "quantity"],
        etapas: [
          {
            titulo: "Linha de transferência",
            descricao: "Transferência, item, lote e quantidade",
            campos: ["transfer", "item", "lot", "quantity"],
          },
        ],
        lembrarCampos: ["transfer", "item"],
      })
    case "cycle_count":
      return warehouseBaseConfig({
        ordenarCampos: ["name", "count_number", "location", "counted_at", "notes"],
        labels: {
          name: "Nome do inventário",
        },
        etapas: [
          {
            titulo: "Inventário",
            descricao: "Número, nome e localização contada",
            campos: ["name", "count_number", "location"],
          },
          {
            titulo: "Contagem",
            descricao: "Data e observações da contagem",
            campos: ["counted_at", "notes"],
          },
        ],
        lembrarCampos: ["location"],
      })
    case "cycle_count_line":
      return warehouseBaseConfig({
        ordenarCampos: ["cycle_count", "item", "lot", "counted_quantity"],
        etapas: [
          {
            titulo: "Linha de inventário",
            descricao: "Inventário, item, lote e quantidade contada",
            campos: ["cycle_count", "item", "lot", "counted_quantity"],
          },
        ],
        lembrarCampos: ["cycle_count", "item"],
      })
    default:
      return warehouseBaseConfig({
        lembrarCampos: ["warehouse", "location", "item", "status"],
      })
  }
}

function bloodbankDonationConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant"],
    esconderCampos: BLOODBANK_INTERNAL_FIELDS,
    labels: {
      tenant: "Instituição",
      donor: "Dador (ID)",
      donor_role: "Tipo de dador",
      bag_identifier: "Identificador da bolsa",
      blood_type: "Grupo sanguíneo",
      donation_type: "Tipo de doação",
      status: "Estado",
      screening_status: "Estado da triagem",
      collected_at: "Data/hora da coleta",
      processed_at: "Data/hora do processamento",
      volume_ml: "Volume (mL)",
      collected_by: "Coletado por (ID)",
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
      collected_by: "Opcional: ID do utilizador/técnico que realizou a coleta.",
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
        titulo: "Coleta",
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

function bloodbankStorageConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant"],
    esconderCampos: BLOODBANK_INTERNAL_FIELDS,
    labels: {
      tenant: "Instituição",
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

function bloodbankUnitConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant"],
    esconderCampos: BLOODBANK_INTERNAL_FIELDS,
    labels: {
      tenant: "Instituição",
      donation: "Doacao de origem (ID)",
      storage: "Armazenamento (ID)",
      reserved_for: "Reservada para (ID do paciente)",
      unit_number: "Numero da unidade",
      component_type: "Tipo de componente",
      blood_type: "Grupo sanguineo",
      volume_ml: "Volume (mL)",
      collected_at: "Data/hora da coleta",
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
      expires_at: "A validade deve ser posterior a data de coleta.",
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
        descricao: "Coleta, validade e volume",
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

function bloodbankTransfusionConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant"],
    esconderCampos: BLOODBANK_INTERNAL_FIELDS,
    labels: {
      tenant: "Instituição",
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

function bloodbankStockMovementConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant"],
    esconderCampos: BLOODBANK_INTERNAL_FIELDS,
    labels: {
      tenant: "Instituição",
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

function bloodbankStorageMaintenanceConfig(): ResourceFormConfig {
  return {
    somenteLeituraCampos: ["tenant"],
    esconderCampos: BLOODBANK_INTERNAL_FIELDS,
    labels: {
      tenant: "Instituição",
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
      tenant: "Instituição",
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
      tenant: "Instituição",
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

function dentalProcedureConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...DENTAL_INTERNAL_FIELDS, "code"],
    labels: {
      name: "Nome do procedimento",
      code: "Código do procedimento",
      category: "Categoria",
      default_duration_minutes: "Duração padrão (minutos)",
      base_price: "Preço base",
      requires_prosthesis_lab: "Requer laboratório de prótese",
      active: "Ativo",
      notes: "Observações",
    },
    hints: {
      code: "Gerado automaticamente pelo identificador do procedimento.",
    },
    widgets: {
      notes: "textarea",
    },
    ordenarCampos: [
      "name",
      "category",
      "default_duration_minutes",
      "base_price",
      "requires_prosthesis_lab",
      "active",
      "notes",
    ],
    etapas: [
      {
        titulo: "Identificação",
        descricao: "Nome, categoria e duração do procedimento",
        campos: ["name", "category", "default_duration_minutes"],
      },
      {
        titulo: "Preço e execução",
        descricao: "Valor base e necessidade de laboratório",
        campos: ["base_price", "requires_prosthesis_lab", "active"],
      },
      {
        titulo: "Observações",
        descricao: "Notas clínicas ou administrativas",
        campos: ["notes"],
      },
    ],
    lembrarCampos: ["category", "default_duration_minutes", "requires_prosthesis_lab"],
  }
}

function dentalOdontogramConfig(): ResourceFormConfig {
  return {
    esconderCampos: DENTAL_INTERNAL_FIELDS,
    labels: {
      odontogram: "Mapa odontológico",
      record: "Prontuário dentário",
      tooth_number: "Numeração dentária",
      surface: "Face",
      condition: "Condição",
      diagnosis: "Diagnóstico",
      severity: "Gravidade",
      color_code: "Código de cor",
      procedure_suggested: "Procedimento sugerido",
      status: "Estado",
      procedure: "Procedimento relacionado",
      notes: "Observações",
    },
    placeholders: {
      tooth_number: "Ex.: 11, 26, 48 ou 75",
    },
    hints: {
      tooth_number: "Use a numeração dentária FDI.",
    },
    widgets: {
      diagnosis: "textarea",
      notes: "textarea",
    },
    ordenarCampos: [
      "odontogram",
      "record",
      "tooth_number",
      "surface",
      "condition",
      "severity",
      "status",
      "color_code",
      "diagnosis",
      "procedure_suggested",
      "procedure",
      "notes",
    ],
    etapas: [
      {
        titulo: "Dente",
        descricao: "Numeração dentária, face e condição",
        campos: ["odontogram", "record", "tooth_number", "surface", "condition"],
      },
      {
        titulo: "Procedimento",
        descricao: "Procedimento relacionado e observações",
        campos: ["severity", "status", "diagnosis", "procedure_suggested", "procedure", "notes"],
      },
    ],
    lembrarCampos: ["record", "surface", "condition"],
  }
}

function dentalTreatmentPlanConfig(): ResourceFormConfig {
  return {
    esconderCampos: DENTAL_INTERNAL_FIELDS,
    labels: {
      patient: "Paciente",
      dentist: "Dentista responsável",
      record: "Prontuário dentário",
      title: "Plano dentário",
      status: "Estado",
      priority: "Prioridade",
      objectives: "Objetivos",
      planned_start: "Início previsto",
      planned_end: "Fim previsto",
      approved_at: "Aprovado em",
      estimated_total: "Total estimado",
      discount_amount: "Desconto",
      approved_amount: "Valor aprovado",
      requires_initial_payment: "Exige sinal inicial",
      initial_payment_amount: "Valor do sinal inicial",
      notes: "Observações",
    },
    hints: {
      title: "Plano clínico e financeiro proposto ao paciente.",
    },
    widgets: {
      objectives: "textarea",
      notes: "textarea",
    },
    ordenarCampos: [
      "patient",
      "dentist",
      "record",
      "title",
      "status",
      "priority",
      "objectives",
      "planned_start",
      "planned_end",
      "approved_at",
      "estimated_total",
      "discount_amount",
      "approved_amount",
      "requires_initial_payment",
      "initial_payment_amount",
      "notes",
    ],
    etapas: [
      {
        titulo: "Plano",
        descricao: "Identificação do plano dentário",
        campos: ["patient", "dentist", "record", "title", "status", "priority"],
      },
      {
        titulo: "Vigência base",
        descricao: "Datas de referência do plano",
        campos: ["planned_start", "planned_end", "approved_at"],
      },
      {
        titulo: "Valores",
        descricao: "Orçamento e aprovação financeira",
        campos: ["estimated_total", "discount_amount", "approved_amount", "requires_initial_payment", "initial_payment_amount"],
      },
      {
        titulo: "Conteúdo",
        descricao: "Objetivos e notas gerais",
        campos: ["objectives", "notes"],
      },
    ],
    lembrarCampos: ["status"],
  }
}

function dentalTreatmentItemConfig(): ResourceFormConfig {
  return {
    esconderCampos: DENTAL_INTERNAL_FIELDS,
    labels: {
      treatment_plan: "Plano dentário",
      phase: "Fase do plano",
      procedure: "Procedimento",
      appointment: "Consulta dentária",
      tooth_number: "Dente",
      surface: "Face",
      status: "Estado",
      financial_status: "Estado financeiro",
      scheduled_date: "Data prevista",
      completed_at: "Concluído em",
      quantity: "Quantidade",
      unit_price: "Preço unitário",
      discount_amount: "Desconto",
      lab_required: "Requer laboratório",
      approved_at: "Aprovado em",
      clinical_notes: "Notas clínicas",
    },
    placeholders: {
      tooth_number: "Ex.: 11, 26, 48 ou 75",
    },
    hints: {
      treatment_plan: "O item pertence ao plano dentário, não ao paciente.",
      tooth_number: "Use a numeração dentária FDI.",
    },
    widgets: {
      clinical_notes: "textarea",
    },
    ordenarCampos: [
      "treatment_plan",
      "phase",
      "procedure",
      "appointment",
      "tooth_number",
      "surface",
      "status",
      "financial_status",
      "scheduled_date",
      "completed_at",
      "quantity",
      "unit_price",
      "discount_amount",
      "lab_required",
      "approved_at",
      "clinical_notes",
    ],
    etapas: [
      {
        titulo: "Plano e procedimento",
        descricao: "Vincule o item ao plano dentário",
        campos: ["treatment_plan", "phase", "procedure", "status", "financial_status"],
      },
      {
        titulo: "Dente e execução",
        descricao: "Detalhes do item previsto no plano",
        campos: ["appointment", "tooth_number", "surface", "scheduled_date", "completed_at", "approved_at"],
      },
      {
        titulo: "Preço e notas",
        descricao: "Quantidade, custo e observações clínicas",
        campos: ["quantity", "unit_price", "discount_amount", "lab_required", "clinical_notes"],
      },
    ],
    lembrarCampos: ["treatment_plan", "status"],
  }
}

function dentalPatientTreatmentPlanConfig(): ResourceFormConfig {
  return {
    esconderCampos: DENTAL_INTERNAL_FIELDS,
    labels: {
      patient: "Paciente",
      treatment_plan: "Plano dentário",
      dentist: "Dentista responsável",
      record: "Prontuário dentário",
      assigned_at: "Atribuído em",
      valid_from: "Início da vigência",
      valid_until: "Fim da vigência",
      status: "Estado",
      notes: "Observações",
    },
    widgets: {
      notes: "textarea",
    },
    ordenarCampos: ["patient", "treatment_plan", "status", "valid_from", "valid_until", "dentist", "record", "assigned_at", "notes"],
    etapas: [
      {
        titulo: "Paciente e plano",
        descricao: "Associe o paciente a um plano dentário",
        campos: ["patient", "treatment_plan", "status"],
      },
      {
        titulo: "Vigência",
        descricao: "Controle se o paciente está na lista válida ou expirada",
        campos: ["valid_from", "valid_until", "assigned_at"],
      },
      {
        titulo: "Contexto clínico",
        descricao: "Responsável, prontuário e observações",
        campos: ["dentist", "record", "notes"],
      },
    ],
    lembrarCampos: ["treatment_plan", "status"],
  }
}

function dentalWorkflowConfig(
  labels: Record<string, string>,
  ordenarCampos: string[],
  textareaCampos: string[] = [],
  lembrarCampos: string[] = []
): ResourceFormConfig {
  const widgets = textareaCampos.reduce<Record<string, "textarea">>((acc, field) => {
    acc[field] = "textarea"
    return acc
  }, {})

  return {
    esconderCampos: DENTAL_INTERNAL_FIELDS,
    labels,
    widgets,
    ordenarCampos,
    etapas: [
      {
        titulo: "Dados",
        campos: ordenarCampos,
      },
    ],
    lembrarCampos,
  }
}

function dentalConsultationConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      patient: "Paciente",
      dentist: "Dentista",
      appointment: "Marcação dentária",
      record: "Prontuário dentário",
      started_at: "Início do atendimento",
      ended_at: "Fim do atendimento",
      status: "Estado",
      chief_complaint: "Queixa principal",
      present_illness_history: "História da doença atual",
      medical_history: "Antecedentes médicos",
      allergies: "Alergias",
      current_medication: "Medicação em uso",
      oral_hygiene_habits: "Hábitos de higiene oral",
      intraoral_exam: "Exame intraoral",
      extraoral_exam: "Exame extraoral",
      clinical_observations: "Observações clínicas",
      attachment_notes: "Fotografias, radiografias e documentos",
    },
    [
      "patient",
      "dentist",
      "appointment",
      "record",
      "status",
      "started_at",
      "ended_at",
      "chief_complaint",
      "present_illness_history",
      "medical_history",
      "allergies",
      "current_medication",
      "oral_hygiene_habits",
      "intraoral_exam",
      "extraoral_exam",
      "clinical_observations",
      "attachment_notes",
    ],
    [
      "chief_complaint",
      "present_illness_history",
      "medical_history",
      "allergies",
      "current_medication",
      "oral_hygiene_habits",
      "intraoral_exam",
      "extraoral_exam",
      "clinical_observations",
      "attachment_notes",
    ],
    ["patient", "dentist"]
  )
}

function dentalOdontogramChartConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      patient: "Paciente",
      consultation: "Atendimento dentário",
      record: "Prontuário dentário",
      created_by_dentist: "Criado pelo dentista",
      charted_at: "Data do odontograma",
      dentition_type: "Tipo de dentição",
      status: "Estado",
      notes: "Observações",
    },
    ["patient", "consultation", "record", "created_by_dentist", "charted_at", "dentition_type", "status", "notes"],
    ["notes"],
    ["patient", "dentition_type"]
  )
}

function dentalDiagnosisConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      patient: "Paciente",
      consultation: "Atendimento dentário",
      record: "Prontuário dentário",
      odontogram_entry: "Entrada do odontograma",
      tooth_number: "Dente relacionado",
      code: "Código CID/interno",
      diagnosis: "Diagnóstico",
      severity: "Gravidade",
      responsible_dentist: "Profissional responsável",
      diagnosed_at: "Diagnosticado em",
      notes: "Observações",
    },
    ["patient", "consultation", "record", "odontogram_entry", "tooth_number", "code", "diagnosis", "severity", "responsible_dentist", "diagnosed_at", "notes"],
    ["notes"],
    ["patient", "severity"]
  )
}

function dentalTreatmentPhaseConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      treatment_plan: "Plano de tratamento",
      title: "Fase",
      phase_type: "Tipo de fase",
      status: "Estado",
      planned_start: "Início previsto",
      planned_end: "Fim previsto",
      estimated_amount: "Valor estimado",
      approved_amount: "Valor aprovado",
      notes: "Observações",
      position: "Ordem de execução",
    },
    ["treatment_plan", "position", "title", "phase_type", "status", "planned_start", "planned_end", "estimated_amount", "approved_amount", "notes"],
    ["notes"],
    ["treatment_plan", "phase_type"]
  )
}

function dentalQuotationConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      treatment_plan: "Plano de tratamento",
      patient: "Paciente",
      issued_by: "Emitido por",
      status: "Estado",
      issued_at: "Emitido em",
      valid_until: "Válido até",
      subtotal: "Subtotal",
      discount_amount: "Desconto",
      tax_amount: "IVA/Taxas",
      total_amount: "Valor total",
      payment_terms: "Condições de pagamento",
      notes: "Observações",
    },
    ["treatment_plan", "patient", "issued_by", "status", "issued_at", "valid_until", "subtotal", "discount_amount", "tax_amount", "total_amount", "payment_terms", "notes"],
    ["payment_terms", "notes"],
    ["treatment_plan", "status"]
  )
}

function dentalApprovalConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      treatment_plan: "Plano de tratamento",
      quotation: "Orçamento",
      patient: "Paciente",
      approved_by_name: "Quem aprovou",
      approved_at: "Aprovado em",
      approval_scope: "Escopo aprovado",
      approved_amount: "Valor aprovado",
      accepted_terms: "Termos aceites",
      consent_signed: "Consentimento assinado",
      consent_document_reference: "Referência do consentimento",
      notes: "Observações",
    },
    ["treatment_plan", "quotation", "patient", "approved_by_name", "approved_at", "approval_scope", "approved_amount", "accepted_terms", "consent_signed", "consent_document_reference", "notes"],
    ["accepted_terms", "notes"],
    ["treatment_plan", "approval_scope"]
  )
}

function dentalPaymentConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      patient: "Paciente",
      treatment_plan: "Plano de tratamento",
      treatment_item: "Item do plano",
      quotation: "Orçamento",
      payment: "Pagamento financeiro",
      payment_kind: "Tipo de pagamento",
      status: "Estado",
      due_date: "Vencimento",
      paid_at: "Pago em",
      amount_due: "Valor devido",
      amount_paid: "Valor pago",
      method: "Método",
      external_reference: "Referência externa",
      notes: "Observações",
    },
    ["patient", "treatment_plan", "treatment_item", "quotation", "payment", "payment_kind", "status", "due_date", "paid_at", "amount_due", "amount_paid", "method", "external_reference", "notes"],
    ["notes"],
    ["patient", "payment_kind", "status"]
  )
}

function dentalProcedureExecutionConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      patient: "Paciente",
      consultation: "Atendimento dentário",
      treatment_plan: "Plano de tratamento",
      treatment_item: "Item do plano",
      appointment: "Marcação dentária",
      procedure: "Procedimento",
      performed_by: "Profissional executor",
      tooth_number: "Dente",
      surface: "Face",
      status: "Estado",
      scheduled_at: "Agendado para",
      started_at: "Iniciado em",
      performed_at: "Executado em",
      materials_used: "Materiais usados",
      anesthesia_used: "Anestesia usada",
      clinical_notes: "Notas clínicas",
    },
    ["patient", "consultation", "treatment_plan", "treatment_item", "appointment", "procedure", "performed_by", "tooth_number", "surface", "status", "scheduled_at", "started_at", "performed_at", "materials_used", "anesthesia_used", "clinical_notes"],
    ["materials_used", "anesthesia_used", "clinical_notes"],
    ["patient", "procedure", "status"]
  )
}

function dentalProsthesisLabOrderConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      patient: "Paciente",
      dentist: "Dentista",
      treatment_item: "Item do plano",
      procedure_execution: "Procedimento executado",
      lab_company: "Laboratório de prótese",
      order_number: "Número da ordem",
      prosthesis_type: "Tipo de prótese",
      status: "Estado",
      tooth_numbers: "Dentes",
      shade: "Cor/Escala",
      material: "Material",
      impression_date: "Data da moldagem",
      sent_at: "Enviado em",
      received_by_lab_at: "Recebido pelo laboratório em",
      due_date: "Previsão de entrega",
      trial_at: "Prova em",
      received_at: "Recebido em",
      adjusted_at: "Ajustado em",
      delivered_at: "Entregue em",
      installed_at: "Instalado em",
      lab_notes: "Notas para o laboratório",
      cost: "Custo laboratorial",
      patient_price: "Preço ao paciente",
    },
    ["patient", "dentist", "treatment_item", "procedure_execution", "lab_company", "order_number", "prosthesis_type", "status", "tooth_numbers", "shade", "material", "impression_date", "sent_at", "received_by_lab_at", "due_date", "trial_at", "received_at", "adjusted_at", "delivered_at", "installed_at", "cost", "patient_price", "lab_notes"],
    ["lab_notes"],
    ["patient", "prosthesis_type", "status"]
  )
}

function dentalImagingOrderConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      patient: "Paciente",
      dentist: "Dentista solicitante",
      consultation: "Atendimento dentário",
      record: "Prontuário dentário",
      treatment_item: "Item do plano",
      procedure_execution: "Procedimento executado",
      imaging_type: "Tipo de imagem",
      status: "Estado",
      requested_at: "Solicitado em",
      scheduled_at: "Agendado para",
      acquired_at: "Adquirido em",
      reviewed_at: "Revisto em",
      clinical_indication: "Indicação clínica",
      result_summary: "Resumo do resultado",
      image_reference: "Referência da imagem",
      notes: "Observações",
    },
    ["patient", "dentist", "consultation", "record", "treatment_item", "procedure_execution", "imaging_type", "status", "requested_at", "scheduled_at", "acquired_at", "reviewed_at", "clinical_indication", "result_summary", "image_reference", "notes"],
    ["clinical_indication", "result_summary", "notes"],
    ["patient", "imaging_type", "status"]
  )
}

function dentalPrescriptionConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      patient: "Paciente",
      dentist: "Dentista prescritor",
      consultation: "Atendimento dentário",
      record: "Prontuário dentário",
      procedure_execution: "Procedimento executado",
      medication_product: "Produto farmacêutico",
      medication: "Medicamento",
      dose: "Dose",
      frequency: "Frequência",
      duration: "Duração",
      instructions: "Instruções",
      status: "Estado",
      prescribed_at: "Prescrito em",
      notes: "Observações",
    },
    ["patient", "dentist", "consultation", "record", "procedure_execution", "medication_product", "medication", "dose", "frequency", "duration", "instructions", "status", "prescribed_at", "notes"],
    ["instructions", "notes"],
    ["patient", "medication", "status"]
  )
}

function dentalFollowUpConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      patient: "Paciente",
      procedure_execution: "Procedimento executado",
      appointment: "Marcação dentária",
      treatment_plan: "Plano de tratamento",
      followup_reason: "Motivo do retorno",
      status: "Estado",
      due_date: "Data prevista",
      completed_at: "Concluído em",
      findings: "Achados",
      notes: "Observações",
    },
    ["patient", "procedure_execution", "appointment", "treatment_plan", "followup_reason", "status", "due_date", "completed_at", "findings", "notes"],
    ["findings", "notes"],
    ["patient", "status"]
  )
}

function dentalMaterialConsumptionConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      procedure_execution: "Procedimento executado",
      product: "Produto de farmácia",
      warehouse_item: "Item de armazém",
      inventory_movement: "Movimento de stock",
      material_name: "Material",
      quantity: "Quantidade",
      unit_cost: "Custo unitário",
      consumed_at: "Consumido em",
      notes: "Observações",
    },
    ["procedure_execution", "product", "warehouse_item", "inventory_movement", "material_name", "quantity", "unit_cost", "consumed_at", "notes"],
    ["notes"],
    ["procedure_execution"]
  )
}

function dentalClinicalEvolutionConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      patient: "Paciente",
      record: "Prontuário dentário",
      consultation: "Atendimento dentário",
      procedure_execution: "Procedimento executado",
      treatment_plan: "Plano de tratamento",
      dentist: "Dentista",
      evolved_at: "Evolução em",
      summary: "Evolução clínica",
      next_steps: "Próximos passos",
      notes: "Observações",
    },
    ["patient", "record", "consultation", "procedure_execution", "treatment_plan", "dentist", "evolved_at", "summary", "next_steps", "notes"],
    ["summary", "next_steps", "notes"],
    ["patient", "dentist"]
  )
}

function dentalDocumentConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      patient: "Paciente",
      consultation: "Atendimento dentário",
      record: "Prontuário dentário",
      treatment_plan: "Plano de tratamento",
      document_type: "Tipo de documento",
      title: "Título",
      file_reference: "Referência do ficheiro",
      signed: "Assinado",
      signed_at: "Assinado em",
      notes: "Observações",
    },
    ["patient", "consultation", "record", "treatment_plan", "document_type", "title", "file_reference", "signed", "signed_at", "notes"],
    ["notes"],
    ["patient", "document_type"]
  )
}

function dentalAuditEventConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      patient: "Paciente",
      treatment_plan: "Plano de tratamento",
      event_type: "Tipo de evento",
      actor_name: "Responsável",
      event_at: "Evento em",
      summary: "Resumo",
      metadata: "Metadados",
    },
    ["patient", "treatment_plan", "event_type", "actor_name", "event_at", "summary", "metadata"],
    ["summary"],
    ["event_type"]
  )
}

function dentalBillingItemConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      patient: "Paciente",
      treatment_plan: "Plano de tratamento",
      treatment_item: "Item do plano",
      procedure_execution: "Procedimento executado",
      quotation: "Orçamento",
      invoice: "Fatura",
      invoice_item: "Item de fatura",
      status: "Estado",
      description: "Descrição",
      quantity: "Quantidade",
      unit_price: "Preço unitário",
      discount_amount: "Desconto",
      tax_amount: "IVA/Taxas",
      billable_at: "Faturável em",
      billed_at: "Faturado em",
      notes: "Observações",
    },
    ["patient", "treatment_plan", "treatment_item", "procedure_execution", "quotation", "invoice", "invoice_item", "status", "description", "quantity", "unit_price", "discount_amount", "tax_amount", "billable_at", "billed_at", "notes"],
    ["notes"],
    ["patient", "status"]
  )
}

function dentalPatientPlanSummaryConfig(): ResourceFormConfig {
  return dentalWorkflowConfig(
    {
      patient: "Paciente",
      active_plan: "Plano ativo",
      next_appointment: "Próxima consulta",
      plan_status: "Estado do plano",
      total_planned_amount: "Total planeado",
      total_paid: "Total pago",
      balance_amount: "Saldo",
      completed_items: "Itens concluídos",
      pending_items: "Itens pendentes",
      generated_at: "Gerado em",
      notes: "Observações",
    },
    ["patient", "active_plan", "plan_status", "total_planned_amount", "total_paid", "balance_amount", "completed_items", "pending_items", "next_appointment", "generated_at", "notes"],
    ["notes"],
    ["patient", "plan_status"]
  )
}

function nursingProcedureConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...NURSING_INTERNAL_FIELDS,
      "ward",
      "ward_name",
      "patient_name",
      "professional_name",
      "professional_names",
      "workflow_status_display",
      "billing_status_display",
      "items_count",
      "services_subtotal",
      "materials_subtotal",
      "total",
      "billed_at",
      "executed_at",
      "completed_at",
    ],
    ordenarCampos: [
      "patient",
      "professional",
      "performed_date",
      "selected_catalogs",
      "selected_materials",
      "workflow_status",
      "billing_status",
      "notes",
    ],
    labels: {
      patient: "Paciente",
      professional: "Profissionais",
      performed_date: "Data de realizacao",
      selected_catalogs: "Procedimentos do catalogo",
      selected_materials: "Materiais selecionados",
      workflow_status: "Estado do fluxo",
      billing_status: "Estado da faturacao",
      notes: "Observacoes",
    },
    placeholders: {
      selected_catalogs: "Pesquisar procedimentos e adicionar por clique...",
      selected_materials: "Pesquisar materiais e adicionar por clique...",
      notes: "Observacoes clinicas ou operacionais do procedimento.",
    },
    hints: {
      patient: "Paciente principal do procedimento.",
      professional: "Equipa responsavel pelo registo e execucao.",
      selected_catalogs: "Catalogos selecionados alimentam a leitura clinica e financeira do procedimento.",
      selected_materials: "Materiais associados ao procedimento de enfermagem.",
    },
    widgets: {
      notes: "textarea",
    },
    etapas: [
      {
        titulo: "Paciente e equipa",
        descricao: "Contexto principal do procedimento",
        campos: ["patient", "professional"],
      },
      {
        titulo: "Procedimento",
        descricao: "Data, catalogos e materiais",
        campos: ["performed_date", "selected_catalogs", "selected_materials"],
      },
      {
        titulo: "Fluxo",
        descricao: "Estados operacional e de faturacao",
        campos: ["workflow_status", "billing_status"],
      },
      {
        titulo: "Observacoes",
        descricao: "Notas clinicas e operacionais",
        campos: ["notes"],
      },
    ],
  }
}

function nursingEvolutionConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...NURSING_INTERNAL_FIELDS,
      "ward_name",
      "patient_name",
      "evolution_date",
    ],
    ordenarCampos: ["patient", "ward", "observation"],
    labels: {
      patient: "Paciente",
      ward: "Enfermaria",
      observation: "Evolução clínica",
    },
    placeholders: {
      patient: "Pesquisar paciente por nome, código ou referência...",
      observation:
        "Descreva a evolução clínica: estado do paciente, sinais, intervenções de enfermagem e plano de seguimento.",
    },
    hints: {
      patient: "Paciente acompanhado nesta evolução.",
      ward: "Enfermaria onde decorre o acompanhamento (opcional).",
      observation: "Texto livre, datado automaticamente no momento do registo.",
    },
    widgets: {
      observation: "textarea",
    },
    etapas: [
      {
        titulo: "Paciente e enfermaria",
        descricao: "Contexto do acompanhamento",
        campos: ["patient", "ward"],
      },
      {
        titulo: "Evolução clínica",
        descricao: "Anotação de enfermagem",
        campos: ["observation"],
      },
    ],
  }
}

function nursingPrescriptionConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...NURSING_INTERNAL_FIELDS,
      "ward_name",
      "patient_name",
      "prescription_date",
    ],
    ordenarCampos: ["patient", "ward", "active", "description"],
    labels: {
      patient: "Paciente",
      ward: "Enfermaria",
      active: "Prescrição ativa",
      description: "Descrição da prescrição",
    },
    placeholders: {
      patient: "Pesquisar paciente por nome, código ou referência...",
      description:
        "Descreva os cuidados de enfermagem prescritos: medidas, frequência, via, observações e plano de seguimento.",
    },
    hints: {
      patient: "Paciente a quem se destina a prescrição.",
      ward: "Enfermaria onde decorre o cuidado (opcional).",
      active: "Desmarque para arquivar a prescrição sem a apagar.",
    },
    widgets: {
      description: "textarea",
    },
    etapas: [
      {
        titulo: "Paciente e enfermaria",
        descricao: "Contexto da prescrição",
        campos: ["patient", "ward", "active"],
      },
      {
        titulo: "Prescrição de cuidados",
        descricao: "Cuidados de enfermagem",
        campos: ["description"],
      },
    ],
  }
}

function financialReconciliationConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...NURSING_INTERNAL_FIELDS,
      "invoice_code",
      "discrepancy",
      "reconciled",
    ],
    ordenarCampos: ["invoice", "external_reference", "accounting_value", "received_amount"],
    labels: {
      invoice: "Fatura",
      external_reference: "Referência externa",
      accounting_value: "Valor contabilístico",
      received_amount: "Valor recebido",
    },
    placeholders: {
      external_reference: "Ex.: extrato, recibo, transferência...",
      accounting_value: "Ex.: 0.00",
      received_amount: "Ex.: 0.00",
    },
    hints: {
      invoice: "Fatura a conciliar.",
      received_amount: "A diferença (discrepância) é calculada automaticamente.",
    },
    etapas: [
      {
        titulo: "Fatura",
        descricao: "Documento e referência",
        campos: ["invoice", "external_reference"],
      },
      {
        titulo: "Valores",
        descricao: "Contabilístico vs. recebido",
        campos: ["accounting_value", "received_amount"],
      },
    ],
  }
}

function ledgerMovementConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...NURSING_INTERNAL_FIELDS,
      "account_name",
      "account_type",
      "entry_code",
    ],
    ordenarCampos: ["entry", "account", "debit", "credit", "name"],
    labels: {
      entry: "Lançamento",
      account: "Conta contábil",
      debit: "Débito",
      credit: "Crédito",
      name: "Identificação (opcional)",
    },
    placeholders: {
      debit: "Ex.: 0.00",
      credit: "Ex.: 0.00",
    },
    hints: {
      entry: "Lançamento ao qual este movimento pertence.",
      account: "Conta movimentada (débito ou crédito).",
      debit: "Preencha o débito OU o crédito.",
    },
    etapas: [
      {
        titulo: "Vínculos",
        descricao: "Lançamento e conta",
        campos: ["entry", "account"],
      },
      {
        titulo: "Valores",
        descricao: "Débito / crédito",
        campos: ["debit", "credit", "name"],
      },
    ],
  }
}

function ledgerEntryConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...NURSING_INTERNAL_FIELDS,
      "confirmed",
    ],
    ordenarCampos: ["name", "date", "external_reference", "description"],
    labels: {
      name: "Identificação do lançamento",
      date: "Data da transação",
      external_reference: "Referência externa",
      description: "Descrição",
    },
    placeholders: {
      name: "Ex.: Pagamento de fornecedor, Receção de receita...",
      external_reference: "Ex.: NF-2024-001, recibo, contrato...",
      description: "Detalhe do lançamento contabilístico.",
    },
    hints: {
      confirmed: "A confirmação (partida dobrada) é feita pelas ações do lançamento, não aqui.",
    },
    widgets: {
      description: "textarea",
    },
    etapas: [
      {
        titulo: "Lançamento",
        descricao: "Identificação, data e referência",
        campos: ["name", "date", "external_reference"],
      },
      {
        titulo: "Descrição",
        descricao: "Detalhe do lançamento",
        campos: ["description"],
      },
    ],
  }
}

function accountConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...NURSING_INTERNAL_FIELDS,
      "current_balance",
      "saldo",
    ],
    ordenarCampos: ["name", "type"],
    labels: {
      name: "Nome da conta",
      type: "Tipo de conta",
    },
    placeholders: {
      name: "Ex.: Caixa, Banco, Fornecedores, Receita de serviços...",
    },
    hints: {
      type: "Ativo, Passivo, Receita, Despesa ou Patrimônio. Não pode mudar após haver movimentação.",
    },
  }
}

function bankAccountConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...NURSING_INTERNAL_FIELDS,
      "account_name",
    ],
    ordenarCampos: [
      "bank_name",
      "kind",
      "account_number",
      "branch",
      "iban",
      "swift",
      "currency",
      "holder_name",
      "account",
      "current_balance",
      "active",
      "notes",
    ],
    labels: {
      bank_name: "Banco",
      kind: "Tipo de conta",
      account_number: "Número da conta",
      branch: "Agência / Balcão",
      iban: "IBAN / NIB",
      swift: "SWIFT / BIC",
      currency: "Moeda",
      holder_name: "Titular",
      account: "Conta contábil (opcional)",
      current_balance: "Saldo atual",
      active: "Conta ativa",
      notes: "Observações",
    },
    placeholders: {
      bank_name: "Ex.: Millennium BIM, BCI, Standard Bank...",
      account_number: "Ex.: 0001234567890",
      iban: "Ex.: MZ59 0001 0000 0012 3456 7890 1",
      swift: "Ex.: BIMOMZMX",
      currency: "Ex.: MZN",
      holder_name: "Nome do titular da conta",
      current_balance: "Ex.: 0.00",
    },
    hints: {
      account: "Vincule à conta do plano de contas, se aplicável.",
      current_balance: "Saldo inicial/atual. Quando há conta contábil vinculada, é calculado automaticamente pelos lançamentos.",
    },
    widgets: {
      notes: "textarea",
    },
    // Saldo vira somente-leitura quando há conta contábil vinculada (passa a ser derivado).
    somenteLeituraSe: {
      current_balance: { campo: "account" },
    },
    etapas: [
      {
        titulo: "Banco",
        descricao: "Identificação da instituição e tipo",
        campos: ["bank_name", "kind", "account_number", "branch"],
      },
      {
        titulo: "Dados bancários",
        descricao: "Códigos internacionais e titular",
        campos: ["iban", "swift", "currency", "holder_name"],
      },
      {
        titulo: "Contabilidade e saldo",
        descricao: "Vínculo contábil, saldo e estado",
        campos: ["account", "current_balance", "active", "notes"],
      },
    ],
  }
}

function nursingVitalSignConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...NURSING_INTERNAL_FIELDS,
      "ward",
      "ward_name",
      "patient_name",
    ],
    ordenarCampos: [
      "patient",
      "record",
      "collected_at",
      "temperature_c",
      "blood_pressure",
      "heart_rate",
      "respiratory_rate",
      "oxygen_saturation",
    ],
    labels: {
      patient: "Paciente",
      record: "Registo de enfermagem",
      collected_at: "Coletado em",
      temperature_c: "Temperatura (°C)",
      blood_pressure: "Pressão arterial",
      heart_rate: "Frequência cardíaca (bpm)",
      respiratory_rate: "Frequência respiratória (rpm)",
      oxygen_saturation: "Saturação de O₂ (%)",
    },
    placeholders: {
      patient: "Pesquisar paciente por nome, código ou referência...",
      blood_pressure: "Ex.: 120/80",
      temperature_c: "Ex.: 36.5",
      heart_rate: "Ex.: 78",
      respiratory_rate: "Ex.: 16",
      oxygen_saturation: "Ex.: 98",
    },
    hints: {
      patient: "Paciente a quem pertencem os sinais vitais.",
      record: "Registo de enfermagem associado (deve pertencer ao paciente).",
      collected_at: "Momento da colheita dos sinais vitais.",
    },
    etapas: [
      {
        titulo: "Paciente e registo",
        descricao: "Contexto da colheita",
        campos: ["patient", "record", "collected_at"],
      },
      {
        titulo: "Sinais vitais",
        descricao: "Medições coletadas",
        campos: [
          "temperature_c",
          "blood_pressure",
          "heart_rate",
          "respiratory_rate",
          "oxygen_saturation",
        ],
      },
    ],
  }
}

function nursingRecordConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...NURSING_INTERNAL_FIELDS, "collection_guidance"],
    ordenarCampos: ["name", "patient", "ward", "priority", "record_kind", "origin_role", "lab_request", "observation"],
    labels: {
      name: "Nome",
      patient: "Paciente",
      ward: "Enfermaria",
      priority: "Prioridade",
      record_kind: "Tipo de registo",
      origin_role: "Perfil de origem",
      lab_request: "Requisição laboratorial",
      observation: "Observação",
    },
    placeholders: {
      observation: "Observações clínicas ou operacionais do registo.",
    },
    hints: {
      patient: "Paciente associado ao registo de enfermagem.",
      ward: "Enfermaria responsável pelo atendimento.",
      lab_request: "Requisição laboratorial vinculada, quando aplicável.",
    },
    widgets: {
      observation: "textarea",
    },
    somenteLeituraCampos: ["record_kind", "origin_role", "lab_request"],
  }
}

function nursingProcedureMaterialConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...NURSING_INTERNAL_FIELDS,
      "ward",
      "ward_name",
      "procedure_item",
      "inventory_movement",
      "procedure_code",
      "product_name",
      "product_type",
      "lot_number",
      "value_unitario",
    ],
    ordenarCampos: ["procedure", "product", "quantity", "lot", "observation"],
    labels: {
      procedure: "Procedimento",
      product: "Produto farmacêutico / médico-cirúrgico",
      quantity: "Quantidade",
      lot: "Lote específico",
      observation: "Observações",
    },
    placeholders: {
      observation: "Observações sobre o consumo ou uso do produto neste procedimento.",
    },
    hints: {
      procedure: "Selecione o procedimento. O paciente fica apenas no procedimento, não no material.",
      product:
        "Vincule medicamentos, materiais, reagentes, insumos e outros produtos farmacêuticos ou médico-cirúrgicos.",
      lot: "Opcional: quando não informado, o backend tenta selecionar um lote disponível.",
    },
    widgets: {
      observation: "textarea",
    },
    etapas: [
      {
        titulo: "Procedimento",
        descricao: "Contexto clínico herdado pelo material",
        campos: ["procedure"],
      },
      {
        titulo: "Produto",
        descricao: "Produto consumido ou associado ao procedimento",
        campos: ["product", "quantity", "lot"],
      },
      {
        titulo: "Observações",
        descricao: "Detalhes adicionais do consumo",
        campos: ["observation"],
      },
    ],
    lembrarCampos: ["procedure"],
  }
}

function nursingNonFinancialConfig(...monetaryFields: string[]): ResourceFormConfig {
  return {
    esconderCampos: [...NURSING_INTERNAL_FIELDS, ...monetaryFields],
  }
}

function nursingProcedureItemConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...NURSING_INTERNAL_FIELDS,
      "value_unitario",
      "unit_price",
      "valor_unitario",
      "valor_unitário",
      "performed",
      "execution_status",
      "execution_status_display",
      "billed",
      "billed_at",
      "executed_at",
      "completed_at",
      "procedure_code",
      "patient_name",
      "ward_name",
      "catalog_name",
      "catalog_code",
    ],
    ordenarCampos: ["procedure", "catalog", "description", "quantity", "position", "observation"],
    labels: {
      procedure: "Procedimento",
      catalog: "Item do catálogo",
      description: "Descrição",
      quantity: "Quantidade",
      position: "Posição",
      observation: "Observações",
    },
  }
}

// ─── Human Resources ────────────────────────────────────────────────────────

const HR_INTERNAL_FIELDS = [
  // Campos de auditoria e infra — nunca mostrar
  "id", "created_at", "updated_at", "deleted", "deleted_at",
  "version", "created_by", "updated_by", "deleted_by", "tenant",
]
const HR_COMPUTED_FIELDS = [
  // Propriedades calculadas — somente leitura, não editáveis
  "employee_name", "role_name", "profession_name", "approved_by_name",
  "salary_base", "salary_liquido", "salary_allowances_value", "current_salary",
  "tenure_months", "has_open_disciplinary_process", "can_progress_salary", "can_change_career",
  "remaining_days",
]

function hrEmployeeConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      name: "Nome completo", role: "Cargo", profession: "Profissão",
      gender: "Género", date_of_birth: "Data de nascimento",
      nationality: "Nacionalidade", marital_status: "Estado civil",
      address: "Morada", document_type: "Tipo de documento",
      document_number: "Número do documento", nuit: "NUIT",
      inss_number: "Número INSS", email: "E-mail", phone: "Telefone",
      emergency_contact_name: "Contacto de emergência (nome)",
      emergency_contact_phone: "Contacto de emergência (telefone)",
      admission_date: "Data de admissão", status: "Estado",
      nib: "NIB / Conta bancária", payment_method: "Método de pagamento",
      nominal_salary: "Salário nominal", salary_increase: "Aumento salarial",
      base_month_hours: "Horas base (mês)",
      ordinary_hour_value: "Valor hora ordinária",
      extraordinary_hour_value: "Valor hora extraordinária",
      minimum_progression_months: "Meses mínimos para progressão",
      minimum_career_change_months: "Meses mínimos para mudança de carreira",
      family_allowance_per_dependent: "Subsídio por agregado familiar",
    },
    widgets: { address: "textarea" },
    ordenarCampos: [
      "name", "gender", "date_of_birth", "nationality", "marital_status",
      "document_type", "document_number", "nuit", "inss_number",
      "email", "phone", "address",
      "emergency_contact_name", "emergency_contact_phone",
      "role", "profession", "admission_date", "status",
      "nib", "payment_method",
      "nominal_salary", "salary_increase", "base_month_hours",
      "ordinary_hour_value", "extraordinary_hour_value",
      "minimum_progression_months", "minimum_career_change_months",
      "family_allowance_per_dependent",
    ],
    etapas: [
      { titulo: "Dados pessoais", campos: ["name", "gender", "date_of_birth", "nationality", "marital_status"] },
      { titulo: "Documentos e contacto", campos: ["document_type", "document_number", "nuit", "inss_number", "email", "phone", "address"] },
      { titulo: "Emergência", campos: ["emergency_contact_name", "emergency_contact_phone"] },
      { titulo: "Dados laborais", campos: ["role", "profession", "admission_date", "status"] },
      { titulo: "Pagamento", campos: ["nib", "payment_method", "nominal_salary", "salary_increase", "base_month_hours"] },
      { titulo: "Horas e progressão", campos: ["ordinary_hour_value", "extraordinary_hour_value", "minimum_progression_months", "minimum_career_change_months", "family_allowance_per_dependent"] },
    ],
    lembrarCampos: ["role", "profession", "payment_method", "nationality"],
  }
}

function hrJobTitleConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      name: "Título do cargo", description: "Descrição",
      is_doctor: "É médico", hierarchy_level: "Nível hierárquico",
      reports_to: "Reporta a", salary_grade: "Nível salarial",
      responsibilities: "Responsabilidades", status: "Estado",
    },
    widgets: { description: "textarea", responsibilities: "textarea" },
    ordenarCampos: ["name", "hierarchy_level", "reports_to", "salary_grade", "is_doctor", "status", "description", "responsibilities"],
    etapas: [
      { titulo: "Identificação", campos: ["name", "hierarchy_level", "reports_to", "salary_grade", "is_doctor", "status"] },
      { titulo: "Descrição", campos: ["description", "responsibilities"] },
    ],
    lembrarCampos: ["status"],
  }
}

function hrProfessionConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      name: "Nome da profissão", description: "Descrição",
      professional_category: "Categoria profissional",
      requires_license: "Requer licença profissional",
      license_authority: "Entidade emissora da licença",
      base_salary: "Salário base", ordinary_hour_value: "Valor hora ordinária",
      extraordinary_hour_value: "Valor hora extraordinária",
      minimum_progression_months: "Meses mínimos para progressão",
      minimum_career_change_months: "Meses mínimos para mudança de carreira",
      family_allowance_per_dependent: "Subsídio por agregado familiar",
      active: "Ativa",
    },
    widgets: { description: "textarea" },
    ordenarCampos: ["name", "professional_category", "requires_license", "license_authority", "active", "description", "base_salary", "ordinary_hour_value", "extraordinary_hour_value", "minimum_progression_months", "minimum_career_change_months", "family_allowance_per_dependent"],
    etapas: [
      { titulo: "Identificação", campos: ["name", "professional_category", "requires_license", "license_authority", "active", "description"] },
      { titulo: "Regras salariais", campos: ["base_salary", "ordinary_hour_value", "extraordinary_hour_value"] },
      { titulo: "Progressão e benefícios", campos: ["minimum_progression_months", "minimum_career_change_months", "family_allowance_per_dependent"] },
    ],
    lembrarCampos: ["professional_category", "requires_license"],
  }
}

function hrFamilyDependentConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      employee: "Funcionário", name: "Nome completo", relationship: "Grau de parentesco",
      gender: "Género", birth_date: "Data de nascimento",
      document_number: "Número do documento", phone: "Telefone",
      lives_with_employee: "Vive com o funcionário",
      is_dependent: "É dependente", is_emergency_contact: "É contacto de emergência",
      benefit_eligible: "Elegível para benefícios", notes: "Observações",
    },
    widgets: { notes: "textarea" },
    ordenarCampos: ["employee", "name", "relationship", "gender", "birth_date", "document_number", "phone", "lives_with_employee", "is_dependent", "is_emergency_contact", "benefit_eligible", "notes"],
    etapas: [
      { titulo: "Identificação", campos: ["employee", "name", "relationship", "gender", "birth_date", "document_number", "phone"] },
      { titulo: "Vínculo e benefícios", campos: ["lives_with_employee", "is_dependent", "is_emergency_contact", "benefit_eligible"] },
      { titulo: "Observações", campos: ["notes"] },
    ],
    lembrarCampos: ["relationship"],
  }
}

function hrWorkScheduleConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      employee: "Funcionário", weekday: "Dia da semana",
      start_time: "Hora de início", end_time: "Hora de fim",
      schedule_type: "Tipo de horário", shift_name: "Nome do turno",
      effective_from: "Vigente a partir de", effective_until: "Vigente até",
      active: "Ativo",
    },
    ordenarCampos: ["employee", "schedule_type", "shift_name", "weekday", "start_time", "end_time", "effective_from", "effective_until", "active"],
    etapas: [
      { titulo: "Funcionário e tipo", campos: ["employee", "schedule_type", "shift_name"] },
      { titulo: "Horário", campos: ["weekday", "start_time", "end_time"] },
      { titulo: "Vigência", campos: ["effective_from", "effective_until", "active"] },
    ],
    lembrarCampos: ["schedule_type", "employee"],
  }
}

function hrAbsenceConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      employee: "Funcionário", date: "Data (legado)", absence_type: "Tipo de falta",
      start_date: "Data de início", end_date: "Data de fim",
      reason: "Motivo", status: "Estado",
      deduct_from_salary: "Descontar do salário",
      deduct_from_vacation: "Descontar das férias",
      document_attached: "Documento anexado",
    },
    ordenarCampos: ["employee", "absence_type", "date", "start_date", "end_date", "reason", "status", "deduct_from_salary", "deduct_from_vacation", "document_attached"],
    etapas: [
      { titulo: "Falta", campos: ["employee", "absence_type", "date", "start_date", "end_date"] },
      { titulo: "Detalhe", campos: ["reason", "status", "document_attached"] },
      { titulo: "Descontos", campos: ["deduct_from_salary", "deduct_from_vacation"] },
    ],
    lembrarCampos: ["absence_type", "deduct_from_salary"],
  }
}

function hrVacationConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS, "total_days", "approved_at"],
    labels: {
      employee: "Funcionário", vacation_year: "Ano de férias",
      start_date: "Data de início", end_date: "Data de fim",
      status: "Estado", approved_by: "Aprovado por", notes: "Observações",
    },
    widgets: { notes: "textarea" },
    ordenarCampos: ["employee", "vacation_year", "start_date", "end_date", "status", "approved_by", "notes"],
    etapas: [
      { titulo: "Pedido", campos: ["employee", "vacation_year", "start_date", "end_date"] },
      { titulo: "Aprovação", campos: ["status", "approved_by"] },
      { titulo: "Observações", campos: ["notes"] },
    ],
    lembrarCampos: ["employee", "vacation_year"],
  }
}

function hrOvertimeConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS, "approved_at"],
    labels: {
      employee: "Funcionário", date: "Data", kind: "Tipo de hora",
      overtime_type: "Classificação", hours: "Horas",
      multiplier: "Multiplicador", amount: "Valor calculado",
      status: "Estado", approved_by: "Aprovado por", notes: "Observações",
    },
    ordenarCampos: ["employee", "date", "kind", "overtime_type", "hours", "multiplier", "amount", "status", "approved_by", "notes"],
    etapas: [
      { titulo: "Registo", campos: ["employee", "date", "kind", "overtime_type", "hours", "multiplier"] },
      { titulo: "Aprovação", campos: ["status", "approved_by", "amount"] },
      { titulo: "Observações", campos: ["notes"] },
    ],
    lembrarCampos: ["employee", "kind", "overtime_type"],
  }
}

function hrDisciplinaryConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS, "resolved_at"],
    labels: {
      employee: "Funcionário", incident_date: "Data do incidente",
      incident_type: "Tipo de incidente", reported_by: "Reportado por",
      severity: "Gravidade", description: "Descrição",
      hearing_date: "Data da audiência", decision: "Decisão",
      action_taken: "Ação aplicada", sanction: "Sanção",
      status: "Estado", notes: "Observações",
    },
    widgets: { description: "textarea", decision: "textarea", action_taken: "textarea", notes: "textarea" },
    ordenarCampos: ["employee", "incident_date", "incident_type", "reported_by", "severity", "description", "hearing_date", "decision", "action_taken", "sanction", "status", "notes"],
    etapas: [
      { titulo: "Incidente", campos: ["employee", "incident_date", "incident_type", "reported_by", "severity", "description"] },
      { titulo: "Audiência e decisão", campos: ["hearing_date", "decision", "action_taken", "sanction"] },
      { titulo: "Estado e notas", campos: ["status", "notes"] },
    ],
    lembrarCampos: ["severity"],
  }
}

function hrAttendanceConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      employee: "Funcionário", date: "Data", clock_in: "Entrada",
      clock_out: "Saída", expected_start: "Entrada prevista",
      expected_end: "Saída prevista", late_minutes: "Minutos de atraso",
      early_leave_minutes: "Minutos de saída antecipada",
      worked_hours: "Horas trabalhadas", status: "Estado", notes: "Observações",
    },
    widgets: { notes: "textarea" },
    ordenarCampos: ["employee", "date", "status", "clock_in", "clock_out", "expected_start", "expected_end", "late_minutes", "early_leave_minutes", "worked_hours", "notes"],
    etapas: [
      { titulo: "Registo", campos: ["employee", "date", "status"] },
      { titulo: "Horas", campos: ["clock_in", "clock_out", "expected_start", "expected_end"] },
      { titulo: "Indicadores", campos: ["late_minutes", "early_leave_minutes", "worked_hours", "notes"] },
    ],
    lembrarCampos: ["employee"],
  }
}

function hrLeavePermissionConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      employee: "Funcionário", permission_date: "Data da dispensa",
      start_time: "Hora de saída", end_time: "Hora de retorno",
      reason: "Motivo", approved_by: "Aprovado por",
      paid_permission: "Dispensa remunerada",
      deduct_from_hours: "Descontar das horas trabalhadas",
      status: "Estado",
    },
    widgets: { reason: "textarea" },
    ordenarCampos: ["employee", "permission_date", "start_time", "end_time", "reason", "paid_permission", "deduct_from_hours", "status", "approved_by"],
    etapas: [
      { titulo: "Pedido", campos: ["employee", "permission_date", "start_time", "end_time", "reason"] },
      { titulo: "Regras e aprovação", campos: ["paid_permission", "deduct_from_hours", "status", "approved_by"] },
    ],
    lembrarCampos: ["paid_permission", "employee"],
  }
}

function hrVacationBalanceConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      employee: "Funcionário", year: "Ano",
      entitled_days: "Dias com direito", used_days: "Dias utilizados",
      pending_days: "Dias pendentes", remaining_days: "Dias restantes",
      carried_over_days: "Dias transitados do ano anterior",
    },
    somenteLeituraCampos: ["remaining_days"],
    ordenarCampos: ["employee", "year", "entitled_days", "carried_over_days", "used_days", "pending_days", "remaining_days"],
    etapas: [
      { titulo: "Funcionário e ano", campos: ["employee", "year"] },
      { titulo: "Saldo", campos: ["entitled_days", "carried_over_days", "used_days", "pending_days", "remaining_days"] },
    ],
    lembrarCampos: ["employee", "year"],
  }
}

function hrContractConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      employee: "Funcionário", contract_type: "Tipo de contrato",
      start_date: "Data de início", end_date: "Data de fim",
      salary: "Salário contratual", notes: "Observações", status: "Estado",
    },
    widgets: { notes: "textarea" },
    ordenarCampos: ["employee", "contract_type", "start_date", "end_date", "salary", "status", "notes"],
    etapas: [
      { titulo: "Contrato", campos: ["employee", "contract_type", "start_date", "end_date"] },
      { titulo: "Remuneração e estado", campos: ["salary", "status"] },
      { titulo: "Observações", campos: ["notes"] },
    ],
    lembrarCampos: ["contract_type"],
  }
}

function hrEmployeeDocumentConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      employee: "Funcionário", document_type: "Tipo de documento",
      title: "Título", file: "Ficheiro", notes: "Observações", status: "Estado",
    },
    widgets: { notes: "textarea" },
    ordenarCampos: ["employee", "document_type", "title", "file", "status", "notes"],
    etapas: [
      { titulo: "Documento", campos: ["employee", "document_type", "title", "file"] },
      { titulo: "Estado e notas", campos: ["status", "notes"] },
    ],
    lembrarCampos: ["document_type"],
  }
}

function hrSalaryHistoryConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      employee: "Funcionário", amount: "Valor do salário",
      effective_from: "Vigente a partir de", effective_until: "Vigente até",
      is_current: "Salário atual", reason: "Motivo da alteração",
    },
    widgets: { reason: "textarea" },
    ordenarCampos: ["employee", "amount", "effective_from", "effective_until", "is_current", "reason"],
    etapas: [
      { titulo: "Salário", campos: ["employee", "amount", "effective_from", "effective_until", "is_current"] },
      { titulo: "Motivo", campos: ["reason"] },
    ],
    lembrarCampos: ["employee"],
  }
}

function hrPayrollRunConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      payroll_period: "Período (AAAA-MM)", start_date: "Data de início",
      end_date: "Data de fim", approved_by: "Aprovado por",
      total_gross: "Total bruto", total_deductions: "Total de descontos",
      total_net: "Total líquido", status: "Estado", notes: "Observações",
    },
    somenteLeituraCampos: ["total_gross", "total_deductions", "total_net"],
    placeholders: { payroll_period: "Ex.: 2026-06" },
    widgets: { notes: "textarea" },
    ordenarCampos: ["payroll_period", "start_date", "end_date", "status", "approved_by", "total_gross", "total_deductions", "total_net", "notes"],
    etapas: [
      { titulo: "Período", campos: ["payroll_period", "start_date", "end_date", "status"] },
      { titulo: "Totais", campos: ["approved_by", "total_gross", "total_deductions", "total_net"] },
      { titulo: "Observações", campos: ["notes"] },
    ],
  }
}

function hrPayrollItemConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      payroll_run: "Folha de pagamento", employee: "Funcionário",
      base_salary: "Salário base", overtime_amount: "Horas extras",
      allowances: "Subsídios", bonuses: "Bónus",
      absence_deductions: "Descontos por faltas",
      other_deductions: "Outros descontos",
      gross_pay: "Salário bruto", net_pay: "Salário líquido",
      status: "Estado", notes: "Observações",
    },
    somenteLeituraCampos: ["gross_pay", "net_pay"],
    widgets: { notes: "textarea" },
    ordenarCampos: ["payroll_run", "employee", "base_salary", "overtime_amount", "allowances", "bonuses", "absence_deductions", "other_deductions", "gross_pay", "net_pay", "status", "notes"],
    etapas: [
      { titulo: "Funcionário", campos: ["payroll_run", "employee"] },
      { titulo: "Vencimentos", campos: ["base_salary", "overtime_amount", "allowances", "bonuses"] },
      { titulo: "Descontos", campos: ["absence_deductions", "other_deductions"] },
      { titulo: "Totais e estado", campos: ["gross_pay", "net_pay", "status", "notes"] },
    ],
    lembrarCampos: ["payroll_run"],
  }
}

function hrTerminationConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...HR_INTERNAL_FIELDS, ...HR_COMPUTED_FIELDS],
    labels: {
      employee: "Funcionário", date: "Data do desligamento",
      type: "Tipo de desligamento", reason: "Motivo",
    },
    widgets: { reason: "textarea" },
    ordenarCampos: ["employee", "date", "type", "reason"],
    etapas: [
      { titulo: "Desligamento", campos: ["employee", "date", "type"] },
      { titulo: "Motivo", campos: ["reason"] },
    ],
    lembrarCampos: ["type"],
  }
}

// ─── Surgery ────────────────────────────────────────────────────────────────

const SURGERY_INTERNAL_FIELDS = [
  "id", "created_at", "updated_at", "custom_id", "deleted", "deleted_at",
  "version", "created_by", "updated_by", "deleted_by", "tenant",
]

const SURGERY_COMPUTED_FIELDS = [
  "patient_name", "surgeon_name", "specialty_name", "operating_room_name",
  "procedure_names", "surgical_request_code", "invoice_id", "invoice_code",
  "invoice_status", "requesting_doctor_name", "surgery_code",
  "primary_surgeon_name", "anesthetist_name", "employee_name",
  "material_name", "procedure_name", "responsible_surgeon_name",
  "responsible_name", "nurse_name", "primary_surgeon_name",
  "completed_by_name", "consumed_by_name", "authorization_code",
  "patient_name_display",
]

function surgeryRequestConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS, "reviewed_at", "converted_at"],
    labels: {
      patient: "Paciente",
      requesting_doctor: "Médico solicitante",
      specialty: "Especialidade cirúrgica",
      clinical_diagnosis: "Diagnóstico clínico",
      icd_code: "Código CID/ICD",
      requested_surgery_type: "Tipo de cirurgia solicitada",
      requested_procedure: "Procedimento solicitado",
      priority: "Prioridade",
      justification: "Justificação clínica",
      status: "Estado",
      notes: "Observações",
    },
    placeholders: {
      icd_code: "Ex.: K40.9, C18.2",
      requested_procedure: "Ex.: Herniorrafia inguinal bilateral",
      clinical_diagnosis: "Resumo do diagnóstico clínico...",
    },
    widgets: {
      clinical_diagnosis: "textarea",
      justification: "textarea",
      notes: "textarea",
    },
    ordenarCampos: [
      "patient", "requesting_doctor", "specialty",
      "clinical_diagnosis", "icd_code", "requested_surgery_type",
      "requested_procedure", "priority", "justification", "status", "notes",
    ],
    etapas: [
      {
        titulo: "Identificação",
        descricao: "Paciente, médico e especialidade",
        campos: ["patient", "requesting_doctor", "specialty"],
      },
      {
        titulo: "Diagnóstico",
        descricao: "Diagnóstico clínico, CID e procedimento",
        campos: ["clinical_diagnosis", "icd_code", "requested_surgery_type", "requested_procedure"],
      },
      {
        titulo: "Prioridade e justificação",
        descricao: "Urgência e motivo clínico",
        campos: ["priority", "justification", "status"],
      },
      {
        titulo: "Observações",
        campos: ["notes"],
      },
    ],
    lembrarCampos: ["requesting_doctor", "specialty", "priority", "requested_surgery_type"],
  }
}

function surgeryPreoperativeConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS, "assessed_at"],
    labels: {
      patient: "Paciente",
      surgical_request: "Pedido cirúrgico",
      proposed_surgery: "Cirurgia proposta",
      evaluator: "Avaliador",
      medical_evaluation: "Avaliação médica",
      anesthetic_evaluation: "Avaliação anestésica",
      asa_class: "Classificação ASA",
      surgical_risk: "Risco cirúrgico",
      required_exams: "Exames necessários",
      exam_results_reviewed: "Exames revistos",
      fit_for_surgery: "Apto para cirurgia",
      consent_signed: "Consentimento assinado",
      status: "Estado",
      observations: "Observações clínicas",
    },
    widgets: {
      medical_evaluation: "textarea",
      anesthetic_evaluation: "textarea",
      observations: "textarea",
    },
    ordenarCampos: [
      "patient", "surgical_request", "proposed_surgery", "evaluator",
      "asa_class", "surgical_risk", "medical_evaluation", "anesthetic_evaluation",
      "required_exams", "exam_results_reviewed", "fit_for_surgery", "consent_signed",
      "status", "observations",
    ],
    etapas: [
      {
        titulo: "Identificação",
        descricao: "Paciente, pedido e avaliador",
        campos: ["patient", "surgical_request", "proposed_surgery", "evaluator"],
      },
      {
        titulo: "Avaliação clínica",
        descricao: "Avaliação médica e anestésica",
        campos: ["asa_class", "surgical_risk", "medical_evaluation", "anesthetic_evaluation"],
      },
      {
        titulo: "Exames e aptidão",
        descricao: "Exames obrigatórios, consentimento e aptidão",
        campos: ["required_exams", "exam_results_reviewed", "fit_for_surgery", "consent_signed", "status"],
      },
      {
        titulo: "Observações",
        campos: ["observations"],
      },
    ],
    lembrarCampos: ["evaluator", "asa_class"],
  }
}

function surgeryMainConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS,
      "started_at", "ended_at", "completed_at", "canceled_at",
    ],
    labels: {
      patient: "Paciente",
      surgical_request: "Pedido cirúrgico",
      specialty: "Especialidade",
      surgeon: "Cirurgião",
      operating_room: "Sala operatória",
      procedures: "Procedimentos do catálogo",
      procedure: "Procedimento (texto livre)",
      description: "Descrição",
      preoperative_diagnosis: "Diagnóstico pré-operatório",
      postoperative_diagnosis: "Diagnóstico pós-operatório",
      estimated_price: "Preço estimado",
      vat_percentage: "IVA (%)",
      applies_vat_by_default: "Aplicar IVA por padrão",
      scheduled_for: "Agendada para",
      status: "Estado",
      surgery_size: "Porte",
      priority: "Prioridade",
      classification: "Classificação",
    },
    placeholders: {
      procedure: "Descreva o procedimento se não estiver no catálogo",
    },
    widgets: {
      description: "textarea",
      preoperative_diagnosis: "textarea",
      postoperative_diagnosis: "textarea",
    },
    ordenarCampos: [
      "patient", "surgical_request", "specialty", "surgeon", "operating_room",
      "surgery_size", "priority", "classification",
      "procedures", "procedure",
      "preoperative_diagnosis", "postoperative_diagnosis", "description",
      "scheduled_for", "estimated_price", "vat_percentage", "applies_vat_by_default", "status",
    ],
    etapas: [
      {
        titulo: "Identificação",
        descricao: "Paciente, pedido e especialidade",
        campos: ["patient", "surgical_request", "specialty"],
      },
      {
        titulo: "Equipa e sala",
        descricao: "Cirurgião e sala operatória",
        campos: ["surgeon", "operating_room"],
      },
      {
        titulo: "Classificação",
        descricao: "Porte, prioridade e classificação",
        campos: ["surgery_size", "priority", "classification"],
      },
      {
        titulo: "Procedimento",
        descricao: "Catálogo de procedimentos ou texto livre",
        campos: ["procedures", "procedure", "preoperative_diagnosis", "postoperative_diagnosis", "description"],
      },
      {
        titulo: "Agendamento e faturação",
        descricao: "Data, preço e estado",
        campos: ["scheduled_for", "estimated_price", "vat_percentage", "applies_vat_by_default", "status"],
      },
    ],
    lembrarCampos: ["surgeon", "operating_room", "specialty", "vat_percentage"],
  }
}

function surgerySmallConfig(): ResourceFormConfig {
  return {
    ...surgeryMainConfig(),
    esconderCampos: [
      ...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS,
      "surgery_size", "started_at", "ended_at", "completed_at", "canceled_at",
    ],
  }
}

function surgeryLargeConfig(): ResourceFormConfig {
  return {
    ...surgeryMainConfig(),
    esconderCampos: [
      ...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS,
      "surgery_size", "started_at", "ended_at", "completed_at", "canceled_at",
    ],
  }
}

function surgeryCatalogProcedureConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS],
    labels: {
      name: "Nome do procedimento",
      description: "Descrição",
      base_price: "Preço base",
      vat_percentage: "IVA (%)",
      applies_vat_by_default: "Aplicar IVA por padrão",
      active: "Ativo",
    },
    widgets: { description: "textarea" },
    ordenarCampos: ["name", "description", "base_price", "vat_percentage", "applies_vat_by_default", "active"],
    etapas: [
      {
        titulo: "Identificação",
        descricao: "Nome e descrição do procedimento",
        campos: ["name", "description"],
      },
      {
        titulo: "Preço e estado",
        campos: ["base_price", "vat_percentage", "applies_vat_by_default", "active"],
      },
    ],
    lembrarCampos: ["vat_percentage", "applies_vat_by_default"],
  }
}

function surgeryScheduleConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS,
      "patient_checked_in_at",
    ],
    labels: {
      surgery: "Cirurgia",
      operating_room: "Centro cirúrgico / Sala",
      primary_surgeon: "Cirurgião principal",
      anesthetist: "Anestesista",
      scheduled_start: "Início previsto",
      scheduled_end: "Fim previsto",
      status: "Estado",
      priority: "Prioridade",
      authorization_verified: "Autorização/pagamento verificado",
      cancellation_reason: "Motivo de cancelamento",
      notes: "Observações",
    },
    widgets: {
      cancellation_reason: "textarea",
      notes: "textarea",
    },
    ordenarCampos: [
      "surgery", "operating_room", "primary_surgeon", "anesthetist",
      "scheduled_start", "scheduled_end",
      "priority", "status", "authorization_verified",
      "cancellation_reason", "notes",
    ],
    etapas: [
      {
        titulo: "Cirurgia e sala",
        descricao: "Cirurgia, sala operatória e equipa",
        campos: ["surgery", "operating_room", "primary_surgeon", "anesthetist"],
      },
      {
        titulo: "Horário",
        descricao: "Data/hora de início e fim previstos",
        campos: ["scheduled_start", "scheduled_end"],
      },
      {
        titulo: "Estado e confirmação",
        campos: ["priority", "status", "authorization_verified"],
      },
      {
        titulo: "Notas",
        campos: ["cancellation_reason", "notes"],
      },
    ],
    lembrarCampos: ["operating_room", "primary_surgeon", "anesthetist", "priority"],
  }
}

function surgeryOperatingRoomConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS],
    labels: {
      name: "Nome da sala",
      code: "Código",
      room_type: "Tipo de sala",
      status: "Estado",
      location: "Localização",
      capacity: "Capacidade (nº de pacientes)",
      sterile: "Esterilizada",
      equipment_notes: "Equipamentos disponíveis",
      working_hours: "Horário de funcionamento",
      cleaning_class: "Classe de limpeza",
      blocked_reason: "Motivo de bloqueio",
      notes: "Observações",
    },
    widgets: {
      equipment_notes: "textarea",
      blocked_reason: "textarea",
      notes: "textarea",
    },
    ordenarCampos: [
      "name", "code", "room_type", "status", "location",
      "capacity", "sterile", "cleaning_class",
      "equipment_notes", "working_hours", "blocked_reason", "notes",
    ],
    etapas: [
      {
        titulo: "Identificação",
        descricao: "Nome, código e tipo de sala",
        campos: ["name", "code", "room_type", "location"],
      },
      {
        titulo: "Capacidade e esterilização",
        campos: ["capacity", "sterile", "cleaning_class", "status"],
      },
      {
        titulo: "Equipamentos",
        descricao: "Equipamentos disponíveis e horário",
        campos: ["equipment_notes", "working_hours"],
      },
      {
        titulo: "Bloqueio e notas",
        campos: ["blocked_reason", "notes"],
      },
    ],
    lembrarCampos: ["room_type", "sterile", "cleaning_class"],
  }
}

function surgeryTeamMemberConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS,
      "signed_at", "signature_reference",
    ],
    labels: {
      surgery: "Cirurgia",
      employee: "Profissional",
      role: "Função na cirurgia",
      lead: "Responsável principal",
      present: "Presente",
      entry_at: "Entrada em sala",
      exit_at: "Saída de sala",
      responsibility: "Responsabilidade",
      notes: "Observações",
    },
    widgets: {
      responsibility: "textarea",
      notes: "textarea",
    },
    ordenarCampos: [
      "surgery", "employee", "role", "lead", "present",
      "entry_at", "exit_at",
      "responsibility", "notes",
    ],
    etapas: [
      {
        titulo: "Cirurgia e profissional",
        campos: ["surgery", "employee", "role"],
      },
      {
        titulo: "Presença",
        campos: ["lead", "present", "entry_at", "exit_at"],
      },
      {
        titulo: "Responsabilidade e notas",
        campos: ["responsibility", "notes"],
      },
    ],
    lembrarCampos: ["role"],
  }
}

function surgeryAnesthesiaConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS,
    ],
    labels: {
      surgery: "Cirurgia",
      anesthetist: "Anestesista",
      anesthesia_type: "Tipo de anestesia",
      asa_class: "Classificação ASA",
      status: "Estado",
      induction_at: "Indução em",
      started_at: "Início da anestesia",
      ended_at: "Fim da anestesia",
      airway_management: "Gestão da via aérea",
      medications: "Fármacos administrados",
      fluids: "Fluidos administrados",
      vital_signs: "Sinais vitais",
      adverse_events: "Eventos adversos",
      recovery_handoff: "Passagem para recuperação",
      complications: "Complicações",
      notes: "Observações",
    },
    widgets: {
      airway_management: "textarea",
      recovery_handoff: "textarea",
      complications: "textarea",
      notes: "textarea",
    },
    ordenarCampos: [
      "surgery", "anesthetist", "anesthesia_type", "asa_class", "status",
      "induction_at", "started_at", "ended_at",
      "airway_management",
      "medications", "fluids", "vital_signs", "adverse_events",
      "recovery_handoff", "complications", "notes",
    ],
    etapas: [
      {
        titulo: "Identificação",
        descricao: "Cirurgia, anestesista e tipo",
        campos: ["surgery", "anesthetist", "anesthesia_type", "asa_class", "status"],
      },
      {
        titulo: "Tempos",
        descricao: "Indução, início e fim da anestesia",
        campos: ["induction_at", "started_at", "ended_at"],
      },
      {
        titulo: "Técnica",
        descricao: "Via aérea, fármacos e fluidos",
        campos: ["airway_management", "medications", "fluids"],
      },
      {
        titulo: "Monitorização",
        descricao: "Sinais vitais e eventos adversos",
        campos: ["vital_signs", "adverse_events"],
      },
      {
        titulo: "Recuperação e notas",
        campos: ["recovery_handoff", "complications", "notes"],
      },
    ],
    lembrarCampos: ["anesthetist", "anesthesia_type", "asa_class"],
  }
}

function surgerySafetyChecklistConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS,
      "completed_at",
    ],
    labels: {
      surgery: "Cirurgia",
      completed_by: "Preenchido por",
      phase: "Fase do checklist",
      status: "Estado",
      patient_identity_confirmed: "Identidade do paciente confirmada",
      procedure_confirmed: "Procedimento confirmado",
      site_marked: "Local cirúrgico marcado",
      consent_confirmed: "Consentimento confirmado",
      anesthesia_safety_checked: "Segurança anestésica verificada",
      antibiotic_prophylaxis: "Profilaxia antibiótica efetuada",
      instrument_count_confirmed: "Contagem de instrumentos confirmada",
      specimens_labeled: "Amostras devidamente identificadas",
      override_reason: "Motivo de sobrescrita",
      notes: "Observações",
    },
    widgets: {
      override_reason: "textarea",
      notes: "textarea",
    },
    ordenarCampos: [
      "surgery", "completed_by", "phase", "status",
      "patient_identity_confirmed", "procedure_confirmed", "site_marked",
      "consent_confirmed", "anesthesia_safety_checked", "antibiotic_prophylaxis",
      "instrument_count_confirmed", "specimens_labeled",
      "override_reason", "notes",
    ],
    etapas: [
      {
        titulo: "Identificação",
        descricao: "Cirurgia, responsável e fase",
        campos: ["surgery", "completed_by", "phase", "status"],
      },
      {
        titulo: "Verificações de segurança",
        descricao: "Confirmações obrigatórias antes da cirurgia",
        campos: [
          "patient_identity_confirmed", "procedure_confirmed", "site_marked",
          "consent_confirmed", "anesthesia_safety_checked", "antibiotic_prophylaxis",
          "instrument_count_confirmed", "specimens_labeled",
        ],
      },
      {
        titulo: "Notas e sobrescrita",
        campos: ["override_reason", "notes"],
      },
    ],
    lembrarCampos: ["completed_by", "phase"],
  }
}

function surgeryMaterialConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS],
    labels: {
      name: "Nome do material",
      code: "Código",
      product: "Produto de farmácia/stock",
      material_type: "Tipo de material",
      unit: "Unidade de medida",
      internal_code: "Código interno",
      cost_price: "Preço de custo",
      sale_price: "Preço de venda",
      batch_number: "Lote padrão",
      expiry_date: "Validade padrão",
      implantable: "Implantável",
      sterilizable: "Esterilizável",
      tracks_lot: "Controla lote",
      tracks_expiry: "Controla validade",
      reusable: "Reutilizável",
      sterile: "Estéril",
      active: "Ativo",
      notes: "Observações",
    },
    widgets: { notes: "textarea" },
    ordenarCampos: [
      "name", "code", "internal_code", "material_type", "unit", "product",
      "cost_price", "sale_price",
      "batch_number", "expiry_date",
      "implantable", "sterilizable", "reusable", "sterile",
      "tracks_lot", "tracks_expiry", "active",
      "notes",
    ],
    etapas: [
      {
        titulo: "Identificação",
        descricao: "Nome, código e tipo de material",
        campos: ["name", "code", "internal_code", "material_type", "unit", "product"],
      },
      {
        titulo: "Preços",
        campos: ["cost_price", "sale_price"],
      },
      {
        titulo: "Lote e rastreabilidade",
        campos: ["batch_number", "expiry_date", "tracks_lot", "tracks_expiry"],
      },
      {
        titulo: "Propriedades",
        campos: ["implantable", "sterilizable", "reusable", "sterile", "active"],
      },
      {
        titulo: "Observações",
        campos: ["notes"],
      },
    ],
    lembrarCampos: ["material_type", "unit", "sterile"],
  }
}

function surgeryConsumptionConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS],
    labels: {
      surgery: "Cirurgia",
      material: "Material cirúrgico",
      product: "Produto (farmácia/stock)",
      consumed_by: "Registado por",
      quantity: "Quantidade",
      unit_cost: "Custo unitário",
      charged_price: "Preço cobrado",
      consumed_at: "Consumido em",
      batch_number: "Lote",
      expiry_date: "Validade",
      material_status: "Estado do material",
      billing_status: "Estado de faturação",
      inventory_deducted: "Stock já baixado",
      returned_quantity: "Quantidade devolvida",
      notes: "Observações",
    },
    widgets: { notes: "textarea" },
    ordenarCampos: [
      "surgery", "material", "product", "consumed_by",
      "quantity", "returned_quantity",
      "unit_cost", "charged_price",
      "consumed_at", "batch_number", "expiry_date",
      "material_status", "billing_status", "inventory_deducted",
      "notes",
    ],
    etapas: [
      {
        titulo: "Cirurgia e material",
        campos: ["surgery", "material", "product", "consumed_by"],
      },
      {
        titulo: "Quantidades e preços",
        campos: ["quantity", "returned_quantity", "unit_cost", "charged_price"],
      },
      {
        titulo: "Rastreabilidade",
        campos: ["consumed_at", "batch_number", "expiry_date"],
      },
      {
        titulo: "Estado",
        campos: ["material_status", "billing_status", "inventory_deducted", "notes"],
      },
    ],
    lembrarCampos: ["consumed_by"],
  }
}

function surgeryRecoveryConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS],
    labels: {
      surgery: "Cirurgia",
      nurse: "Enfermeiro",
      admitted_at: "Admitido em",
      discharged_at: "Alta em",
      status: "Estado",
      consciousness_level: "Nível de consciência",
      pain_score: "Dor (0-10)",
      aldrete_score: "Índice de Aldrete (0-10)",
      vital_signs: "Sinais vitais",
      nausea_vomiting: "Náuseas / vómitos",
      bleeding: "Sangramento",
      complications: "Complicações",
      destination: "Destino após alta",
      notes: "Observações",
    },
    hints: {
      aldrete_score: "Score de alta da RPA: 0 = não apto, 10 = alta imediata.",
      pain_score: "Escala numérica de dor: 0 = sem dor, 10 = dor máxima.",
    },
    widgets: {
      complications: "textarea",
      notes: "textarea",
    },
    ordenarCampos: [
      "surgery", "nurse", "status",
      "admitted_at", "discharged_at",
      "consciousness_level", "pain_score", "aldrete_score",
      "nausea_vomiting", "bleeding", "vital_signs",
      "complications", "destination", "notes",
    ],
    etapas: [
      {
        titulo: "Admissão",
        descricao: "Cirurgia, enfermeiro e estado",
        campos: ["surgery", "nurse", "status", "admitted_at", "discharged_at"],
      },
      {
        titulo: "Avaliação clínica",
        descricao: "Sinais vitais e scores de avaliação",
        campos: ["consciousness_level", "pain_score", "aldrete_score", "vital_signs"],
      },
      {
        titulo: "Intercorrências",
        campos: ["nausea_vomiting", "bleeding", "complications"],
      },
      {
        titulo: "Alta",
        campos: ["destination", "notes"],
      },
    ],
    lembrarCampos: ["nurse"],
  }
}

function surgeryOperativeReportConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS,
      "signed_at", "digitally_signed", "digital_signature_reference",
    ],
    labels: {
      surgery: "Cirurgia",
      primary_surgeon: "Cirurgião principal",
      status: "Estado",
      preoperative_diagnosis: "Diagnóstico pré-operatório",
      postoperative_diagnosis: "Diagnóstico pós-operatório",
      procedure_performed: "Procedimento realizado",
      findings: "Achados operatórios",
      technique: "Técnica cirúrgica",
      complications: "Complicações",
      estimated_blood_loss_ml: "Perda sanguínea estimada (ml)",
      specimens: "Amostras coletadas",
      drains: "Drenos colocados",
      implants: "Implantes utilizados",
      final_patient_condition: "Condição final do paciente",
      postoperative_plan: "Plano pós-operatório",
      specimen_sent_to_pathology: "Amostra enviada à patologia",
      pathology_accession_number: "N.º de requisição de patologia",
      started_at: "Início da cirurgia",
      ended_at: "Fim da cirurgia",
      notes: "Notas adicionais",
    },
    widgets: {
      preoperative_diagnosis: "textarea",
      postoperative_diagnosis: "textarea",
      procedure_performed: "textarea",
      findings: "textarea",
      technique: "textarea",
      complications: "textarea",
      final_patient_condition: "textarea",
      postoperative_plan: "textarea",
      specimens: "textarea",
      notes: "textarea",
    },
    ordenarCampos: [
      "surgery", "primary_surgeon", "status",
      "started_at", "ended_at",
      "preoperative_diagnosis", "postoperative_diagnosis",
      "procedure_performed", "findings", "technique",
      "estimated_blood_loss_ml", "complications",
      "specimens", "drains", "implants",
      "specimen_sent_to_pathology", "pathology_accession_number",
      "final_patient_condition", "postoperative_plan", "notes",
    ],
    etapas: [
      {
        titulo: "Identificação",
        campos: ["surgery", "primary_surgeon", "status", "started_at", "ended_at"],
      },
      {
        titulo: "Diagnóstico",
        campos: ["preoperative_diagnosis", "postoperative_diagnosis"],
      },
      {
        titulo: "Procedimento e técnica",
        campos: ["procedure_performed", "findings", "technique"],
      },
      {
        titulo: "Intercorrências e perdas",
        campos: ["complications", "estimated_blood_loss_ml"],
      },
      {
        titulo: "Material e patologia",
        campos: ["specimens", "drains", "implants", "specimen_sent_to_pathology", "pathology_accession_number"],
      },
      {
        titulo: "Plano pós-operatório",
        campos: ["final_patient_condition", "postoperative_plan", "notes"],
      },
    ],
    lembrarCampos: ["primary_surgeon"],
  }
}

function surgeryProcedureItemConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS],
    labels: {
      surgery: "Cirurgia",
      procedure: "Procedimento do catálogo",
      description: "Descrição",
      anatomical_region: "Região anatómica",
      laterality: "Lateralidade",
      sequence: "Ordem de execução",
      responsible_surgeon: "Cirurgião responsável",
      status: "Estado",
      quantity: "Quantidade",
      unit_price: "Preço unitário",
      vat_percentage: "IVA (%)",
      notes: "Observações",
    },
    widgets: { notes: "textarea" },
    ordenarCampos: [
      "surgery", "procedure", "description",
      "sequence", "anatomical_region", "laterality",
      "responsible_surgeon", "status",
      "quantity", "unit_price", "vat_percentage",
      "notes",
    ],
    etapas: [
      {
        titulo: "Cirurgia e procedimento",
        campos: ["surgery", "procedure", "description"],
      },
      {
        titulo: "Localização e cirurgião",
        campos: ["sequence", "anatomical_region", "laterality", "responsible_surgeon", "status"],
      },
      {
        titulo: "Faturação",
        campos: ["quantity", "unit_price", "vat_percentage"],
      },
      {
        titulo: "Observações",
        campos: ["notes"],
      },
    ],
    lembrarCampos: ["responsible_surgeon", "vat_percentage"],
  }
}

function surgeryAuthorizationConfig(): ResourceFormConfig {
  return {
    esconderCampos: [
      ...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS,
      "approved_at",
    ],
    labels: {
      patient: "Paciente",
      surgery: "Cirurgia",
      surgical_request: "Pedido cirúrgico",
      preoperative_assessment: "Avaliação pré-operatória",
      status: "Estado",
      quotation_amount: "Valor orçamentado",
      approved_amount: "Valor aprovado",
      initial_payment_amount: "Pagamento inicial",
      budget_approved: "Orçamento aprovado",
      initial_payment_received: "Pagamento inicial recebido",
      insurance_authorized: "Seguro autorizou",
      special_materials_approved: "Materiais especiais aprovados",
      room_available: "Sala disponível",
      team_available: "Equipa disponível",
      preoperative_assessment_completed: "Avaliação pré-op. concluída",
      consent_signed: "Consentimento assinado",
      valid_until: "Válida até",
      rejected_reason: "Motivo de rejeição",
      notes: "Observações",
    },
    widgets: {
      rejected_reason: "textarea",
      notes: "textarea",
    },
    ordenarCampos: [
      "patient", "surgery", "surgical_request", "preoperative_assessment",
      "status", "valid_until",
      "quotation_amount", "approved_amount", "initial_payment_amount",
      "budget_approved", "initial_payment_received", "insurance_authorized",
      "special_materials_approved",
      "room_available", "team_available",
      "preoperative_assessment_completed", "consent_signed",
      "rejected_reason", "notes",
    ],
    etapas: [
      {
        titulo: "Identificação",
        descricao: "Paciente, cirurgia e pedido",
        campos: ["patient", "surgery", "surgical_request", "preoperative_assessment"],
      },
      {
        titulo: "Valores",
        descricao: "Orçamento e pagamento",
        campos: ["status", "valid_until", "quotation_amount", "approved_amount", "initial_payment_amount"],
      },
      {
        titulo: "Confirmações financeiras",
        campos: ["budget_approved", "initial_payment_received", "insurance_authorized", "special_materials_approved"],
      },
      {
        titulo: "Confirmações operacionais",
        campos: ["room_available", "team_available", "preoperative_assessment_completed", "consent_signed"],
      },
      {
        titulo: "Rejeição e notas",
        campos: ["rejected_reason", "notes"],
      },
    ],
    lembrarCampos: ["status"],
  }
}

function surgeryBillingItemConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS],
    labels: {
      surgery: "Cirurgia",
      authorization: "Autorização",
      event_type: "Tipo de evento",
      billing_mode: "Modo de faturação",
      description: "Descrição",
      quantity: "Quantidade",
      unit_price: "Preço unitário",
      vat_percentage: "IVA (%)",
      discount_amount: "Desconto",
      status: "Estado",
      invoiced_at: "Faturado em",
      notes: "Observações",
    },
    widgets: { notes: "textarea" },
    ordenarCampos: [
      "surgery", "authorization", "event_type", "billing_mode",
      "description", "quantity", "unit_price", "vat_percentage", "discount_amount",
      "status", "invoiced_at", "notes",
    ],
    etapas: [
      {
        titulo: "Cirurgia e autorização",
        campos: ["surgery", "authorization"],
      },
      {
        titulo: "Tipo de evento",
        campos: ["event_type", "billing_mode", "description"],
      },
      {
        titulo: "Valores",
        campos: ["quantity", "unit_price", "vat_percentage", "discount_amount"],
      },
      {
        titulo: "Estado",
        campos: ["status", "invoiced_at", "notes"],
      },
    ],
    lembrarCampos: ["billing_mode", "vat_percentage"],
  }
}

function surgerySpecimenConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS],
    labels: {
      surgery: "Cirurgia",
      patient: "Paciente",
      specimen_type: "Tipo de amostra",
      anatomical_site: "Local anatómico",
      collected_at: "Coletada em",
      fixative: "Fixador usado",
      responsible: "Responsável",
      pathology_request: "Pedido de patologia",
      status: "Estado",
      notes: "Observações",
    },
    placeholders: {
      specimen_type: "Ex.: Fragmento tecidular, Cisto, Pólipo",
      anatomical_site: "Ex.: Intestino delgado, Vesícula biliar",
      fixative: "Ex.: Formol a 10%",
    },
    widgets: { notes: "textarea" },
    ordenarCampos: [
      "surgery", "patient", "specimen_type", "anatomical_site",
      "collected_at", "fixative", "responsible", "pathology_request",
      "status", "notes",
    ],
    etapas: [
      {
        titulo: "Identificação",
        campos: ["surgery", "patient", "specimen_type", "anatomical_site"],
      },
      {
        titulo: "Coleta",
        campos: ["collected_at", "fixative", "responsible"],
      },
      {
        titulo: "Patologia e estado",
        campos: ["pathology_request", "status", "notes"],
      },
    ],
    lembrarCampos: ["responsible", "fixative"],
  }
}

function surgeryDocumentConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS],
    labels: {
      surgery: "Cirurgia",
      document_type: "Tipo de documento",
      title: "Título",
      file: "Ficheiro",
      notes: "Observações",
      status: "Estado",
    },
    widgets: { notes: "textarea" },
    ordenarCampos: ["surgery", "document_type", "title", "file", "status", "notes"],
    etapas: [
      {
        titulo: "Documento",
        campos: ["surgery", "document_type", "title", "file"],
      },
      {
        titulo: "Estado e notas",
        campos: ["status", "notes"],
      },
    ],
    lembrarCampos: ["document_type"],
  }
}

function surgeryAuditEventConfig(): ResourceFormConfig {
  return {
    esconderCampos: [...SURGERY_INTERNAL_FIELDS, ...SURGERY_COMPUTED_FIELDS],
    somenteLeituraCampos: [
      "surgery", "event_type", "previous_status", "new_status",
      "actor", "description", "metadata",
    ],
    labels: {
      surgery: "Cirurgia",
      event_type: "Tipo de evento",
      previous_status: "Estado anterior",
      new_status: "Novo estado",
      actor: "Utilizador",
      description: "Descrição",
      metadata: "Metadados",
      notes: "Notas",
    },
    widgets: { notes: "textarea" },
    ordenarCampos: [
      "surgery", "event_type", "previous_status", "new_status",
      "actor", "description", "metadata", "notes",
    ],
  }
}

function clinicalLabRequestConfig(): ResourceFormConfig {
  return {
    // Campos geridos pelo fluxo/admin, nao editaveis no frontend:
    // - status muda automaticamente com o estagio da requisicao
    // - external_executing_company e preenchida na transferencia entre tenants
    // - type e LAB por omissao nesta pagina; analyst e atribuido no laboratorio
    esconderCampos: [
      "type",
      "analyst",
      "status",
      "external_executing_company",
      "medical_exams",
    ],
    ordenarCampos: [
      "patient",
      "requesting_physician",
      "exams",
      "is_occupational",
      "occupational_profile",
      "requesting_company",
      "clinical_status",
    ],
    labels: {
      patient: "Paciente",
      requesting_physician: "Médico solicitante",
      exams: "Exames solicitados",
      is_occupational: "Requisição de exames ocupacionais",
      occupational_profile: "Perfil profissional (bandeja de exames)",
      clinical_status: "Estado clínico",
      requesting_company: "Empresa solicitante",
    },
    placeholders: {
      exams: "Pesquisar exames e adicionar por clique...",
      occupational_profile: "Pesquisar perfil profissional...",
      requesting_physician: "Pesquisar médico...",
      requesting_company: "Pesquisar empresa...",
    },
    hints: {
      exams: "Pesquise e clique para adicionar cada exame necessário.",
      occupational_profile:
        "Os exames da bandeja do perfil somam-se aos exames selecionados.",
    },
    mostrarSe: {
      occupational_profile: { campo: "is_occupational", igualA: true },
    },
  }
}

function clinicalOccupationalProfileConfig(): ResourceFormConfig {
  return {
    labels: {
      name: "Nome do perfil",
      profession: "Profissão",
      description: "Descrição",
      active: "Ativo",
      exams: "Exames da bandeja",
    },
    placeholders: {
      exams: "Pesquisar exames e adicionar por clique...",
    },
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

  if (g === "clinical" || g === "clinico" || g === "clínico") {
    // As rotas usam aliases com hífen (ex.: /clinical/lab-requests/);
    // canonicaliza antes de comparar com o endpoint canónico.
    const epc = canonicalCollectionPath(ep)
    const rc = r.replace(/[-_]/g, "")
    if (rc === "labrequest" || rc === "labrequests" || epc === "/clinical/labrequest/") {
      return clinicalLabRequestConfig()
    }
    if (
      rc === "occupationalprofile" ||
      rc === "occupationalprofiles" ||
      epc === "/clinical/occupational_profile/"
    ) {
      return clinicalOccupationalProfileConfig()
    }
    return null
  }

  if (g === "human_resources" || g === "recursos_humanos") {
    if (r === "employee" || ep === "/human_resources/employee/") return hrEmployeeConfig()
    if (r === "role" || ep === "/human_resources/role/") return hrJobTitleConfig()
    if (r === "profissao" || ep === "/human_resources/profissao/") return hrProfessionConfig()
    if (r === "agregadofamiliar" || ep === "/human_resources/agregadofamiliar/") return hrFamilyDependentConfig()
    if (r === "horario" || ep === "/human_resources/horario/") return hrWorkScheduleConfig()
    if (r === "falta" || ep === "/human_resources/falta/") return hrAbsenceConfig()
    if (r === "ferias" || ep === "/human_resources/ferias/") return hrVacationConfig()
    if (r === "horaextra" || ep === "/human_resources/horaextra/") return hrOvertimeConfig()
    if (r === "processodisciplinar" || ep === "/human_resources/processodisciplinar/") return hrDisciplinaryConfig()
    if (r === "dispensa" || ep === "/human_resources/dispensa/") return hrTerminationConfig()
    if (r === "assiduidade" || ep === "/human_resources/assiduidade/") return hrAttendanceConfig()
    if (r === "licenca" || ep === "/human_resources/licenca/") return hrLeavePermissionConfig()
    if (r === "saldo_ferias" || ep === "/human_resources/saldo_ferias/") return hrVacationBalanceConfig()
    if (r === "contrato" || ep === "/human_resources/contrato/") return hrContractConfig()
    if (r === "documento_funcionario" || ep === "/human_resources/documento_funcionario/") return hrEmployeeDocumentConfig()
    if (r === "historico_salarial" || ep === "/human_resources/historico_salarial/") return hrSalaryHistoryConfig()
    if (r === "folha_run" || ep === "/human_resources/folha_run/") return hrPayrollRunConfig()
    if (r === "folha_item" || ep === "/human_resources/folha_item/") return hrPayrollItemConfig()
    return null
  }

  if (g === "surgery" || g === "cirurgia") {
    if (r === "pedido_cirurgico" || ep === "/surgery/pedido_cirurgico/") {
      return surgeryRequestConfig()
    }
    if (r === "avaliacao_pre_operatoria" || ep === "/surgery/avaliacao_pre_operatoria/") {
      return surgeryPreoperativeConfig()
    }
    if (r === "surgery" || ep === "/surgery/surgery/") {
      return surgeryMainConfig()
    }
    if (r === "small_surgery" || ep === "/surgery/small_surgery/") {
      return surgerySmallConfig()
    }
    if (r === "large_surgery" || ep === "/surgery/large_surgery/") {
      return surgeryLargeConfig()
    }
    if (r === "surgical_procedure" || ep === "/surgery/surgical_procedure/") {
      return surgeryCatalogProcedureConfig()
    }
    if (r === "agenda_cirurgica" || ep === "/surgery/agenda_cirurgica/") {
      return surgeryScheduleConfig()
    }
    if (r === "centro_cirurgico" || ep === "/surgery/centro_cirurgico/") {
      return surgeryOperatingRoomConfig()
    }
    if (r === "equipa_cirurgica" || ep === "/surgery/equipa_cirurgica/") {
      return surgeryTeamMemberConfig()
    }
    if (r === "anestesia" || ep === "/surgery/anestesia/") {
      return surgeryAnesthesiaConfig()
    }
    if (r === "checklist_seguranca" || ep === "/surgery/checklist_seguranca/") {
      return surgerySafetyChecklistConfig()
    }
    if (r === "materiais" || ep === "/surgery/materiais/") {
      return surgeryMaterialConfig()
    }
    if (r === "consumos" || ep === "/surgery/consumos/") {
      return surgeryConsumptionConfig()
    }
    if (r === "recuperacao" || ep === "/surgery/recuperacao/") {
      return surgeryRecoveryConfig()
    }
    if (r === "relatorio_operatorio" || ep === "/surgery/relatorio_operatorio/") {
      return surgeryOperativeReportConfig()
    }
    if (r === "procedimentos_realizados" || ep === "/surgery/procedimentos_realizados/") {
      return surgeryProcedureItemConfig()
    }
    if (r === "autorizacoes" || ep === "/surgery/autorizacoes/") {
      return surgeryAuthorizationConfig()
    }
    if (r === "faturacao" || ep === "/surgery/faturacao/") {
      return surgeryBillingItemConfig()
    }
    if (r === "amostras" || ep === "/surgery/amostras/") {
      return surgerySpecimenConfig()
    }
    if (r === "documentos" || ep === "/surgery/documentos/") {
      return surgeryDocumentConfig()
    }
    if (r === "auditoria" || ep === "/surgery/auditoria/") {
      return surgeryAuditEventConfig()
    }
    return null
  }

  if (g === "dental") {
    if (r === "procedure" || ep === "/dental/procedure/") {
      return dentalProcedureConfig()
    }
    if (r === "consultation" || ep === "/dental/consultation/") {
      return dentalConsultationConfig()
    }
    if (r === "odontogram_chart" || ep === "/dental/odontogram_chart/") {
      return dentalOdontogramChartConfig()
    }
    if (r === "odontogram" || ep === "/dental/odontogram/") {
      return dentalOdontogramConfig()
    }
    if (r === "diagnosis" || ep === "/dental/diagnosis/") {
      return dentalDiagnosisConfig()
    }
    if (r === "treatment_plan" || ep === "/dental/treatment_plan/") {
      return dentalTreatmentPlanConfig()
    }
    if (r === "treatment_phase" || ep === "/dental/treatment_phase/") {
      return dentalTreatmentPhaseConfig()
    }
    if (r === "treatment_item" || ep === "/dental/treatment_item/") {
      return dentalTreatmentItemConfig()
    }
    if (r === "patient_treatment_plan" || ep === "/dental/patient_treatment_plan/") {
      return dentalPatientTreatmentPlanConfig()
    }
    if (r === "quotation" || ep === "/dental/quotation/") {
      return dentalQuotationConfig()
    }
    if (r === "approval" || ep === "/dental/approval/") {
      return dentalApprovalConfig()
    }
    if (r === "payment" || ep === "/dental/payment/") {
      return dentalPaymentConfig()
    }
    if (r === "procedure_execution" || ep === "/dental/procedure_execution/") {
      return dentalProcedureExecutionConfig()
    }
    if (r === "prosthesis_lab_order" || ep === "/dental/prosthesis_lab_order/") {
      return dentalProsthesisLabOrderConfig()
    }
    if (r === "imaging_order" || ep === "/dental/imaging_order/") {
      return dentalImagingOrderConfig()
    }
    if (r === "prescription" || ep === "/dental/prescription/") {
      return dentalPrescriptionConfig()
    }
    if (r === "followup" || ep === "/dental/followup/") {
      return dentalFollowUpConfig()
    }
    if (r === "material_consumption" || ep === "/dental/material_consumption/") {
      return dentalMaterialConsumptionConfig()
    }
    if (r === "clinical_evolution" || ep === "/dental/clinical_evolution/") {
      return dentalClinicalEvolutionConfig()
    }
    if (r === "document" || ep === "/dental/document/") {
      return dentalDocumentConfig()
    }
    if (r === "audit_event" || ep === "/dental/audit_event/") {
      return dentalAuditEventConfig()
    }
    if (r === "billing_item" || ep === "/dental/billing_item/") {
      return dentalBillingItemConfig()
    }
    if (r === "patient_plan_summary" || ep === "/dental/patient_plan_summary/") {
      return dentalPatientPlanSummaryConfig()
    }
    return null
  }

  if (g === "accounting" || ep.startsWith("/accounting/")) {
    if (r === "bank_account" || ep === "/accounting/bank_account/") {
      return bankAccountConfig()
    }
    if (r === "account" || ep === "/accounting/accounts/" || ep === "/accounting/account/") {
      return accountConfig()
    }
    if (r === "entry" || ep === "/accounting/entry/") {
      return ledgerEntryConfig()
    }
    if (r === "movement" || ep === "/accounting/movement/") {
      return ledgerMovementConfig()
    }
    if (
      r === "financialreconciliation" ||
      ep === "/accounting/financialreconciliation/" ||
      ep === "/accounting/financial-reconciliations/"
    ) {
      return financialReconciliationConfig()
    }
  }

  if (g === "nursing") {
    if (r === "nursing_record" || ep === "/nursing/nursing_record/") {
      return nursingRecordConfig()
    }
    if (r === "nursing_evolution" || ep === "/nursing/nursing_evolution/") {
      return nursingEvolutionConfig()
    }
    if (r === "nursing_prescription" || ep === "/nursing/nursing_prescription/") {
      return nursingPrescriptionConfig()
    }
    if (r === "nursing_vital_sign" || ep === "/nursing/nursing_vital_sign/") {
      return nursingVitalSignConfig()
    }
    if (r === "procedure" || ep === "/nursing/procedure/") {
      return nursingProcedureConfig()
    }
    if (r === "procedure_material" || ep === "/nursing/procedure_material/") {
      return nursingProcedureMaterialConfig()
    }
    if (r === "procedure_catalog" || ep === "/nursing/procedure_catalog/") {
      return nursingNonFinancialConfig("default_price", "preco", "preço", "preco_padrao", "preço_padrão")
    }
    if (r === "procedure_catalog_material" || ep === "/nursing/procedure_catalog_material/") {
      return nursingNonFinancialConfig("default_unit_cost")
    }
    if (r === "procedure_item" || ep === "/nursing/procedure_item/") {
      return nursingProcedureItemConfig()
    }
    if (r === "procedure_item_value" || ep === "/nursing/procedure_item_value/") {
      return nursingNonFinancialConfig("unit_price", "preco_unitario", "preço_unitário", "valor_unitario", "valor_unitário")
    }
    if (r === "procedure_material_value" || ep === "/nursing/procedure_material_value/") {
      return nursingNonFinancialConfig("unit_cost", "custo_unitario", "custo_unitário", "valor_unitario", "valor_unitário")
    }
    return null
  }

  if (g === "education") {
    const educationEp = normalizeEducationEndpoint(ep)
    const educationResourceKey =
      educationResourceKeyFromEndpoint(educationEp) ||
      normalizeEducationResourceKey(r)

    if (educationResourceKey === "student" || educationEp === "/education/student/") {
      return educationStudentConfig()
    }
    if (educationResourceKey === "teacher" || educationEp === "/education/teacher/") {
      return educationTeacherConfig()
    }
    if (educationResourceKey === "course" || educationEp === "/education/course/") {
      return educationCourseConfig()
    }
    if (educationResourceKey === "classroom" || educationEp === "/education/classroom/") {
      return educationClassroomConfig()
    }
    if (educationResourceKey === "enrollment" || educationEp === "/education/enrollment/") {
      return educationEnrollmentConfig()
    }
    if (educationResourceKey === "attendance" || educationEp === "/education/attendance/") {
      return educationAttendanceConfig()
    }
    if (educationResourceKey === "grade" || educationEp === "/education/grade/") {
      return educationGradeConfig()
    }
    if (educationResourceKey === "bibliography" || educationEp === "/education/bibliography/") {
      return educationBibliographyConfig()
    }
    if (educationResourceKey === "thematic_map" || educationEp === "/education/thematic_map/") {
      return educationThematicMapConfig()
    }
    if (educationResourceKey === "examination" || educationEp === "/education/examination/") {
      return educationExaminationConfig()
    }
    if (educationResourceKey === "random_test" || educationEp === "/education/random_test/") {
      return educationRandomTestConfig()
    }
    if (educationResourceKey === "assignment" || educationEp === "/education/assignment/") {
      return educationAssignmentConfig()
    }
    if (educationResourceKey === "submission" || educationEp === "/education/submission/") {
      return educationSubmissionConfig()
    }
    if (educationResourceKey === "exam_attempt" || educationEp === "/education/exam_attempt/" || educationEp === "/education/examination_attempt/") {
      return educationExamAttemptConfig()
    }
    if (educationResourceKey === "content" || educationEp === "/education/content/" || educationEp === "/education/lesson/") {
      return educationContentConfig()
    }
    if (educationResourceKey === "discipline_schedule" || educationEp === "/education/discipline_schedule/") {
      return educationDisciplineScheduleConfig()
    }
    if (educationResourceKey === "schedule_progress" || educationEp === "/education/schedule_progress/") {
      return educationScheduleProgressConfig()
    }
    if (educationResourceKey === "skill" || educationEp === "/education/skill/") {
      return educationSkillConfig()
    }
    return null
  }

  if (g === "warehouse") {
    return warehouseConfigForResource(r || warehouseResourceKeyFromEndpoint(ep), ep)
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

  if (r === "donation" || ep === "/bloodbank/donation/") {
    return bloodbankDonationConfig()
  }
  if (r === "storage" || ep === "/bloodbank/storage/") {
    return bloodbankStorageConfig()
  }
  if (r === "unit" || ep === "/bloodbank/unit/") {
    return bloodbankUnitConfig()
  }
  if (r === "transfusion" || ep === "/bloodbank/transfusion/") {
    return bloodbankTransfusionConfig()
  }
  if (r === "stock_movement" || ep === "/bloodbank/stock_movement/") {
    return bloodbankStockMovementConfig()
  }
  if (r === "storage_maintenance" || ep === "/bloodbank/storage_maintenance/") {
    return bloodbankStorageMaintenanceConfig()
  }

  return null
}
