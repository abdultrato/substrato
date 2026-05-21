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
    descriptionPt: "Agendamento de exames.",
    descriptionEn: "Exam scheduling.",
  },
  {
    key: "content",
    labelPt: "Conteúdos",
    labelEn: "Learning Content",
    descriptionPt: "Publicação de conteúdos.",
    descriptionEn: "Learning content publishing.",
  },
  {
    key: "skill",
    labelPt: "Skills",
    labelEn: "Skills",
    descriptionPt: "Catálogo de skills por curso.",
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
