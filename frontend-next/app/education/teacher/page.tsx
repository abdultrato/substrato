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

type RandomTest = {
  id: number
  title?: string
  classroom?: number
  student?: number
  status?: string
  opens_at?: string | null
  closes_at?: string | null
  duration_minutes?: number
  question_count?: number
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

function toLocalDateTimeInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function defaultScheduleInputValue() {
  const date = new Date(Date.now() + 60 * 60_000)
  date.setSeconds(0, 0)
  return toLocalDateTimeInputValue(date)
}

function localInputToIso(value: string) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
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
  const [randomTests, setRandomTests] = useState<RandomTest[]>([])

  const [selectedClassroomId, setSelectedClassroomId] = useState<number | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [scheduleAtInput, setScheduleAtInput] = useState(defaultScheduleInputValue())
  const [durationMinutesInput, setDurationMinutesInput] = useState("45")
  const [questionCountInput, setQuestionCountInput] = useState("15")
  const [titleTemplate, setTitleTemplate] = useState("Teste Aleatório - {student_code}")
  const [scheduleNotes, setScheduleNotes] = useState("")
  const [schedulingClassroom, setSchedulingClassroom] = useState(false)
  const [schedulingStudent, setSchedulingStudent] = useState(false)
  const [randomTestMessage, setRandomTestMessage] = useState<string | null>(null)
  const [randomTestError, setRandomTestError] = useState<string | null>(null)

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

  useEffect(() => {
    let mounted = true

    async function loadRandomTests() {
      if (!selectedClassroomId) {
        setRandomTests([])
        return
      }

      try {
        const query = selectedStudentId
          ? `/education/random_test/?classroom=${selectedClassroomId}&student=${selectedStudentId}`
          : `/education/random_test/?classroom=${selectedClassroomId}`
        const testsRes = await apiFetch<any>(query)
        if (!mounted) return
        setRandomTests(toList<RandomTest>(testsRes))
      } catch (e: any) {
        if (!mounted) return
        setRandomTests([])
        setRandomTestError(
          isNotFoundLikeError(e)
            ? null
            : (e?.message || "Falha ao carregar testes aleatórios.")
        )
      }
    }

    loadRandomTests().catch(() => undefined)
    return () => {
      mounted = false
    }
  }, [selectedClassroomId, selectedStudentId])

  async function handleScheduleRandomTest(scope: "classroom" | "student") {
    if (!selectedClassroomId) {
      setRandomTestError("Selecione uma turma para agendar o teste.")
      return
    }
    if (scope === "student" && !selectedStudentId) {
      setRandomTestError("Selecione um estudante para marcação individual.")
      return
    }

    const scheduledForIso = localInputToIso(scheduleAtInput)
    const durationMinutes = Number.parseInt(durationMinutesInput, 10)
    const questionCount = Number.parseInt(questionCountInput, 10)

    if (!scheduledForIso) {
      setRandomTestError("Informe uma data/hora válida para o teste.")
      return
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setRandomTestError("A duração deve ser maior que zero.")
      return
    }
    if (!Number.isFinite(questionCount) || questionCount <= 0) {
      setRandomTestError("A quantidade de questões deve ser maior que zero.")
      return
    }

    try {
      setRandomTestError(null)
      setRandomTestMessage(null)
      if (scope === "classroom") setSchedulingClassroom(true)
      if (scope === "student") setSchedulingStudent(true)

      const payload: Record<string, any> = {
        classroom: selectedClassroomId,
        scheduled_for: scheduledForIso,
        duration_minutes: durationMinutes,
        question_count: questionCount,
        title_template: titleTemplate || "Teste Aleatório - {student_code}",
        notes: scheduleNotes || "",
      }
      if (scope === "student" && selectedStudentId) {
        payload.student_ids = [selectedStudentId]
      }

      const response = await apiFetch<any>("/education/random_test/schedule_for_classroom/", {
        method: "POST",
        body: JSON.stringify(payload),
      })

      const created = Number(response?.count || 0)
      setRandomTestMessage(
        created > 0
          ? `${created} teste(s) aleatório(s) marcado(s) com sucesso.`
          : "Agendamento concluído sem novos testes."
      )

      const refreshQuery = scope === "student" && selectedStudentId
        ? `/education/random_test/?classroom=${selectedClassroomId}&student=${selectedStudentId}`
        : `/education/random_test/?classroom=${selectedClassroomId}`
      const refreshed = await apiFetch<any>(refreshQuery)
      setRandomTests(toList<RandomTest>(refreshed))
    } catch (e: any) {
      setRandomTestError(e?.message || "Falha ao marcar teste aleatório.")
    } finally {
      setSchedulingClassroom(false)
      setSchedulingStudent(false)
    }
  }

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

  const randomTestRows = useMemo(() => {
    return randomTests.map((item) => ({
      title: item.title || "—",
      status: item.status || "—",
      window: `${parseDate(item.opens_at)} → ${parseDate(item.closes_at)}`,
      details: `${item.question_count ?? 0} questões • ${item.duration_minutes ?? 0} min`,
    }))
  }, [randomTests])

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

        <Card title="Marcação de testes aleatórios">
          <div className="space-y-3">
            {randomTestError ? (
              <div className="border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">{randomTestError}</div>
            ) : null}
            {randomTestMessage ? (
              <div className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800">{randomTestMessage}</div>
            ) : null}

            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
              <label className="space-y-1 text-xs text-[var(--gray-700)]">
                <span>Data/hora de início</span>
                <input
                  type="datetime-local"
                  value={scheduleAtInput}
                  onChange={(event) => setScheduleAtInput(event.target.value)}
                  className="w-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
                />
              </label>

              <label className="space-y-1 text-xs text-[var(--gray-700)]">
                <span>Duração (min)</span>
                <input
                  type="number"
                  min={1}
                  value={durationMinutesInput}
                  onChange={(event) => setDurationMinutesInput(event.target.value)}
                  className="w-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
                />
              </label>

              <label className="space-y-1 text-xs text-[var(--gray-700)]">
                <span>Questões</span>
                <input
                  type="number"
                  min={1}
                  value={questionCountInput}
                  onChange={(event) => setQuestionCountInput(event.target.value)}
                  className="w-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
                />
              </label>

              <label className="space-y-1 text-xs text-[var(--gray-700)] md:col-span-2">
                <span>Título/template</span>
                <input
                  type="text"
                  value={titleTemplate}
                  onChange={(event) => setTitleTemplate(event.target.value)}
                  className="w-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
                  placeholder="Teste Aleatório - {student_code}"
                />
              </label>
            </div>

            <label className="space-y-1 text-xs text-[var(--gray-700)]">
              <span>Observações</span>
              <textarea
                value={scheduleNotes}
                onChange={(event) => setScheduleNotes(event.target.value)}
                className="min-h-[64px] w-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
                placeholder="Notas opcionais da marcação."
              />
            </label>

            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => handleScheduleRandomTest("classroom")}
                disabled={schedulingClassroom || schedulingStudent || !selectedClassroomId}
                className="border border-[var(--border)] bg-[var(--primary-600)] px-2 py-1 text-xs text-white transition hover:bg-[var(--primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {schedulingClassroom ? "A marcar..." : "Marcar para toda turma"}
              </button>
              <button
                type="button"
                onClick={() => handleScheduleRandomTest("student")}
                disabled={schedulingClassroom || schedulingStudent || !selectedClassroomId || !selectedStudentId}
                className="border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {schedulingStudent ? "A marcar..." : "Marcar para estudante selecionado"}
              </button>
            </div>

            <DataTable
              columns={[
                { header: "Título", accessor: "title" },
                { header: "Estado", accessor: "status" },
                { header: "Janela", accessor: "window" },
                { header: "Detalhes", accessor: "details" },
              ]}
              data={randomTestRows}
              emptyMessage="Sem testes aleatórios marcados para o filtro atual."
            />
          </div>
        </Card>

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
