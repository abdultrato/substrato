"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import Card from "@/components/ui/Card"
import DataTable from "@/components/ui/DataTable"
import SearchInput from "@/components/ui/SearchInput"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"


type PacienteRow = {
  id: number
  id_custom?: string
  nome?: string
  numero_id?: string
  contacto?: string
  email?: string
}

function listFrom(res: any): any[] {
  if (res && (res as any).results) return (res as any).results
  return Array.isArray(res) ? res : []
}

export default function NovaFaturaPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [pacientes, setPacientes] = useState<PacienteRow[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [acaoId, setAcaoId] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setErro(null)
        if (!search || search.trim().length < 2) {
          setPacientes([])
          return
        }
        setLoading(true)
        const res = await apiFetch<any>(`/clinical/patients/?search=${encodeURIComponent(search.trim())}`)
        const items = listFrom(res)
        if (mounted) setPacientes(items as PacienteRow[])
      } catch (e: any) {
        if (mounted) setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar pacientes."))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [search])

  const criarRascunho = useCallback(async (paciente: PacienteRow) => {
    if (!paciente?.id) return
    try {
      setAcaoId(paciente.id)
      setErro(null)

      const existentes = await apiFetch<any>(`/invoices/?paciente=${paciente.id}&estado=RASC`)
      const lista = listFrom(existentes)
      if (lista.length) {
        router.push(`/invoices/draft/${lista[0].id}`)
        return
      }

      const nova = await apiFetch<any>("/invoices/", {
        method: "POST",
        body: JSON.stringify({
          paciente: paciente.id,
          origem: "MIX",
        }),
      })

      if (nova?.id) {
        router.push(`/invoices/draft/${nova.id}`)
      } else {
        setErro("Não foi possível criar a fatura.")
      }
    } catch (e: any) {
      setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao criar fatura."))
    } finally {
      setAcaoId(null)
    }
  }, [router])

  const columns = useMemo(
    () => [
      { header: "Código", render: (p: PacienteRow) => p.id_custom || p.id },
      { header: "Nome", render: (p: PacienteRow) => p.nome || "-" },
      { header: "Documento", render: (p: PacienteRow) => p.numero_id || "-" },
      { header: "Contacto", render: (p: PacienteRow) => p.contacto || p.email || "-" },
      {
        header: "Ação",
        render: (p: PacienteRow) => (
          <button
            className="inline-flex items-center rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
            onClick={() => criarRascunho(p)}
            disabled={acaoId === p.id}
          >
            Criar rascunho
          </button>
        ),
      },
    ],
    [acaoId, criarRascunho]
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO]}>
      <div className="space-y-6">
        <PageHeader
          title="Nova fatura"
          subtitle="Selecione o paciente para criar uma fatura em rascunho."
        />

        <Card title="Pesquisar paciente" subtitle="Digite pelo menos 2 caracteres para buscar.">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              placeholder="Nome, email ou documento"
              onSearch={setSearch}
            />
            {loading ? <div className="text-xs text-gray-500">Buscando...</div> : null}
          </div>
        </Card>

        {erro ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <Card title="Resultados">
          {search.trim().length < 2 ? (
            <div className="text-sm text-gray-500">Digite para buscar pacientes.</div>
          ) : loading ? (
            <div className="text-sm text-gray-500">Carregando...</div>
          ) : pacientes.length === 0 ? (
            <div className="text-sm text-gray-500">Nenhum paciente encontrado.</div>
          ) : (
            <DataTable<PacienteRow> columns={columns as any} data={pacientes} />
          )}
        </Card>
      </div>
    </AppLayout>
  )
}


