"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { RotateCcw, Search } from "lucide-react"
import { type ReactNode, useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import AutoForm from "@/components/form/AutoForm"
import ResourceDetailsCard from "@/components/resources/ResourceDetailsCard"
import Badge from "@/components/ui/Badge"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import Pagination from "@/components/ui/Pagination"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import useDebounce from "@/hooks/useDebounce"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { hasOpenApiMethod, hasWriteContract } from "@/lib/openapi/writeContract"
import { routeParamToString } from "@/lib/routeParams"
import { createResourceActionLabel } from "@/lib/resources/createLabels"
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"
import { primaryRecordId } from "@/lib/resources/recordIdentity"
import { GROUPS } from "@/lib/rbac"

type Row = Record<string, any>

export type PublicHealthResourceKey =
  | "vaccine"
  | "lot"
  | "campaign"
  | "target"
  | "immunization"
  | "adverse_event"
  | "notification"

type FilterOption = {
  label: string
  value: string
}

type ColumnConfig = {
  header: string
  render: (row: Row) => ReactNode
  className?: string
}

type PublicHealthResourceConfig = {
  key: PublicHealthResourceKey
  segment: string
  endpoint: string
  adminHref: string
  title: string
  singular: string
  primaryHeader: string
  description: string
  createHint: string
  detailHint: string
  editHint: string
  searchPlaceholder: string
  filterLabel?: string
  filterQueryField?: string
  filterOptions?: FilterOption[]
  primary: (row: Row) => string
  columns: ColumnConfig[]
}

export const PUBLIC_HEALTH_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.RECEPCAO,
  GROUPS.MEDICINA,
  GROUPS.MEDICINA_OCUPACIONAL,
  GROUPS.ENFERMAGEM,
  GROUPS.LABORATORIO,
  GROUPS.SAUDE_PUBLICA,
]

const RESOURCE_CONFIGS: Record<PublicHealthResourceKey, PublicHealthResourceConfig> = {
  vaccine: {
    key: "vaccine",
    segment: "vaccines",
    endpoint: "/public_health/vaccine/",
    adminHref: "/admin/saude_publica/vaccineproduct/",
    title: "Vacinas",
    singular: "Vacina",
    primaryHeader: "Vacina",
    description: "Produtos vacinais, doenças alvo, doses requeridas, reforços e cadeia fria.",
    createHint: "Registe a vacina com código, doença alvo, regra de doses e faixa etária aplicável.",
    detailHint: "Consulte a ficha vacinal e os parâmetros de cadeia fria usados nos lotes.",
    editHint: "Atualize os dados da vacina mantendo códigos oficiais e regras de reforço consistentes.",
    searchPlaceholder: "Pesquisar por vacina, doença, fabricante, código ou código oficial",
    filterLabel: "Atividade",
    filterQueryField: "active",
    filterOptions: [
      { label: "Ativas", value: "true" },
      { label: "Inativas", value: "false" },
    ],
    primary: (row) => firstText(row, ["name", "nome", "code", "custom_id", "id"]),
    columns: [
      { header: "Doença alvo", render: (row) => textOrDash(row.disease) },
      { header: "Tipo", render: (row) => humanize(row.vaccine_type) },
      { header: "Doses", render: (row) => textOrDash(row.dose_count_required) },
      { header: "Reforço", render: (row) => daysLabel(row.booster_interval_days) },
      { header: "Cadeia fria", render: (row) => tempRange(row.cold_chain_min_c, row.cold_chain_max_c) },
      { header: "Ativa", render: (row) => boolLabel(row.active) },
    ],
  },
  lot: {
    key: "lot",
    segment: "lots",
    endpoint: "/public_health/lot/",
    adminHref: "/admin/saude_publica/vaccinelot/",
    title: "Lotes de Vacina",
    singular: "Lote de vacina",
    primaryHeader: "Lote",
    description: "Validade, doses disponíveis, quarentena, recolha e quebra de cadeia fria.",
    createHint: "Registe o lote com validade, stock recebido e temperatura para rastreabilidade.",
    detailHint: "Consulte stock, validade e estado da cadeia fria do lote selecionado.",
    editHint: "Atualize o lote sem perder coerência entre doses recebidas, disponíveis e reservadas.",
    searchPlaceholder: "Pesquisar por lote, vacina, local de armazenamento ou código oficial",
    filterLabel: "Estado",
    filterQueryField: "status",
    filterOptions: [
      { label: "Recebido", value: "RECEIVED" },
      { label: "Ativo", value: "ACTIVE" },
      { label: "Quarentena", value: "QUARANTINED" },
      { label: "Esgotado", value: "DEPLETED" },
      { label: "Expirado", value: "EXPIRED" },
      { label: "Recolhido", value: "RECALLED" },
    ],
    primary: (row) => firstText(row, ["lot_number", "official_batch_code", "custom_id", "id"]),
    columns: [
      { header: "Vacina", render: (row) => textOrDash(row.vaccine_name || row.vaccine) },
      { header: "Estado", render: (row) => statusBadge(row.status) },
      { header: "Validade", render: (row) => formatDate(row.expiration_date) },
      { header: "Doses disponíveis", render: (row) => textOrDash(row.doses_available) },
      { header: "Reservadas", render: (row) => textOrDash(row.reserved_doses) },
      { header: "Cadeia fria", render: (row) => statusBadge(row.cold_chain_status) },
      { header: "Local", render: (row) => textOrDash(row.storage_location) },
    ],
  },
  campaign: {
    key: "campaign",
    segment: "campaigns",
    endpoint: "/public_health/campaign/",
    adminHref: "/admin/saude_publica/vaccinationcampaign/",
    title: "Campanhas de Vacinação",
    singular: "Campanha de vacinação",
    primaryHeader: "Campanha",
    description: "Campanhas por região, população alvo, metas de doses e integração oficial.",
    createHint: "Crie a campanha vinculando vacina, responsável, região e metas operacionais.",
    detailHint: "Acompanhe cobertura, metas e vínculo oficial da campanha selecionada.",
    editHint: "Atualize a campanha mantendo datas, estado e metas coerentes.",
    searchPlaceholder: "Pesquisar por campanha, vacina, região, responsável ou código oficial",
    filterLabel: "Estado",
    filterQueryField: "status",
    filterOptions: [
      { label: "Planeada", value: "PLANNED" },
      { label: "Ativa", value: "ACTIVE" },
      { label: "Pausada", value: "PAUSED" },
      { label: "Concluída", value: "COMPLETED" },
      { label: "Cancelada", value: "CANCELLED" },
    ],
    primary: (row) => firstText(row, ["name", "custom_id", "id"]),
    columns: [
      { header: "Vacina", render: (row) => textOrDash(row.vaccine_name || row.vaccine) },
      { header: "Estado", render: (row) => statusBadge(row.status) },
      { header: "Região", render: (row) => textOrDash(row.target_region) },
      { header: "Início", render: (row) => formatDate(row.start_date) },
      { header: "Fim", render: (row) => formatDate(row.end_date) },
      { header: "Cobertura", render: (row) => `${formatPercent(row.coverage_percent)} (${row.administered_doses ?? 0}/${row.target_doses ?? 0})` },
    ],
  },
  target: {
    key: "target",
    segment: "targets",
    endpoint: "/public_health/target/",
    adminHref: "/admin/saude_publica/vaccinationcampaigntarget/",
    title: "Metas por Região",
    singular: "Meta por região",
    primaryHeader: "Região",
    description: "População alvo, distrito, faixa etária, doses planeadas e cobertura.",
    createHint: "Defina a meta regional com campanha, distrito, faixa etária e doses previstas.",
    detailHint: "Consulte a cobertura regional e o vínculo com a campanha.",
    editHint: "Atualize a meta mantendo o total aplicado compatível com o plano.",
    searchPlaceholder: "Pesquisar por campanha, região, distrito ou código",
    primary: (row) => [row.region, row.district].filter(Boolean).join(" / ") || firstText(row, ["custom_id", "id"]),
    columns: [
      { header: "Campanha", render: (row) => textOrDash(row.campaign_name || row.campaign) },
      { header: "Distrito", render: (row) => textOrDash(row.district) },
      { header: "População alvo", render: (row) => textOrDash(row.target_population) },
      { header: "Meta de doses", render: (row) => textOrDash(row.target_doses) },
      { header: "Aplicadas", render: (row) => textOrDash(row.administered_doses) },
      { header: "Cobertura", render: (row) => formatPercent(row.coverage_percent) },
    ],
  },
  immunization: {
    key: "immunization",
    segment: "immunizations",
    endpoint: "/public_health/immunization/",
    adminHref: "/admin/saude_publica/immunizationrecord/",
    title: "Registos de Imunização",
    singular: "Registo de imunização",
    primaryHeader: "Paciente",
    description: "Histórico vacinal, lote rastreável, dose aplicada e próxima data de reforço.",
    createHint: "Registe a dose aplicada com paciente, lote, campanha, profissional e próxima dose.",
    detailHint: "Consulte a imunização com rastreabilidade por paciente, vacina e lote.",
    editHint: "Atualize o registo preservando a rastreabilidade da dose aplicada.",
    searchPlaceholder: "Pesquisar por paciente, vacina, lote, campanha ou notificação oficial",
    filterLabel: "Estado",
    filterQueryField: "status",
    filterOptions: [
      { label: "Agendada", value: "SCHEDULED" },
      { label: "Aplicada", value: "ADMINISTERED" },
      { label: "Notificada", value: "REPORTED" },
      { label: "Isenta", value: "EXEMPT" },
      { label: "Cancelada", value: "CANCELLED" },
    ],
    primary: (row) => firstText(row, ["patient_name", "custom_id", "id"]),
    columns: [
      { header: "Vacina", render: (row) => textOrDash(row.vaccine_name || row.vaccine) },
      { header: "Lote", render: (row) => textOrDash(row.lot_number || row.lot) },
      { header: "Estado", render: (row) => statusBadge(row.status) },
      { header: "Dose", render: (row) => textOrDash(row.dose_number) },
      { header: "Aplicada em", render: (row) => formatDateTime(row.administered_at) },
      { header: "Próxima dose", render: (row) => formatDate(row.next_due_date) },
    ],
  },
  adverse_event: {
    key: "adverse_event",
    segment: "adverse-events",
    endpoint: "/public_health/adverse_event/",
    adminHref: "/admin/saude_publica/adverseeventfollowingimmunization/",
    title: "Eventos Adversos AEFI",
    singular: "Evento adverso AEFI",
    primaryHeader: "Paciente",
    description: "AEFI, gravidade, investigação, sintomas, desfecho e causalidade.",
    createHint: "Registe o AEFI a partir do registo de imunização e detalhe sintomas e gravidade.",
    detailHint: "Consulte investigação, gravidade, desfecho e notificação oficial do AEFI.",
    editHint: "Atualize a investigação mantendo paciente, vacina e lote coerentes com a imunização.",
    searchPlaceholder: "Pesquisar por paciente, vacina, lote, sintomas ou notificação oficial",
    filterLabel: "Estado",
    filterQueryField: "status",
    filterOptions: [
      { label: "Reportado", value: "REPORTED" },
      { label: "Em investigação", value: "UNDER_INVESTIGATION" },
      { label: "Resolvido", value: "RESOLVED" },
      { label: "Descartado", value: "DISCARDED" },
      { label: "Enviado à autoridade", value: "SENT_TO_AUTHORITY" },
    ],
    primary: (row) => firstText(row, ["patient_name", "custom_id", "id"]),
    columns: [
      { header: "Vacina", render: (row) => textOrDash(row.vaccine_name || row.vaccine) },
      { header: "Gravidade", render: (row) => statusBadge(row.severity) },
      { header: "Estado", render: (row) => statusBadge(row.status) },
      { header: "Grave", render: (row) => boolLabel(row.serious) },
      { header: "Reportado em", render: (row) => formatDateTime(row.reported_at) },
      { header: "Investigar até", render: (row) => formatDateTime(row.investigation_due_at) },
    ],
  },
  notification: {
    key: "notification",
    segment: "notifications",
    endpoint: "/public_health/notification/",
    adminHref: "/admin/saude_publica/publichealthnotification/",
    title: "Notificações Oficiais",
    singular: "Notificação oficial",
    primaryHeader: "Referência",
    description: "Integração e-SUS, SIPNI, DHIS2 ou sistemas oficiais customizados.",
    createHint: "Crie a notificação oficial vinculando imunização, AEFI ou cobertura de campanha.",
    detailHint: "Consulte payload, resposta, tentativas e estado da integração oficial.",
    editHint: "Atualize estado, resposta e próxima tentativa mantendo o vínculo clínico.",
    searchPlaceholder: "Pesquisar por referência externa, erro, sistema ou código",
    filterLabel: "Estado",
    filterQueryField: "status",
    filterOptions: [
      { label: "Pendente", value: "PENDING" },
      { label: "Enviando", value: "SENDING" },
      { label: "Enviado", value: "SENT" },
      { label: "Aceito", value: "ACCEPTED" },
      { label: "Rejeitado", value: "REJECTED" },
      { label: "Falhou", value: "FAILED" },
    ],
    primary: (row) => firstText(row, ["external_reference", "custom_id", "id"]),
    columns: [
      { header: "Sistema", render: (row) => humanize(row.official_system) },
      { header: "Evento", render: (row) => humanize(row.event_type) },
      { header: "Estado", render: (row) => statusBadge(row.status) },
      { header: "Tentativas", render: (row) => textOrDash(row.attempt_count) },
      { header: "Próxima tentativa", render: (row) => formatDateTime(row.next_retry_at) },
      { header: "Enviado em", render: (row) => formatDateTime(row.sent_at) },
    ],
  },
}

export function PublicHealthListPage({ resourceKey }: { resourceKey: PublicHealthResourceKey }) {
  const { loading } = useAuthGuard()
  const { t, tr } = useLanguage()
  const config = resourceConfig(resourceKey)
  const [search, setSearch] = useState("")
  const [filterValue, setFilterValue] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [rows, setRows] = useState<Row[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debouncedSearch = useDebounce(search, 300)
  const safeRefreshToken = useSafeDataRefreshSignal()
  const createAvailable = hasOpenApiMethod(config.endpoint, "post")

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, filterValue, pageSize])

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoadingData(true)
        setError(null)
        const query: Record<string, string | number | boolean | null | undefined> = {}
        if (debouncedSearch.trim()) query.search = debouncedSearch.trim()
        if (filterValue && config.filterQueryField) query[config.filterQueryField] = filterValue

        const response = await apiFetchList<Row>(config.endpoint, {
          page,
          pageSize,
          query,
          clientCacheTtlMs: 30000,
          clientCache: safeRefreshToken === 0,
        })

        if (!mounted) return
        const items = Array.isArray(response.items) ? response.items : []
        const total = response.meta.total ?? items.length
        const computedTotalPages =
          response.meta.totalPages ??
          (total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1)

        setRows(items)
        setTotalItems(total || 0)
        setTotalPages(computedTotalPages)
        if (page > computedTotalPages) setPage(computedTotalPages)
      } catch (err: any) {
        if (mounted) setError(err?.message || t("Falha ao carregar dados.", "Failed to load data."))
      } finally {
        if (mounted) setLoadingData(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [config, debouncedSearch, filterValue, page, pageSize, safeRefreshToken, t])

  const columns = useMemo(
    () => [
      {
        header: config.primaryHeader,
        render: (row: Row) => (
          <Link
            href={resourceDetailHref(config, row)}
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            {config.primary(row)}
          </Link>
        ),
      },
      ...config.columns,
    ],
    [config]
  )

  if (loading) return null

  return (
    <AppLayout requiredGroups={PUBLIC_HEALTH_GROUPS}>
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <PageHeader
          title={config.title}
          subtitle={config.description}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {createAvailable ? (
                <Link
                  href={`/public-health/${config.segment}/new`}
                  className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary-hover"
                >
                  {createResourceActionLabel(config.singular)}
                </Link>
              ) : null}
              <Link
                href="/public-health"
                className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground-2 shadow-sm transition hover:bg-muted"
              >
                {t("Voltar ao módulo", "Back to module")}
              </Link>
            </div>
          }
        />

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 xl:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Pesquisar", "Search")}
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={config.searchPlaceholder}
                  className="h-9 w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring"
                />
              </div>
            </label>

            {config.filterOptions?.length ? (
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {config.filterLabel || t("Filtro", "Filter")}
                </span>
                <select
                  value={filterValue}
                  onChange={(event) => setFilterValue(event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring"
                >
                  <option value="">{t("Todos", "All")}</option>
                  {config.filterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {tr(option.label)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("Por página", "Per page")}
              </span>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none focus-visible:border-ring"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {t("Total:", "Total:")} {totalItems} · {t("Nesta página:", "On this page:")} {rows.length}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch("")
                setFilterValue("")
                setPageSize(50)
                setPage(1)
              }}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-card px-2.5 font-semibold text-foreground-2 shadow-sm transition hover:bg-muted"
            >
              <RotateCcw size={12} />
              {t("Limpar filtros", "Clear filters")}
            </button>
          </div>
        </div>

        {loadingData ? (
          <div className="text-sm text-muted-foreground">{t("Carregando...", "Loading...")}</div>
        ) : (
          <>
            <DataTable<Row>
              columns={columns}
              data={rows}
              emptyMessage={t("Nenhum registo encontrado.", "No record found.")}
              searchable={false}
            />
            <div className="text-xs text-muted-foreground">
              {t("Página", "Page")} {page} {t("de", "of")} {totalPages}
            </div>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </AppLayout>
  )
}

export function PublicHealthCreatePage({ resourceKey }: { resourceKey: PublicHealthResourceKey }) {
  useAuthGuard()
  const { t, language } = useLanguage()
  const router = useRouter()
  const config = resourceConfig(resourceKey)
  const createAvailable = hasOpenApiMethod(config.endpoint, "post")
  const createLabel = createResourceActionLabel(config.singular, language)

  return (
    <AppLayout requiredGroups={PUBLIC_HEALTH_GROUPS}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <PageHeader
          title={createAvailable ? createLabel : t("Criação indisponível", "Creation unavailable")}
          subtitle={createAvailable ? config.createHint : t("Este recurso não expõe criação no contrato atual.", "This resource does not expose creation in the current contract.")}
          actions={<BackToListLink config={config} />}
        />

        {createAvailable ? (
          <AutoForm
            endpoint={config.endpoint}
            method="post"
            submitLabel={createLabel}
            config={getResourceFormConfig("public_health", config.key, config.endpoint)}
            onSuccess={(data) => {
              const id = primaryRecordId(data)
              if (id !== null) {
                router.push(`/public-health/${config.segment}/${encodeURIComponent(String(id))}`)
                return
              }
              router.push(`/public-health/${config.segment}`)
            }}
          />
        ) : null}
      </div>
    </AppLayout>
  )
}

export function PublicHealthDetailPage({ resourceKey }: { resourceKey: PublicHealthResourceKey }) {
  useAuthGuard()
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const config = resourceConfig(resourceKey)
  const [data, setData] = useState<Row | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const detailEndpoint = `${config.endpoint}${encodeURIComponent(id)}/`
  const detailContract = `${config.endpoint.replace(/\/$/, "")}/{id}/`
  const canEdit = hasWriteContract(detailContract, "put")
  const canDelete = hasOpenApiMethod(detailContract, "delete")

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoadingData(true)
        setError(null)
        const payload = await apiFetch<Row>(detailEndpoint, { clientCacheTtlMs: 30000 })
        if (mounted) setData(payload)
      } catch (err: any) {
        if (mounted) {
          setError(
            isNotFoundLikeError(err)
              ? t("Registo não encontrado.", "Record not found.")
              : err?.message || t("Erro ao carregar registo.", "Failed to load record.")
          )
        }
      } finally {
        if (mounted) setLoadingData(false)
      }
    }

    if (id) load()
    return () => {
      mounted = false
    }
  }, [detailEndpoint, id, t])

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await apiFetch(detailEndpoint, { method: "DELETE" })
      router.push(`/public-health/${config.segment}`)
    } catch (err: any) {
      setError(err?.message || t("Erro ao apagar registo.", "Failed to delete record."))
    } finally {
      setDeleting(false)
    }
  }

  const title = data ? config.primary(data) : `${config.singular} #${id}`

  return (
    <AppLayout requiredGroups={PUBLIC_HEALTH_GROUPS}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <PageHeader
          title={title}
          subtitle={config.detailHint}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {canEdit ? (
                <Link
                  href={`/public-health/${config.segment}/${encodeURIComponent(id)}/edit`}
                  className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground-2 shadow-sm transition hover:bg-muted"
                >
                  {t("Editar", "Edit")}
                </Link>
              ) : null}
              {canDelete ? (
                <ConfirmDialog
                  title={t("Apagar registo", "Delete record")}
                  message={t("Esta ação apaga o registo selecionado.", "This action deletes the selected record.")}
                  confirmText={t("Apagar", "Delete")}
                  onConfirm={handleDelete}
                  disabled={deleting}
                >
                  <button
                    type="button"
                    disabled={deleting}
                    className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {deleting ? t("Apagando...", "Deleting...") : t("Apagar", "Delete")}
                  </button>
                </ConfirmDialog>
              ) : null}
              <BackToListLink config={config} />
            </div>
          }
        />

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        {loadingData ? (
          <div className="text-sm text-muted-foreground">{t("Carregando...", "Loading...")}</div>
        ) : data ? (
          <ResourceDetailsCard endpoint={config.endpoint} data={data} />
        ) : null}
      </div>
    </AppLayout>
  )
}

export function PublicHealthEditPage({ resourceKey }: { resourceKey: PublicHealthResourceKey }) {
  useAuthGuard()
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const config = resourceConfig(resourceKey)
  const [data, setData] = useState<Row | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const detailEndpoint = `${config.endpoint}${encodeURIComponent(id)}/`
  const detailContract = `${config.endpoint.replace(/\/$/, "")}/{id}/`
  const canUpdate = hasWriteContract(detailContract, "put")

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        setLoadingData(true)
        setError(null)
        const payload = await apiFetch<Row>(detailEndpoint, { clientCacheTtlMs: 30000 })
        if (mounted) setData(payload)
      } catch (err: any) {
        if (mounted) {
          setError(
            isNotFoundLikeError(err)
              ? t("Registo não encontrado.", "Record not found.")
              : err?.message || t("Erro ao carregar registo.", "Failed to load record.")
          )
        }
      } finally {
        if (mounted) setLoadingData(false)
      }
    }

    if (id && canUpdate) load()
    return () => {
      mounted = false
    }
  }, [canUpdate, detailEndpoint, id, t])

  return (
    <AppLayout requiredGroups={PUBLIC_HEALTH_GROUPS}>
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <PageHeader
          title={`${t("Editar", "Edit")} ${config.singular}`}
          subtitle={canUpdate ? config.editHint : t("Este recurso não expõe edição no contrato atual.", "This resource does not expose editing in the current contract.")}
          actions={
            <Link
              href={`/public-health/${config.segment}/${encodeURIComponent(id)}`}
              className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground-2 shadow-sm transition hover:bg-muted"
            >
              {t("Voltar", "Back")}
            </Link>
          }
        />

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        {canUpdate ? (
          loadingData ? (
            <div className="text-sm text-muted-foreground">{t("Carregando...", "Loading...")}</div>
          ) : data ? (
            <AutoForm
              endpoint={detailEndpoint}
              method="put"
              initialValues={data}
              submitLabel={t("Guardar alterações", "Save changes")}
              config={getResourceFormConfig("public_health", config.key, config.endpoint)}
              onSuccess={() => router.push(`/public-health/${config.segment}/${encodeURIComponent(id)}`)}
            />
          ) : null
        ) : null}
      </div>
    </AppLayout>
  )
}

function resourceConfig(key: PublicHealthResourceKey): PublicHealthResourceConfig {
  return RESOURCE_CONFIGS[key]
}

function BackToListLink({ config }: { config: PublicHealthResourceConfig }) {
  const { t } = useLanguage()
  return (
    <Link
      href={`/public-health/${config.segment}`}
      className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground-2 shadow-sm transition hover:bg-muted"
    >
      {t("Voltar à lista", "Back to list")}
    </Link>
  )
}

function resourceDetailHref(config: PublicHealthResourceConfig, row: Row): string {
  const id = primaryRecordId(row)
  return `/public-health/${config.segment}/${encodeURIComponent(String(id ?? ""))}`
}

function firstText(row: Row, keys: string[]): string {
  for (const key of keys) {
    const value = row?.[key]
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim()
  }
  return "-"
}

function textOrDash(value: any): string {
  if (value === undefined || value === null || value === "") return "-"
  return String(value)
}

function humanize(value: any): string {
  if (value === undefined || value === null || value === "") return "-"
  return String(value).replace(/_/g, " ")
}

function boolLabel(value: any): string {
  if (value === true) return "Sim"
  if (value === false) return "Não"
  return "-"
}

function daysLabel(value: any): string {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return "-"
  return `${parsed} dias`
}

function tempRange(minC: any, maxC: any): string {
  if ((minC === undefined || minC === null || minC === "") && (maxC === undefined || maxC === null || maxC === "")) return "-"
  if (minC !== undefined && minC !== null && minC !== "" && maxC !== undefined && maxC !== null && maxC !== "") {
    return `${minC} - ${maxC} C`
  }
  return `${minC || maxC} C`
}

function formatDate(value: any): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString()
}

function formatDateTime(value: any): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function formatPercent(value: any): string {
  const parsed = Number(value ?? 0)
  if (!Number.isFinite(parsed)) return "0.00%"
  return `${parsed.toFixed(2)}%`
}

function statusBadge(value: any): ReactNode {
  const status = String(value || "-")
  return <Badge variant={statusVariant(status)}>{humanize(status)}</Badge>
}

function statusVariant(status: string): "default" | "success" | "warning" | "danger" | "info" {
  const value = status.toUpperCase()
  if (["ACTIVE", "ADMINISTERED", "REPORTED", "SENT", "ACCEPTED", "OK", "COMPLETED", "RESOLVED"].includes(value)) return "success"
  if (["PLANNED", "PENDING", "SCHEDULED", "WARNING", "RECEIVED", "PAUSED", "UNDER_INVESTIGATION", "SENDING"].includes(value)) return "warning"
  if (["FAILED", "REJECTED", "EXPIRED", "RECALLED", "BREACH", "CRITICAL", "SEVERE", "CANCELLED", "DISCARDED"].includes(value)) return "danger"
  return "info"
}
