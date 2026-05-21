"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpen, CalendarCheck, GraduationCap, Users } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useLanguage } from "@/hooks/useLanguage"

export default function EducationPage() {
  const { t } = useLanguage()
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
          apiFetch<any>("/education/student/"),
          apiFetch<any>("/education/teacher/"),
          apiFetch<any>("/education/course/"),
          apiFetch<any>("/education/enrollment/"),
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
            : (e?.message || t("Falha ao carregar o módulo Education.", "Failed to load the Education module."))
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [t])

  const metricValue = useMemo(() => (loading ? "..." : null), [loading])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.PROFESSOR]}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <WorkspaceHub
          title="Substrato Education"
          subtitle={t(
            "Domínio académico no mesmo design operacional do healthcare.",
            "Academic domain within the same operational design as healthcare."
          )}
          adminHref="/admin/education/"
          secondaryCta={{ href: "/education/student", label: t("Área do Estudante", "Student Area") }}
          metrics={[
            { label: "Students", value: metricValue || students },
            { label: "Teachers", value: metricValue || teachers },
            { label: "Courses", value: metricValue || courses },
            { label: "Enrollments", value: metricValue || enrollments },
          ]}
          actions={[
            {
              title: "Students",
              description: t("Gestão de perfis estudantis.", "Student profile management."),
              href: "/resources/education/student",
              icon: GraduationCap,
            },
            {
              title: "Teachers",
              description: t("Gestão de docentes e turmas.", "Teacher and class management."),
              href: "/resources/education/teacher",
              icon: Users,
            },
            {
              title: "Courses",
              description: t("Catálogo curricular e carga horária.", "Curriculum catalog and workload."),
              href: "/resources/education/course",
              icon: BookOpen,
            },
            {
              title: "Enrollments",
              description: t("Matrículas e vínculo por turma.", "Enrollments and class assignment."),
              href: "/resources/education/enrollment",
              icon: CalendarCheck,
            },
          ]}
          noteTitle={t("Governança da migração", "Migration governance")}
          notes={[
            t(
              "Identidade e autenticação permanecem centralizadas no Substrato.",
              "Identity and authentication remain centralized in Substrato."
            ),
            t(
              "Regras de domínio Education vivem em apps/education e services/education.",
              "Education domain rules live in apps/education and services/education."
            ),
            t(
              "Fluxos críticos de Education já executam no domínio novo sem dependência operacional do legado.",
              "Critical Education flows now run on the new domain without operational legacy dependency."
            ),
          ]}
        />
      </div>
    </AppLayout>
  )
}
