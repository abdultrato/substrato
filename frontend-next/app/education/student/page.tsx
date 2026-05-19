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
import { GROUPS } from "@/lib/rbac"

type StudentProfile = {
  id: number
  student_code: string
  status: string
}

type Enrollment = {
  id: number
  classroom?: number
  status?: string
  enrolled_on?: string
}

type Grade = {
  id: number
  component?: string
  score?: string | number
  max_score?: string | number
  published_at?: string | null
}

export default function EducationStudentPage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [grades, setGrades] = useState<Grade[]>([])

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

        const studentRes = await apiFetch<any>(`/education/student/?user=${user.id}`)
        const studentList = Array.isArray(studentRes?.results)
          ? studentRes.results
          : Array.isArray(studentRes)
            ? studentRes
            : []

        const currentStudent: StudentProfile | null = studentList[0] ?? null
        if (!mounted) return
        setStudent(currentStudent)

        if (!currentStudent?.id) {
          setEnrollments([])
          setGrades([])
          return
        }

        const enrollmentRes = await apiFetch<any>(`/education/enrollment/?student=${currentStudent.id}`)
        const enrollmentList: Enrollment[] = Array.isArray(enrollmentRes?.results)
          ? enrollmentRes.results
          : Array.isArray(enrollmentRes)
            ? enrollmentRes
            : []
        if (!mounted) return
        setEnrollments(enrollmentList)

        const enrollmentIds = enrollmentList.map((item) => item.id).filter(Boolean)
        if (!enrollmentIds.length) {
          setGrades([])
          return
        }

        const gradeResponses = await Promise.all(
          enrollmentIds.map((enrollmentId) => apiFetch<any>(`/education/grade/?enrollment=${enrollmentId}`))
        )

        const gradeItems = gradeResponses.flatMap((res) => {
          if (Array.isArray(res?.results)) return res.results
          if (Array.isArray(res)) return res
          return []
        }) as Grade[]

        if (!mounted) return
        setGrades(gradeItems)
      } catch (e: any) {
        if (!mounted) return
        setError(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar área do estudante."))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [user?.id])

  const gradeRows = useMemo(() => grades.map((grade) => ({
    component: grade.component || "—",
    score: `${grade.score ?? "0"}/${grade.max_score ?? "0"}`,
    published: grade.published_at ? new Date(grade.published_at).toLocaleString() : "Pendente",
  })), [grades])

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
              Voltar ao Education
            </Link>
          }
        />

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Perfil">
            <div className="text-sm text-foreground-2 space-y-1">
              <p><strong>Código:</strong> {loading ? "..." : (student?.student_code || "Não vinculado")}</p>
              <p><strong>Estado:</strong> {loading ? "..." : (student?.status || "—")}</p>
            </div>
          </Card>

          <Card title="Matrículas">
            <div className="text-sm text-foreground-2">
              {loading ? "..." : enrollments.length}
            </div>
          </Card>

          <Card title="Notas">
            <div className="text-sm text-foreground-2">
              {loading ? "..." : grades.length}
            </div>
          </Card>
        </div>

        <Card title="Resultados">
          <DataTable
            columns={[
              { header: "Componente", accessor: "component" },
              { header: "Nota", accessor: "score" },
              { header: "Publicação", accessor: "published" },
            ]}
            data={gradeRows}
            emptyMessage={loading ? "Carregando..." : "Sem notas disponíveis."}
          />
        </Card>
      </div>
    </AppLayout>
  )
}
