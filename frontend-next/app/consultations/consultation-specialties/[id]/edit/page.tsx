"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import {
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  Clipboard,
  Coins,
  Loader2,
  Pencil,
  Save,
  Stethoscope,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import MoneyValue from "@/components/ui/MoneyValue"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import { routeParamToString } from "@/lib/routeParams"

type Row = Record<string, any>

type SpecialtyFormState = {
  name: string
  description: string
  base_price: string
  vat_percentage: string
  active: boolean
}

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const TONES = [
  { grad: "from-sky-500 to-blue-600", bar: "bg-sky-500", panel: "from-sky-500/12 via-blue-500/10 to-cyan-500/8" },
  { grad: "from-emerald-500 to-teal-600", bar: "bg-emerald-500", panel: "from-emerald-500/12 via-teal-500/10 to-cyan-500/8" },
  { grad: "from-violet-500 to-purple-600", bar: "bg-violet-500", panel: "from-violet-500/12 via-purple-500/10 to-fuchsia-500/8" },
  { grad: "from-amber-500 to-orange-600", bar: "bg-amber-500", panel: "from-amber-500/12 via-orange-500/10 to-yellow-500/8" },
  { grad: "from-rose-500 to-pink-600", bar: "bg-rose-500", panel: "from-rose-500/12 via-pink-500/10 to-fuchsia-500/8" },
]

function toneFor(id: any) {
  const n = Number(id) || String(id).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return TONES[Math.abs(n) % TONES.length]
}

export default function ConsultationSpecialtiesEditPage() {
  const params = useParams()
  const router = useRouter()
  const id = routeParamToString(params?.id)
  const { t } = useLanguage()
  const { loading: authLoading } = useAuthGuard()
  const safeRefreshToken = useSafeDataRefreshSignal()

  const [specialty, setSpecialty] = useState<Row | null>(null)
  const [form, setForm] = useState<SpecialtyFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch<Row>(`/consultations/specialty/${id}/`, {
        clientCache: safeRefreshToken === 0,
      })
      setSpecialty(response || null)
      setForm({
        name: String(response?.name || ""),
        description: String(response?.description || ""),
        base_price: response?.base_price !== null && response?.base_price !== undefined ? String(response.base_price) : "",
        vat_percentage: response?.vat_percentage !== null && response?.vat_percentage !== undefined ? String(response.vat_percentage) : "",
        active: response?.active !== false,
      })
    } catch (e: any) {
      setError(
        isNotFoundLikeError(e)
          ? t("Especialidade não encontrada.", "Specialty not found.")
          : e?.message || t("Falha ao carregar especialidade.", "Failed to load specialty."),
      )
    } finally {
      setLoading(false)
    }
  }, [id, safeRefreshToken, t])

  useEffect(() => {
    load()
  }, [load])

  const tone = useMemo(() => toneFor(id), [id])
  const name = String(form?.name || specialty?.name || `${t("Especialidade", "Specialty")} ${id || ""}`).trim()
  const initial = name.charAt(0).toUpperCase() || "?"
  const pricePreview = useMemo(() => {
    const base = Number(form?.base_price)
    const vat = Number(form?.vat_percentage)
    if (!Number.isFinite(base)) return null
    const safeVat = Number.isFinite(vat) ? vat : 0
    return base * (1 + safeVat / 100)
  }, [form?.base_price, form?.vat_percentage])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!id || !form) return
    setFormError(null)

    const name = form.name.trim()
    if (!name) {
      setFormError(t("Informe o nome da especialidade.", "Provide the specialty name."))
      return
    }
    if (form.base_price.trim() && !Number.isFinite(Number(form.base_price))) {
      setFormError(t("Preço base inválido.", "Invalid base price."))
      return
    }
    if (form.vat_percentage.trim() && !Number.isFinite(Number(form.vat_percentage))) {
      setFormError(t("IVA inválido.", "Invalid VAT."))
      return
    }

    setSaving(true)
    try {
      await apiFetch(`/consultations/specialty/${id}/`, {
        method: "PUT",
        body: JSON.stringify({
          name,
          description: form.description.trim(),
          base_price: form.base_price.trim() || undefined,
          vat_percentage: form.vat_percentage.trim() || undefined,
          active: form.active,
        }),
      })
      router.push(`/consultations/consultation-specialties/${id}`)
    } catch (e: any) {
      setFormError(e?.message || t("Falha ao guardar alterações.", "Failed to save changes."))
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) return null

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("consultations")}>
      <div className="space-y-1.5">
        {loading ? (
          <div className={`${GLASS} flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground`}>
            <Loader2 size={16} className="animate-spin" /> {t("A carregar…", "Loading…")}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : form ? (
          <>
            <section className={`relative overflow-hidden ${GLASS} bg-gradient-to-br ${tone.panel}`}>
              <span className={`absolute left-0 top-0 h-full w-1 ${tone.bar}`} />
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/20 blur-3xl" />
              <div className="relative flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 pl-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone.grad} text-base font-bold text-white shadow-md`}>
                    {initial}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-base font-bold leading-tight text-foreground">{name}</h1>
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                        {t("Modo edição", "Edit mode")}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{specialty?.custom_id || `#${id}`}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/consultations/consultation-specialties/${id}`}
                    className="group inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/40 py-1.5 pl-1.5 pr-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:border-white/40 hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 transition group-hover:-translate-x-0.5 dark:text-sky-400">
                      <ArrowLeft size={14} />
                    </span>
                    {t("Voltar ao detalhe", "Back to detail")}
                  </Link>
                </div>
              </div>
            </section>

            <div className="grid gap-1.5 xl:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)]">
              <section className={`${GLASS} overflow-hidden`}>
                <div className="flex items-center gap-2 border-b border-white/20 px-3 py-2.5 pl-4 dark:border-white/10">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-sm">
                    <Pencil size={15} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">{t("Editar especialidade", "Edit specialty")}</h2>
                    <p className="text-[11px] text-muted-foreground">{t("Actualize nome, descrição, preço, IVA e disponibilidade.", "Update name, description, price, VAT and availability.")}</p>
                  </div>
                </div>

                <div className="p-3">
                  {formError ? (
                    <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
                      {formError}
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmit} className="space-y-2.5">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">{t("Nome", "Name")}</span>
                        <input
                          value={form.name}
                          onChange={(e) => setForm((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                          className="w-full rounded-lg border border-white/30 bg-white/55 px-2.5 py-2 text-sm text-foreground shadow-sm backdrop-blur-sm outline-none transition hover:border-violet-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/10"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">{t("Preço base", "Base price")}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.base_price}
                          onChange={(e) => setForm((prev) => prev ? { ...prev, base_price: e.target.value } : prev)}
                          className="w-full rounded-lg border border-white/30 bg-white/55 px-2.5 py-2 text-sm text-foreground shadow-sm backdrop-blur-sm outline-none transition hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-white/10 dark:bg-white/10"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">{t("IVA (%)", "VAT (%)")}</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={form.vat_percentage}
                          onChange={(e) => setForm((prev) => prev ? { ...prev, vat_percentage: e.target.value } : prev)}
                          className="w-full rounded-lg border border-white/30 bg-white/55 px-2.5 py-2 text-sm text-foreground shadow-sm backdrop-blur-sm outline-none transition hover:border-cyan-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-white/10"
                        />
                      </label>

                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-muted-foreground">{t("Estado", "Status")}</span>
                        <label className="flex min-h-[40px] cursor-pointer items-center justify-between rounded-lg border border-white/30 bg-white/55 px-2.5 py-1.5 text-sm text-foreground shadow-sm backdrop-blur-sm transition hover:border-violet-400 dark:border-white/10 dark:bg-white/10">
                          <span className="inline-flex items-center gap-2">
                            <CheckCircle2 size={15} className={form.active ? "text-emerald-500" : "text-slate-400"} />
                            {form.active ? t("Ativa", "Active") : t("Inativa", "Inactive")}
                          </span>
                          <input
                            type="checkbox"
                            checked={form.active}
                            onChange={(e) => setForm((prev) => prev ? { ...prev, active: e.target.checked } : prev)}
                            className="h-4 w-4 accent-emerald-600"
                          />
                        </label>
                      </div>
                    </div>

                    <label className="block space-y-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">{t("Descrição", "Description")}</span>
                      <textarea
                        rows={4}
                        value={form.description}
                        onChange={(e) => setForm((prev) => prev ? { ...prev, description: e.target.value } : prev)}
                        className="w-full rounded-lg border border-white/30 bg-white/55 px-2.5 py-2 text-sm text-foreground shadow-sm backdrop-blur-sm outline-none transition hover:border-fuchsia-400 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20 dark:border-white/10 dark:bg-white/10"
                      />
                    </label>

                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/20 bg-white/35 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Coins size={12} className="text-emerald-600 dark:text-emerald-300" />
                          {t("Base", "Base")}: <strong>{form.base_price.trim() ? <MoneyValue value={form.base_price} /> : "—"}</strong>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <BadgePercent size={12} className="text-cyan-600 dark:text-cyan-300" />
                          {t("IVA", "VAT")}: <strong>{form.vat_percentage.trim() || "0"}%</strong>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clipboard size={12} className="text-violet-600 dark:text-violet-300" />
                          {t("Final", "Final")}: <strong>{pricePreview !== null ? <MoneyValue value={pricePreview} /> : "—"}</strong>
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition hover:brightness-110 disabled:opacity-60"
                      >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        {saving ? t("A guardar...", "Saving...") : t("Guardar alterações", "Save changes")}
                      </button>
                    </div>
                  </form>
                </div>
              </section>

              <aside className="grid gap-1.5">
                <section className={`relative overflow-hidden ${GLASS}`}>
                  <span className={`absolute left-0 top-0 h-full w-1 ${tone.bar}`} />
                  <div className="px-3 py-2.5 pl-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <Stethoscope size={12} /> {t("Resumo do registo", "Record summary")}
                    </div>
                    <div className="mt-2.5 grid gap-1.5">
                      <div className="rounded-lg border border-white/20 bg-white/40 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Código", "Code")}</div>
                        <div className="mt-0.5 font-mono text-sm text-foreground">{specialty?.custom_id || `#${id}`}</div>
                      </div>
                      <div className="rounded-lg border border-white/20 bg-white/40 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Criada em", "Created at")}</div>
                        <div className="mt-0.5 text-sm text-foreground">{specialty?.created_at ? new Date(specialty.created_at).toLocaleString() : "—"}</div>
                      </div>
                      <div className="rounded-lg border border-white/20 bg-white/40 px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="text-[10px] font-semibold uppercase text-muted-foreground">{t("Atualizada em", "Updated at")}</div>
                        <div className="mt-0.5 text-sm text-foreground">{specialty?.updated_at ? new Date(specialty.updated_at).toLocaleString() : "—"}</div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className={`relative overflow-hidden ${GLASS}`}>
                  <span className="absolute left-0 top-0 h-full w-1 bg-cyan-500" />
                  <div className="px-3 py-2.5 pl-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <Coins size={12} /> {t("Impacto financeiro", "Financial impact")}
                    </div>
                    <div className="mt-2.5 space-y-1.5">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 dark:border-emerald-700/30 dark:bg-emerald-900/15">
                        <div className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">{t("Preço final", "Final price")}</div>
                        <div className="mt-1 text-lg font-bold text-emerald-900 dark:text-emerald-100">{pricePreview !== null ? <MoneyValue value={pricePreview} /> : "—"}</div>
                      </div>
                      <div className="rounded-lg border border-cyan-200 bg-cyan-50/80 px-2.5 py-1.5 dark:border-cyan-700/30 dark:bg-cyan-900/15">
                        <div className="text-[10px] font-semibold uppercase text-cyan-700 dark:text-cyan-300">{t("IVA actual", "Current VAT")}</div>
                        <div className="mt-1 text-lg font-bold text-cyan-900 dark:text-cyan-100">{form.vat_percentage.trim() || "0"}%</div>
                      </div>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
