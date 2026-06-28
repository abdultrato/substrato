"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Clipboard, Edit3 } from "lucide-react"

import AutoForm from "@/components/form/AutoForm"
import AppLayout from "@/components/layout/AppLayout"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { GROUPS } from "@/lib/rbac"
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"
import { routeParamToString } from "@/lib/routeParams"

type NursingRecord = Record<string, any> & {
  id?: number
  custom_id?: string | null
  name?: string | null
  patient_name?: string | null
  priority?: string | null
  record_kind?: string | null
}

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const PRIORITY_ACCENTS: Record<string, string> = {
  URG: "bg-red-500",
  NOR: "bg-emerald-500",
  BAI: "bg-sky-500",
}

export default function NursingRecordsEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = routeParamToString((params as any)?.id)
  const safeRefreshToken = useSafeDataRefreshSignal()
  const [data, setData] = useState<NursingRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const detailPath = `/nursing/nursing-records/${id}`

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch<NursingRecord>(`/nursing/nursing_record/${id}/`, {
        clientCache: safeRefreshToken === 0,
      })
      setData(response)
    } catch (reason: any) {
      setData(null)
      setError(
        isNotFoundLikeError(reason)
          ? "Registo de enfermagem não encontrado."
          : reason?.message || "Não foi possível carregar o registo de enfermagem."
      )
    } finally {
      setLoading(false)
    }
  }, [id, safeRefreshToken])

  useEffect(() => {
    load().catch(() => {})
  }, [load])

  if (loading) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Carregando...</div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
        <div className="mx-auto w-full max-w-5xl space-y-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error || "Registo de enfermagem não encontrado."}
          </div>
          <Link href="/nursing/nursing-records" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted">
            <ArrowLeft size={14} /> Voltar aos registos
          </Link>
        </div>
      </AppLayout>
    )
  }

  const accent = PRIORITY_ACCENTS[data.priority || ""] || PRIORITY_ACCENTS.NOR
  const title = data.name || data.patient_name || `Registo #${id}`

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-5xl space-y-3 px-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
          <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="relative flex min-h-[60px] flex-wrap items-center justify-between gap-3 px-4 py-2 pl-5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20">
                <Edit3 size={16} />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold leading-tight text-foreground">Editar {title}</h1>
                <p className="text-[11px] text-muted-foreground">
                  {data.record_kind === "LAB_COLLECTION_REQUEST" ? "Coleta laboratorial" : "Registo manual"} · {data.custom_id || `REG-${data.id}`}
                </p>
              </div>
            </div>
            <Link href={detailPath} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card/70 px-3 text-xs font-medium text-foreground shadow-sm backdrop-blur transition hover:bg-muted">
              <ArrowLeft size={13} /> Voltar
            </Link>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-xl border border-emerald-200/30 bg-white/25 shadow-lg shadow-slate-900/5 backdrop-blur-2xl dark:border-emerald-800/20 dark:bg-white/[0.04]">
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
          <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="relative px-4 py-3 sm:px-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/30 pb-2 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
                  <Clipboard size={15} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Dados do registo</h2>
                  <p className="text-[11px] text-muted-foreground">Atualize os dados clínicos e o contexto de enfermagem.</p>
                </div>
              </div>
              <span className="rounded-full border border-emerald-200/70 bg-emerald-50/70 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-950/30 dark:text-emerald-300">
                Enfermagem
              </span>
            </div>

            <AutoForm
              endpoint={`/nursing/nursing_record/${id}/`}
              method="put"
              initialValues={data}
              submitLabel="Guardar alterações"
              presentation="modern-nursing"
              config={getResourceFormConfig("nursing", "nursing_record", "/nursing/nursing_record/")}
              onSuccess={() => router.push(detailPath)}
            />
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
