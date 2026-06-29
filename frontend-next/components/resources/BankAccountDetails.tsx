"use client"

import type { ReactNode } from "react"
import { Building2, CreditCard, Hash, Landmark, User, Wallet } from "lucide-react"

import MoneyValue from "@/components/ui/MoneyValue"
import { useLanguage } from "@/hooks/useLanguage"

const KIND_LABELS: Record<string, { pt: string; en: string }> = {
  COR: { pt: "Corrente", en: "Checking" },
  POU: { pt: "Poupança", en: "Savings" },
  OUT: { pt: "Outra", en: "Other" },
}

function MetaItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  if (!value || value === "-") return null
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{label}</p>
        <p className="truncate text-sm font-medium text-[var(--text)]">{value}</p>
      </div>
    </div>
  )
}

export default function BankAccountDetails({
  data,
  actions,
}: {
  endpoint: string
  data: Record<string, any>
  actions?: ReactNode
}) {
  const { t, language } = useLanguage()
  const isPt = language !== "en"

  const bank = String(data?.bank_name || "").trim() || t("Conta bancária", "Bank account")
  const name = String(data?.name || "").trim()
  const code = String(data?.custom_id || data?.id_custom || "").trim()
  const kind = String(data?.kind || "").toUpperCase()
  const kindLabel = KIND_LABELS[kind] ? (isPt ? KIND_LABELS[kind].pt : KIND_LABELS[kind].en) : kind
  const isActive = data?.active !== false
  const currency = String(data?.currency || "").trim()
  const notes = String(data?.notes || "").trim()

  return (
    <div className="space-y-3">
      {/* Cabeçalho */}
      <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
        <span className={`absolute left-0 top-0 h-full w-1.5 ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-600 shadow-sm dark:bg-white/10 dark:text-white">
              <Building2 size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">
                {t("Conta bancária", "Bank account")}
              </p>
              <h2 className="truncate text-lg font-bold leading-tight text-[var(--text)]">{bank}</h2>
              {name ? <p className="truncate text-[11px] text-[var(--gray-500)]">{name}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-sm ${
                isActive
                  ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "border-white/30 bg-white/20 text-[var(--gray-600)] dark:border-white/10 dark:text-[var(--gray-300)]"
              }`}
            >
              {isActive ? t("Ativa", "Active") : t("Inativa", "Inactive")}
            </span>
            {code ? (
              <span className="rounded-full border border-[var(--primary-300)]/60 bg-[var(--primary-500)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--primary-700)] backdrop-blur-sm">
                {code}
              </span>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/20 px-4 py-2.5 pl-5 dark:border-white/10">
            {actions}
          </div>
        ) : null}
      </section>

      {/* Saldo */}
      <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 px-4 py-3 pl-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
        <span className="absolute left-0 top-0 h-full w-1.5 bg-[var(--primary-500)]" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--gray-500)]">{t("Saldo atual", "Current balance")}</p>
        <p className="flex items-baseline gap-1.5 text-xl font-bold text-black dark:text-white">
          <Wallet size={16} className="text-[var(--gray-500)]" />
          <MoneyValue value={data?.current_balance} />
          {currency ? <span className="text-xs font-medium text-[var(--gray-500)]">{currency}</span> : null}
        </p>
      </section>

      {/* Dados bancários */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <MetaItem icon={<CreditCard size={15} />} label={t("Tipo de conta", "Account type")} value={kindLabel} />
        <MetaItem icon={<Hash size={15} />} label={t("Número da conta", "Account number")} value={String(data?.account_number || "")} />
        <MetaItem icon={<Landmark size={15} />} label={t("Agência / Balcão", "Branch")} value={String(data?.branch || "")} />
        <MetaItem icon={<Hash size={15} />} label="IBAN / NIB" value={String(data?.iban || "")} />
        <MetaItem icon={<Hash size={15} />} label="SWIFT / BIC" value={String(data?.swift || "")} />
        <MetaItem icon={<User size={15} />} label={t("Titular", "Holder")} value={String(data?.holder_name || "")} />
        <MetaItem icon={<Landmark size={15} />} label={t("Conta contábil", "Ledger account")} value={String(data?.account_name || "")} />
      </div>

      {notes ? (
        <section className="rounded-xl border border-white/20 bg-white/10 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center gap-2 border-b border-white/20 px-4 py-2.5 dark:border-white/10">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary-500)]/15 text-[var(--primary-700)]">
              <CreditCard size={15} />
            </span>
            <h3 className="text-sm font-semibold text-[var(--text)]">{t("Observações", "Notes")}</h3>
          </div>
          <div className="px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-black dark:text-white">{notes}</p>
          </div>
        </section>
      ) : null}
    </div>
  )
}
