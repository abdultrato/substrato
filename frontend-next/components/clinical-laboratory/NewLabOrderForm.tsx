"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { SearchableRelationSelect, SearchableMultiSelect } from "@/components/form/AutoForm"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import {
  relationOptionFromRow,
  type RelationOption,
  type RelationTarget,
} from "@/lib/resources/relationOptions"

const ORDER_ENDPOINT = "/clinical_laboratory/order/"
const ORDER_ITEM_ENDPOINT = "/clinical_laboratory/order_item/"
const PANEL_ENDPOINT = "/clinical_laboratory/panel/"

const PATIENT_TARGET: RelationTarget = {
  endpoint: "/clinical/patient/",
  labelFields: ["name", "document_number", "custom_id"],
}
const COMPANY_TARGET: RelationTarget = {
  endpoint: "/external_entities/empresa/",
  labelFields: ["name", "nuit", "custom_id"],
}
// Filtra os painéis ocupacionais; a pesquisa por nome é acrescentada pelo picker.
const OCCUPATIONAL_TARGET: RelationTarget = {
  endpoint: "/clinical_laboratory/panel/?profile_type=occupational",
  labelFields: ["name", "occupation", "code"],
}
const TEST_TARGET: RelationTarget = {
  endpoint: "/clinical_laboratory/test/",
  labelFields: ["name", "code"],
}

const PRIORITY_OPTIONS = [
  { value: "ROTINA", label: "Rotina" },
  { value: "URGENTE", label: "Urgente" },
  { value: "STAT", label: "STAT (emergência)" },
  { value: "AGENDADO", label: "Agendado" },
]

type LabTestDetail = {
  id?: number
  name?: string
  code?: string
  sector?: number | string | null
  sector_name?: string | null
  sector_code?: string | null
}

type SectorChip = {
  key: string
  name: string
  code?: string
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
      {children}
      {required ? " *" : ""}
    </span>
  )
}

function normalizeTestId(value: any): number | null {
  const id = Number(value)
  return Number.isFinite(id) ? id : null
}

function sectorChipFromTest(test?: LabTestDetail | null): SectorChip | null {
  if (!test) return null
  const sectorId = test.sector !== null && test.sector !== undefined ? String(test.sector) : ""
  const code = String(test.sector_code || "").trim()
  const name = String(test.sector_name || "").trim()
  const key = sectorId || code || name
  if (!key) return null
  return {
    key,
    name: name || code || `#${key}`,
    code: code || undefined,
  }
}

export default function NewLabOrderForm() {
  const { t } = useLanguage()
  const router = useRouter()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const requiredGroups = requiredGroupsForResourceGroup("clinical_laboratory")

  const [patient, setPatient] = useState<number | null>(null)
  const [company, setCompany] = useState<number | null>(null)
  const [profile, setProfile] = useState<number | null>(null)
  const [tests, setTests] = useState<number[]>([])
  // Rótulos conhecidos dos exames (para os chips mostrarem nome, não #id),
  // semeados a partir dos exames que vêm de um perfil ocupacional.
  const [testOptions, setTestOptions] = useState<RelationOption[]>([])
  const [testDetailsById, setTestDetailsById] = useState<Record<string, LabTestDetail>>({})
  const [priority, setPriority] = useState("ROTINA")
  const [indication, setIndication] = useState("")
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingTestSectors, setLoadingTestSectors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const missingTestIds = tests.filter((id) => !testDetailsById[String(id)])
    if (!missingTestIds.length) {
      setLoadingTestSectors(false)
      return
    }

    let active = true
    setLoadingTestSectors(true)

    async function loadSelectedTests() {
      const rows = await Promise.all(
        missingTestIds.map(async (id) => {
          try {
            return await apiFetch<LabTestDetail>(`${TEST_TARGET.endpoint}${id}/`, {
              clientCache: safeRefreshToken === 0,
              clientCacheTtlMs: 60000,
            })
          } catch {
            return null
          }
        })
      )

      if (!active) return
      setTestDetailsById((current) => {
        const next = { ...current }
        rows.forEach((row, index) => {
          const id = normalizeTestId(row?.id) ?? missingTestIds[index]
          if (id) next[String(id)] = row || { id }
        })
        return next
      })
      setLoadingTestSectors(false)
    }

    loadSelectedTests().catch(() => {
      if (active) setLoadingTestSectors(false)
    })

    return () => {
      active = false
    }
  }, [safeRefreshToken, testDetailsById, tests])

  const sectorChips = useMemo(() => {
    const byKey = new Map<string, SectorChip>()
    for (const testId of tests) {
      const chip = sectorChipFromTest(testDetailsById[String(testId)])
      if (chip && !byKey.has(chip.key)) byKey.set(chip.key, chip)
    }
    return Array.from(byKey.values())
  }, [testDetailsById, tests])

  // Ao escolher o perfil ocupacional, junta automaticamente os exames do perfil
  // à seleção (sem duplicar) — item §4.
  async function handleProfileChange(nextProfile: number | null) {
    setProfile(nextProfile)
    if (!nextProfile) return
    setError(null)
    setLoadingProfile(true)
    try {
      const panel = await apiFetch<Record<string, any>>(`${PANEL_ENDPOINT}${nextProfile}/`, {
        clientCache: false,
      })
      const profileTests: number[] = Array.isArray(panel?.tests)
        ? panel.tests.map((value: any) => Number(value)).filter((n: number) => Number.isFinite(n))
        : []
      setTests((current) => Array.from(new Set([...current, ...profileTests])))

      // Resolve os nomes dos exames do perfil para os chips não mostrarem #id.
      const resolved = await Promise.all(
        profileTests.map(async (id) => {
          try {
            const row = await apiFetch<LabTestDetail>(`${TEST_TARGET.endpoint}${id}/`, {
              clientCache: safeRefreshToken === 0,
              clientCacheTtlMs: 60000,
            })
            return row
          } catch {
            return null
          }
        })
      )
      const rows = resolved.filter(Boolean) as LabTestDetail[]
      const options = rows
        .map((row) => relationOptionFromRow(row as Record<string, any>, TEST_TARGET))
        .filter(Boolean) as RelationOption[]
      if (rows.length) {
        setTestDetailsById((current) => {
          const next = { ...current }
          for (const row of rows) {
            const id = normalizeTestId(row.id)
            if (id) next[String(id)] = row
          }
          return next
        })
      }
      if (options.length) {
        setTestOptions((current) => {
          const byValue = new Map(current.map((option) => [option.value, option]))
          for (const option of options) byValue.set(option.value, option)
          return Array.from(byValue.values())
        })
      }
    } catch (e: any) {
      setError(
        isNotFoundLikeError(e)
          ? t("Perfil não encontrado.", "Profile not found.")
          : e?.message || t("Falha ao carregar os exames do perfil.", "Failed to load profile tests.")
      )
    } finally {
      setLoadingProfile(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!patient) {
      setError(t("Selecione o paciente.", "Select the patient."))
      return
    }
    if (!tests.length) {
      setError(t("Selecione pelo menos um exame.", "Select at least one test."))
      return
    }

    setSubmitting(true)
    try {
      const order = await apiFetch<Record<string, any>>(ORDER_ENDPOINT, {
        method: "POST",
        body: JSON.stringify({
          patient,
          requesting_company: company,
          priority,
          clinical_indication: indication.trim(),
        }),
      })
      const orderId = order?.id
      if (!orderId) throw new Error(t("Falha ao criar a requisição.", "Failed to create the order."))

      // Cria um item por exame selecionado.
      await Promise.all(
        tests.map((testId) =>
          apiFetch(ORDER_ITEM_ENDPOINT, {
            method: "POST",
            body: JSON.stringify({ order: orderId, test: testId }),
          })
        )
      )

      router.push(`/resources/clinical_laboratory/order/${orderId}`)
    } catch (e: any) {
      setError(
        isNotFoundLikeError(e)
          ? t("Registo não encontrado.", "Record not found.")
          : e?.message || t("Falha ao criar a requisição.", "Failed to create the order.")
      )
      setSubmitting(false)
    }
  }

  return (
    <AppLayout requiredGroups={requiredGroups}>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageHeader
          title={t("Nova requisição", "New lab order")}
          subtitle={t(
            "Selecione o paciente, os exames e (se aplicável) um perfil ocupacional.",
            "Select the patient, the tests and (if applicable) an occupational profile."
          )}
        />

        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm"
        >
          <label className="grid gap-1" data-form-field="patient">
            <FieldLabel required>{t("Paciente", "Patient")}</FieldLabel>
            <SearchableRelationSelect
              fieldName="patient"
              value={patient}
              onChange={(value: any) => setPatient(value ?? null)}
              target={PATIENT_TARGET}
              safeRefreshToken={safeRefreshToken}
              placeholder={t("Pesquisar paciente...", "Search patient...")}
            />
          </label>

          <label className="grid gap-1" data-form-field="requesting_company">
            <FieldLabel>{t("Companhia solicitante", "Requesting company")}</FieldLabel>
            <SearchableRelationSelect
              fieldName="requesting_company"
              value={company}
              onChange={(value: any) => setCompany(value ?? null)}
              target={COMPANY_TARGET}
              safeRefreshToken={safeRefreshToken}
              placeholder={t("Pesquisar companhia...", "Search company...")}
            />
          </label>

          <label className="grid gap-1" data-form-field="occupational_profile">
            <FieldLabel>{t("Perfil ocupacional", "Occupational profile")}</FieldLabel>
            <SearchableRelationSelect
              fieldName="occupational_profile"
              value={profile}
              onChange={(value: any) => void handleProfileChange(value ?? null)}
              target={OCCUPATIONAL_TARGET}
              safeRefreshToken={safeRefreshToken}
              placeholder={t("Pesquisar perfil ocupacional...", "Search occupational profile...")}
            />
            <span className="text-[11px] text-[var(--gray-500)]">
              {loadingProfile
                ? t("A carregar exames do perfil...", "Loading profile tests...")
                : t(
                    "Ao escolher um perfil, os seus exames são adicionados automaticamente.",
                    "Selecting a profile adds its tests automatically."
                  )}
            </span>
          </label>

          <label className="grid gap-1" data-form-field="tests">
            <FieldLabel required>{t("Exames", "Tests")}</FieldLabel>
            <SearchableMultiSelect
              fieldName="tests"
              value={tests}
              onChange={(value: number[]) => setTests(value)}
              target={TEST_TARGET}
              initialOptions={testOptions}
              safeRefreshToken={safeRefreshToken}
              placeholder={t("Pesquisar e adicionar exames...", "Search and add tests...")}
            />
          </label>

          <div className="grid gap-1" data-form-field="sectors">
            <FieldLabel>{t("Sectores", "Sectors")}</FieldLabel>
            <div className="min-h-11 rounded-md border border-[var(--border)] bg-[var(--gray-50)] px-3 py-2">
              {sectorChips.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {sectorChips.map((sector) => (
                    <span
                      key={sector.key}
                      className="inline-flex min-h-7 items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-medium text-[var(--text)]"
                    >
                      {sector.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-[var(--gray-500)]">
                  {loadingTestSectors
                    ? t("A calcular sectores...", "Calculating sectors...")
                    : t("—", "—")}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <FieldLabel>{t("Prioridade", "Priority")}</FieldLabel>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="min-h-11 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] shadow-sm outline-none focus:border-[var(--primary-500)] focus:ring-2 focus:ring-[var(--primary-100)]"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-1">
            <FieldLabel>{t("Indicação clínica", "Clinical indication")}</FieldLabel>
            <textarea
              value={indication}
              onChange={(e) => setIndication(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] shadow-sm outline-none focus:border-[var(--primary-500)] focus:ring-2 focus:ring-[var(--primary-100)]"
              placeholder={t("Motivo clínico da requisição (opcional)", "Clinical reason (optional)")}
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-1">
            <span className="mr-auto text-xs text-[var(--gray-500)]">
              {tests.length
                ? t(`${tests.length} exame(s) selecionado(s)`, `${tests.length} test(s) selected`)
                : ""}
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--primary-600)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
              {submitting ? t("A criar...", "Creating...") : t("Criar requisição", "Create order")}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
