"use client"

import { useState } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type RejectionReason = { id: number; name: string; code?: string }

export type SampleOption = {
  id: number
  name?: string
  bottle_type_display?: string
  minimum_volume_ml?: string
}

export type RequestItem = {
  id: number
  exam_name?: string
  medical_exam_name?: string
  sample_status?: string
  sample_status_display?: string
  sample_options?: SampleOption[]
  rejection_reason_names?: string[]
  rejection_note?: string
}

export type LabRequest = {
  id: number
  custom_id?: string
  patient_name?: string
  patient_age?: string
  patient_gender?: string
  clinical_status?: string
  clinical_status_display?: string
  type: "LAB" | "MED"
  collected_at?: string
  items?: RequestItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function normSt(v?: string) {
  return (v || "").trim().toLowerCase()
}

export type ItemStatus = "pending" | "received" | "rejected"

export function getItemStatus(item: RequestItem): ItemStatus {
  const s = normSt(item.sample_status)
  if (s === "recebida") return "received"
  if (s === "rejeitada") return "rejected"
  return "pending"
}

export function labItemsOf(row: LabRequest) {
  // include all items regardless of whether exam_name is populated —
  // items linked via LabTest (new model) arrive with exam_name=null but still
  // carry sample_status and count towards reception totals
  return row.items ?? []
}

export function countsByStatus(items: RequestItem[]) {
  let pending = 0, received = 0, rejected = 0
  for (const i of items) {
    const s = getItemStatus(i)
    if (s === "pending") pending++
    else if (s === "received") received++
    else rejected++
  }
  return { pending, received, rejected, total: items.length }
}

export function fmt(v?: string) {
  if (!v) return "-"
  const d = new Date(v)
  if (isNaN(d.getTime())) return v
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })
}

export function genderLabel(value?: string): string {
  const v = (value || "").trim().toLocaleUpperCase()
  if (v.startsWith("M")) return "Masculino"
  if (v.startsWith("F")) return "Feminino"
  return ""
}

/** "Nome · idade · sexo" numa só linha (partes vazias são omitidas). */
export function patientLine(row: LabRequest): { name: string; meta: string } {
  const meta = [row.patient_age, genderLabel(row.patient_gender)].filter(Boolean).join(" · ")
  return { name: row.patient_name || "", meta }
}

// ─── Rejection Panel ──────────────────────────────────────────────────────────

export function RejectionPanel({
  reasons,
  onConfirm,
  onCancel,
  busy,
}: {
  reasons: RejectionReason[]
  onConfirm: (note: string, reasonIds: number[]) => void
  onCancel: () => void
  busy: boolean
}) {
  const [note, setNote] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())

  function toggleReason(r: RejectionReason) {
    const next = new Set(selected)
    if (next.has(r.id)) {
      next.delete(r.id)
    } else {
      next.add(r.id)
      setNote((prev) => prev.trim() ? `${prev.trim()}; ${r.name}` : r.name)
    }
    setSelected(next)
  }

  return (
    <div className="mt-2 rounded border border-red-200 bg-red-50 p-2.5 dark:border-red-800/30 dark:bg-red-900/10">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
        Motivo da rejeição
      </p>

      {reasons.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {reasons.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => toggleReason(r)}
              className={`rounded border px-2 py-0.5 text-[10px] transition-colors ${
                selected.has(r.id)
                  ? "border-red-500 bg-red-200 font-semibold text-red-800 dark:bg-red-800/50 dark:text-red-200"
                  : "border-red-200 bg-white text-red-700 hover:bg-red-100 dark:border-red-800/30 dark:bg-transparent dark:text-red-300"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Descreva o motivo ou selecione acima para preencher automaticamente..."
        rows={2}
        className="w-full resize-none rounded border border-red-200 bg-white px-2 py-1.5 text-[11px] text-[var(--text)] placeholder:text-[var(--gray-400)] focus:border-red-400 focus:outline-none dark:border-red-800/30 dark:bg-[var(--card)]"
      />

      <div className="mt-1.5 flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="h-6 rounded border border-[var(--border)] px-2.5 text-[10px] text-[var(--gray-600)] hover:bg-[var(--gray-100)] disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onConfirm(note.trim(), Array.from(selected))}
          disabled={busy || !note.trim()}
          className="h-6 rounded bg-red-600 px-2.5 text-[10px] font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy ? "A rejeitar..." : "Confirmar rejeição"}
        </button>
      </div>
    </div>
  )
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

export function ItemRow({
  item,
  reasons,
  onReceive,
  onReject,
  busy,
}: {
  item: RequestItem
  reasons: RejectionReason[]
  onReceive: () => void
  onReject: (note: string, reasonIds: number[]) => void
  busy: boolean
}) {
  const [showReject, setShowReject] = useState(false)
  const status = getItemStatus(item)
  const name = item.exam_name ?? item.medical_exam_name ?? "Exame"
  const samples = item.sample_options ?? []

  return (
    <div className={`rounded border px-2.5 py-2 text-[0.82em] transition-colors ${
      status === "received"
        ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/20 dark:bg-emerald-900/5"
        : status === "rejected"
          ? "border-red-200 bg-red-50/40 dark:border-red-800/20 dark:bg-red-900/5"
          : "border-[var(--border)] bg-[var(--background)]"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-[var(--text)]">{name}</span>
            {status === "received" && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                Recebida ✓
              </span>
            )}
            {status === "rejected" && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                Rejeitada — devolvida à enfermagem
              </span>
            )}
            {status === "pending" && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Aguardando
              </span>
            )}
          </div>

          {samples.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-2">
              {samples.map((s, idx) => (
                <span key={s.id ?? `${s.name ?? "amostra"}-${idx}`} className="text-[10px] text-[var(--gray-500)]">
                  {s.name}
                  {s.bottle_type_display ? ` · ${s.bottle_type_display}` : ""}
                  {s.minimum_volume_ml && Number(s.minimum_volume_ml) > 0 ? ` · ${s.minimum_volume_ml} ml` : ""}
                </span>
              ))}
            </div>
          )}

          {status === "rejected" && (item.rejection_reason_names?.length || item.rejection_note) && (
            <div className="mt-0.5 text-[10px] text-red-600 dark:text-red-400">
              {item.rejection_reason_names?.join("; ")}
              {item.rejection_note ? ` — ${item.rejection_note}` : ""}
            </div>
          )}
        </div>

        {status === "pending" && !showReject && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={onReceive}
              disabled={busy}
              className="h-6 rounded bg-emerald-600 px-2.5 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "..." : "Receber"}
            </button>
            <button
              type="button"
              onClick={() => setShowReject(true)}
              disabled={busy}
              className="h-6 rounded border border-red-300 px-2.5 text-[10px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Rejeitar
            </button>
          </div>
        )}

        {status === "received" && (
          <span className="shrink-0 text-lg leading-none text-emerald-500">✓</span>
        )}
      </div>

      {showReject && (
        <RejectionPanel
          reasons={reasons}
          busy={busy}
          onConfirm={(note, ids) => {
            setShowReject(false)
            onReject(note, ids)
          }}
          onCancel={() => setShowReject(false)}
        />
      )}
    </div>
  )
}
