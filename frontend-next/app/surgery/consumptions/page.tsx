"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { GROUPS } from "@/lib/rbac";
import { apiFetch } from "@/lib/api";
import {
  ArrowLeft,
  ChevronDown,
  Package,
  User,
  CalendarClock,
  Search,
  Plus,
  Loader2,
  ChevronRight,
  AlertCircle,
  Boxes,
  Tag,
  CheckCircle2,
} from "lucide-react";

const GLASS = "rounded-xl border border-violet-200 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const MATERIAL_STATUS_LABEL: Record<string, string> = {
  RESERVED: "Reservado",
  PREPARED: "Preparado",
  SENT_TO_OR: "Enviado para sala",
  USED: "Usado",
  PARTIALLY_USED: "Parcialmente usado",
  RETURNED: "Devolvido",
  DISCARDED: "Descartado",
  STERILIZATION_REQUIRED: "Esterilização necessária",
  BILLED: "Faturado",
};

const MATERIAL_STATUS_COLOR: Record<string, string> = {
  RESERVED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  PREPARED: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  SENT_TO_OR: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  USED: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  PARTIALLY_USED: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  RETURNED: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  DISCARDED: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  STERILIZATION_REQUIRED: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  BILLED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

const BILLING_STATUS_LABEL: Record<string, string> = {
  NOT_BILLABLE: "Não faturável",
  PENDING: "Pendente",
  BILLABLE: "Faturável",
  BILLED: "Faturado",
  ADJUSTED: "Ajustado",
};

const BILLING_STATUS_COLOR: Record<string, string> = {
  NOT_BILLABLE: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  BILLABLE: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  BILLED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  ADJUSTED: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

const MATERIAL_FILTER_OPTIONS = Object.keys(MATERIAL_STATUS_LABEL);
const BILLING_FILTER_OPTIONS = Object.keys(BILLING_STATUS_LABEL);

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface Consumption {
  id: number;
  custom_id: string;
  material_status: string;
  billing_status: string;
  quantity: string;
  unit_cost: string;
  charged_price: string;
  line_total: string;
  batch_number: string;
  consumed_at: string | null;
  inventory_deducted: boolean;
  returned_quantity: string;
  surgery_code?: string;
  material_name?: string;
  product_name?: string;
  consumed_by_name?: string;
}

function itemName(c: Consumption) {
  const raw = c.material_name || c.product_name || "Material não identificado";
  return raw.replace(/^Farmacia Teste \d+ - /, "");
}

function ConsumptionCard({ c }: { c: Consumption }) {
  const mLabel = MATERIAL_STATUS_LABEL[c.material_status] ?? c.material_status;
  const mCls = MATERIAL_STATUS_COLOR[c.material_status] ?? "bg-gray-100 text-gray-600";
  const bLabel = BILLING_STATUS_LABEL[c.billing_status] ?? c.billing_status;
  const bCls = BILLING_STATUS_COLOR[c.billing_status] ?? "bg-gray-100 text-gray-600";
  const qty = parseFloat(c.quantity);
  const total = parseFloat(c.line_total || c.charged_price);

  return (
    <Link href={`/surgery/consumptions/${c.id}`} className="group block">
      <div className={`${GLASS} relative overflow-hidden p-4 transition-all duration-150 hover:border-violet-300 hover:shadow-md dark:hover:border-violet-600/40`}>
        {/* accent bar */}
        <span className="absolute left-0 top-0 h-full w-1 bg-violet-400 opacity-60 group-hover:opacity-100" />

        <div className="pl-3">
          {/* top row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-semibold tracking-wide text-violet-600 dark:text-violet-400">
                  {c.custom_id}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${mCls}`}>
                  {mLabel}
                </span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${bCls}`}>
                  {bLabel}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[13px] font-medium text-foreground">
                {itemName(c)}
              </p>
            </div>
            <ChevronRight size={14} className="mt-1 shrink-0 text-[var(--gray-400)] transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
          </div>

          {/* detail row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--gray-500)]">
            {c.consumed_by_name ? (
              <span className="flex items-center gap-1">
                <User size={10} className="shrink-0" />
                {c.consumed_by_name}
              </span>
            ) : null}
            {c.consumed_at ? (
              <span className="flex items-center gap-1">
                <CalendarClock size={10} className="shrink-0" />
                {formatDate(c.consumed_at)}
              </span>
            ) : null}
            {c.batch_number ? (
              <span className="flex items-center gap-1">
                <Tag size={10} className="shrink-0" />
                Lote {c.batch_number}
              </span>
            ) : null}
          </div>

          {/* bottom row */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {c.surgery_code ? (
              <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-violet-600 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300">
                {c.surgery_code}
              </span>
            ) : null}
            <span className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
              <Boxes size={10} className="shrink-0" />
              {qty.toLocaleString("pt-PT")} × {parseFloat(c.charged_price).toLocaleString("pt-PT")} MT
            </span>
            {parseFloat(c.returned_quantity || "0") > 0 ? (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                {parseFloat(c.returned_quantity).toLocaleString("pt-PT")} devolvido(s)
              </span>
            ) : null}
            {c.inventory_deducted ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={10} /> Stock baixado
              </span>
            ) : null}
            {total > 0 ? (
              <span className="ml-auto text-[10px] font-semibold text-foreground">
                {total.toLocaleString("pt-PT", { minimumFractionDigits: 2 })} MT
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

interface DropdownProps {
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder: string;
  options: string[];
  labels: Record<string, string>;
  colors: Record<string, string>;
}

function StatusDropdown({ value, onChange, placeholder, options, labels, colors }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative z-20 shrink-0">
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`inline-flex h-[34px] items-center gap-1.5 rounded-lg border px-2.5 text-[12px] transition ${
          value
            ? (colors[value] ?? "bg-card border-border text-foreground") + " border-transparent"
            : "border-border bg-card/60 text-[var(--gray-500)] hover:border-violet-300 hover:text-violet-600"
        }`}>
        {value ? labels[value] : placeholder}
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-52 rounded-xl border border-border bg-card shadow-xl">
          {value && (
            <button type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className="flex w-full items-center gap-2 border-b border-border px-3 py-1.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-50/60">
              × Limpar filtro
            </button>
          )}
          {options.map(s => {
            const active = value === s;
            return (
              <button key={s} type="button"
                onClick={() => { onChange(active ? null : s); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] first:rounded-t-xl last:rounded-b-xl transition ${
                  active ? "bg-violet-50 font-semibold text-violet-700 dark:bg-violet-900/20" : "hover:bg-muted"
                }`}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${colors[s]?.match(/bg-\S+/)?.[0] ?? "bg-gray-300"}`} />
                <span className="flex-1">{labels[s] ?? s}</span>
                {active && <span className="text-[10px] text-violet-500">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SurgicalConsumptionsListPage() {
  const [items, setItems] = useState<Consumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [materialFilter, setMaterialFilter] = useState<string | null>(null);
  const [billingFilter, setBillingFilter] = useState<string | null>(null);
  const [numFilter, setNumFilter] = useState("");

  const load = useCallback(async (q: string, material: string | null, billing: string | null, num: string) => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ limit: "200" });
      if (q) p.set("search", q);
      if (material) p.set("material_status", material);
      if (billing) p.set("billing_status", billing);
      if (num && /^\d{1,3}$/.test(num)) p.set("id", num);
      const d = await apiFetch<any>(`/surgery/consumos/?${p}`);
      setItems(d.results ?? d);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load("", null, null, ""); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search, materialFilter, billingFilter, numFilter), 300);
    return () => clearTimeout(t);
  }, [search, materialFilter, billingFilter, numFilter, load]);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-5xl space-y-2 px-1 py-1">

        {/* header */}
        <section className={`relative z-10 overflow-visible ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="px-3 py-2 pl-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--gray-500)]">
                  <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                  <span>/</span>
                  <span className="font-semibold text-foreground">Consumos</span>
                </div>
                <h1 className="font-display text-sm font-semibold text-foreground">Consumos cirúrgicos</h1>
              </div>
              <div className="flex items-center gap-1.5">
                <Link href="/surgery"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground hover:bg-muted">
                  <ArrowLeft size={11} /> Voltar
                </Link>
                <Link href="/surgery/consumptions/new"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
                  <Plus size={11} /> Novo consumo
                </Link>
              </div>
            </div>

            <div className="mt-2 border-t border-white/20 dark:border-white/10" />

            {/* search + filters + num */}
            <div className="mt-2 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--gray-400)]" />
                <input
                  className="w-full rounded-lg border border-border bg-card/60 py-1.5 pl-7 pr-3 text-[12px] placeholder-[var(--gray-400)] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
                  placeholder="Pesquisar por código, cirurgia, material ou lote..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <StatusDropdown
                value={materialFilter}
                onChange={setMaterialFilter}
                placeholder="Material"
                options={MATERIAL_FILTER_OPTIONS}
                labels={MATERIAL_STATUS_LABEL}
                colors={MATERIAL_STATUS_COLOR}
              />
              <StatusDropdown
                value={billingFilter}
                onChange={setBillingFilter}
                placeholder="Faturação"
                options={BILLING_FILTER_OPTIONS}
                labels={BILLING_STATUS_LABEL}
                colors={BILLING_STATUS_COLOR}
              />

              <input
                type="number" min="1" max="999"
                className="w-16 shrink-0 rounded-lg border border-border bg-card/60 py-1.5 px-2 text-[12px] text-center text-foreground placeholder-[var(--gray-400)] focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-800"
                placeholder="Nº"
                value={numFilter}
                onChange={e => setNumFilter(e.target.value.replace(/\D/g, "").slice(0, 3))}
              />
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--gray-500)]">
            <Loader2 size={16} className="animate-spin" /> Carregando...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-3 text-sm text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
            <AlertCircle size={14} />{error}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--gray-400)]">
            <Package size={32} className="mx-auto mb-3 opacity-30" />
            Nenhum consumo encontrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map(c => <ConsumptionCard key={c.id} c={c} />)}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
