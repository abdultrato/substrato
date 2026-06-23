"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ShieldAlert } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import AutoForm from "@/components/form/AutoForm"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import type { ResourceFormConfig } from "@/lib/resources/resourceFormConfig"

const ENDPOINT = "/clinical_laboratory/critical_notification/"
const BOARD_PATH = "/clinical-laboratory/critical-results"

export default function CriticalResultCreateForm() {
  useAuthGuard()
  const { t } = useLanguage()
  const router = useRouter()

  const config: ResourceFormConfig = {
    ordenarCampos: ["result", "patient", "order", "notified_professional", "method", "readback_confirmed", "notes"],
    esconderCampos: ["notified_by", "notified_at"],
    labels: {
      result: t("Resultado crítico", "Critical result"),
      patient: t("Paciente", "Patient"),
      order: t("Requisição", "Requisition"),
      notified_professional: t("Profissional notificado", "Notified professional"),
      method: t("Método", "Method"),
      readback_confirmed: t("Readback confirmado", "Readback confirmed"),
      notes: t("Observações", "Notes"),
    },
    placeholders: {
      notified_professional: t("Nome de quem recebeu a comunicação", "Name of who received the notification"),
    },
    widgets: { notes: "textarea" },
  }

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Link
            href={BOARD_PATH}
            aria-label={t("Voltar", "Back")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-[var(--gray-600)] transition hover:bg-[var(--gray-100)] dark:text-[var(--gray-300)]"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h1 className="font-display text-base font-semibold text-foreground">
              {t("Nova comunicação de resultado crítico", "New critical result notification")}
            </h1>
            <p className="text-xs text-[var(--gray-500)]">
              {t("Registar a comunicação e o readback de um resultado crítico", "Record the notification and readback of a critical result")}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <AutoForm
            endpoint={ENDPOINT}
            method="post"
            submitLabel={t("Criar comunicação", "Create notification")}
            config={config}
            onSuccess={(data: any) => {
              const id = data?.id ?? data?.pk
              router.push(id != null && String(id).trim() ? `${BOARD_PATH}/${encodeURIComponent(String(id))}` : BOARD_PATH)
            }}
          />
        </div>
      </div>
    </AppLayout>
  )
}
