"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, CreditCard, Scissors } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const INPUT = "w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
const LABEL = "block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)] mb-1"

export default function NewSurgicalProcedurePage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [basePrice, setBasePrice] = useState("")
  const [vatPct, setVatPct] = useState("5")
  const [appliesVat, setAppliesVat] = useState(true)
  const [active, setActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const base = parseFloat(basePrice || "0")
  const vat = parseFloat(vatPct || "0")
  const total = appliesVat ? base * (1 + vat / 100) : base

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Nome obrigatório."
    if (!basePrice || isNaN(parseFloat(basePrice))) errs.basePrice = "Preço inválido."
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true); setErrors({})
    try {
      const res = await apiFetch<any>("/surgery/surgical_procedure/", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description,
          base_price: basePrice,
          vat_percentage: vatPct || "0",
          applies_vat_by_default: appliesVat,
          active,
        }),
      })
      router.push(`/surgery/surgical-procedures/${res.id}`)
    } catch (err: any) {
      try {
        const d = JSON.parse(err?.message || "{}")
        const m: Record<string, string> = {}
        for (const [k, v] of Object.entries(d)) m[k] = Array.isArray(v) ? (v as string[]).join(" ") : String(v)
        setErrors(m)
      } catch { setErrors({ _: err?.message || "Erro ao criar." }) }
    } finally { setSaving(false) }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM, GROUPS.MEDICINA]}>
      <div className="mx-auto w-full max-w-2xl space-y-3 px-1">

        {/* header */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-400" />
          <div className="flex items-center justify-between gap-3 px-4 py-3 pl-5">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href="/surgery/surgical-procedures" className="hover:text-foreground">Procedimentos</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">Novo</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <Scissors size={14} className="text-violet-500" />
                <h1 className="font-display text-base font-semibold text-foreground">Novo procedimento cirúrgico</h1>
              </div>
            </div>
            <Link href="/surgery/surgical-procedures"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
              <ArrowLeft size={11} /> Cancelar
            </Link>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-3">

          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 bg-violet-400" />
            <div className="px-4 py-3 pl-5">
              <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <Scissors size={13} /><span>Identificação</span>
              </div>
              <div className="grid gap-3">
                <div>
                  <label className={LABEL}>Nome *</label>
                  <input value={name} onChange={e => setName(e.target.value)} className={INPUT} placeholder="Ex: Apendicectomia" />
                  {errors.name && <p className="mt-1 text-[11px] text-rose-500">{errors.name}</p>}
                </div>
                <div>
                  <label className={LABEL}>Descrição</label>
                  <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                    className={`${INPUT} resize-none`} placeholder="Descrição do procedimento..." />
                </div>
              </div>
            </div>
          </section>

          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 bg-teal-400" />
            <div className="px-4 py-3 pl-5">
              <div className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <CreditCard size={13} /><span>Financeiro</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Preço base (MT) *</label>
                  <input type="number" min="0" step="0.01" value={basePrice} onChange={e => setBasePrice(e.target.value)}
                    className={INPUT} placeholder="0.00" />
                  {errors.basePrice && <p className="mt-1 text-[11px] text-rose-500">{errors.basePrice}</p>}
                </div>
                <div>
                  <label className={LABEL}>IVA (%)</label>
                  <input type="number" min="0" max="100" step="0.01" value={vatPct} onChange={e => setVatPct(e.target.value)}
                    className={INPUT} placeholder="5" />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => setAppliesVat(v => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${appliesVat ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-600"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${appliesVat ? "left-[18px]" : "left-0.5"}`} />
                </button>
                <span className="text-[12px] text-foreground">Aplicar IVA por defeito</span>
              </div>

              {base > 0 && appliesVat && vat > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-teal-200/50 bg-teal-50/40 px-3 py-2 dark:border-teal-700/20 dark:bg-teal-900/10">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Total c/ IVA ({vat}%)</span>
                  <span className="text-[14px] font-bold text-teal-600 dark:text-teal-400">
                    {total.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} MT
                  </span>
                </div>
              )}
            </div>
          </section>

          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className={`absolute left-0 top-0 h-full w-1 ${active ? "bg-emerald-400" : "bg-slate-400"}`} />
            <div className="flex items-center justify-between px-4 py-3 pl-5">
              <div>
                <p className="text-[12px] font-semibold text-foreground">Procedimento activo</p>
                <p className="text-[10px] text-[var(--gray-500)]">Procedimentos inactivos não aparecem na selecção de cirurgias</p>
              </div>
              <button type="button" onClick={() => setActive(v => !v)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${active ? "left-[18px]" : "left-0.5"}`} />
              </button>
            </div>
          </section>

          {errors._ && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{errors._}</div>
          )}

          <div className="flex justify-end pb-4">
            <button type="submit" disabled={saving}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-violet-300 bg-violet-600 px-5 text-[12px] font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">
              <Check size={14} />
              {saving ? "A criar..." : "Criar procedimento"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
