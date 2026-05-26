"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch, apiFetchAll } from "@/lib/api"
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
  teacher_code?: string
  status?: string
  specialty?: string
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

type Assignment = {
  id: number
  course?: number
  classroom?: number | null
  title?: string
  due_at?: string
  status?: string
  work_category?: string
}

type AssignmentSubmission = {
  id: number
  assignment?: number
  student?: number
  status?: string
  score?: string | number | null
  submitted_at?: string
  graded_at?: string | null
}

type ScheduleItem = {
  id: number
  course?: number
  classroom?: number
  item_type?: string
  title?: string
  description?: string
  scheduled_date?: string
  requires_attendance?: boolean
  status?: string
  completed_at?: string | null
  notes?: string
}

type ScheduleProgress = {
  id: number
  schedule_item?: number
  enrollment?: number
  status?: string
  completion_marked?: boolean
  completed_at?: string | null
  attendance_status_snapshot?: string
  notes?: string
}

type RollCallStatus = "PRESENT" | "LATE" | "ABSENT"

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

function toDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function defaultDateInputValue() {
  return toDateInputValue(new Date())
}

function parseCsvDates(raw: string): string[] {
  return Array.from(
    new Set(
      String(raw || "")
        .split(",")
        .map((value) => value.trim())
        .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    )
  )
}

function parseThemes(raw: string): Array<{ title: string; scheduled_date: string; description: string }> {
  return String(raw || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [date, title, description] = line.split("|").map((value) => value.trim())
      if (!date || !title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
      return { scheduled_date: date, title, description: description || "" }
    })
    .filter(Boolean) as Array<{ title: string; scheduled_date: string; description: string }>
}

function normalizeText(value?: string | number | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

export default function EducationTeacherAreaPage() {
  const { user } = useAuth()
  const isDirectorScope = useMemo(() => userHasAnyGroup(user, DIRECTOR_GROUPS), [user])

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
  const [studentSearch, setStudentSearch] = useState("")
  const [schedulingClassroom, setSchedulingClassroom] = useState(false)
  const [schedulingStudent, setSchedulingStudent] = useState(false)
  const [randomTestMessage, setRandomTestMessage] = useState<string | null>(null)
  const [randomTestError, setRandomTestError] = useState<string | null>(null)

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [scheduleProgress, setScheduleProgress] = useState<ScheduleProgress[]>([])
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [markingScheduleItemId, setMarkingScheduleItemId] = useState<number | null>(null)

  const [testDatesInput, setTestDatesInput] = useState("")
  const [assignmentDatesInput, setAssignmentDatesInput] = useState("")
  const [exerciseDatesInput, setExerciseDatesInput] = useState("")
  const [themesInput, setThemesInput] = useState("")
  const [schedulePlanNotes, setSchedulePlanNotes] = useState("")

  const [rollCallDateInput, setRollCallDateInput] = useState(defaultDateInputValue())
  const [rollCallByStudent, setRollCallByStudent] = useState<Record<number, RollCallStatus>>({})
  const [rollCallSaving, setRollCallSaving] = useState(false)
  const [rollCallMessage, setRollCallMessage] = useState<string | null>(null)
  const [rollCallError, setRollCallError] = useState<string | null>(null)

  const [directorLoading, setDirectorLoading] = useState(false)
  const [directorError, setDirectorError] = useState<string | null>(null)
  const [directorTeacherSearch, setDirectorTeacherSearch] = useState("")
  const [directorStudentSearch, setDirectorStudentSearch] = useState("")
  const [directorTeachers, setDirectorTeachers] = useState<TeacherProfile[]>([])
  const [directorStudents, setDirectorStudents] = useState<StudentProfile[]>([])
  const [directorEnrollments, setDirectorEnrollments] = useState<Enrollment[]>([])
  const [directorAssignments, setDirectorAssignments] = useState<Assignment[]>([])
  const [directorSubmissions, setDirectorSubmissions] = useState<AssignmentSubmission[]>([])

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

    async function loadDirectorScope() {
      if (!isDirectorScope) {
        setDirectorTeachers([])
        setDirectorStudents([])
        setDirectorEnrollments([])
        setDirectorAssignments([])
        setDirectorSubmissions([])
        setDirectorError(null)
        return
      }

      try {
        setDirectorLoading(true)
        setDirectorError(null)

        const [teachers, students, enrollmentsAll, assignmentsAll, submissionsAll] = await Promise.all([
          apiFetchAll<TeacherProfile>("/education/teacher/", { pageSize: 100 }),
          apiFetchAll<StudentProfile>("/education/student/", { pageSize: 100 }),
          apiFetchAll<Enrollment>("/education/enrollment/", { pageSize: 100 }),
          apiFetchAll<Assignment>("/education/assignment/", { pageSize: 100 }),
          apiFetchAll<AssignmentSubmission>("/education/submission/", { pageSize: 100 }),
        ])

        if (!mounted) return
        setDirectorTeachers(teachers)
        setDirectorStudents(students)
        setDirectorEnrollments(enrollmentsAll)
        setDirectorAssignments(assignmentsAll)
        setDirectorSubmissions(submissionsAll)
      } catch (e: any) {
        if (!mounted) return
        setDirectorError(
          isNotFoundLikeError(e)
            ? null
            : (e?.message || "Falha ao carregar a secção de directoria.")
        )
      } finally {
        if (mounted) setDirectorLoading(false)
      }
    }

    loadDirectorScope().catch(() => undefined)
    return () => {
      mounted = false
    }
  }, [isDirectorScope])

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
    const isClassDirector =
      !!selectedClassroom?.homeroom_teacher &&
      !!teacherProfileId &&
      selectedClassroom.homeroom_teacher === teacherProfileId
    return isDirectorScope || isClassDirector
  }, [isDirectorScope, selectedClassroom?.homeroom_teacher, teacherProfileId])

  const refreshScheduleContext = useCallback(async (classroomId: number | null, enrollmentId: number | null) => {
    if (!classroomId) {
      setScheduleItems([])
      setScheduleProgress([])
      return
    }
    try {
      const scheduleRes = await apiFetch<any>(`/education/discipline_schedule/?classroom=${classroomId}`)
      const items = toList<ScheduleItem>(scheduleRes)
      setScheduleItems(items)
      if (enrollmentId) {
        const progressRes = await apiFetch<any>(`/education/schedule_progress/?enrollment=${enrollmentId}`)
        setScheduleProgress(toList<ScheduleProgress>(progressRes))
      } else {
        setScheduleProgress([])
      }
    } catch (e: any) {
      setScheduleItems([])
      setScheduleProgress([])
      setScheduleError(
        isNotFoundLikeError(e)
          ? null
          : (e?.message || "Falha ao carregar cronograma da disciplina.")
      )
    }
  }, [])

  useEffect(() => {
    refreshScheduleContext(selectedClassroomId, selectedEnrollment?.id ?? null).catch(() => undefined)
  }, [refreshScheduleContext, selectedClassroomId, selectedEnrollment?.id])

  useEffect(() => {
    setRollCallByStudent((current) => {
      const next: Record<number, RollCallStatus> = {}
      enrollments.forEach((enrollment) => {
        if (!enrollment.student) return
        next[enrollment.student] = current[enrollment.student] || "PRESENT"
      })
      return next
    })
  }, [enrollments])

  useEffect(() => {
    let mounted = true

    async function loadExistingRollCall() {
      if (!selectedClassroomId || !rollCallDateInput || !enrollments.length) return
      try {
        const attendanceRes = await apiFetch<any>(`/education/attendance/?attendance_date=${rollCallDateInput}`)
        if (!mounted) return
        const enrollmentById = new Map(enrollments.map((item) => [item.id, item]))
        const byStudent: Record<number, RollCallStatus> = {}
        enrollments.forEach((enrollment) => {
          if (!enrollment.student) return
          byStudent[enrollment.student] = "PRESENT"
        })

        toList<any>(attendanceRes).forEach((record) => {
          const enrollment = enrollmentById.get(record?.enrollment)
          const studentId = enrollment?.student
          if (!studentId) return
          if (record?.status === "ABSENT") {
            byStudent[studentId] = "ABSENT"
          } else if (record?.status === "LATE") {
            byStudent[studentId] = "LATE"
          } else {
            byStudent[studentId] = "PRESENT"
          }
        })
        setRollCallByStudent(byStudent)
      } catch {
        // Keep local defaults when attendance records are unavailable.
      }
    }

    loadExistingRollCall().catch(() => undefined)
    return () => {
      mounted = false
    }
  }, [selectedClassroomId, rollCallDateInput, enrollments])

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

  async function handleCreateFullPlan() {
    if (!selectedClassroomId) {
      setScheduleError("Selecione uma turma para criar o cronograma.")
      return
    }
    const selectedClassroomRecord = classrooms.find((item) => item.id === selectedClassroomId)
    if (!selectedClassroomRecord?.course) {
      setScheduleError("A turma selecionada não tem curso associado.")
      return
    }

    const testDates = parseCsvDates(testDatesInput)
    const assignmentDates = parseCsvDates(assignmentDatesInput)
    const exerciseDates = parseCsvDates(exerciseDatesInput)
    const themes = parseThemes(themesInput)

    if (!testDates.length && !assignmentDates.length && !exerciseDates.length && !themes.length) {
      setScheduleError("Informe pelo menos uma data de teste/trabalho/exercício ou temas programados.")
      return
    }

    try {
      setSavingSchedule(true)
      setScheduleError(null)
      setScheduleMessage(null)

      const response = await apiFetch<any>("/education/discipline_schedule/create_full_plan/", {
        method: "POST",
        body: JSON.stringify({
          classroom: selectedClassroomId,
          course: selectedClassroomRecord.course,
          test_dates: testDates,
          assignment_dates: assignmentDates,
          exercise_dates: exerciseDates,
          themes,
          notes: schedulePlanNotes || "",
        }),
      })

      const created = Number(response?.count || 0)
      setScheduleMessage(
        created > 0
          ? `${created} item(ns) de cronograma criado(s) com sucesso.`
          : "Cronograma processado sem novos itens."
      )

      await refreshScheduleContext(selectedClassroomId, selectedEnrollment?.id ?? null)
    } catch (e: any) {
      setScheduleError(e?.message || "Falha ao criar cronograma completo da disciplina.")
    } finally {
      setSavingSchedule(false)
    }
  }

  async function handleMarkScheduleCompleted(itemId: number) {
    try {
      setMarkingScheduleItemId(itemId)
      setScheduleError(null)
      setScheduleMessage(null)
      await apiFetch(`/education/discipline_schedule/${itemId}/mark_completed/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      setScheduleMessage("Item do cronograma marcado como concluído.")
      await refreshScheduleContext(selectedClassroomId, selectedEnrollment?.id ?? null)
    } catch (e: any) {
      setScheduleError(e?.message || "Falha ao marcar item como concluído.")
    } finally {
      setMarkingScheduleItemId(null)
    }
  }

  async function handleMarkStudentProgressSuccess(progressId: number) {
    try {
      setScheduleError(null)
      setScheduleMessage(null)
      await apiFetch(`/education/schedule_progress/${progressId}/mark_success/`, {
        method: "POST",
        body: JSON.stringify({}),
      })
      setScheduleMessage("Progresso do estudante marcado como sucesso.")
      await refreshScheduleContext(selectedClassroomId, selectedEnrollment?.id ?? null)
    } catch (e: any) {
      setScheduleError(e?.message || "Falha ao marcar progresso do estudante como sucesso.")
    }
  }

  async function handleSubmitRollCall() {
    if (!selectedClassroomId) {
      setRollCallError("Selecione uma turma para efetuar a chamada.")
      return
    }
    if (!rollCallDateInput) {
      setRollCallError("Informe a data da chamada.")
      return
    }

    const presentStudentIds = enrollments
      .map((item) => item.student)
      .filter((studentId): studentId is number => Boolean(studentId) && rollCallByStudent[studentId] === "PRESENT")
    const lateStudentIds = enrollments
      .map((item) => item.student)
      .filter((studentId): studentId is number => Boolean(studentId) && rollCallByStudent[studentId] === "LATE")

    try {
      setRollCallSaving(true)
      setRollCallError(null)
      setRollCallMessage(null)

      const response = await apiFetch<any>("/education/attendance/roll_call/", {
        method: "POST",
        body: JSON.stringify({
          classroom: selectedClassroomId,
          attendance_date: rollCallDateInput,
          present_student_ids: presentStudentIds,
          late_student_ids: lateStudentIds,
          notes: "Chamada registada na área do professor.",
        }),
      })

      const count = Number(response?.count || 0)
      setRollCallMessage(
        count > 0
          ? `Chamada registada para ${count} matrícula(s).`
          : "Chamada processada sem registos novos."
      )

      await refreshScheduleContext(selectedClassroomId, selectedEnrollment?.id ?? null)
    } catch (e: any) {
      setRollCallError(e?.message || "Falha ao registar chamada.")
    } finally {
      setRollCallSaving(false)
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

  const scheduleRows = useMemo(() => {
    return scheduleItems.map((item) => ({
      id: item.id,
      title: item.title || "—",
      type: item.item_type || "—",
      date: item.scheduled_date || "—",
      status: item.status || "—",
      attendance: item.requires_attendance ? "Sim" : "Não",
      completed: parseDate(item.completed_at),
    }))
  }, [scheduleItems])

  const scheduleProgressRows = useMemo(() => {
    if (!selectedEnrollment) return []
    return scheduleProgress
      .filter((progress) => progress.enrollment === selectedEnrollment.id)
      .map((progress) => {
        const scheduleItem = scheduleItems.find((item) => item.id === progress.schedule_item)
        return {
          id: progress.id,
          item: scheduleItem?.title || `Item #${progress.schedule_item ?? "—"}`,
          date: scheduleItem?.scheduled_date || "—",
          status: progress.status || "—",
          attendance: progress.attendance_status_snapshot || "—",
          completed: progress.completion_marked ? "Sim" : "Não",
        }
      })
  }, [scheduleItems, scheduleProgress, selectedEnrollment])

  const filteredEnrollments = useMemo(() => {
    const query = normalizeText(studentSearch)
    if (!query) return enrollments
    return enrollments.filter((enrollment) => {
      const student = enrollment.student ? studentsById.get(enrollment.student) : null
      const haystack = normalizeText(
        [
          student?.student_code,
          student?.guardian_name,
          student?.status,
          enrollment.status,
          enrollment.id,
          enrollment.student,
        ]
          .filter(Boolean)
          .join(" ")
      )
      return haystack.includes(query)
    })
  }, [enrollments, studentSearch, studentsById])

  const filteredDirectorTeachers = useMemo(() => {
    const query = normalizeText(directorTeacherSearch)
    if (!query) return directorTeachers
    return directorTeachers.filter((teacher) => {
      const haystack = normalizeText(
        [teacher.id, teacher.teacher_code, teacher.specialty, teacher.status, teacher.user].filter(Boolean).join(" ")
      )
      return haystack.includes(query)
    })
  }, [directorTeacherSearch, directorTeachers])

  const assignmentById = useMemo(() => {
    return new Map(directorAssignments.map((assignment) => [assignment.id, assignment]))
  }, [directorAssignments])

  const enrollmentsByStudentId = useMemo(() => {
    const map = new Map<number, Enrollment[]>()
    directorEnrollments.forEach((enrollment) => {
      if (!enrollment.student) return
      const current = map.get(enrollment.student) || []
      current.push(enrollment)
      map.set(enrollment.student, current)
    })
    return map
  }, [directorEnrollments])

  const workCountsByStudentId = useMemo(() => {
    const map = new Map<number, { mandatoryDone: number; hygienicDone: number }>()
    directorSubmissions.forEach((submission) => {
      const studentId = submission.student
      if (!studentId) return
      const assignment = submission.assignment ? assignmentById.get(submission.assignment) : null
      if (!assignment) return
      const current = map.get(studentId) || { mandatoryDone: 0, hygienicDone: 0 }
      if (assignment.work_category === "MANDATORY") current.mandatoryDone += 1
      if (assignment.work_category === "HYGIENIC") current.hygienicDone += 1
      map.set(studentId, current)
    })
    return map
  }, [assignmentById, directorSubmissions])

  const filteredDirectorStudents = useMemo(() => {
    const query = normalizeText(directorStudentSearch)
    const base = query
      ? directorStudents.filter((student) => {
          const haystack = normalizeText(
            [student.id, student.student_code, student.guardian_name, student.status, student.notes].filter(Boolean).join(" ")
          )
          return haystack.includes(query)
        })
      : directorStudents

    return base.map((student) => {
      const enrollmentsForStudent = enrollmentsByStudentId.get(student.id) || []
      const workCounts = workCountsByStudentId.get(student.id) || { mandatoryDone: 0, hygienicDone: 0 }

      return {
        id: student.id,
        code: student.student_code || `Estudante #${student.id}`,
        status: student.status || "—",
        guardian: student.guardian_name || "—",
        enrollments: enrollmentsForStudent.length,
        activeEnrollments: enrollmentsForStudent.filter((item) => item.status === "ACTIVE").length,
        mandatoryDone: workCounts.mandatoryDone,
        hygienicDone: workCounts.hygienicDone,
      }
    })
  }, [directorStudentSearch, directorStudents, enrollmentsByStudentId, workCountsByStudentId])

  const directorTeacherRows = useMemo(() => {
    return filteredDirectorTeachers.map((teacher) => ({
      code: teacher.teacher_code || `Professor #${teacher.id}`,
      status: teacher.status || "—",
      specialty: teacher.specialty || "—",
      user: teacher.user ? `#${teacher.user}` : "—",
    }))
  }, [filteredDirectorTeachers])

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
              Voltar à Educação
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
              <input
                type="text"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Buscar estudante/aluno/encarregado..."
                className="w-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
              />
              {filteredEnrollments.length ? (
                filteredEnrollments.map((enrollment) => {
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
                      <div className="text-[0.9em] text-[var(--gray-500)]">
                        Matrícula: {enrollment.status || "—"} • Encarregado: {student?.guardian_name || "—"}
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="text-xs text-[var(--gray-500)]">
                  {loadingDetail || loading ? "Carregando..." : "Sem estudantes para o filtro atual."}
                </div>
              )}
            </div>
          </Card>

          <Card title="Resumo">
            <div className="space-y-1 text-xs text-[var(--gray-700)]">
              <div><strong>Turmas:</strong> {loading ? "..." : classrooms.length}</div>
              <div><strong>Estudantes na turma:</strong> {loading || loadingDetail ? "..." : enrollments.length}</div>
              <div><strong>Estudantes no filtro:</strong> {loading || loadingDetail ? "..." : filteredEnrollments.length}</div>
              <div><strong>Notas visíveis:</strong> {loading || loadingDetail ? "..." : grades.length}</div>
              <div className="text-[0.9em] text-[var(--gray-500)]">
                {canViewAllGrades
                  ? "Visão de notas completa (directoria de turma/directoria)."
                  : "Visão restrita às notas da disciplina do professor logado."}
              </div>
            </div>
          </Card>
        </div>

        {isDirectorScope ? (
          <Card title="Secção de Directoria">
            <div className="space-y-3">
              {directorError ? (
                <div className="border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">{directorError}</div>
              ) : null}

              <div className="grid gap-2 md:grid-cols-4">
                <div className="border border-[var(--border)] bg-[var(--card)] p-2 text-xs text-[var(--gray-700)]">
                  <div><strong>Professores:</strong> {directorLoading ? "..." : directorTeachers.length}</div>
                  <div className="text-[0.9em] text-[var(--gray-500)]">
                    Ativos: {directorLoading ? "..." : directorTeachers.filter((item) => item.status === "ACTIVE").length}
                  </div>
                </div>
                <div className="border border-[var(--border)] bg-[var(--card)] p-2 text-xs text-[var(--gray-700)]">
                  <div><strong>Estudantes:</strong> {directorLoading ? "..." : directorStudents.length}</div>
                  <div className="text-[0.9em] text-[var(--gray-500)]">
                    Matrículas: {directorLoading ? "..." : directorEnrollments.length}
                  </div>
                </div>
                <div className="border border-[var(--border)] bg-[var(--card)] p-2 text-xs text-[var(--gray-700)]">
                  <div><strong>Trabalhos obrigatórios:</strong> {directorLoading ? "..." : directorAssignments.filter((item) => item.work_category === "MANDATORY").length}</div>
                </div>
                <div className="border border-[var(--border)] bg-[var(--card)] p-2 text-xs text-[var(--gray-700)]">
                  <div><strong>Trabalhos higiénicos:</strong> {directorLoading ? "..." : directorAssignments.filter((item) => item.work_category === "HYGIENIC").length}</div>
                </div>
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[var(--text)]">Professores activos e inactivos (histórico)</div>
                  <input
                    type="text"
                    value={directorTeacherSearch}
                    onChange={(event) => setDirectorTeacherSearch(event.target.value)}
                    placeholder="Buscar professor por código, estado, especialidade..."
                    className="w-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
                  />
                  <DataTable
                    columns={[
                      { header: "Código", accessor: "code" },
                      { header: "Estado", accessor: "status" },
                      { header: "Especialidade", accessor: "specialty" },
                      { header: "Utilizador", accessor: "user" },
                    ]}
                    data={directorTeacherRows}
                    emptyMessage={directorLoading ? "Carregando..." : "Sem professores para o filtro atual."}
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[var(--text)]">Estudantes e percurso escolar completo</div>
                  <input
                    type="text"
                    value={directorStudentSearch}
                    onChange={(event) => setDirectorStudentSearch(event.target.value)}
                    placeholder="Buscar estudante por código, encarregado, estado..."
                    className="w-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
                  />
                  <DataTable
                    columns={[
                      { header: "Estudante", accessor: "code" },
                      { header: "Estado", accessor: "status" },
                      { header: "Encarregado", accessor: "guardian" },
                      { header: "Matrículas", accessor: "enrollments" },
                      { header: "Activas", accessor: "activeEnrollments" },
                      { header: "Obrigatórios feitos", accessor: "mandatoryDone" },
                      { header: "Higiénicos feitos", accessor: "hygienicDone" },
                    ]}
                    data={filteredDirectorStudents}
                    emptyMessage={directorLoading ? "Carregando..." : "Sem estudantes para o filtro atual."}
                  />
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        <Card title="Cronograma completo da disciplina">
          <div className="space-y-3">
            {scheduleError ? (
              <div className="border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">{scheduleError}</div>
            ) : null}
            {scheduleMessage ? (
              <div className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800">{scheduleMessage}</div>
            ) : null}

            <div className="grid gap-2 md:grid-cols-2">
              <label className="space-y-1 text-xs text-[var(--gray-700)]">
                <span>Datas de testes (YYYY-MM-DD, separadas por vírgula)</span>
                <input
                  type="text"
                  value={testDatesInput}
                  onChange={(event) => setTestDatesInput(event.target.value)}
                  placeholder="2026-06-10, 2026-07-05"
                  className="w-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
                />
              </label>
              <label className="space-y-1 text-xs text-[var(--gray-700)]">
                <span>Datas de trabalhos (YYYY-MM-DD, separadas por vírgula)</span>
                <input
                  type="text"
                  value={assignmentDatesInput}
                  onChange={(event) => setAssignmentDatesInput(event.target.value)}
                  placeholder="2026-06-15, 2026-07-20"
                  className="w-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
                />
              </label>
              <label className="space-y-1 text-xs text-[var(--gray-700)]">
                <span>Datas de resolução de exercícios (YYYY-MM-DD, separadas por vírgula)</span>
                <input
                  type="text"
                  value={exerciseDatesInput}
                  onChange={(event) => setExerciseDatesInput(event.target.value)}
                  placeholder="2026-06-12, 2026-06-26"
                  className="w-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
                />
              </label>
              <label className="space-y-1 text-xs text-[var(--gray-700)]">
                <span>Observações do plano</span>
                <input
                  type="text"
                  value={schedulePlanNotes}
                  onChange={(event) => setSchedulePlanNotes(event.target.value)}
                  placeholder="Ex.: Plano trimestral oficial."
                  className="w-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
                />
              </label>
            </div>

            <label className="space-y-1 text-xs text-[var(--gray-700)]">
              <span>Temas (uma linha por tema no formato: data|título|descrição)</span>
              <textarea
                value={themesInput}
                onChange={(event) => setThemesInput(event.target.value)}
                className="min-h-[88px] w-full border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
                placeholder={"2026-06-03|Tema 1|Introdução\n2026-06-10|Tema 2|Equações lineares"}
              />
            </label>

            <button
              type="button"
              onClick={handleCreateFullPlan}
              disabled={savingSchedule || !selectedClassroomId}
              className="border border-[var(--border)] bg-[var(--primary-600)] px-2 py-1 text-xs text-white transition hover:bg-[var(--primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSchedule ? "A criar cronograma..." : "Criar cronograma completo"}
            </button>

            <DataTable
              columns={[
                { header: "ID", accessor: "id" },
                { header: "Título", accessor: "title" },
                { header: "Tipo", accessor: "type" },
                { header: "Data", accessor: "date" },
                { header: "Estado", accessor: "status" },
                { header: "Requer presença", accessor: "attendance" },
                { header: "Concluído em", accessor: "completed" },
              ]}
              data={scheduleRows}
              emptyMessage="Sem itens de cronograma para a turma selecionada."
            />

            {!!scheduleRows.length ? (
              <div className="flex flex-wrap gap-1">
                {scheduleRows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => handleMarkScheduleCompleted(row.id)}
                    disabled={markingScheduleItemId === row.id}
                    className="border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--gray-700)] transition hover:bg-[var(--gray-100)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {markingScheduleItemId === row.id ? "A concluir..." : `Concluir #${row.id}`}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </Card>

        <Card title="Chamada e matéria em atraso por ausência">
          <div className="space-y-3">
            {rollCallError ? (
              <div className="border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">{rollCallError}</div>
            ) : null}
            {rollCallMessage ? (
              <div className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800">{rollCallMessage}</div>
            ) : null}

            <label className="space-y-1 text-xs text-[var(--gray-700)]">
              <span>Data da aula/chamada</span>
              <input
                type="date"
                value={rollCallDateInput}
                onChange={(event) => setRollCallDateInput(event.target.value)}
                className="w-full max-w-[220px] border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
              />
            </label>

            <div className="grid gap-2 md:grid-cols-2">
              {filteredEnrollments.map((enrollment) => {
                const studentId = enrollment.student
                if (!studentId) return null
                const student = studentsById.get(studentId)
                const value = rollCallByStudent[studentId] || "PRESENT"
                return (
                  <label
                    key={`roll-${enrollment.id}`}
                    className="flex items-center justify-between border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--gray-700)]"
                  >
                    <span>{student?.student_code || `Estudante #${studentId}`}</span>
                    <select
                      value={value}
                      onChange={(event) =>
                        setRollCallByStudent((current) => ({
                          ...current,
                          [studentId]: event.target.value as RollCallStatus,
                        }))
                      }
                      className="border border-[var(--border)] bg-[var(--card)] px-1 py-0.5 text-xs text-[var(--text)]"
                    >
                      <option value="PRESENT">Presente</option>
                      <option value="LATE">Atrasado</option>
                      <option value="ABSENT">Ausente</option>
                    </select>
                  </label>
                )
              })}
            </div>

            <button
              type="button"
              onClick={handleSubmitRollCall}
              disabled={rollCallSaving || !selectedClassroomId || !enrollments.length}
              className="border border-[var(--border)] bg-[var(--primary-600)] px-2 py-1 text-xs text-white transition hover:bg-[var(--primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {rollCallSaving ? "A registar chamada..." : "Registar chamada"}
            </button>

            <DataTable
              columns={[
                { header: "Item", accessor: "item" },
                { header: "Data", accessor: "date" },
                { header: "Estado", accessor: "status" },
                { header: "Presença", accessor: "attendance" },
                { header: "Concluído", accessor: "completed" },
              ]}
              data={scheduleProgressRows}
              emptyMessage="Sem progresso de cronograma para o estudante selecionado."
            />

            {!!scheduleProgressRows.length ? (
              <div className="flex flex-wrap gap-1">
                {scheduleProgressRows.map((row) => (
                  <button
                    key={`progress-${row.id}`}
                    type="button"
                    onClick={() => handleMarkStudentProgressSuccess(row.id)}
                    className="border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
                  >
                    Marcar sucesso #{row.id}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </Card>

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
