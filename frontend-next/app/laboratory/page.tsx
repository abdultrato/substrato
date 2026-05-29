"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  FileText,
  FileDown,
  ListChecks,
  Shield,
  PackageSearch,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import DataTable from "@/components/ui/DataTable"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, extractResults, extractTotalCount } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type RequestRow = Record<string, any>

async function openResultsPdf(requestId: number) {
  const blob = await apiFetch<Blob>(`/requests/${requestId}/results-pdf/`, {
    responseType: "blob",
  })
  const url = window.URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener,noreferrer")
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
}

export default function LaboratoryPage() {
  const { user } = useAuth()
  const canViewAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [pendingRequests, setPendingRequests] = useState<RequestRow[]>([])
  const [pendingRequestsTotal, setPendingRequestsTotal] = useState<number>(0)
  const [awaitingValidationTotal, setAwaitingValidationTotal] = useState<number>(0)
  const [criticalRequestsTotal, setCriticalRequestsTotal] = useState<number>(0)
  const [pendingItemsTotal, setPendingItemsTotal] = useState<number>(0)

  const onPdf = useCallback(async (id: number) => {
    try {
      await openResultsPdf(id)
    } catch (e: any) {
      setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF de resultados."))
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setErrorMessage(null)

        const [
          pendingRequestsResponse,
          awaitingValidationResponse,
          criticalRequestsResponse,
          pendingItemsResponse,
        ] = await Promise.all([
          apiFetch<any>("/requests/?type=LAB&status=pendente", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/requests/?type=LAB&status=aguardando_validacao", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/requests/?type=LAB&has_critical_result=true", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/clinical/resultitem/?status=pendente", { clientCache: safeRefreshToken === 0 }),
        ])

        if (!mounted) return
        setPendingRequests(extractResults<RequestRow>(pendingRequestsResponse).slice(0, 10))
        setPendingRequestsTotal(extractTotalCount(pendingRequestsResponse))
        setAwaitingValidationTotal(extractTotalCount(awaitingValidationResponse))
        setCriticalRequestsTotal(extractTotalCount(criticalRequestsResponse))
        setPendingItemsTotal(extractTotalCount(pendingItemsResponse))
      } catch (e: any) {
        if (!mounted) return
        setErrorMessage(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar o workspace do laboratório."))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken])

  const columns = useMemo(
    () => [
      { header: "Código", render: (r: RequestRow) => r.custom_id || r.id || "-" },
      { header: "Paciente", render: (r: RequestRow) => r.patient_name || r.patient || "-" },
      { header: "Estado", render: (r: RequestRow) => r.status || "-" },
      {
        header: "Ações",
        render: (r: RequestRow) => (
          <div className="flex flex-wrap gap-2">
            {canViewAdmin ? (
              <Link
                href={`/admin/clinical/labrequest/${r.id}/change/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Admin
              </Link>
            ) : null}

            {r.id ? (
              <button
                type="button"
                onClick={() => onPdf(Number(r.id))}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                PDF
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [canViewAdmin, onPdf]
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="space-y-6">
        <PageHeader
          title="Laboratório"
          subtitle="Entrada de resultados, validação e emissão de documentos."
          actions={
            canViewAdmin ? (
              <Link
                href="/admin/clinical/labrequest/"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <Shield size={16} />
                Abrir na Administração
              </Link>
            ) : null
          }
        />

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Requisições pendentes" value={loading ? "..." : pendingRequestsTotal} />
          <MetricCard label="Aguardando validação" value={loading ? "..." : awaitingValidationTotal} />
          <MetricCard label="Críticas" value={loading ? "..." : criticalRequestsTotal} hint="Marcadas como críticas" />
          <MetricCard label="Itens de resultado pendentes" value={loading ? "..." : pendingItemsTotal} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Fila de requisições"
            description="Veja as requisições e aceda rapidamente ao lançamento de resultados."
            href="/laboratory/requests"
            icon={FileText}
          />
          <ActionTile
            title="Itens de resultados"
            description="Gerencie os ResultadoItem (pendente, em análise, validado, rejeitado)."
            href="/laboratory/results"
            icon={ListChecks}
          />
          {canViewAdmin ? (
            <ActionTile
              title="Resultados (admin)"
              description="Lançar e validar resultados com rastreabilidade (Django admin)."
              href="/admin/clinical/result/"
              icon={Shield}
            />
          ) : null}
          <ActionTile
            title="PDF de resultados"
            description="Emita o PDF institucional (somente resultados validados)."
            href="/laboratory/requests"
            icon={FileDown}
          />
          <ActionTile
            title="Criar requisição de materiais"
            description="Abrir o formulário para solicitar consumíveis ao almoxarifado/farmácia."
            href="/pharmacy/material-requests/new"
            icon={PackageSearch}
          />
        </div>

        <Card
          title="Próximas requisições"
          subtitle="Atalhos para lançar resultado pela Administração e emitir PDF."
        >
          {loading ? (
            <div className="text-sm text-gray-500">Carregando...</div>
          ) : (
            <DataTable<RequestRow>
              columns={columns as any}
              data={pendingRequests}
              emptyMessage="Nenhuma requisição pendente."
            />
          )}
        </Card>
      </div>
    </AppLayout>
  )
}


