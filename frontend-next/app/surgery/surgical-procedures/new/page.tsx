"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, CreditCard, Package, Plus, Scissors, Search, Stethoscope, X } from "lucide-react"
import { createPortal } from "react-dom"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const INPUT = "w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
const LABEL = "block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)] mb-0.5"

type SurgeryType = "PEQUENA" | "GRANDE" | "AMBAS"
type MatItem = {
  id: number
  name: string
  type: string
  sale_price: string
  vat_percentage: string
  applies_vat_by_default: boolean
  qty: number
}

const TYPE_LABEL: Record<string, string> = {
  CONS: "Consumível", FARM: "Farmácia", MED: "Medicamento", OUT: "Outro",
}

const SURGERY_TYPE_OPTIONS: { value: SurgeryType; label: string; description: string; color: string }[] = [
  { value: "PEQUENA", label: "Pequena cirurgia", description: "Baixa complexidade, ambulatório ou internamento curto.", color: "blue" },
  { value: "GRANDE", label: "Grande cirurgia", description: "Alta complexidade com bloco operatório e internamento.", color: "violet" },
  { value: "AMBAS", label: "Ambas", description: "Aplicável a pequenas e grandes cirurgias.", color: "slate" },
]

function fmtMT(n: number) {
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MT"
}

function matLineTotal(m: MatItem) {
  const price = parseFloat(m.sale_price || "0")
  const vat = m.applies_vat_by_default ? parseFloat(m.vat_percentage || "0") : 0
  return price * m.qty * (1 + vat / 100)
}

export default function NewSurgicalProcedurePage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [basePrice, setBasePrice] = useState("")
  const [vatPct, setVatPct] = useState("5")
  const [appliesVat, setAppliesVat] = useState(true)
  const [active, setActive] = useState(true)
  const [surgeryType, setSurgeryType] = useState<SurgeryType>("AMBAS")
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // materials
  const [materials, setMaterials] = useState<MatItem[]>([])
  const [matQuery, setMatQuery] = useState("")
  const [matResults, setMatResults] = useState<Omit<MatItem, "qty">[]>([])
  const [matOpen, setMatOpen] = useState(false)
  const [matLoading, setMatLoading] = useState(false)
  const [matRect, setMatRect] = useState<DOMRect | null>(null)
  const [pending, setPending] = useState<Omit<MatItem, "qty"> | null>(null)
  const [pendingQty, setPendingQty] = useState("1")
  const matRef = useRef<HTMLDivElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)
  const matTimer = useRef<ReturnType<typeof setTimeout>>()

  // totals
  const base = parseFloat(basePrice || "0")
  const vat = parseFloat(vatPct || "0")
  const procWithVat = appliesVat ? base * (1 + vat / 100) : base
  const matTotal = materials.reduce((s, m) => s + matLineTotal(m), 0)
  const grandTotal = procWithVat + matTotal

  // debounced product search
  useEffect(() => {
    clearTimeout(matTimer.current)
    if (!matQuery.trim()) { setMatResults([]); setMatOpen(false); return }
    matTimer.current = setTimeout(async () => {
      setMatLoading(true)
      try {
        const res = await apiFetch<any>(`/pharmacy/product/?search=${encodeURIComponent(matQuery)}&limit=20`)
        const list = (res.results ?? res ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          type: p.type || "OUT",
          sale_price: p.sale_price || "0.00",
          vat_percentage: p.vat_percentage || "0.00",
          applies_vat_by_default: p.applies_vat_by_default ?? true,
        }))
        setMatResults(list)
        if (list.length > 0) {
          const rect = matRef.current?.getBoundingClientRect()
          if (rect) setMatRect(rect)
          setMatOpen(true)
        }
      } catch { setMatResults([]) }
      finally { setMatLoading(false) }
    }, 280)
  }, [matQuery])

  useEffect(() => {
    if (!matOpen) return
    const handler = (e: MouseEvent) => {
      if (matRef.current && !matRef.current.contains(e.target as Node)) setMatOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [matOpen])

  useEffect(() => {
    if (pending) { setPendingQty("1"); setTimeout(() => qtyRef.current?.select(), 50) }
  }, [pending])

  const confirmAdd = () => {
    if (!pending) return
    const qty = Math.max(1, parseInt(pendingQty) || 1)
    if (materials.some(m => m.id === pending.id)) {
      setMaterials(prev => prev.map(m => m.id === pending.id ? { ...m, qty } : m))
    } else {
      setMaterials(prev => [...prev, { ...pending, qty }])
    }
    setPending(null); setMatQuery(""); setMatResults([]); setMatOpen(false)
  }

  const removeMaterial = (id: number) => setMaterials(prev => prev.filter(m => m.id !== id))

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
          surgery_type: surgeryType,
          default_materials_detail: materials.map(m => ({ id: m.id, qty: m.qty })),
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
      <div className="mx-auto w-full max-w-2xl space-y-1 px-1">

        {/* header */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-400" />
          <div className="px-3 py-2 pl-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                  <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <Link href="/surgery/surgical-procedures" className="hover:text-foreground">Procedimentos</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">Novo</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Scissors size={13} className="text-violet-500" />
                  <h1 className="font-display text-sm font-semibold text-foreground">Novo procedimento cirúrgico</h1>
                </div>
                <p className="mt-1 text-[11px] text-[var(--gray-500)]">
                  Defina a indicação do procedimento no catálogo e se ele fica activo para selecção nas cirurgias.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {grandTotal > 0 && (
                  <div className="mr-1 flex flex-col items-end border-r border-white/30 pr-2 dark:border-white/10">
                    <span className="text-[9px] text-[var(--gray-500)]">Total estimado</span>
                    <span className="text-[12px] font-bold text-teal-600 dark:text-teal-400">{fmtMT(grandTotal)}</span>
                  </div>
                )}
                <Link href="/surgery/surgical-procedures"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
                  <ArrowLeft size={11} /> Cancelar
                </Link>
                <button type="submit" form="new-proc-form" disabled={saving}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-violet-300 bg-violet-600 px-3 text-[11px] font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">
                  <Check size={12} />
                  {saving ? "A criar..." : "Criar procedimento"}
                </button>
                <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/70 px-2.5 py-1">
                  <button
                    type="button"
                    aria-label={active ? "Marcar procedimento como inactivo" : "Marcar procedimento como activo"}
                    onClick={() => setActive(v => !v)}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${active ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                  <div className="leading-tight">
                    <p className="text-[11px] font-semibold text-foreground">{active ? "Activo" : "Inactivo"}</p>
                    <p className="text-[9px] text-[var(--gray-500)]">
                      {active ? "Disponível na selecção de cirurgias" : "Oculto na selecção de cirurgias"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-2 border-t border-white/30 pt-2 dark:border-white/10">
              <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <Stethoscope size={11} /><span>Indicação do procedimento</span>
              </div>
              <div className="grid gap-1 sm:grid-cols-3">
                {SURGERY_TYPE_OPTIONS.map(opt => {
                  const selected = surgeryType === opt.value
                  const colorMap: Record<string, string> = {
                    blue: selected
                      ? "border-blue-400 bg-blue-50/60 dark:border-blue-600/50 dark:bg-blue-900/15"
                      : "border-border bg-card/50 hover:border-blue-300 hover:bg-blue-50/30 dark:hover:border-blue-700/40",
                    violet: selected
                      ? "border-violet-400 bg-violet-50/60 dark:border-violet-600/50 dark:bg-violet-900/15"
                      : "border-border bg-card/50 hover:border-violet-300 hover:bg-violet-50/30 dark:hover:border-violet-700/40",
                    slate: selected
                      ? "border-slate-400 bg-slate-50/60 dark:border-slate-500/50 dark:bg-slate-800/20"
                      : "border-border bg-card/50 hover:border-slate-300 hover:bg-slate-50/30 dark:hover:border-slate-600/40",
                  }
                  const dotMap: Record<string, string> = {
                    blue: "bg-blue-500", violet: "bg-violet-500", slate: "bg-slate-400",
                  }
                  return (
                    <button key={opt.value} type="button" onClick={() => setSurgeryType(opt.value)}
                      className={`flex flex-col gap-0.5 rounded-lg border p-2 text-left transition ${colorMap[opt.color]}`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${dotMap[opt.color]} ${selected ? "opacity-100" : "opacity-30"}`} />
                        <span className={`text-[11px] font-semibold ${selected ? "text-foreground" : "text-[var(--gray-500)]"}`}>
                          {opt.label}
                        </span>
                        {selected && <Check size={10} className="ml-auto shrink-0 text-emerald-500" />}
                      </div>
                      <p className="text-[10px] leading-snug text-[var(--gray-400)]">{opt.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <form id="new-proc-form" onSubmit={handleSubmit} className="space-y-1">

          {/* identificação */}
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 bg-violet-400" />
            <div className="px-3 py-2 pl-4">
              <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <Scissors size={11} /><span>Identificação</span>
              </div>
              <div className="grid gap-1.5">
                <div>
                  <label className={LABEL}>Nome *</label>
                  <input value={name} onChange={e => setName(e.target.value)} className={INPUT} placeholder="Ex: Apendicectomia" />
                  {errors.name && <p className="mt-0.5 text-[11px] text-rose-500">{errors.name}</p>}
                </div>
                <div>
                  <label className={LABEL}>Descrição</label>
                  <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                    className={`${INPUT} resize-none`} placeholder="Descrição do procedimento..." />
                </div>
              </div>
            </div>
          </section>

          {/* financeiro */}
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 bg-teal-400" />
            <div className="px-3 py-2 pl-4">
              <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <CreditCard size={11} /><span>Financeiro</span>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <div>
                  <label className={LABEL}>Preço base (MT) *</label>
                  <input type="number" min="0" step="0.01" value={basePrice} onChange={e => setBasePrice(e.target.value)}
                    className={INPUT} placeholder="0.00" />
                  {errors.basePrice && <p className="mt-0.5 text-[11px] text-rose-500">{errors.basePrice}</p>}
                </div>
                <div>
                  <label className={LABEL}>IVA (%)</label>
                  <input type="number" min="0" max="100" step="0.01" value={vatPct} onChange={e => setVatPct(e.target.value)}
                    className={INPUT} placeholder="5" />
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <button type="button" onClick={() => setAppliesVat(v => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${appliesVat ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-600"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${appliesVat ? "left-[18px]" : "left-0.5"}`} />
                </button>
                <span className="text-[12px] text-foreground">Aplicar IVA por defeito</span>
              </div>
              {base > 0 && (
                <div className="mt-1.5 flex items-center justify-between rounded-lg border border-teal-200/50 bg-teal-50/40 px-2.5 py-1.5 dark:border-teal-700/20 dark:bg-teal-900/10">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                    Procedimento {appliesVat && vat > 0 ? `c/ IVA (${vat}%)` : "s/ IVA"}
                  </span>
                  <span className="text-[13px] font-bold text-teal-600 dark:text-teal-400">{fmtMT(procWithVat)}</span>
                </div>
              )}
            </div>
          </section>

          {/* materiais */}
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 bg-amber-400" />
            <div className="px-3 py-2 pl-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                  <Package size={11} /><span>Materiais e produtos</span>
                </div>
                {materials.length > 0 && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300">
                    {materials.length} {materials.length === 1 ? "item" : "itens"} · {fmtMT(matTotal)}
                  </span>
                )}
              </div>

              {/* search */}
              <div ref={matRef} className="relative">
                <div className="flex h-7 items-center gap-2 rounded-lg border border-border bg-card px-2.5 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-200 dark:focus-within:ring-amber-800">
                  <Search size={11} className="shrink-0 text-[var(--gray-400)]" />
                  <input
                    value={matQuery}
                    onChange={e => setMatQuery(e.target.value)}
                    onFocus={() => {
                      if (matResults.length > 0) {
                        const rect = matRef.current?.getBoundingClientRect()
                        if (rect) setMatRect(rect)
                        setMatOpen(true)
                      }
                    }}
                    placeholder="Pesquisar produto de farmácia..."
                    className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  {matLoading && <span className="h-3 w-3 animate-spin rounded-full border border-amber-400 border-t-transparent" />}
                </div>

                {/* qty picker */}
                {pending && (
                  <div className="mt-1 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50/80 px-2.5 py-1.5 dark:border-amber-700/40 dark:bg-amber-900/15">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-amber-900 dark:text-amber-200">{pending.name}</p>
                      <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70">
                        {TYPE_LABEL[pending.type] || pending.type} · {fmtMT(parseFloat(pending.sale_price || "0"))} / un.
                        {pending.applies_vat_by_default && parseFloat(pending.vat_percentage) > 0
                          ? ` + IVA ${pending.vat_percentage}%`
                          : " · isento IVA"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <label className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">Qtd.</label>
                      <input
                        ref={qtyRef}
                        type="number" min="1" step="1"
                        value={pendingQty}
                        onChange={e => setPendingQty(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); confirmAdd() } if (e.key === "Escape") setPending(null) }}
                        className="w-12 rounded-md border border-amber-300 bg-white px-2 py-0.5 text-center text-[12px] font-semibold text-foreground focus:border-amber-500 focus:outline-none dark:border-amber-700/50 dark:bg-slate-900/40"
                      />
                    </div>
                    <button type="button" onClick={confirmAdd}
                      className="inline-flex h-6 items-center gap-1 rounded-md bg-amber-500 px-2 text-[11px] font-semibold text-white hover:bg-amber-600">
                      <Plus size={10} /> Adicionar
                    </button>
                    <button type="button" onClick={() => setPending(null)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted">
                      <X size={10} />
                    </button>
                  </div>
                )}

                {/* portal dropdown */}
                {matOpen && matRect && matResults.length > 0 && typeof document !== "undefined" && createPortal(
                  <div style={{ position: "fixed", top: matRect.bottom + 4, left: matRect.left, width: matRect.width, zIndex: 9999 }}
                    className="rounded-xl border border-border bg-card shadow-xl">
                    {matResults.map(item => {
                      const already = materials.some(m => m.id === item.id)
                      const unitVat = item.applies_vat_by_default ? parseFloat(item.vat_percentage || "0") : 0
                      const unitTotal = parseFloat(item.sale_price || "0") * (1 + unitVat / 100)
                      return (
                        <button key={item.id} type="button"
                          onMouseDown={e => { e.preventDefault(); setMatOpen(false); setPending(item) }}
                          disabled={already}
                          className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left first:rounded-t-xl last:rounded-b-xl transition ${
                            already ? "cursor-default opacity-40" : "hover:bg-amber-50/60 dark:hover:bg-amber-900/10"
                          }`}>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[12px] font-medium text-foreground">{item.name}</span>
                            <span className="text-[10px] text-[var(--gray-400)]">
                              {TYPE_LABEL[item.type] || item.type}
                              {unitVat > 0 ? ` · IVA ${unitVat}%` : " · isento IVA"}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <div className="flex flex-col items-end">
                              <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">{fmtMT(unitTotal)}</span>
                              {unitVat > 0 && (
                                <span className="text-[9px] text-[var(--gray-400)]">{fmtMT(parseFloat(item.sale_price || "0"))} s/ IVA</span>
                              )}
                            </div>
                            {already && <Check size={12} className="text-emerald-500" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>,
                  document.body
                )}
              </div>

              {/* chips */}
              {materials.length > 0 ? (
                <div className="mt-1.5 space-y-1">
                  {materials.map(m => {
                    const unitVat = m.applies_vat_by_default ? parseFloat(m.vat_percentage || "0") : 0
                    const lineTotal = matLineTotal(m)
                    return (
                      <div key={m.id}
                        className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-1 dark:border-amber-700/30 dark:bg-amber-900/10">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium text-amber-800 dark:text-amber-300">{m.name}</p>
                          <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60">
                            {fmtMT(parseFloat(m.sale_price || "0"))} × {m.qty}
                            {unitVat > 0 ? ` + IVA ${unitVat}%` : " · isento IVA"}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold text-teal-600 dark:text-teal-400">{fmtMT(lineTotal)}</span>
                        <button type="button" onClick={() => removeMaterial(m.id)}
                          className="shrink-0 rounded-full p-0.5 text-amber-600 hover:bg-amber-200/60 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-800/30">
                          <X size={10} />
                        </button>
                      </div>
                    )
                  })}
                  {/* subtotal materiais */}
                  <div className="flex items-center justify-between rounded-lg border border-amber-200/50 bg-amber-50/40 px-2.5 py-1 dark:border-amber-700/20 dark:bg-amber-900/10">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Subtotal materiais c/ IVA</span>
                    <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400">{fmtMT(matTotal)}</span>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 text-[11px] text-[var(--gray-400)]">
                  Nenhum material. Pesquise acima para adicionar produtos de farmácia.
                </p>
              )}

              {/* grand total */}
              {grandTotal > 0 && (
                <div className="mt-1 flex items-center justify-between rounded-lg border border-teal-300/60 bg-teal-50/50 px-2.5 py-1.5 dark:border-teal-600/30 dark:bg-teal-900/10">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Total geral estimado</p>
                    <p className="text-[9px] text-[var(--gray-400)]">
                      proc {fmtMT(procWithVat)}{matTotal > 0 ? ` + mat ${fmtMT(matTotal)}` : ""}
                    </p>
                  </div>
                  <span className="text-[14px] font-bold text-teal-600 dark:text-teal-400">{fmtMT(grandTotal)}</span>
                </div>
              )}
            </div>
          </section>

          {errors._ && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[12px] text-rose-700">{errors._}</div>
          )}
        </form>
      </div>
    </AppLayout>
  )
}
