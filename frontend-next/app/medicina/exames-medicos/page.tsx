"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type ExameMedicoRow = Record<string, any>

export default function ExamesMedicosPage() {
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ExameMedicoRow[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)
        const res = await apiFetch<any>("/clinico/examemedico/")
        const items = res && (res as any).results ? (res as any).results : res
        if (!mounted) return
        setData(Array.isArray(items) ? items : [])
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar exames médicos.")
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
      { header: "Código", render: (e: ExameMedicoRow) => e.id_custom || e.id || "-" },
      { header: "Nome", render: (e: ExameMedicoRow) => e.nome || "-" },
      { header: "Setor", render: (e: ExameMedicoRow) => e.setor || "-" },
      { header: "Método", render: (e: ExameMedicoRow) => e.metodo || "-" },
    ],
    []
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA]}>
      <div className="space-y-6">
        <PageHeader
          title="Exames médicos"
          subtitle="Catálogo de exames médicos (imagem/diagnóstico), conforme backend."
          actions={
            <Link
              href="/admin/clinico/examemedico/"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Abrir no admin
            </Link>
          }
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <DataTable<ExameMedicoRow>
            columns={columns as any}
            data={data}
            emptyMessage="Nenhum exame médico encontrado."
          />
        )}
      </div>
    </AppLayout>
  )
}

