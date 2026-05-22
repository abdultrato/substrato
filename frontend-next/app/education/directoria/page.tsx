"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"

type TeacherProfile = {
  id: number
  teacher_code?: string
  status?: string
  user?: number
}

type StudentProfile = {
  id: number
  student_code?: string
  status?: string
  birth_date?: string | null
  guardian_name?: string
}

type Course = {
  id: number
  name?: string
  code?: string
}

type Classroom = {
  id: number
  name?: string
  course?: number
  academic_year?: string
}

type Enrollment = {
  id: number
  student?: number
  classroom?: number
  status?: string
  enrolled_on?: string
}

type Assignment = {
  id: number
  title?: string
  work_category?: string
}

type Submission = {
  id: number
  assignment?: number
  student?: number
  status?: string
  submitted_at?: string | null
}

type Grade = {
  id: number
  enrollment?: number
}

const REQUIRED_GROUPS = [GROUPS.ADMIN, GROUPS.DIRETOR_ESCOLA, GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO]

function toList<T>(payload: any): T[] {
  if (Array.isArray(payload?.results)) return payload.results as T[]
  if (Array.isArray(payload)) return payload as T[]
  return []
}

function normalizeStatus(status?: string) {
  return String(status || "").toUpperCase().trim()
}

function workCategoryLabel(value?: string) {
  const v = String(value || "").toUpperCase()
  if (v === "MANDATORY") return "Obrigatório"
  if (v === "HYGIENIC") return "Higiénico"
  if (v === "OPTIONAL") return "Opcional"
  return "Não classificado"
}

export default function EducationDirectoriaPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [teachers, setTeachers] = useState<TeacherProfile[]>([])
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [grades, setGrades] = useState<Grade[]>([])

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [
          teachersRes,
          studentsRes,
          coursesRes,
          classroomsRes,
          enrollmentsRes,
          assignmentsRes,
          submissionsRes,
          gradesRes,
        ] = await Promise.all([
          apiFetch<any>("/education/teacher/"),
          apiFetch<any>("/education/student/"),
          apiFetch<any>("/education/course/"),
          apiFetch<any>("/education/classroom/"),
          apiFetch<any>("/education/enrollment/"),
          apiFetch<any>("/education/assignment/"),
          apiFetch<any>("/education/submission/"),
          apiFetch<any>("/education/grade/"),
        ])

        if (!mounted) return
        setTeachers(toList<TeacherProfile>(teachersRes))
        setStudents(toList<StudentProfile>(studentsRes))
        setCourses(toList<Course>(coursesRes))
        setClassrooms(toList<Classroom>(classroomsRes))
        setEnrollments(toList<Enrollment>(enrollmentsRes))
        setAssignments(toList<Assignment>(assignmentsRes))
        setSubmissions(toList<Submission>(submissionsRes))
        setGrades(toList<Grade>(gradesRes))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : (e?.message || "Falha ao carregar a área da directoria.")
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const coursesById = useMemo(() => new Map(courses.map((item) => [item.id, item])), [courses])
  const classroomsById = useMemo(() => new Map(classrooms.map((item) => [item.id, item])), [classrooms])
  const assignmentsById = useMemo(() => new Map(assignments.map((item) => [item.id, item])), [assignments])

  const teacherRows = useMemo(() => {
    return teachers.map((teacher) => ({
      teacher_code: teacher.teacher_code || `#${teacher.id}`,
      status: teacher.status || "—",
      timeline: normalizeStatus(teacher.status) === "ACTIVE" ? "Ativo (presente)" : "Inativo (passado)",
      user_ref: teacher.user ? `Utilizador #${teacher.user}` : "—",
    }))
  }, [teachers])

  const studentRows = useMemo(() => {
    return students.map((student) => {
      const ownEnrollments = enrollments.filter((item) => item.student === student.id)
      const ownEnrollmentIds = new Set(ownEnrollments.map((item) => item.id))
      const ownGrades = grades.filter((item) => item.enrollment && ownEnrollmentIds.has(item.enrollment))

      const disciplines = ownEnrollments.map((enrollment) => {
        const classroom = enrollment.classroom ? classroomsById.get(enrollment.classroom) : undefined
        const course = classroom?.course ? coursesById.get(classroom.course) : undefined
        const courseLabel = course?.name || course?.code || `Curso #${classroom?.course ?? "—"}`
        const classroomLabel = classroom?.name || `Turma #${enrollment.classroom ?? "—"}`
        return `${courseLabel} (${classroomLabel})`
      })

      const ownSubmissions = submissions.filter((item) => item.student === student.id)
      let mandatoryDone = 0
      let hygienicDone = 0
      ownSubmissions.forEach((submission) => {
        const assignment = submission.assignment ? assignmentsById.get(submission.assignment) : undefined
        const category = String(assignment?.work_category || "").toUpperCase()
        if (category === "MANDATORY") mandatoryDone += 1
        if (category === "HYGIENIC") hygienicDone += 1
      })

      return {
        student_code: student.student_code || `#${student.id}`,
        status: student.status || "—",
        enrollment_count: ownEnrollments.length,
        disciplines: disciplines.join(" | ") || "—",
        mandatory_done: mandatoryDone,
        hygienic_done: hygienicDone,
        submissions_total: ownSubmissions.length,
        grades_total: ownGrades.length,
        guardian: student.guardian_name || "—",
      }
    })
  }, [assignmentsById, classroomsById, coursesById, enrollments, grades, students, submissions])

  const activeTeachers = useMemo(
    () => teachers.filter((item) => normalizeStatus(item.status) === "ACTIVE").length,
    [teachers]
  )

  const inactiveTeachers = useMemo(
    () => teachers.filter((item) => normalizeStatus(item.status) !== "ACTIVE").length,
    [teachers]
  )

  const mandatoryAssignments = useMemo(
    () => assignments.filter((item) => String(item.work_category || "").toUpperCase() === "MANDATORY").length,
    [assignments]
  )

  const hygienicAssignments = useMemo(
    () => assignments.filter((item) => String(item.work_category || "").toUpperCase() === "HYGIENIC").length,
    [assignments]
  )

  return (
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <div className="space-y-4">
        <PageHeader
          title="Área da Directoria"
          subtitle="Visão integral da escola: professores, estudantes, inscrições e execução de trabalhos."
          actions={
            <Link
              href="/education"
              className="inline-flex items-center border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
            >
              Voltar ao Education
            </Link>
          }
        />

        {error ? (
          <div className="border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-4">
          <Card title="Professores">
            <div className="text-xs text-[var(--gray-700)]">
              {loading ? "..." : teachers.length}
              <div className="text-[0.9em] text-[var(--gray-500)]">Ativos: {loading ? "..." : activeTeachers}</div>
              <div className="text-[0.9em] text-[var(--gray-500)]">Inativos: {loading ? "..." : inactiveTeachers}</div>
            </div>
          </Card>
          <Card title="Estudantes">
            <div className="text-xs text-[var(--gray-700)]">{loading ? "..." : students.length}</div>
          </Card>
          <Card title="Trabalhos obrigatórios">
            <div className="text-xs text-[var(--gray-700)]">{loading ? "..." : mandatoryAssignments}</div>
          </Card>
          <Card title="Trabalhos higiénicos">
            <div className="text-xs text-[var(--gray-700)]">{loading ? "..." : hygienicAssignments}</div>
          </Card>
        </div>

        <Card title="Quadro docente (ativos e inativos)">
          <DataTable
            columns={[
              { header: "Código", accessor: "teacher_code" },
              { header: "Estado", accessor: "status" },
              { header: "Linha temporal", accessor: "timeline" },
              { header: "Utilizador", accessor: "user_ref" },
            ]}
            data={teacherRows}
            emptyMessage={loading ? "Carregando..." : "Sem professores registados."}
          />
        </Card>

        <Card title="Quadro discente (inscrição, disciplinas e trabalhos)">
          <DataTable
            columns={[
              { header: "Código", accessor: "student_code" },
              { header: "Estado", accessor: "status" },
              { header: "Inscrições", accessor: "enrollment_count" },
              { header: "Disciplinas/turmas", accessor: "disciplines" },
              { header: "Obrigatórios feitos", accessor: "mandatory_done" },
              { header: "Higiénicos feitos", accessor: "hygienic_done" },
              { header: "Submissões", accessor: "submissions_total" },
              { header: "Notas", accessor: "grades_total" },
              { header: "Encarregado", accessor: "guardian" },
            ]}
            data={studentRows}
            emptyMessage={loading ? "Carregando..." : "Sem estudantes registados."}
          />
        </Card>

        <Card title="Tipos de trabalhos catalogados">
          <div className="grid gap-1 md:grid-cols-2">
            {assignments.length ? (
              assignments.map((assignment) => (
                <div key={assignment.id} className="border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--gray-700)]">
                  <strong>{assignment.title || `Trabalho #${assignment.id}`}</strong> • {workCategoryLabel(assignment.work_category)}
                </div>
              ))
            ) : (
              <div className="text-xs text-[var(--gray-500)]">{loading ? "Carregando..." : "Sem trabalhos registados."}</div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
