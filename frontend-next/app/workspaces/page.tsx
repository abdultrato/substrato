"use client"

import Link from "next/link"
import { GraduationCap, Stethoscope } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { useLanguage } from "@/hooks/useLanguage"
import { GROUPS } from "@/lib/rbac"

export default function WorkspacesPage() {
  const { t } = useLanguage()

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN]}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader
          title={t("Selecionar workspace", "Select workspace")}
          subtitle={t(
            "Escolha o domínio principal para iniciar a sessão.",
            "Choose the main domain to start your session."
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            href="/healthcare"
            className="group block rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-muted/50 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-border bg-background p-2.5 text-foreground">
                <Stethoscope size={20} />
              </div>
              <div className="space-y-1">
                <div className="font-display text-lg font-semibold text-foreground">
                  Substrato Healthcare
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
            className="group block rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-muted/50 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-border bg-background p-2.5 text-foreground">
                <GraduationCap size={20} />
              </div>
              <div className="space-y-1">
                <div className="font-display text-lg font-semibold text-foreground">
                  Substrato Education
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
        </div>
      </div>
    </AppLayout>
  )
}
