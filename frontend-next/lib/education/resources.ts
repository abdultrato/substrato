import { findModuleGroup, findModuleResource, type ModuleGroup } from "@/lib/modules"
import { GROUPS } from "@/lib/rbac"

export const EDUCATION_REQUIRED_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.PROFESSOR,
  GROUPS.DIRETOR_ESCOLA,
  GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
]

export type EducationResourceDescriptor = {
  key: string
  labelPt: string
  labelEn: string
  descriptionPt: string
  descriptionEn: string
}

export const EDUCATION_RESOURCE_DESCRIPTORS: EducationResourceDescriptor[] = [
  {
    key: "student",
    labelPt: "Estudantes",
    labelEn: "Students",
    descriptionPt: "Gestão de perfis estudantis.",
    descriptionEn: "Student profile management.",
  },
  {
    key: "teacher",
    labelPt: "Professores",
    labelEn: "Teachers",
    descriptionPt: "Gestão de docentes.",
    descriptionEn: "Teacher management.",
  },
  {
    key: "course",
    labelPt: "Cursos",
    labelEn: "Courses",
    descriptionPt: "Catálogo curricular.",
    descriptionEn: "Curriculum catalog.",
  },
  {
    key: "classroom",
    labelPt: "Turmas",
    labelEn: "Classrooms",
    descriptionPt: "Gestão de turmas e anos letivos.",
    descriptionEn: "Class and school-year management.",
  },
  {
    key: "enrollment",
    labelPt: "Matrículas",
    labelEn: "Enrollments",
    descriptionPt: "Vínculo estudante-turma.",
    descriptionEn: "Student-class assignment.",
  },
  {
    key: "attendance",
    labelPt: "Presenças",
    labelEn: "Attendance",
    descriptionPt: "Registo de presenças por matrícula.",
    descriptionEn: "Attendance records by enrollment.",
  },
  {
    key: "grade",
    labelPt: "Notas",
    labelEn: "Grades",
    descriptionPt: "Lançamento de avaliações.",
    descriptionEn: "Grade publishing workflows.",
  },
  {
    key: "examination",
    labelPt: "Exames",
    labelEn: "Examinations",
    descriptionPt: "Provas por disciplina: 3 testes (slots), final normal/recorrência/especial e final do curso.",
    descriptionEn: "Course exams: 3 test slots, discipline final stages and course final exam.",
  },
  {
    key: "random_test",
    labelPt: "Testes Aleatórios",
    labelEn: "Random Tests",
    descriptionPt: "Marcação de testes aleatórios por turma e por estudante.",
    descriptionEn: "Random test scheduling per classroom and student.",
  },
  {
    key: "assignment",
    labelPt: "Trabalhos",
    labelEn: "Assignments",
    descriptionPt: "Configuração de trabalhos com cronologia e prazo de submissão.",
    descriptionEn: "Assignments with timeline and strict submission deadlines.",
  },
  {
    key: "submission",
    labelPt: "Submissões de Trabalho",
    labelEn: "Assignment Submissions",
    descriptionPt: "Submissões de estudantes com estado e avaliação.",
    descriptionEn: "Student submissions with status and grading data.",
  },
  {
    key: "exam_attempt",
    labelPt: "Tentativas de Exame",
    labelEn: "Exam Attempts",
    descriptionPt: "Até 3 tentativas por teste em dias diferentes (se nota < 10) e controlo anual no final do curso.",
    descriptionEn: "Up to 3 attempts per test on different days (when score < 10) and yearly course-final control.",
  },
  {
    key: "content",
    labelPt: "Conteúdos de Aprendizagem",
    labelEn: "Learning Content",
    descriptionPt: "Publicação de conteúdos.",
    descriptionEn: "Learning content publishing.",
  },
  {
    key: "bibliography",
    labelPt: "Referências Bibliográficas",
    labelEn: "Bibliographic References",
    descriptionPt: "Módulos de referência bibliográfica por disciplina.",
    descriptionEn: "Bibliographic reference modules by course.",
  },
  {
    key: "thematic_map",
    labelPt: "Mapa de Conteúdo Temático",
    labelEn: "Thematic Content Map",
    descriptionPt: "Estrutura temática e sequenciamento curricular por disciplina.",
    descriptionEn: "Thematic structure and curriculum sequencing per course.",
  },
  {
    key: "discipline_schedule",
    labelPt: "Cronograma da Disciplina",
    labelEn: "Discipline Schedule",
    descriptionPt: "Plano completo da disciplina: testes, trabalhos, temas e resolução de exercícios.",
    descriptionEn: "Full discipline plan with tests, assignments, themes and exercise sessions.",
  },
  {
    key: "schedule_progress",
    labelPt: "Progresso do Cronograma",
    labelEn: "Schedule Progress",
    descriptionPt: "Acompanhamento por estudante: sucesso, pendente ou matéria em atraso.",
    descriptionEn: "Per-student tracking: success, pending or overdue topic.",
  },
  {
    key: "skill",
    labelPt: "Competências",
    labelEn: "Skills",
    descriptionPt: "Catálogo de competências por curso.",
    descriptionEn: "Course skills catalog.",
  },
]

export function getEducationGroup(modules: ModuleGroup[]) {
  return findModuleGroup("education", modules)
}

export function getEducationResource(modules: ModuleGroup[], resourceKey: string) {
  return findModuleResource("education", resourceKey, modules)
}

export function getEducationDescriptor(resourceKey: string) {
  return EDUCATION_RESOURCE_DESCRIPTORS.find((item) => item.key === resourceKey) || null
}
