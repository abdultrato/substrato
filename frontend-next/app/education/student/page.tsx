"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchAll } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"

type StudentProfile = {
  id: number
  student_code: string
  status: string
}

type Enrollment = {
  id: number
  classroom?: number | null
  status?: string | null
  enrolled_on?: string | null
  closed_on?: string | null
}

type Course = {
  id: number
  name?: string | null
  code?: string | null
  workload_hours?: number | string | null
  status?: string | null
}

type Classroom = {
  id: number
  name?: string | null
  course?: number | null
  academic_year?: string | null
}

type Grade = {
  id: number
  enrollment?: number | null
  component?: string | null
  score?: string | number | null
  max_score?: string | number | null
  weight?: string | number | null
  published_at?: string | null
}

type AttendanceRecord = {
  id: number
  enrollment?: number | null
  attendance_date?: string | null
  status?: string | null
  notes?: string | null
}

type ScheduleItem = {
  id: number
  course?: number | null
  classroom?: number | null
  item_type?: string | null
  title?: string | null
  scheduled_date?: string | null
  requires_attendance?: boolean | null
  status?: string | null
}

type ScheduleProgress = {
  id: number
  schedule_item?: number | null
  enrollment?: number | null
  status?: string | null
  completion_marked?: boolean | null
  completed_at?: string | null
  attendance_status_snapshot?: string | null
}

type DisciplineRow = {
  discipline: string
  classroom: string
  status: string
  enrollmentDate: string
  gradeAverage: string
  attendanceRate: string
  progressRate: string
}

type GradeRow = {
  discipline: string
  component: string
  score: string
  published: string
}

type ScheduleRow = {
  discipline: string
  title: string
  type: string
  date: string
  itemStatus: string
  progressStatus: string
}

type AttendanceRow = {
  discipline: string
  date: string
  status: string
  notes: string
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa",
  INACTIVE: "Inativa",
  PENDING: "Pendente",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  TRANSFERRED: "Transferida",
  PLANNED: "Planeado",
  OVERDUE: "Em atraso",
  SUCCESS: "Concluído",
  PRESENT: "Presente",
  ABSENT: "Ausente",
  LATE: "Atraso",
  EXCUSED: "Justificada",
  TEST: "Teste",
  ASSIGNMENT: "Trabalho",
  THEME: "Tema",
  EXERCISE: "Exercício",
}

function normalizeList<T>(response: any): T[] {
  if (Array.isArray(response?.results)) return response.results
  if (Array.isArray(response)) return response
  return []
}

async function fetchAllForEnrollments<T>(endpoint: string, enrollmentIds: number[]): Promise<T[]> {
  if (!enrollmentIds.length) return []
  const responses = await Promise.all(
    enrollmentIds.map((enrollmentId) =>
      apiFetchAll<T>(`${endpoint}?enrollment=${enrollmentId}`, {
        pageSize: 100,
        maxPages: 10,
      })
    )
  )
  return responses.flat()
}

function statusLabel(value?: string | null): string {
  if (!value) return "—"
  return STATUS_LABELS[value] || value
}

function numeric(value?: string | number | null): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatDate(value?: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Pendente"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value)}%`
}

function percentage(done: number, total: number): number | null {
  if (!total) return null
  return (done / total) * 100
}

function gradePercentage(grades: Grade[]): number | null {
  let scored = 0
  let maximum = 0

  grades.forEach((grade) => {
    const score = numeric(grade.score)
    const maxScore = numeric(grade.max_score)
    if (score === null || maxScore === null || maxScore <= 0) return
    scored += score
    maximum += maxScore
  })

  return maximum > 0 ? (scored / maximum) * 100 : null
}

function formatScore(grade: Grade): string {
  const score = grade.score ?? "0"
  const maxScore = grade.max_score ?? "0"
  return `${score}/${maxScore}`
}

function attendancePercentage(records: AttendanceRecord[]): number | null {
  if (!records.length) return null
  const presentLike = records.filter((record) =>
    ["PRESENT", "LATE", "EXCUSED"].includes(String(record.status || ""))
  ).length
  return percentage(presentLike, records.length)
}

function progressPercentage(progress: ScheduleProgress[], fallbackItems: ScheduleItem[]): number | null {
  if (progress.length) {
    const completed = progress.filter((item) => item.status === "SUCCESS" || item.completion_marked).length
    return percentage(completed, progress.length)
  }

  if (fallbackItems.length) {
    const completed = fallbackItems.filter((item) => item.status === "COMPLETED").length
    return percentage(completed, fallbackItems.length)
  }

  return null
}

function courseLabel(course?: Course): string {
  if (!course) return "Disciplina não identificada"
  const code = course.code ? `${course.code} - ` : ""
  return `${code}${course.name || "Disciplina sem nome"}`
}

function classroomLabel(classroom?: Classroom): string {
  if (!classroom) return "—"
  const year = classroom.academic_year ? ` · ${classroom.academic_year}` : ""
  return `${classroom.name || "Turma sem nome"}${year}`
}

function matchScheduleItems(
  enrollment: Enrollment,
  classroom: Classroom | undefined,
  scheduleItems: ScheduleItem[]
): ScheduleItem[] {
  return scheduleItems.filter((item) => {
    if (item.classroom && enrollment.classroom) return item.classroom === enrollment.classroom
    if (item.course && classroom?.course) return item.course === classroom.course
    return false
  })
}

export default function EducationStudentPage() {
  const { user } = useAuth()
  const { tr } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [scheduleProgress, setScheduleProgress] = useState<ScheduleProgress[]>([])

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        if (!user?.id) {
          if (mounted) setLoading(false)
          return
        }

        const studentRes = await apiFetch<any>(`/education/student/?user=${user.id}`, {
          clientCache: safeRefreshToken === 0,
        })
        const studentList = normalizeList<StudentProfile>(studentRes)
        const currentStudent: StudentProfile | null = studentList[0] ?? null

        if (!mounted) return
        setStudent(currentStudent)

        if (!currentStudent?.id) {
          setEnrollments([])
          setCourses([])
          setClassrooms([])
          setGrades([])
          setAttendanceRecords([])
          setScheduleItems([])
          setScheduleProgress([])
          return
        }

        const enrollmentRes = await apiFetch<any>(`/education/enrollment/?student=${currentStudent.id}`, {
          clientCache: safeRefreshToken === 0,
        })
        const enrollmentList = normalizeList<Enrollment>(enrollmentRes)

        if (!mounted) return
        setEnrollments(enrollmentList)

        const enrollmentIds = enrollmentList.map((item) => item.id).filter(Boolean)

        const [classroomList, courseList, scheduleList, gradeItems, attendanceItems, progressItems] =
          await Promise.all([
            apiFetchAll<Classroom>("/education/classroom/", { pageSize: 100, maxPages: 10 }),
            apiFetchAll<Course>("/education/course/", { pageSize: 100, maxPages: 10 }),
            apiFetchAll<ScheduleItem>("/education/discipline_schedule/", { pageSize: 100, maxPages: 20 }),
            fetchAllForEnrollments<Grade>("/education/grade/", enrollmentIds),
            fetchAllForEnrollments<AttendanceRecord>("/education/attendance/", enrollmentIds),
            fetchAllForEnrollments<ScheduleProgress>("/education/schedule_progress/", enrollmentIds),
          ])

        if (!mounted) return
        setClassrooms(classroomList)
        setCourses(courseList)
        setScheduleItems(scheduleList)
        setGrades(gradeItems)
        setAttendanceRecords(attendanceItems)
        setScheduleProgress(progressItems)
      } catch (e: any) {
        if (!mounted) return
        setError(isNotFoundLikeError(e) ? null : e?.message || "Falha ao carregar área do estudante.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken, user?.id])

  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses])
  const classroomById = useMemo(
    () => new Map(classrooms.map((classroom) => [classroom.id, classroom])),
    [classrooms]
  )
  const enrollmentById = useMemo(
    () => new Map(enrollments.map((enrollment) => [enrollment.id, enrollment])),
    [enrollments]
  )

  const disciplineRows = useMemo<DisciplineRow[]>(() => {
    return enrollments.map((enrollment) => {
      const classroom = enrollment.classroom ? classroomById.get(enrollment.classroom) : undefined
      const course = classroom?.course ? courseById.get(classroom.course) : undefined
      const enrollmentGrades = grades.filter((grade) => grade.enrollment === enrollment.id)
      const enrollmentAttendance = attendanceRecords.filter((record) => record.enrollment === enrollment.id)
      const enrollmentProgress = scheduleProgress.filter((item) => item.enrollment === enrollment.id)
      const enrollmentSchedule = matchScheduleItems(enrollment, classroom, scheduleItems)

      return {
        discipline: courseLabel(course),
        classroom: classroomLabel(classroom),
        status: statusLabel(enrollment.status),
        enrollmentDate: formatDate(enrollment.enrolled_on),
        gradeAverage: formatPercent(gradePercentage(enrollmentGrades)),
        attendanceRate: formatPercent(attendancePercentage(enrollmentAttendance)),
        progressRate: formatPercent(progressPercentage(enrollmentProgress, enrollmentSchedule)),
      }
    })
  }, [attendanceRecords, classroomById, courseById, enrollments, grades, scheduleItems, scheduleProgress])

  const gradeRows = useMemo<GradeRow[]>(() => {
    return grades.map((grade) => {
      const enrollment = grade.enrollment ? enrollmentById.get(grade.enrollment) : undefined
      const classroom = enrollment?.classroom ? classroomById.get(enrollment.classroom) : undefined
      const course = classroom?.course ? courseById.get(classroom.course) : undefined

      return {
        discipline: courseLabel(course),
        component: grade.component || "—",
        score: formatScore(grade),
        published: formatDateTime(grade.published_at),
      }
    })
  }, [classroomById, courseById, enrollmentById, grades])

  const scheduleRows = useMemo<ScheduleRow[]>(() => {
    return scheduleItems
      .map((item) => {
        const progress = scheduleProgress.find((progressItem) => progressItem.schedule_item === item.id)
        const enrollment = progress?.enrollment ? enrollmentById.get(progress.enrollment) : undefined
        const classroom =
          (item.classroom ? classroomById.get(item.classroom) : undefined) ||
          (enrollment?.classroom ? classroomById.get(enrollment.classroom) : undefined)
        const course =
          (item.course ? courseById.get(item.course) : undefined) ||
          (classroom?.course ? courseById.get(classroom.course) : undefined)

        return {
          discipline: courseLabel(course),
          title: item.title || "Atividade sem título",
          type: statusLabel(item.item_type),
          date: formatDate(item.scheduled_date),
          itemStatus: statusLabel(item.status),
          progressStatus: progress ? statusLabel(progress.status) : "Sem registo",
        }
      })
      .filter((row) => row.discipline !== "Disciplina não identificada")
  }, [classroomById, courseById, enrollmentById, scheduleItems, scheduleProgress])

  const attendanceRows = useMemo<AttendanceRow[]>(() => {
    return attendanceRecords
      .slice()
      .sort((a, b) => String(b.attendance_date || "").localeCompare(String(a.attendance_date || "")))
      .map((record) => {
        const enrollment = record.enrollment ? enrollmentById.get(record.enrollment) : undefined
        const classroom = enrollment?.classroom ? classroomById.get(enrollment.classroom) : undefined
        const course = classroom?.course ? courseById.get(classroom.course) : undefined

        return {
          discipline: courseLabel(course),
          date: formatDate(record.attendance_date),
          status: statusLabel(record.status),
          notes: record.notes || "—",
        }
      })
  }, [attendanceRecords, classroomById, courseById, enrollmentById])

  const overallGrade = useMemo(() => gradePercentage(grades), [grades])
  const overallAttendance = useMemo(() => attendancePercentage(attendanceRecords), [attendanceRecords])
  const overallProgress = useMemo(
    () => progressPercentage(scheduleProgress, scheduleItems),
    [scheduleItems, scheduleProgress]
  )
  const activeEnrollments = useMemo(
    () => enrollments.filter((enrollment) => enrollment.status === "ACTIVE").length,
    [enrollments]
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.STUDENT]}>
      <div className="space-y-6">
        <PageHeader
          title="Área do Estudante"
          subtitle="Contexto académico do utilizador autenticado."
          actions={
            <Link
              href="/education"
              className="inline-flex items-center rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted"
            >
              Voltar à Educação
            </Link>
          }
        />

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card title="Perfil">
            <div className="space-y-1 text-sm text-foreground-2">
              <p>
                <strong>Código:</strong> {loading ? "..." : student?.student_code || "Não vinculado"}
              </p>
              <p>
                <strong>Estado:</strong> {loading ? "..." : student?.status ? tr(statusLabel(student.status)) : "—"}
              </p>
            </div>
          </Card>

          <Card title="Disciplinas">
            <div className="text-2xl font-semibold text-foreground">
              {loading ? "..." : activeEnrollments || enrollments.length}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Matrículas em curso</p>
          </Card>

          <Card title="Média geral">
            <div className="text-2xl font-semibold text-foreground">
              {loading ? "..." : formatPercent(overallGrade)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Notas publicadas</p>
          </Card>

          <Card title="Presença">
            <div className="text-2xl font-semibold text-foreground">
              {loading ? "..." : formatPercent(overallAttendance)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Registos de frequência</p>
          </Card>

          <Card title="Progresso">
            <div className="text-2xl font-semibold text-foreground">
              {loading ? "..." : formatPercent(overallProgress)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Cronograma académico</p>
          </Card>
        </div>

        <Card title="Disciplinas em curso">
          <DataTable
            columns={[
              { header: "Disciplina", accessor: "discipline" },
              { header: "Turma", accessor: "classroom" },
              { header: "Estado", accessor: "status" },
              { header: "Matrícula", accessor: "enrollmentDate" },
              { header: "Média", accessor: "gradeAverage" },
              { header: "Presença", accessor: "attendanceRate" },
              { header: "Progresso", accessor: "progressRate" },
            ]}
            data={disciplineRows}
            emptyMessage={loading ? "Carregando..." : "Sem disciplinas associadas ao estudante."}
            searchKeys={["discipline", "classroom", "status"]}
          />
        </Card>

        <Card title="Progresso estudantil">
          <DataTable
            columns={[
              { header: "Disciplina", accessor: "discipline" },
              { header: "Atividade", accessor: "title" },
              { header: "Tipo", accessor: "type" },
              { header: "Data", accessor: "date" },
              { header: "Estado", accessor: "itemStatus" },
              { header: "Progresso do estudante", accessor: "progressStatus" },
            ]}
            data={scheduleRows}
            emptyMessage={loading ? "Carregando..." : "Sem cronograma académico disponível."}
            searchKeys={["discipline", "title", "type", "itemStatus", "progressStatus"]}
          />
        </Card>

        <Card title="Resultados">
          <DataTable
            columns={[
              { header: "Disciplina", accessor: "discipline" },
              { header: "Componente", accessor: "component" },
              { header: "Nota", accessor: "score" },
              { header: "Publicação", accessor: "published" },
            ]}
            data={gradeRows}
            emptyMessage={loading ? "Carregando..." : "Sem notas disponíveis."}
            searchKeys={["discipline", "component"]}
          />
        </Card>

        <Card title="Presenças e assiduidade">
          <DataTable
            columns={[
              { header: "Disciplina", accessor: "discipline" },
              { header: "Data", accessor: "date" },
              { header: "Estado", accessor: "status" },
              { header: "Observações", accessor: "notes" },
            ]}
            data={attendanceRows}
            emptyMessage={loading ? "Carregando..." : "Sem registos de presença disponíveis."}
            searchKeys={["discipline", "status", "notes"]}
          />
        </Card>
      </div>
    </AppLayout>
  )
}
