"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { GraduationCap, PackageSearch, School, Stethoscope, Users } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { writeStoredWorkspaceScope } from "@/lib/workspaceScope"

export default function WorkspacesPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const router = useRouter()
  const showTeacherArea = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.PROFESSOR])
  const showDirectoriaArea = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.DIRETOR_ESCOLA, GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO])
  const showStudentArea = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.STUDENT, GROUPS.ENCARREGADO_EDUCACAO])
  const showErpWmsArea = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.CONTABILIDADE, GROUPS.FARMACIA, GROUPS.RECURSOS_HUMANOS])

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader
          title={t("Selecionar workspace", "Select workspace")}
          subtitle={t(
            "Escolha o domínio principal para iniciar a sessão.",
            "Choose the main domain to start your session."
          )}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/healthcare"
            onClick={(event) => {
              event.preventDefault()
              writeStoredWorkspaceScope("healthcare")
              router.push("/healthcare")
            }}
            className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                <Stethoscope size={20} />
              </div>
              <div className="space-y-1">
                <div className="font-display text-lg font-semibold text-foreground">
                  Substrato Saúde
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Fluxos clínicos, laboratório, enfermagem, consultas e faturamento assistencial.",
                    "Clinical workflows, laboratory, nursing, consultations, and care billing."
                  )}
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/education"
            onClick={(event) => {
              event.preventDefault()
              writeStoredWorkspaceScope("education")
              router.push("/education")
            }}
            className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                <GraduationCap size={20} />
              </div>
              <div className="space-y-1">
                <div className="font-display text-lg font-semibold text-foreground">
                  Substrato Educação
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Fluxos académicos para docentes, estudantes, cursos, turmas e matrículas.",
                    "Academic workflows for teachers, students, courses, classes, and enrollments."
                  )}
                </p>
              </div>
            </div>
          </Link>

          {showErpWmsArea ? (
            <Link
              href="/warehouse"
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <PackageSearch size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Substrato ERP e WMS
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Compras, reservas, separação, expedição, saldos e inventários com lógica empresarial.",
                      "Compras, reservas, separação, expedição, saldos e inventários com lógica empresarial."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showTeacherArea ? (
            <Link
              href="/education/teacher"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("education")
                router.push("/education/teacher")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <Users size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Área do Professor
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Turmas lecionadas, estudantes e notas por disciplina.",
                      "Classes taught, students, and grades by discipline."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showDirectoriaArea ? (
            <Link
              href="/education/directoria"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("education")
                router.push("/education/directoria")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <School size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Área da Directoria
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Visão global da escola com professores, estudantes e secções.",
                      "School-wide view with teachers, students, and sections."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showStudentArea ? (
            <Link
              href="/education/student"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("education")
                router.push("/education/student")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <GraduationCap size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Área do Estudante
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Aulas, presenças e notas do estudante autenticado.",
                      "Classes, attendance, and grades for the authenticated student."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}
        </div>
      </div>
    </AppLayout>
  )
}
