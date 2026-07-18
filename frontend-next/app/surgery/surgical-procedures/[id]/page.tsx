"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, CreditCard, Package, Plus, Scissors, Search, Stethoscope, Trash2, X } from "lucide-react"
import { createPortal } from "react-dom"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"
const INPUT = "w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
const LABEL = "block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--gray-500)] mb-1"

type MatItem = { id: number; name: string; type: string; sale_price: string; vat_percentage: string; applies_vat_by_default: boolean; qty: number }
type SurgeryType = "PEQUENA" | "GRANDE" | "AMBAS"

const SURGERY_TYPE_OPTIONS: { value: SurgeryType; label: string; description: string; color: string }[] = [
  { value: "PEQUENA", label: "Pequena cirurgia", description: "Baixa complexidade, ambulatório ou internamento curto.", color: "blue" },
  { value: "GRANDE", label: "Grande cirurgia", description: "Alta complexidade com bloco operatório e internamento.", color: "violet" },
]

const TYPE_LABEL: Record<string, string> = {
  CONS: "Consumível",
  FARM: "Farmácia",
  MED: "Medicamento",
  OUT: "Outro",
}

function fmtMT(n: number) {
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MT"
}

export default function SurgicalProcedureDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)
  const router = useRouter()

  const [data, setData] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  // form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [basePrice, setBasePrice] = useState("")
  const [vatPct, setVatPct] = useState("")
  const [appliesVat, setAppliesVat] = useState(true)
  const [active, setActive] = useState(true)
  const [isSurgical, setIsSurgical] = useState(true)
  const [surgeryType, setSurgeryType] = useState<SurgeryType>("PEQUENA")

  // materials
  const [materials, setMaterials] = useState<MatItem[]>([])
  const [matQuery, setMatQuery] = useState("")
  const [matResults, setMatResults] = useState<Omit<MatItem, "qty">[]>([])
  const [matOpen, setMatOpen] = useState(false)
  const [matLoading, setMatLoading] = useState(false)
  const [matRect, setMatRect] = useState<DOMRect | null>(null)
  // inline qty picker: holds the candidate item before confirm
  const [pending, setPending] = useState<Omit<MatItem, "qty"> | null>(null)
  const [pendingQty, setPendingQty] = useState("1")
  const matRef = useRef<HTMLDivElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)
  const matTimer = useRef<ReturnType<typeof setTimeout>>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch<Record<string, any>>(`/surgery/surgical_procedure/${id}/`)
      setData(res)
      setName(res.name || "")
      setDescription(res.description || "")
      setBasePrice(res.base_price || "")
      setVatPct(res.vat_percentage || "")
      setAppliesVat(res.applies_vat_by_default ?? true)
      setActive(res.active ?? true)
      setIsSurgical(res.is_surgical ?? true)
      setSurgeryType((res.surgery_type as SurgeryType) || "AMBAS")
      setMaterials(
        (res.default_materials_detail || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          type: m.type || "OUT",
          sale_price: m.sale_price || "0.00",
          vat_percentage: m.vat_percentage || "0.00",
          applies_vat_by_default: m.applies_vat_by_default ?? true,
          qty: m.qty ?? 1,
        }))
      )
    } catch { setData(null) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  // debounced search
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

  // outside-click closes dropdown
  useEffect(() => {
    if (!matOpen) return
    const handler = (e: MouseEvent) => {
      if (matRef.current && !matRef.current.contains(e.target as Node)) {
        setMatOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [matOpen])

  // focus qty input when pending opens
  useEffect(() => {
    if (pending) {
      setPendingQty("1")
      setTimeout(() => qtyRef.current?.select(), 50)
    }
  }, [pending])

  const saveMaterials = async (next: MatItem[]) => {
    try {
      await apiFetch(`/surgery/surgical_procedure/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          default_materials_detail: next.map(m => ({ id: m.id, qty: m.qty })),
        }),
      })
    } catch { /* silently fail */ }
  }

  const confirmAdd = () => {
    if (!pending) return
    const qty = Math.max(1, parseInt(pendingQty) || 1)
    if (materials.some(m => m.id === pending.id)) {
      // update qty
      const next = materials.map(m => m.id === pending.id ? { ...m, qty } : m)
      setMaterials(next)
      saveMaterials(next)
    } else {
      const next = [...materials, { ...pending, qty }]
      setMaterials(next)
      saveMaterials(next)
    }
    setPending(null)
    setMatQuery("")
    setMatResults([])
    setMatOpen(false)
  }

  const removeMaterial = (itemId: number) => {
    const next = materials.filter(m => m.id !== itemId)
    setMaterials(next)
    saveMaterials(next)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Nome obrigatório."
    if (!basePrice || isNaN(parseFloat(basePrice))) errs.basePrice = "Preço inválido."
    if (isSurgical && !["PEQUENA", "GRANDE"].includes(surgeryType)) errs.surgeryType = "Escolha se é pequena ou grande cirurgia."
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true); setErrors({})
    try {
      await apiFetch(`/surgery/surgical_procedure/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          description,
          base_price: basePrice,
          vat_percentage: vatPct || "0",
          applies_vat_by_default: appliesVat,
          active,
          is_surgical: isSurgical,
          surgery_type: isSurgical ? surgeryType : "AMBAS",
        }),
      })
      setSaved(true)
      setTimeout(() => router.push("/surgery/surgical-procedures"), 800)
    } catch (err: any) {
      try {
        const d = JSON.parse(err?.message || "{}")
        const m: Record<string, string> = {}
        for (const [k, v] of Object.entries(d)) m[k] = Array.isArray(v) ? (v as string[]).join(" ") : String(v)
        setErrors(m)
      } catch { setErrors({ _: err?.message || "Erro ao guardar." }) }
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm(`Eliminar "${name}"? Esta acção não pode ser desfeita.`)) return
    setDeleting(true)
    try {
      await apiFetch(`/surgery/surgical_procedure/${id}/`, { method: "DELETE" })
      router.push("/surgery/surgical-procedures")
    } catch (err: any) {
      alert(err?.message || "Erro ao eliminar.")
    } finally { setDeleting(false) }
  }

  const base = parseFloat(basePrice || "0")
  const vat = parseFloat(vatPct || "0")
  const procTotal = appliesVat ? base * (1 + vat / 100) : base
  const matTotal = materials.reduce((s, m) => {
    const unitVat = m.applies_vat_by_default ? parseFloat(m.vat_percentage || "0") : 0
    return s + parseFloat(m.sale_price || "0") * m.qty * (1 + unitVat / 100)
  }, 0)
  const grandTotal = procTotal + matTotal

  if (loading) return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="flex h-40 items-center justify-center text-sm text-[var(--gray-500)]">Carregando...</div>
    </AppLayout>
  )

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-2xl space-y-2 px-1">

        {/* header */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${active ? "bg-emerald-400" : "bg-slate-400"}`} />
          <div className="flex items-center justify-between gap-3 px-4 py-3 pl-5">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] text-[var(--gray-500)]">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href="/surgery/surgical-procedures" className="hover:text-foreground">Procedimentos</Link>
                <span>/</span>
                <span className="font-semibold text-foreground">{data?.custom_id || `#${id}`}</span>
              </div>
              <h1 className="mt-0.5 font-display text-base font-semibold text-foreground">{name || "Procedimento"}</h1>
            </div>
            <div className="flex items-center gap-3">
              {/* grand total */}
              {grandTotal > 0 && (
                <div className="flex flex-col items-end border-r border-white/30 pr-3 dark:border-white/10">
                  <span className="text-[9px] text-[var(--gray-500)]">Total estimado</span>
                  <span className="text-[13px] font-bold text-teal-600 dark:text-teal-400">
                    {fmtMT(grandTotal)}
                  </span>
                  {matTotal > 0 && (
                    <span className="text-[9px] text-[var(--gray-400)]">
                      proc {fmtMT(procTotal)} + mat {fmtMT(matTotal)}
                    </span>
                  )}
                </div>
              )}
              {/* active toggle */}
              <div className="flex items-center gap-2 border-r border-white/30 pr-3 dark:border-white/10">
                <button type="button" onClick={() => setActive(v => !v)}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${active ? "left-[18px]" : "left-0.5"}`} />
                </button>
                <span className="text-[11px] font-medium text-foreground">{active ? "Activo" : "Inactivo"}</span>
              </div>
              <Link href="/surgery/surgical-procedures"
                className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
                <ArrowLeft size={11} /> Voltar
              </Link>
            </div>
          </div>
        </section>

        <form id="proc-form" onSubmit={handleSave} className="space-y-2">

          {/* identificação */}
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 bg-violet-400" />
            <div className="px-4 py-3 pl-5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <Scissors size={13} /><span>Identificação</span>
              </div>
              <div className="grid gap-2.5">
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

          {/* preço */}
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 bg-teal-400" />
            <div className="px-4 py-3 pl-5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <CreditCard size={13} /><span>Financeiro</span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
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

              <div className="mt-2.5 flex items-center gap-2">
                <button type="button" onClick={() => setAppliesVat(v => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${appliesVat ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-600"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${appliesVat ? "left-[18px]" : "left-0.5"}`} />
                </button>
                <span className="text-[12px] text-foreground">Aplicar IVA por defeito</span>
              </div>

              {base > 0 && appliesVat && vat > 0 && (
                <div className="mt-2.5 flex items-center justify-between rounded-lg border border-teal-200/50 bg-teal-50/40 px-3 py-2 dark:border-teal-700/20 dark:bg-teal-900/10">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Procedimento c/ IVA ({vat}%)</span>
                  <span className="text-[14px] font-bold text-teal-600 dark:text-teal-400">{fmtMT(procTotal)}</span>
                </div>
              )}
            </div>
          </section>

          {/* vínculo cirúrgico e porte */}
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
            <div className="px-4 py-3 pl-5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <Stethoscope size={13} /><span>Vínculo cirúrgico e porte</span>
              </div>
              <div className="mb-2 grid gap-2 sm:grid-cols-2">
                {[
                  { value: true, label: "Cirúrgico", description: "Entra no catálogo das cirurgias." },
                  { value: false, label: "Não cirúrgico", description: "Fica fora da selecção de cirurgias." },
                ].map(opt => {
                  const selected = isSurgical === opt.value
                  return (
                    <button key={String(opt.value)} type="button" onClick={() => {
                      setIsSurgical(opt.value)
                      if (opt.value && surgeryType === "AMBAS") setSurgeryType("PEQUENA")
                    }}
                      className={`rounded-xl border p-3 text-left transition ${selected ? "border-emerald-400 bg-emerald-50/60 dark:border-emerald-700/50 dark:bg-emerald-900/15" : "border-border bg-card/50 hover:bg-muted"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-emerald-500" : "bg-slate-300"}`} />
                        <span className="text-[12px] font-semibold text-foreground">{opt.label}</span>
                        {selected && <Check size={11} className="ml-auto shrink-0 text-emerald-500" />}
                      </div>
                      <p className="text-[10px] leading-relaxed text-[var(--gray-400)]">{opt.description}</p>
                    </button>
                  )
                })}
              </div>
              {isSurgical ? (
                <div className="grid gap-2 sm:grid-cols-2">
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
                    blue: "bg-blue-500",
                    violet: "bg-violet-500",
                    slate: "bg-slate-400",
                  }
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSurgeryType(opt.value)}
                      className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition ${colorMap[opt.color]}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotMap[opt.color]} ${selected ? "opacity-100" : "opacity-30"}`} />
                        <span className={`text-[12px] font-semibold ${selected ? "text-foreground" : "text-[var(--gray-500)]"}`}>
                          {opt.label}
                        </span>
                        {selected && <Check size={11} className="ml-auto shrink-0 text-emerald-500" />}
                      </div>
                      <p className="text-[10px] leading-relaxed text-[var(--gray-400)]">{opt.description}</p>
                    </button>
                  )
                })}
                </div>
              ) : null}
              {errors.surgeryType && <p className="mt-1 text-[11px] text-rose-500">{errors.surgeryType}</p>}
            </div>
          </section>

          {errors._ && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{errors._}</div>
          )}
        </form>

        {/* materiais / produtos de farmácia */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-amber-400" />
          <div className="px-4 py-3 pl-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--gray-500)]">
                <Package size={13} /><span>Materiais e produtos</span>
              </div>
              {materials.length > 0 && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300">
                  {materials.length} {materials.length === 1 ? "item" : "itens"} · {fmtMT(matTotal)}
                </span>
              )}
            </div>

            {/* search input */}
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
                    <input ref={qtyRef} type="number" min="1" step="1"
                      value={pendingQty} onChange={e => setPendingQty(e.target.value)}
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
                <div style={{ position: "fixed", top: matRect.bottom + 4, left: matRect.left, width: matRect.width, zIndex: 2147483647 }}
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
                            {unitVat > 0 && <span className="text-[9px] text-[var(--gray-400)]">{fmtMT(parseFloat(item.sale_price || "0"))} s/ IVA</span>}
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

            {/* lista */}
            {materials.length > 0 ? (
              <div className="mt-1.5 space-y-1">
                {materials.map(m => {
                  const unitVat = m.applies_vat_by_default ? parseFloat(m.vat_percentage || "0") : 0
                  const lineTotal = parseFloat(m.sale_price || "0") * m.qty * (1 + unitVat / 100)
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
                <div className="flex items-center justify-between rounded-lg border border-amber-200/50 bg-amber-50/40 px-2.5 py-1 dark:border-amber-700/20 dark:bg-amber-900/10">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">Subtotal materiais c/ IVA</span>
                  <span className="text-[12px] font-bold text-amber-600 dark:text-amber-400">{fmtMT(matTotal)}</span>
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-[11px] text-[var(--gray-400)]">
                Nenhum material associado. Pesquise acima para adicionar produtos de farmácia.
              </p>
            )}
          </div>
        </section>

        {/* action bar */}
        <div className="flex items-center justify-between pb-4">
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[12px] font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50">
            <Trash2 size={13} />
            {deleting ? "A eliminar..." : "Eliminar"}
          </button>
          <button type="submit" form="proc-form" disabled={saving}
            className={`inline-flex h-9 items-center gap-2 rounded-lg border px-5 text-[12px] font-semibold transition disabled:opacity-50 ${
              saved
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-violet-300 bg-violet-600 text-white hover:bg-violet-700"
            }`}>
            <Check size={14} />
            {saving ? "A guardar..." : saved ? "Guardado!" : "Guardar alterações"}
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
