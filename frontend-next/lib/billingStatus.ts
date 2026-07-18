export type StatusMeta = {
  label: string
  accent: string
  badge: string
}

export const INVOICE_STATUS_META: Record<string, StatusMeta> = {
  RASC: {
    label: "Rascunho",
    accent: "bg-slate-400",
    badge: "border-slate-300/50 bg-slate-500/15 text-slate-600 dark:text-slate-300",
  },
  DRAFT: {
    label: "Rascunho",
    accent: "bg-slate-400",
    badge: "border-slate-300/50 bg-slate-500/15 text-slate-600 dark:text-slate-300",
  },
  EMIT: {
    label: "Emitida",
    accent: "bg-sky-500",
    badge: "border-sky-300/50 bg-sky-500/15 text-sky-700 dark:text-sky-400",
  },
  ISSUED: {
    label: "Emitida",
    accent: "bg-sky-500",
    badge: "border-sky-300/50 bg-sky-500/15 text-sky-700 dark:text-sky-400",
  },
  PAGA: {
    label: "Paga",
    accent: "bg-emerald-500",
    badge: "border-emerald-300/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  PAID: {
    label: "Paga",
    accent: "bg-emerald-500",
    badge: "border-emerald-300/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  CANC: {
    label: "Cancelada",
    accent: "bg-rose-500",
    badge: "border-rose-300/50 bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  ANUL: {
    label: "Anulada",
    accent: "bg-rose-500",
    badge: "border-rose-300/50 bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  CANCELED: {
    label: "Cancelada",
    accent: "bg-rose-500",
    badge: "border-rose-300/50 bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  CANCELLED: {
    label: "Cancelada",
    accent: "bg-rose-500",
    badge: "border-rose-300/50 bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
}

export function invoiceStatusCode(status?: string | null): string {
  return String(status || "").trim().toUpperCase()
}

export function invoiceStatusMeta(status?: string | null): StatusMeta | null {
  const code = invoiceStatusCode(status)
  if (!code) return null
  return INVOICE_STATUS_META[code] || {
    label: String(status),
    accent: "bg-slate-400",
    badge: "border-border bg-muted text-foreground-2",
  }
}

export function formatInvoiceStatus(status?: string | null, options?: { hasInvoice?: boolean; fallback?: string }): string {
  const meta = invoiceStatusMeta(status)
  if (meta) return meta.label
  if (options?.fallback) return options.fallback
  return options?.hasInvoice ? "Criada" : "Pendente"
}
