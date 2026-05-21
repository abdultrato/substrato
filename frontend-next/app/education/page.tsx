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
  UserCheck,
  Users,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import WorkspaceHub from "@/components/workspace/WorkspaceHub"
import { apiFetch, extractTotalCount } from "@/lib/api"
import { EDUCATION_REQUIRED_GROUPS, EDUCATION_RESOURCE_DESCRIPTORS } from "@/lib/education/resources"
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
      content: FileStack,
    }),
    []
  )
  const resourceActions = useMemo(
    () =>
      EDUCATION_RESOURCE_DESCRIPTORS.map((resource) => ({
        title: t(resource.labelPt, resource.labelEn),
        description: t(resource.descriptionPt, resource.descriptionEn),
        href: `/education/resources/${resource.key}`,
        icon: iconByResourceKey[resource.key as keyof typeof iconByResourceKey] || CalendarCheck,
      })),
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
          title="Substrato Education"
          subtitle={t(
            "Domínio académico no mesmo design operacional do healthcare.",
            "Academic domain within the same operational design as healthcare."
          )}
          adminHref="/admin/education/"
          secondaryCta={{ href: "/education/resources", label: t("CRUD Education", "Education CRUD") }}
          metrics={[
            { label: "Students", value: metricValue || students },
            { label: "Teachers", value: metricValue || teachers },
            { label: "Courses", value: metricValue || courses },
            { label: "Enrollments", value: metricValue || enrollments },
          ]}
          actions={resourceActions}
          noteTitle={t("Governança da migração", "Migration governance")}
          notes={[
            t(
              "Identidade e autenticação permanecem centralizadas no Substrato.",
              "Identity and authentication remain centralized in Substrato."
            ),
            t(
              "Todas as telas de Education para frontend estão disponíveis em /education/resources.",
              "All Education frontend screens are available under /education/resources."
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
