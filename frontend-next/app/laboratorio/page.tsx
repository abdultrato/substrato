"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  FileText,
  FileDown,
  ListChecks,
  Shield,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import DataTable from "@/components/ui/DataTable"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type RequisicaoRow = Record<string, any>

async function abrirPdfResultados(requisicaoId: number) {
  const blob = await apiFetch<Blob>(`/requisicoes/${requisicaoId}/pdf_resultados/`, {
    responseType: "blob",
  })
  const url = window.URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener,noreferrer")
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
}

export default function LaboratorioPage() {
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [pendentes, setPendentes] = useState<RequisicaoRow[]>([])
  const [aguardandoValidacao, setAguardandoValidacao] = useState<number>(0)
  const [criticas, setCriticas] = useState<number>(0)
  const [itensPendentes, setItensPendentes] = useState<number>(0)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoading(true)
        setErro(null)

        const [
          reqPendentes,
          reqAguardando,
          reqCriticas,
          resItensPendentes,
        ] = await Promise.all([
          apiFetch<any>("/requisicoes/?tipo=LAB&estado=pendente"),
          apiFetch<any>("/requisicoes/?tipo=LAB&estado=aguardando_validacao"),
          apiFetch<any>("/requisicoes/?tipo=LAB&possui_resultado_critico=true"),
          apiFetch<any>("/clinico/resultadoitem/?estado=pendente"),
        ])

        const list = (v: any) => (v && v.results ? v.results : v) || []

        if (!mounted) return
        setPendentes(Array.isArray(list(reqPendentes)) ? list(reqPendentes).slice(0, 10) : [])
        setAguardandoValidacao(Array.isArray(list(reqAguardando)) ? list(reqAguardando).length : 0)
        setCriticas(Array.isArray(list(reqCriticas)) ? list(reqCriticas).length : 0)
        setItensPendentes(Array.isArray(list(resItensPendentes)) ? list(resItensPendentes).length : 0)
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar o workspace do laboratório.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const columns = useMemo(
    () => [
      { header: "Código", render: (r: RequisicaoRow) => r.id_custom || r.id || "-" },
      { header: "Paciente", render: (r: RequisicaoRow) => r.paciente_nome || r.paciente || "-" },
      { header: "Estado", render: (r: RequisicaoRow) => r.estado || "-" },
      {
        header: "Ações",
        render: (r: RequisicaoRow) => (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/clinico/requisicaoanalise/${r.id}/change/`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Admin
            </Link>

            {r.id ? (
              <button
                type="button"
                onClick={() => abrirPdfResultados(Number(r.id))}
                className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                PDF
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    []
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="space-y-6">
        <PageHeader
          title="Laboratório"
          subtitle="Entrada de resultados, validação e emissão de documentos."
          actions={
            <Link
              href="/admin/clinico/requisicaoanalise/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              <Shield size={16} />
              Abrir no admin
            </Link>
          }
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Requisições pendentes" value={loading ? "..." : pendentes.length} />
          <MetricCard label="Aguardando validação" value={loading ? "..." : aguardandoValidacao} />
          <MetricCard label="Críticas" value={loading ? "..." : criticas} hint="Flag possui_resultado_critico" />
          <MetricCard label="Itens de resultado pendentes" value={loading ? "..." : itensPendentes} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Fila de requisições"
            description="Veja as requisições e aceda rapidamente ao lançamento de resultados."
            href="/laboratorio/requisicoes"
            icon={FileText}
          />
          <ActionTile
            title="Itens de resultados"
            description="Gerencie os ResultadoItem (pendente, em análise, validado, rejeitado)."
            href="/laboratorio/resultados"
            icon={ListChecks}
          />
          <ActionTile
            title="Resultados (admin)"
            description="Lançar e validar resultados com rastreabilidade (Django admin)."
            href="/admin/clinico/resultado/"
            icon={Shield}
          />
          <ActionTile
            title="PDF de resultados"
            description="Emita o PDF institucional (somente resultados validados)."
            href="/laboratorio/requisicoes"
            icon={FileDown}
          />
        </div>

        <Card
          title="Próximas requisições"
          subtitle="Atalhos para lançar resultado no admin e emitir PDF."
        >
          {loading ? (
            <div className="text-sm text-gray-500">Carregando...</div>
          ) : (
            <DataTable<RequisicaoRow>
              columns={columns as any}
              data={pendentes}
              emptyMessage="Nenhuma requisição pendente."
            />
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
