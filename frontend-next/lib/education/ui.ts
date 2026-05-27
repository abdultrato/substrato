export type EducationResourceUi = {
  key: string
  endpoint: string
  label: string
  singularLabel: string
  description: string
}

function normalizeEndpointPath(value?: string): string {
  const clean = String(value || "").split("?")[0].split("#")[0].trim()
  if (!clean) return "/"
  const prefixed = clean.startsWith("/") ? clean : `/${clean}`
  return prefixed.replace(/\/+$/, "") + "/"
}

const EDUCATION_ENDPOINT_ALIASES: Record<string, string> = {
  "/education/student-profiles/": "/education/student/",
  "/education/teacher-profiles/": "/education/teacher/",
  "/education/courses/": "/education/course/",
  "/education/classrooms/": "/education/classroom/",
  "/education/enrollments/": "/education/enrollment/",
  "/education/attendance-records/": "/education/attendance/",
  "/education/grade-records/": "/education/grade/",
  "/education/examinations/": "/education/examination/",
  "/education/random-tests/": "/education/random_test/",
  "/education/assignments/": "/education/assignment/",
  "/education/assignment-submissions/": "/education/submission/",
  "/education/examination-attempts/": "/education/exam_attempt/",
  "/education/learning-contents/": "/education/content/",
  "/education/discipline-schedule-items/": "/education/discipline_schedule/",
  "/education/discipline-schedule-student-statuses/": "/education/schedule_progress/",
  "/education/skills/": "/education/skill/",
}

const EDUCATION_RESOURCE_ALIASES: Record<string, string> = {
  "student-profile": "student",
  student_profiles: "student",
  "student-profiles": "student",
  "teacher-profile": "teacher",
  teacher_profiles: "teacher",
  "teacher-profiles": "teacher",
  courses: "course",
  classrooms: "classroom",
  enrollments: "enrollment",
  examinations: "examination",
  students: "student",
  teachers: "teacher",
  grades: "grade",
  attendances: "attendance",
  attendance_record: "attendance",
  attendance_records: "attendance",
  "attendance-record": "attendance",
  "attendance-records": "attendance",
  grade_record: "grade",
  grade_records: "grade",
  "grade-record": "grade",
  "grade-records": "grade",
  random_tests: "random_test",
  "random-tests": "random_test",
  assignments: "assignment",
  submissions: "submission",
  assignment_submission: "submission",
  assignment_submissions: "submission",
  "assignment-submission": "submission",
  "assignment-submissions": "submission",
  examination_attempt: "exam_attempt",
  examination_attempts: "exam_attempt",
  exam_attempts: "exam_attempt",
  "examination-attempt": "exam_attempt",
  "examination-attempts": "exam_attempt",
  learning_content: "content",
  learning_contents: "content",
  contents: "content",
  "learning-content": "content",
  "learning-contents": "content",
  discipline_schedule_item: "discipline_schedule",
  discipline_schedule_items: "discipline_schedule",
  discipline_schedules: "discipline_schedule",
  "discipline-schedule-item": "discipline_schedule",
  "discipline-schedule-items": "discipline_schedule",
  discipline_schedule_student_status: "schedule_progress",
  discipline_schedule_student_statuses: "schedule_progress",
  schedule_progresses: "schedule_progress",
  "discipline-schedule-student-status": "schedule_progress",
  "discipline-schedule-student-statuses": "schedule_progress",
  skills: "skill",
}

export const EDUCATION_RESOURCE_UI: Record<string, EducationResourceUi> = {
  student: {
    key: "student",
    endpoint: "/education/student/",
    label: "Estudantes",
    singularLabel: "Estudante",
    description: "Gestão de perfis estudantis.",
  },
  teacher: {
    key: "teacher",
    endpoint: "/education/teacher/",
    label: "Professores",
    singularLabel: "Professor",
    description: "Gestão de docentes.",
  },
  course: {
    key: "course",
    endpoint: "/education/course/",
    label: "Cursos",
    singularLabel: "Curso",
    description: "Catálogo curricular.",
  },
  classroom: {
    key: "classroom",
    endpoint: "/education/classroom/",
    label: "Turmas",
    singularLabel: "Turma",
    description: "Gestão de turmas e anos letivos.",
  },
  enrollment: {
    key: "enrollment",
    endpoint: "/education/enrollment/",
    label: "Matrículas",
    singularLabel: "Matrícula",
    description: "Vínculo entre estudante e turma.",
  },
  attendance: {
    key: "attendance",
    endpoint: "/education/attendance/",
    label: "Presenças",
    singularLabel: "Presença",
    description: "Registo de presenças por matrícula.",
  },
  grade: {
    key: "grade",
    endpoint: "/education/grade/",
    label: "Notas",
    singularLabel: "Nota",
    description: "Lançamento e publicação de avaliações.",
  },
  examination: {
    key: "examination",
    endpoint: "/education/examination/",
    label: "Exames",
    singularLabel: "Exame",
    description: "Provas, janelas de avaliação e regras de tentativa.",
  },
  random_test: {
    key: "random_test",
    endpoint: "/education/random_test/",
    label: "Testes Aleatórios",
    singularLabel: "Teste Aleatório",
    description: "Marcação de testes por turma e estudante.",
  },
  assignment: {
    key: "assignment",
    endpoint: "/education/assignment/",
    label: "Trabalhos",
    singularLabel: "Trabalho",
    description: "Trabalhos com instruções, prazo e regras de submissão.",
  },
  submission: {
    key: "submission",
    endpoint: "/education/submission/",
    label: "Submissões de Trabalho",
    singularLabel: "Submissão de Trabalho",
    description: "Submissões de estudantes com estado e avaliação.",
  },
  exam_attempt: {
    key: "exam_attempt",
    endpoint: "/education/exam_attempt/",
    label: "Tentativas de Exame",
    singularLabel: "Tentativa de Exame",
    description: "Tentativas, respostas, notas e feedback de avaliação.",
  },
  content: {
    key: "content",
    endpoint: "/education/content/",
    label: "Conteúdos de Aprendizagem",
    singularLabel: "Conteúdo de Aprendizagem",
    description: "Publicação de materiais de estudo por disciplina.",
  },
  bibliography: {
    key: "bibliography",
    endpoint: "/education/bibliography/",
    label: "Referências Bibliográficas",
    singularLabel: "Referência Bibliográfica",
    description: "Referências bibliográficas por disciplina.",
  },
  thematic_map: {
    key: "thematic_map",
    endpoint: "/education/thematic_map/",
    label: "Mapa de Conteúdo Temático",
    singularLabel: "Mapa de Conteúdo Temático",
    description: "Estrutura temática e sequenciamento curricular.",
  },
  discipline_schedule: {
    key: "discipline_schedule",
    endpoint: "/education/discipline_schedule/",
    label: "Cronograma da Disciplina",
    singularLabel: "Item do Cronograma",
    description: "Plano da disciplina com temas, avaliações e exercícios.",
  },
  schedule_progress: {
    key: "schedule_progress",
    endpoint: "/education/schedule_progress/",
    label: "Progresso do Cronograma",
    singularLabel: "Progresso do Cronograma",
    description: "Acompanhamento do avanço de cada estudante.",
  },
  skill: {
    key: "skill",
    endpoint: "/education/skill/",
    label: "Competências",
    singularLabel: "Competência",
    description: "Catálogo de competências por curso.",
  },
}

export function normalizeEducationResourceKey(value?: string): string {
  const raw = String(value || "").trim().toLowerCase()
  if (!raw) return ""
  const normalized = raw.replace(/\s+/g, "_")
  return EDUCATION_RESOURCE_ALIASES[normalized] || normalized
}

export function normalizeEducationEndpoint(endpoint?: string): string {
  const normalized = normalizeEndpointPath(endpoint)
  if (!normalized.startsWith("/education/")) return normalized
  const parts = normalized.split("/").filter(Boolean)
  const resource = parts[1] || ""
  const remainder = parts.slice(2).join("/")
  const resourceKey = normalizeEducationResourceKey(resource)
  const canonicalByKey = EDUCATION_RESOURCE_UI[resourceKey]?.endpoint
  const canonicalBase = EDUCATION_ENDPOINT_ALIASES[normalized] || canonicalByKey
  if (!canonicalBase) return normalized
  return remainder ? `${canonicalBase}${remainder}/` : canonicalBase
}

export function educationResourceKeyFromEndpoint(endpoint?: string): string | null {
  const normalized = normalizeEducationEndpoint(endpoint)
  const match = normalized.match(/^\/education\/([^/]+)\//)
  if (!match) return null
  return normalizeEducationResourceKey(match[1])
}

export function educationResourceUiFromEndpoint(endpoint?: string): EducationResourceUi | null {
  const key = educationResourceKeyFromEndpoint(endpoint)
  return key ? EDUCATION_RESOURCE_UI[key] || null : null
}

export function educationResourceUiFromKey(resourceKey?: string): EducationResourceUi | null {
  const key = normalizeEducationResourceKey(resourceKey)
  return EDUCATION_RESOURCE_UI[key] || null
}
