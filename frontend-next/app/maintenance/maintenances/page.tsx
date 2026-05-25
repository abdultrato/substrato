"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, ClipboardList, RefreshCcw, Wrench } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import DataTable from "@/components/ui/DataTable"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { apiFetch, apiFetchList } from "@/lib/api"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type IncidentRow = {
  id: number
  custom_id?: string
  equipment: number
  equipment_name?: string
  equipment_serial_number?: string
  date?: string
  type?: string
  status?: string
  description?: string
  support_contact?: string
  post_incident_actions?: string
  maintenance_status?: string
  latest_maintenance?: {
    custom_id?: string
    maintenance_type?: string
    scheduled_date?: string
    performed_date?: string
    technician?: string
    description?: string
  } | null
}

type MaintenanceRow = {
  id: number
  custom_id?: string
  incident?: number | null
  incident_code?: string
  equipment?: number
  equipment_name?: string
  maintenance_type?: string
  maintenance_type_display?: string
  scheduled_date?: string
  performed_date?: string
  technician?: string
  status?: string
}

type MaintenanceForm = {
  maintenance_type: "PREVENTIVA" | "CORRECTIVA"
  type: "DIARIA" | "SEMANAL" | "MENSAL" | "SEMESTRAL" | "ANUAL"
  scheduled_date: string
  performed_date: string
  technician: string
  description: string
  post_incident_actions: string
}

const MAINTENANCE_TYPES = [
  { value: "CORRECTIVA", label: "Correctiva" },
  { value: "PREVENTIVA", label: "Preventiva" },
] as const

const RECURRENCES = [
  { value: "DIARIA", label: "Diária" },
  { value: "SEMANAL", label: "Semanal" },
  { value: "MENSAL", label: "Mensal" },
  { value: "SEMESTRAL", label: "Semestral" },
  { value: "ANUAL", label: "Anual" },
] as const

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(value?: string | null): string {
  if (!value) return "-"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleString()
}

function code(row: { custom_id?: string; id?: number | string | null }): string {
  return row.custom_id || (row.id ? String(row.id) : "-")
}

function buildInitialForm(): MaintenanceForm {
  const today = todayIso()
  return {
    maintenance_type: "CORRECTIVA",
    type: "MENSAL",
    scheduled_date: today,
    performed_date: today,
    technician: "",
    description: "",
    post_incident_actions: "",
  }
}

export default function MaintenanceMaintenancesPage() {
  const { loading } = useAuthGuard()
  const { t, tr } = useLanguage()
  const [incidents, setIncidents] = useState<IncidentRow[]>([])
  const [maintenances, setMaintenances] = useState<MaintenanceRow[]>([])
  const [selectedIncident, setSelectedIncident] = useState<IncidentRow | null>(null)
  const [form, setForm] = useState<MaintenanceForm>(() => buildInitialForm())
  const [loadingData, setLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function loadData() {
    setLoadingData(true)
    setError(null)
    try {
      const [incidentRes, maintenanceRes] = await Promise.all([
        apiFetchList<IncidentRow>("/incidents/incidents/?requires_maintenance=true&resolved=false", {
          pageSize: 100,
          clientCache: false,
        }),
        apiFetchList<MaintenanceRow>("/maintenance/maintenances/", {
          pageSize: 50,
          clientCache: false,
        }),
      ])
      setIncidents(incidentRes.items)
      setMaintenances(maintenanceRes.items)
      if (selectedIncident && !incidentRes.items.some((item) => item.id === selectedIncident.id)) {
        setSelectedIncident(null)
      }
    } catch (err: any) {
      setError(err?.message || "Falha ao carregar manutenções.")
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    loadData().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedContext = useMemo(() => selectedIncident, [selectedIncident])

  function selectIncident(incident: IncidentRow) {
    setSelectedIncident(incident)
    setForm(buildInitialForm())
    setMessage(null)
    setError(null)
  }

  async function submitMaintenance() {
    if (!selectedIncident) return
    if (!form.maintenance_type) {
      setError("Indique se a manutenção é preventiva ou correctiva.")
      return
    }

    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      await apiFetch(`/equipment/incident/${selectedIncident.id}/realizar-manutencao/`, {
        method: "POST",
        clientCache: false,
        body: JSON.stringify(form),
      })
      setMessage("Manutenção registada e ocorrência atualizada.")
      setSelectedIncident(null)
      setForm(buildInitialForm())
      await loadData()
    } catch (err: any) {
      setError(err?.message || "Falha ao registar manutenção.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("equipment")}>
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <PageHeader
          title={t("Manutenção de equipamentos", "Equipment maintenance")}
          subtitle={t(
            "Ocorrências com equipamento entram aqui como pedidos de manutenção para execução técnica.",
            "Equipment incidents enter this queue as maintenance requests."
          )}
          actions={
            <button
              type="button"
              onClick={() => loadData().catch(() => {})}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <RefreshCcw size={14} />
              {t("Atualizar", "Refresh")}
            </button>
          }
        />

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}
        {message ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ClipboardList size={16} />
            {t("Pedidos vindos de ocorrências", "Requests from incidents")}
          </div>

          {loadingData ? (
            <div className="text-sm text-muted-foreground">{t("Carregando...", "Loading...")}</div>
          ) : incidents.length ? (
            <div className="grid gap-3">
              {incidents.map((incident) => (
                <article key={incident.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-foreground">
                          {code(incident)}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {incident.equipment_name || `Equipamento #${incident.equipment}`}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {incident.equipment_serial_number || ""}
                        </span>
                      </div>
                      <p className="max-w-3xl whitespace-pre-wrap text-sm text-foreground">
                        {incident.description || "-"}
                      </p>
                      <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                        <span>{t("Data", "Date")}: {fmtDate(incident.date)}</span>
                        <span>{t("Tipo", "Type")}: {tr(incident.type || "-")}</span>
                        <span>{t("Estado", "Status")}: {tr(incident.maintenance_status || incident.status || "-")}</span>
                      </div>
                      {incident.support_contact ? (
                        <div className="text-xs text-muted-foreground">
                          {t("Contacto", "Contact")}: {incident.support_contact}
                        </div>
                      ) : null}
                      {incident.post_incident_actions ? (
                        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
                          <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                            {t("Ações após ocorrência", "Post-incident actions")}
                          </div>
                          <div className="whitespace-pre-wrap">{incident.post_incident_actions}</div>
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => selectIncident(incident)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-[var(--primary-600)] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)]"
                    >
                      <Wrench size={15} />
                      {t("Realizar manutenção", "Perform maintenance")}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground">
              {t("Não há ocorrências de equipamento pendentes para manutenção.", "No equipment incidents pending maintenance.")}
            </div>
          )}
        </section>

        {selectedContext ? (
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle2 size={16} />
              {t("Execução da manutenção", "Maintenance execution")} · {code(selectedContext)}
            </div>

            <div className="mb-4 grid gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">{t("Equipamento", "Equipment")}</div>
                <div className="text-foreground">{selectedContext.equipment_name || selectedContext.equipment}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">{t("Ocorrência", "Incident")}</div>
                <div className="text-foreground">{selectedContext.description || "-"}</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium text-foreground">{t("Tipo de manutenção", "Maintenance type")} *</span>
                <select
                  value={form.maintenance_type}
                  onChange={(event) => setForm((prev) => ({ ...prev, maintenance_type: event.target.value as MaintenanceForm["maintenance_type"] }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  {MAINTENANCE_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-foreground">{t("Recorrência/plano", "Schedule type")}</span>
                <select
                  value={form.type}
                  onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as MaintenanceForm["type"] }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  {RECURRENCES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-foreground">{t("Data programada", "Scheduled date")}</span>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, scheduled_date: event.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-foreground">{t("Data executada", "Performed date")}</span>
                <input
                  type="date"
                  value={form.performed_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, performed_date: event.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-foreground">{t("Técnico", "Technician")}</span>
                <input
                  value={form.technician}
                  onChange={(event) => setForm((prev) => ({ ...prev, technician: event.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>

              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium text-foreground">{t("Trabalho realizado", "Work performed")}</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>

              <label className="space-y-1 text-sm md:col-span-2">
                <span className="font-medium text-foreground">{t("Ações após ocorrência", "Post-incident actions")}</span>
                <textarea
                  value={form.post_incident_actions}
                  onChange={(event) => setForm((prev) => ({ ...prev, post_incident_actions: event.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={submitMaintenance}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary-600)] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:opacity-60"
              >
                <CheckCircle2 size={15} />
                {submitting ? t("Registando...", "Saving...") : t("Concluir manutenção", "Complete maintenance")}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                disabled={submitting}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                {t("Cancelar", "Cancel")}
              </button>
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Wrench size={16} />
            {t("Manutenções recentes", "Recent maintenances")}
          </div>
          <DataTable<MaintenanceRow>
            searchable
            searchKeys={["custom_id", "incident_code", "equipment_name", "technician", "maintenance_type_display"]}
            emptyMessage={t("Nenhuma manutenção registada.", "No maintenance recorded.")}
            data={maintenances}
            columns={[
              {
                header: t("Código", "Code"),
                render: (row) => (
                  <Link href={`/maintenance/maintenances/${row.id}`} className="font-semibold text-foreground hover:text-[var(--hover-accent)]">
                    {code(row)}
                  </Link>
                ),
              },
              { header: t("Ocorrência", "Incident"), render: (row) => row.incident_code || row.incident || "-" },
              { header: t("Equipamento", "Equipment"), render: (row) => row.equipment_name || row.equipment || "-" },
              { header: t("Tipo", "Type"), render: (row) => row.maintenance_type_display || tr(row.maintenance_type || "-") },
              { header: t("Executada em", "Performed at"), render: (row) => fmtDate(row.performed_date) },
              { header: t("Técnico", "Technician"), render: (row) => row.technician || "-" },
            ]}
          />
        </section>
      </div>
    </AppLayout>
  )
}
