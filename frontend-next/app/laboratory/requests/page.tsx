"use client"

import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import { Shield, FileDown, FlaskConical } from "lucide-react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { useAuth } from "@/hooks/useAuth"
import { ApiListMeta, apiFetch, apiFetchList } from "@/lib/api"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type RequisicaoRow = Record<string, any>
type RequisicaoList = { items: RequisicaoRow[]; meta: ApiListMeta; raw: any }

async function abrirPdfResultados(requisicaoId: number) {
  const blob = await apiFetch<Blob>(`/requisicoes/${requisicaoId}/pdf_resultados/`, {
    responseType: "blob",
  })
  const url = window.URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener,noreferrer")
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
}

const ESTADOS = [
  { value: "pendente", label: "Pendente" },
  { value: "em_analise", label: "Em análise" },
  { value: "aguardando_validacao", label: "Aguardando validação" },
  { value: "validado", label: "Validado" },
  { value: "rejeitado", label: "Rejeitado" },
]

export default function LaboratorioRequisicoesPage() {
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

  const [estado, setEstado] = useState<string>("pendente")

  const { data, isFetching, isError, error } = useQuery<RequisicaoList>({
    queryKey: ["lab-requests", estado],
    queryFn: () =>
      apiFetchList<RequisicaoRow>(`/requisicoes/?tipo=LAB&estado=${encodeURIComponent(estado)}`),
    placeholderData: keepPreviousData,
    staleTime: 20_000,
  })

  const rows = data?.items ?? []

  const onPdf = useCallback(async (id: number) => {
    try {
      await abrirPdfResultados(id)
    } catch (e: any) {
      alert(e?.message || "Falha ao gerar PDF de resultados.")
    }
  }, [])

  const columns = useMemo(
    () => [
      { header: "Código", render: (r: RequisicaoRow) => r.id_custom || r.id || "-" },
      { header: "Paciente", render: (r: RequisicaoRow) => r.paciente_nome || r.paciente || "-" },
      { header: "Prioridade", render: (r: RequisicaoRow) => r.status_clinico || "-" },
      { header: "Crítico", render: (r: RequisicaoRow) => (r.possui_resultado_critico ? "SIM" : "—") },
      {
        header: "Ações",
        render: (r: RequisicaoRow) => (
          <div className="flex flex-wrap gap-2">
            {r.id && String(r.estado || "").toLowerCase() !== "validado" ? (
              <Link
                href={`/laboratorio/requisicoes/${r.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <FlaskConical size={14} />
                Lançar
              </Link>
            ) : r.id ? (
              <Link
                href={`/laboratorio/requisicoes/${r.id}`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <FlaskConical size={14} />
                Ver
              </Link>
            ) : null}

            {podeVerAdmin ? (
              <Link
                href={`/admin/clinico/labrequest/${r.id}/change/`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Shield size={14} />
                Admin
              </Link>
            ) : null}

            {r.id_custom ? (
              <button
                type="button"
                onClick={() => onPdf(Number(r.id))}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <FileDown size={14} />
                PDF
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [onPdf, podeVerAdmin]
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="space-y-6">
        <PageHeader
          title="Requisições (Laboratório)"
          subtitle="Triagem de requisições e atalhos para lançamento e PDF."
          actions={
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-700">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm"
              >
                {ESTADOS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        {isError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {(error as any)?.message || "Falha ao carregar requisições."}
          </div>
        ) : null}

        {isFetching ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <DataTable<RequisicaoRow>
            columns={columns as any}
            data={rows}
            emptyMessage="Nenhuma requisição encontrada."
          />
        )}
      </div>
    </AppLayout>
  )
}

