"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
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
}

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
}

export default function ResourceListPage({
  title,
  subtitle,
  endpoint,
  adminListHref,
  createHref,
  rowHref,
  requiredGroups,
}: {
  title: string
  subtitle?: string
  endpoint: string
  adminListHref?: string
  createHref?: string
  rowHref?: RowHref
  requiredGroups?: string[]
}) {
  const { loading } = useAuthGuard()
  const { user } = useAuth()
  const { t, tr } = useLanguage()
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
        if (mounted) setError(e?.message || t("Falha ao carregar dados.", "Failed to load data."))
      } finally {
        if (mounted) setLoadingData(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [endpoint, t])

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
    () => [
      {
        header: t("Código", "Code"),
        render: (row: Row) => {
          const label = pickCode(row)
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
      },
      {
        header: t("Nome", "Name"),
        render: (row: Row) => pickLabel(row) || "-",
      },
      {
        header: t("Estado", "Status"),
        render: (row: Row) =>
          tr(String(row.estado || row.status || row.status_comercial || "-")),
      },
      {
        header: t("Criado em", "Created at"),
        render: (row: Row) => fmtDate(row.criado_em || row.created_at),
      },
    ],
    [rowHref, t, tr]
  )

  if (loading) return null

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="mx-auto w-full max-w-6xl space-y-3">
        <PageHeader
          title={title}
          subtitle={subtitle || t("Registos disponíveis no módulo selecionado.", "Available records in the selected module.")}
          actions={
            <>
              {createHref ? (
                <Link
                  href={createHref}
                  className="inline-flex items-center rounded-lg bg-[var(--primary-600)] px-2.5 py-1 text-sm font-semibold leading-tight text-white transition hover:bg-[var(--primary-700)]"
                >
                  {t("Novo", "New")}
                </Link>
              ) : null}

              {adminListHref && podeVerAdmin ? (
                <Link
                  href={adminListHref}
                  className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-sm font-medium leading-tight text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
                >
                  {t("Abrir na administração", "Open in administration")}
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
          <div className="text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
        ) : (
          <DataTable<Row>
            columns={columns as any}
            data={data}
            emptyMessage={t("Nenhum registo encontrado.", "No record found.")}
          />
        )}
      </div>
    </AppLayout>
  )
}
