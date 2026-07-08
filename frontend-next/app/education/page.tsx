"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  FileCheck2,
  FileStack,
  GraduationCap,
  Pencil,
  School,
  Target,
  UserCheck,
  Users,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { EDUCATION_REQUIRED_GROUPS, EDUCATION_RESOURCE_DESCRIPTORS } from "@/lib/education/resources"
import { GROUPS } from "@/lib/rbac"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useLanguage } from "@/hooks/useLanguage"

export default function EducationPage() {
  const { t } = useLanguage()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [students, setStudents] = useState(0)
  const [teachers, setTeachers] = useState(0)
  const [courses, setCourses] = useState(0)
  const [enrollments, setEnrollments] = useState(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const [studentsRes, teachersRes, coursesRes, enrollmentsRes] = await Promise.all([
          apiFetch<any>("/education/student/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/education/teacher/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/education/course/", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/education/enrollment/", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setStudents(extractTotalCount(studentsRes))
        setTeachers(extractTotalCount(teachersRes))
        setCourses(extractTotalCount(coursesRes))
        setEnrollments(extractTotalCount(enrollmentsRes))
      } catch (e: any) {
        if (!mounted) return
        setError(
          isNotFoundLikeError(e)
            ? null
            : (e?.message || t("Falha ao carregar o módulo de Educação.", "Failed to load the Education module."))
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken, t])

  const metricValue = useMemo(() => (loading ? "..." : null), [loading])
  const iconByResourceKey = useMemo(
    () => ({
      student: GraduationCap,
      teacher: Users,
      course: BookOpen,
      classroom: School,
      enrollment: ClipboardCheck,
      attendance: UserCheck,
      grade: Pencil,
      examination: FileCheck2,
      random_test: CalendarCheck,
      assignment: ClipboardCheck,
      submission: FileCheck2,
      exam_attempt: CalendarCheck,
      content: FileStack,
      bibliography: FileStack,
      thematic_map: BookOpen,
      discipline_schedule: CalendarCheck,
      schedule_progress: UserCheck,
      skill: Target,
    }),
    []
  )
  const resourceActions = useMemo(
    () => [
      {
        title: t("Área do Professor", "Teacher Area"),
        description: t(
          "Turmas lecionadas, estudantes, notas da disciplina e chamadas.",
          "Assigned classrooms, students, course grades and roll call workflows."
        ),
        href: "/education/teacher",
        icon: Users,
      },
      ...EDUCATION_RESOURCE_DESCRIPTORS.map((resource) => ({
        title: t(resource.labelPt, resource.labelEn),
        description: t(resource.descriptionPt, resource.descriptionEn),
        href: `/education/resources/${resource.key}`,
        icon: iconByResourceKey[resource.key as keyof typeof iconByResourceKey] || CalendarCheck,
      })),
    ],
    [iconByResourceKey, t]
  )

  return (
    <AppLayout requiredGroups={EDUCATION_REQUIRED_GROUPS}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Substrato Educação"
          metrics={[
            { label: "Estudantes", value: metricValue || students, href: "/education/resources/student" },
            { label: "Professores", value: metricValue || teachers, href: "/education/resources/teacher" },
            { label: "Cursos", value: metricValue || courses, href: "/education/resources/course" },
            { label: "Matrículas", value: metricValue || enrollments, href: "/education/resources/enrollment" },
          ]}
          actions={resourceActions}
        />
      </div>
    </AppLayout>
  )
}
