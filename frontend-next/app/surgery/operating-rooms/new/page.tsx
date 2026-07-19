"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clipboard, DoorOpen } from "lucide-react"

import AutoForm from "@/components/form/AutoForm"
import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefresh } from "@/hooks/useSafeDataRefresh"
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

const ENDPOINT = "/surgery/centro_cirurgico/"
const ROUTE_BASE = "/surgery/operating-rooms"

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

export default function SurgeryOperatingRoomsCreatePage() {
  const router = useRouter()
  const { loading: authLoading } = useAuthGuard()
  const { t } = useLanguage()
  const { refreshNow } = useSafeDataRefresh()
  const formConfig = getResourceFormConfig("surgery", "centro_cirurgico", ENDPOINT)

  if (authLoading) return null

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
      <div className="mx-auto w-full max-w-5xl space-y-2 px-1 py-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-teal-500" />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/20">
                <DoorOpen size={17} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Link href="/surgery" className="hover:text-foreground">{t("Cirurgia", "Surgery")}</Link>
                  <span>/</span>
                  <Link href={ROUTE_BASE} className="hover:text-foreground">{t("Salas operatórias", "Operating rooms")}</Link>
                </div>
                <h1 className="text-lg font-bold leading-tight text-foreground">{t("Novo bloco operatório", "New operating room")}</h1>
                <p className="text-[11px] text-muted-foreground">
                  {t("Cadastre a sala com identificação, disponibilidade, esterilização e equipamentos.", "Register the room with identification, availability, sterilization and equipment.")}
                </p>
              </div>
            </div>
            <Link
              href={ROUTE_BASE}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted"
            >
              <ArrowLeft size={11} /> {t("Voltar", "Back")}
            </Link>
          </div>
        </section>

        <section className={`${GLASS} overflow-hidden`}>
          <div className="flex items-center gap-2 border-b border-white/20 px-4 py-3 dark:border-white/10">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <Clipboard size={17} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground">{t("Dados do bloco operatório", "Operating room details")}</h2>
              <p className="text-[11px] text-muted-foreground">
                {t("Preencha os dados operacionais antes de disponibilizar a sala para agendamentos.", "Fill operational data before making the room available for scheduling.")}
              </p>
            </div>
          </div>
          <div className="px-4 py-4">
            <AutoForm
              endpoint={ENDPOINT}
              method="post"
              submitLabel={t("Criar bloco operatório", "Create operating room")}
              config={formConfig}
              presentation="modern-nursing"
              onSuccess={() => {
                void refreshNow("mutation")
                router.push(ROUTE_BASE)
              }}
            />
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
