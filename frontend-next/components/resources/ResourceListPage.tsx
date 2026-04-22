"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { apiFetch } from "@/lib/api"
import { bloodbankResourceKeyFromEndpoint } from "@/lib/ui/fieldLabels"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type Row = Record<string, any>

type RowHref = (row: Row) => string

function pickLabel(row: Row): string {
  const candidates = [
    "nome",
    "descricao",
    "identificador",
    "bag_identifier",
    "unit_number",
    "dominio",
    "token",
    "numero",
    "referencia_externa",
    "estado",
    "status",
  ]
  for (const key of candidates) {
    const v = row?.[key]
    if (typeof v === "string" && v.trim()) return v
  }
  return ""
}

function fmtDate(value: any): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

<<<<<<< Updated upstream
function pickCode(row: Row): string {
  return (
    row?.id_custom ||
    row?.custom_id ||
    row?.customId ||
    row?.codigo ||
    row?.code ||
    row?.id ||
    "-"
  )
=======
function fmtBool(value: any): string {
  if (value === true) return "Sim"
  if (value === false) return "Não"
  return "-"
}

function fmtTemp(minC: any, maxC: any): string {
  const min = minC ?? ""
  const max = maxC ?? ""
  if (min === "" && max === "") return "-"
  if (min !== "" && max !== "") return `${min} - ${max} °C`
  return `${min || max} °C`
}

const BLOODBANK_MAINTENANCE_TYPE: Record<string, string> = {
  PRV: "Preventiva",
  COR: "Corretiva",
  CAL: "Calibração",
  SAN: "Higienização",
  TMP: "Validação de temperatura",
}

const BLOODBANK_MAINTENANCE_STATUS: Record<string, string> = {
  SCH: "Agendada",
  INP: "Em andamento",
  COM: "Concluída",
  CAN: "Cancelada",
>>>>>>> Stashed changes
}

export default function ResourceListPage({
  title,
  endpoint,
  adminListHref,
  createHref,
  rowHref,
  requiredGroups,
}: {
  title: string
  endpoint: string
  adminListHref?: string
  createHref?: string
  rowHref?: RowHref
  requiredGroups?: string[]
}) {
  const { loading } = useAuthGuard()
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const [data, setData] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [bloodStorages, setBloodStorages] = useState<Record<number, string>>({})

  const bloodbankResource = bloodbankResourceKeyFromEndpoint(endpoint)
  const needsBloodStorageLookup =
    bloodbankResource === "manutencaoarmazenamento" || bloodbankResource === "unidade" || bloodbankResource === "movimentoestoque"

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoadingData(true)
        setError(null)
        const res = await apiFetch<any>(endpoint)
        const items = res && (res as any).results ? (res as any).results : res
        if (mounted) setData(Array.isArray(items) ? items : [])
      } catch (e: any) {
        if (mounted) setError(e?.message || "Falha ao carregar dados.")
      } finally {
        if (mounted) setLoadingData(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [endpoint])

  useEffect(() => {
    let mounted = true
    async function loadStorages() {
      if (!needsBloodStorageLookup) return
      try {
        const res = await apiFetch<any>("/bloodbank/armazenamento/")
        const items = res && (res as any).results ? (res as any).results : res
        const map: Record<number, string> = {}
        if (Array.isArray(items)) {
          for (const s of items) {
            const id = Number(s?.id)
            if (!Number.isFinite(id)) continue
            const name = String(s?.name || s?.custom_id || s?.id_custom || id)
            map[id] = name
          }
        }
        if (mounted) setBloodStorages(map)
      } catch {
        // ignore (still show numeric ids)
      }
    }
    loadStorages()
    return () => {
      mounted = false
    }
  }, [needsBloodStorageLookup])

  const columns = useMemo(
    () => {
      const codeCol = {
        header: "Código",
        render: (row: Row) => {
<<<<<<< Updated upstream
          const label = pickCode(row)
=======
          const label = row.id_custom || row.custom_id || row.id || "-"
>>>>>>> Stashed changes
          if (!rowHref) return label
          return (
            <Link
              href={rowHref(row)}
              className="font-medium text-[var(--text)] hover:text-[var(--hover-accent)]"
            >
              {label}
            </Link>
          )
        },
<<<<<<< Updated upstream
      },
      {
        header: "Nome",
        render: (row: Row) => pickLabel(row) || "-",
      },
      {
        header: "Estado",
        render: (row: Row) =>
          row.estado || row.status || row.status_comercial || "-",
      },
      {
        header: "Criado em",
        render: (row: Row) => fmtDate(row.criado_em || row.created_at),
      },
    ],
    [rowHref]
=======
      }

      if (bloodbankResource === "armazenamento") {
        return [
          codeCol,
          { header: "Nome", render: (row: Row) => row.name || "-" },
          { header: "Localização", render: (row: Row) => row.location || "-" },
          { header: "Capacidade", render: (row: Row) => row.capacity_units ?? "-" },
          {
            header: "Temperatura",
            render: (row: Row) => fmtTemp(row.temperature_min_c, row.temperature_max_c),
          },
          { header: "Ativo", render: (row: Row) => fmtBool(row.is_active) },
        ]
      }

      if (bloodbankResource === "manutencaoarmazenamento") {
        return [
          codeCol,
          {
            header: "Armazenamento",
            render: (row: Row) => {
              const id = Number(row.storage)
              if (!Number.isFinite(id)) return "-"
              return bloodStorages[id] || `ID ${id}`
            },
          },
          {
            header: "Tipo",
            render: (row: Row) =>
              BLOODBANK_MAINTENANCE_TYPE[String(row.maintenance_type || "")] ||
              row.maintenance_type ||
              "-",
          },
          {
            header: "Estado",
            render: (row: Row) =>
              BLOODBANK_MAINTENANCE_STATUS[String(row.status || "")] || row.status || "-",
          },
          { header: "Agendada", render: (row: Row) => fmtDate(row.scheduled_at) },
          { header: "Técnico", render: (row: Row) => row.technician_name || "-" },
        ]
      }

      return [
        codeCol,
        {
          header: "Nome",
          render: (row: Row) => pickLabel(row) || "-",
        },
        {
          header: "Estado",
          render: (row: Row) => row.estado || row.status || row.status_comercial || "-",
        },
        {
          header: "Criado em",
          render: (row: Row) => fmtDate(row.criado_em || row.created_at),
        },
      ]
    },
    [bloodStorages, bloodbankResource, rowHref]
>>>>>>> Stashed changes
  )

  if (loading) return null

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="mx-auto w-full max-w-6xl space-y-3">
        <PageHeader
          title={title}
          subtitle={endpoint}
          actions={
            <>
              {createHref ? (
                <Link
                  href={createHref}
                  className="inline-flex items-center rounded-lg bg-[var(--primary-600)] px-2.5 py-1 text-sm font-semibold leading-tight text-white transition hover:bg-[var(--primary-700)]"
                >
                  Novo
                </Link>
              ) : null}

              {adminListHref && podeVerAdmin ? (
                <Link
                  href={adminListHref}
                  className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-sm font-medium leading-tight text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
                >
                  Abrir na administração
                </Link>
              ) : null}
            </>
          }
        />

        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </div>
        )}

        {loadingData ? (
          <div className="text-sm text-[var(--gray-500)]">Carregando...</div>
        ) : (
          <DataTable<Row>
            columns={columns as any}
            data={data}
            emptyMessage="Nenhum registo encontrado."
          />
        )}
      </div>
    </AppLayout>
  )
}
