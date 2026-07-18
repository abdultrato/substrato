import { formatInvoiceStatus, invoiceStatusMeta } from "@/lib/billingStatus"

interface Props {
  status?: string | null
  label?: string
}

const styles: Record<string, string> = {
  // requisicao
  PEND: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  VAL: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  CANC: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",

  // fatura
  RASC: "border-border bg-muted text-foreground-2",
  EMIT: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
  PAGA: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  ANUL: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200",

  // ativo/inativo
  ATIVO: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
  INATIVO: "border-border bg-muted text-foreground-2",
}

export default function StatusBadge ( { status, label }: Props ) {
  if ( !status && !label ) return null

  const key = ( status ?? label ?? "" ).toUpperCase()
  const invoiceMeta = invoiceStatusMeta(status)
  const style = invoiceMeta?.badge ?? styles[key] ?? "border-border bg-muted text-foreground-2"
  const display = label ?? (invoiceMeta ? formatInvoiceStatus(status) : status)

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${style}`}>
      {display}
    </span>
  )
}
