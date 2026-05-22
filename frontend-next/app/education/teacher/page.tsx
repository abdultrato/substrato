"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type Classroom = {
  id: number
  name?: string
  academic_year?: string
  course?: number
  homeroom_teacher?: number | null
}

type Course = {
  id: number
  name?: string
  code?: string
}

type Enrollment = {
  id: number
  student?: number
  classroom?: number
  status?: string
  enrolled_on?: string
  closed_on?: string | null
}

type StudentProfile = {
  id: number
  student_code?: string
  status?: string
  birth_date?: string | null
  guardian_name?: string
  notes?: string
}

type TeacherProfile = {
  id: number
  user?: number
}

type Grade = {
  id: number
  component?: string
  score?: string | number
  max_score?: string | number
  teacher?: number | null
  published_at?: string | null
}

const REQUIRED_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.PROFESSOR,
  GROUPS.DIRETOR_ESCOLA,
  GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
]

const DIRECTOR_GROUPS = [GROUPS.ADMIN, GROUPS.DIRETOR_ESCOLA, GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO]

function toList<T>(payload: any): T[] {
  if (Array.isArray(payload?.results)) return payload.results as T[]
  if (Array.isArray(payload)) return payload as T[]
  return []
}

function parseDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export default function EducationTeacherAreaPage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [coursesById, setCoursesById] = useState<Map<number, Course>>(new Map())
  const [teacherProfileId, setTeacherProfileId] = useState<number | null>(null)

  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [studentsById, setStudentsById] = useState<Map<number, StudentProfile>>(new Map())

  const [studentEnrollments, setStudentEnrollments] = useState<Enrollment[]>([])
  const [grades, setGrades] = useState<Grade[]>([])

  const [selectedClassroomId, setSelectedClassroomId] = useState<number | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadInitial() {
      try {
        setLoading(true)
        setError(null)

        const [coursesRes, classroomsRes, teacherRes] = await Promise.all([
          apiFetch<any>("/education/course/"),
          apiFetch<any>("/education/classroom/"),
          user?.id ? apiFetch<any>(`/education/teacher/?user=${user.id}`) : Promise.resolve([]),
        ])

        if (!mounted) return

        const courseList = toList<Course>(coursesRes)
        setCoursesById(new Map(courseList.map((course) => [course.id, course])))

        const classroomList = toList<Classroom>(classroomsRes)
        setClassrooms(classroomList)
        setSelectedClassroomId((prev) => prev ?? classroomList[0]?.id ?? null)

        const teacherList = toList<TeacherProfile>(teacherRes)
        setTeacherProfileId(teacherList[0]?.id ?? null)
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : (e?.message || "Falha ao carregar a área do professor.")
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadInitial()
    return () => {
      mounted = false
    }
  }, [user?.id])

  useEffect(() => {
    let mounted = true

    async function loadClassroomStudents() {
      if (!selectedClassroomId) {
        setEnrollments([])
        setStudentsById(new Map())
        setSelectedStudentId(null)
        return
      }
      try {
        setLoadingDetail(true)
        const enrollmentRes = await apiFetch<any>(`/education/enrollment/?classroom=${selectedClassroomId}`)
        const enrollmentList = toList<Enrollment>(enrollmentRes)
        if (!mounted) return
        setEnrollments(enrollmentList)

        const studentIds = Array.from(new Set(enrollmentList.map((item) => item.student).filter(Boolean))) as number[]
        const students = await Promise.all(studentIds.map((id) => apiFetch<StudentProfile>(`/education/student/${id}/`)))
        if (!mounted) return
        setStudentsById(new Map(students.map((student) => [student.id, student])))

        const currentExists = selectedStudentId && studentIds.includes(selectedStudentId)
        setSelectedStudentId(currentExists ? selectedStudentId : (studentIds[0] ?? null))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : (e?.message || "Falha ao carregar estudantes da turma.")
        )
      } finally {
        if (mounted) setLoadingDetail(false)
      }
    }

    loadClassroomStudents()
    return () => {
      mounted = false
    }
  }, [selectedClassroomId, selectedStudentId])

  const selectedClassroom = useMemo(
    () => classrooms.find((item) => item.id === selectedClassroomId) ?? null,
    [classrooms, selectedClassroomId]
  )

  const selectedEnrollment = useMemo(
    () => enrollments.find((item) => item.student === selectedStudentId) ?? null,
    [enrollments, selectedStudentId]
  )

  const selectedStudent = useMemo(
    () => (selectedStudentId ? studentsById.get(selectedStudentId) ?? null : null),
    [selectedStudentId, studentsById]
  )

  const canViewAllGrades = useMemo(() => {
    const isDirectorRole = userHasAnyGroup(user, DIRECTOR_GROUPS)
    const isClassDirector =
      !!selectedClassroom?.homeroom_teacher &&
      !!teacherProfileId &&
      selectedClassroom.homeroom_teacher === teacherProfileId
    return isDirectorRole || isClassDirector
  }, [selectedClassroom?.homeroom_teacher, teacherProfileId, user])

  useEffect(() => {
    let mounted = true

    async function loadStudentAcademicContext() {
      if (!selectedStudent || !selectedEnrollment) {
        setStudentEnrollments([])
        setGrades([])
        return
      }
      try {
        setLoadingDetail(true)
        const enrollmentsRes = await apiFetch<any>(`/education/enrollment/?student=${selectedStudent.id}`)
        if (!mounted) return
        const enrollmentList = toList<Enrollment>(enrollmentsRes)
        setStudentEnrollments(enrollmentList)

        let gradeEndpoint = `/education/grade/?enrollment=${selectedEnrollment.id}`
        if (!canViewAllGrades && teacherProfileId) {
          gradeEndpoint += `&teacher=${teacherProfileId}`
        }
        const gradesRes = await apiFetch<any>(gradeEndpoint)
        if (!mounted) return
        setGrades(toList<Grade>(gradesRes))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : (e?.message || "Falha ao carregar inscrição e notas do estudante.")
        )
      } finally {
        if (mounted) setLoadingDetail(false)
      }
    }

    loadStudentAcademicContext()
    return () => {
      mounted = false
    }
  }, [canViewAllGrades, selectedEnrollment, selectedStudent, teacherProfileId])

  const disciplineLabels = useMemo(() => {
    return studentEnrollments.map((item) => {
      const classroom = classrooms.find((cls) => cls.id === item.classroom)
      const course = classroom?.course ? coursesById.get(classroom.course) : undefined
      const courseLabel = course?.name || course?.code || `Curso #${classroom?.course ?? "—"}`
      const classLabel = classroom?.name || `Turma #${item.classroom ?? "—"}`
      return `${courseLabel} (${classLabel})`
    })
  }, [classrooms, coursesById, studentEnrollments])

  const gradeRows = useMemo(() => {
    return grades.map((grade) => ({
      component: grade.component || "—",
      score: `${grade.score ?? "0"}/${grade.max_score ?? "0"}`,
      teacher: grade.teacher ? `#${grade.teacher}` : "—",
      published: parseDate(grade.published_at),
    }))
  }, [grades])

  return (
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <div className="space-y-4">
        <PageHeader
          title="Área do Professor"
          subtitle="Turmas lecionadas, estudantes e contexto académico por disciplina."
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

        <div className="grid gap-2 md:grid-cols-3">
          <Card title="Turmas atribuídas">
            <div className="space-y-1">
              {classrooms.length ? (
                classrooms.map((classroom) => {
                  const course = classroom.course ? coursesById.get(classroom.course) : undefined
                  const active = classroom.id === selectedClassroomId
                  return (
                    <button
                      key={classroom.id}
                      type="button"
                      onClick={() => setSelectedClassroomId(classroom.id)}
                      className={`w-full border px-2 py-1 text-left text-xs transition ${
                        active
                          ? "border-[var(--primary-600)] bg-[var(--primary-50)] text-[var(--primary-700)]"
                          : "border-[var(--border)] bg-[var(--card)] text-[var(--gray-700)] hover:bg-[var(--gray-100)]"
                      }`}
                    >
                      <div className="font-semibold">{classroom.name || `Turma #${classroom.id}`}</div>
                      <div className="text-[0.9em] text-[var(--gray-500)]">
                        {course?.name || course?.code || `Curso #${classroom.course ?? "—"}`} • {classroom.academic_year || "—"}
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="text-xs text-[var(--gray-500)]">{loading ? "Carregando..." : "Sem turmas atribuídas."}</div>
              )}
            </div>
          </Card>

          <Card title="Estudantes da turma">
            <div className="space-y-1">
              {enrollments.length ? (
                enrollments.map((enrollment) => {
                  const student = enrollment.student ? studentsById.get(enrollment.student) : null
                  const active = enrollment.student === selectedStudentId
                  return (
                    <button
                      key={enrollment.id}
                      type="button"
                      onClick={() => setSelectedStudentId(enrollment.student ?? null)}
                      className={`w-full border px-2 py-1 text-left text-xs transition ${
                        active
                          ? "border-[var(--primary-600)] bg-[var(--primary-50)] text-[var(--primary-700)]"
                          : "border-[var(--border)] bg-[var(--card)] text-[var(--gray-700)] hover:bg-[var(--gray-100)]"
                      }`}
                    >
                      <div className="font-semibold">{student?.student_code || `Estudante #${enrollment.student ?? "—"}`}</div>
                      <div className="text-[0.9em] text-[var(--gray-500)]">Matrícula: {enrollment.status || "—"}</div>
                    </button>
                  )
                })
              ) : (
                <div className="text-xs text-[var(--gray-500)]">
                  {loadingDetail || loading ? "Carregando..." : "Sem estudantes para esta turma."}
                </div>
              )}
            </div>
          </Card>

          <Card title="Resumo">
            <div className="space-y-1 text-xs text-[var(--gray-700)]">
              <div><strong>Turmas:</strong> {loading ? "..." : classrooms.length}</div>
              <div><strong>Estudantes na turma:</strong> {loading || loadingDetail ? "..." : enrollments.length}</div>
              <div><strong>Notas visíveis:</strong> {loading || loadingDetail ? "..." : grades.length}</div>
              <div className="text-[0.9em] text-[var(--gray-500)]">
                {canViewAllGrades
                  ? "Visão de notas completa (directoria de turma/directoria)."
                  : "Visão restrita às notas da disciplina do professor logado."}
              </div>
            </div>
          </Card>
        </div>

        <Card title="Dados do estudante selecionado">
          {!selectedStudent || !selectedEnrollment ? (
            <div className="text-xs text-[var(--gray-500)]">
              {loading || loadingDetail ? "Carregando..." : "Selecione turma e estudante para abrir os detalhes."}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <div className="border border-[var(--border)] bg-[var(--card)] p-2 text-xs text-[var(--gray-700)]">
                  <div><strong>Código:</strong> {selectedStudent.student_code || "—"}</div>
                  <div><strong>Estado:</strong> {selectedStudent.status || "—"}</div>
                  <div><strong>Nascimento:</strong> {selectedStudent.birth_date || "—"}</div>
                  <div><strong>Encarregado:</strong> {selectedStudent.guardian_name || "—"}</div>
                </div>
                <div className="border border-[var(--border)] bg-[var(--card)] p-2 text-xs text-[var(--gray-700)]">
                  <div><strong>Matrícula:</strong> {selectedEnrollment.status || "—"}</div>
                  <div><strong>Inscrito em:</strong> {selectedEnrollment.enrolled_on || "—"}</div>
                  <div><strong>Encerrado em:</strong> {selectedEnrollment.closed_on || "—"}</div>
                  <div><strong>Observações:</strong> {selectedStudent.notes || "—"}</div>
                </div>
              </div>

              <div className="border border-[var(--border)] bg-[var(--card)] p-2">
                <div className="text-xs font-semibold text-[var(--text)]">Disciplinas/inscrições do estudante</div>
                {disciplineLabels.length ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {disciplineLabels.map((label) => (
                      <span key={label} className="border border-[var(--border)] bg-[var(--gray-100)] px-2 py-0.5 text-xs text-[var(--gray-700)]">
                        {label}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-[var(--gray-500)]">Sem outras inscrições visíveis.</div>
                )}
              </div>

              <DataTable
                columns={[
                  { header: "Componente", accessor: "component" },
                  { header: "Nota", accessor: "score" },
                  { header: "Professor", accessor: "teacher" },
                  { header: "Publicação", accessor: "published" },
                ]}
                data={gradeRows}
                emptyMessage={loadingDetail ? "Carregando..." : "Sem notas disponíveis para o escopo atual."}
              />
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
