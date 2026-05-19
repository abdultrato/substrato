"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpen, CalendarCheck, GraduationCap, Users } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { isNotFoundLikeError } from "@/lib/errors/api-error"

export default function EducationPage() {
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
        setError(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar o módulo Education."))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

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
          subtitle="Domínio académico no mesmo design operacional do healthcare."
          adminHref="/admin/education/"
          secondaryCta={{ href: "/education/student", label: "Área do Estudante" }}
          metrics={[
            { label: "Students", value: metricValue || students },
            { label: "Teachers", value: metricValue || teachers },
            { label: "Courses", value: metricValue || courses },
            { label: "Enrollments", value: metricValue || enrollments },
          ]}
          actions={[
            { title: "Students", description: "Gestão de perfis estudantis.", href: "/resources/education/student", icon: GraduationCap },
            { title: "Teachers", description: "Gestão de docentes e turmas.", href: "/resources/education/teacher", icon: Users },
            { title: "Courses", description: "Catálogo curricular e carga horária.", href: "/resources/education/course", icon: BookOpen },
            { title: "Enrollments", description: "Matrículas e vínculo por turma.", href: "/resources/education/enrollment", icon: CalendarCheck },
          ]}
          noteTitle="Governança da migração"
          notes={[
            "Identidade e autenticação permanecem centralizadas no Substrato.",
            "Regras de domínio Education vivem em apps/education e services/education.",
            "Legado Schoolar-S está isolado em apps/education/legacy_schoolar para extração gradual.",
          ]}
        />
      </div>
    </AppLayout>
  )
}
