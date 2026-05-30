import { canonicalModuleGroupKey } from "@/lib/modules"
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
      record: "Prontuário dentário",
      tooth_number: "Numeração dentária",
      surface: "Face",
      condition: "Condição",
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
      notes: "textarea",
    },
    ordenarCampos: ["record", "tooth_number", "surface", "condition", "procedure", "notes"],
    etapas: [
      {
        titulo: "Dente",
        descricao: "Numeração dentária, face e condição",
        campos: ["record", "tooth_number", "surface", "condition"],
      },
      {
        titulo: "Procedimento",
        descricao: "Procedimento relacionado e observações",
        campos: ["procedure", "notes"],
      },
    ],
    lembrarCampos: ["record", "surface", "condition"],
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

  if (g === "dental") {
    if (r === "procedure" || ep === "/dental/procedure/") {
      return dentalProcedureConfig()
    }
    if (r === "odontogram" || ep === "/dental/odontogram/") {
      return dentalOdontogramConfig()
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
