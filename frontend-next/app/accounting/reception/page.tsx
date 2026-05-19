"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type Row = Record<string, any>

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export default function ContabilidadeRecepcaoAuditPage() {
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkins, setCheckins] = useState<Row[]>([])
  const [atendimentos, setAtendimentos] = useState<Row[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)

        const [cRes, aRes] = await Promise.all([
          apiFetch<any>("/reception/checkin/"),
          apiFetch<any>("/reception/atendimento/"),
        ])

        const list = (v: any) => (v && v.results ? v.results : v) || []

        if (!mounted) return
        setCheckins(Array.isArray(list(cRes)) ? list(cRes).slice(0, 100) : [])
        setAtendimentos(Array.isArray(list(aRes)) ? list(aRes).slice(0, 100) : [])
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar dados da recepção."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const checkinCols = useMemo(
    () => [
      { header: "Código", render: (r: Row) => r.id_custom || r.id || "-" },
      { header: "Paciente", render: (r: Row) => r.paciente || r.paciente_id || "-" },
      { header: "Estado", render: (r: Row) => r.estado || r.status || "-" },
      { header: "Criado em", render: (r: Row) => fmtDate(r.criado_em) },
    ],
    []
  )

  const atendimentoCols = useMemo(
    () => [
      { header: "Código", render: (r: Row) => r.id_custom || r.id || "-" },
      { header: "Paciente", render: (r: Row) => r.paciente || r.paciente_id || "-" },
      { header: "Estado", render: (r: Row) => r.estado || r.status || "-" },
      { header: "Criado em", render: (r: Row) => fmtDate(r.criado_em) },
    ],
    []
  )

  return (
    <AppLayout
      requiredGroups={[
        GROUPS.ADMIN,
        GROUPS.CONTABILIDADE,
      ]}
    >
      <div className="space-y-6">
        <PageHeader
          title="Recepção (auditoria)"
          subtitle="Somente leitura: check-ins e atendimentos."
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <Card
            title="Check-ins"
            subtitle="Últimos registros (somente leitura)."
          >
            {loading ? (
              <div className="text-sm text-gray-500">Carregando...</div>
            ) : (
              <DataTable<Row>
                columns={checkinCols as any}
                data={checkins}
                emptyMessage="Nenhum check-in encontrado."
              />
            )}
          </Card>

          <Card
            title="Atendimentos"
            subtitle="Últimos registros (somente leitura)."
          >
            {loading ? (
              <div className="text-sm text-gray-500">Carregando...</div>
            ) : (
              <DataTable<Row>
                columns={atendimentoCols as any}
                data={atendimentos}
                emptyMessage="Nenhum atendimento encontrado."
              />
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}


