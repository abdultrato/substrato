"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, Loader2, Search, X } from "lucide-react";

import { apiFetchList } from "@/lib/api";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

export const STATUS_CHOICES = [
  { value: "NA_META", label: "Dentro da meta" },
  { value: "ALERTA", label: "Alerta" },
  { value: "FORA_META", label: "Fora da meta" },
  { value: "NAO_MEDIDO", label: "Não medido" },
];

export const STATUS_LABEL: Record<string, string> = {
  NA_META: "Dentro da meta",
  ALERTA: "Alerta",
  FORA_META: "Fora da meta",
  NAO_MEDIDO: "Não medido",
};

export const STATUS_COLOR: Record<string, string> = {
  NA_META: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  ALERTA: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  FORA_META: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/15 dark:text-red-300",
  NAO_MEDIDO: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/30 dark:text-slate-300",
};

export const STATUS_DOT: Record<string, string> = {
  NA_META: "bg-emerald-500",
  ALERTA: "bg-amber-400",
  FORA_META: "bg-red-500",
  NAO_MEDIDO: "bg-slate-400",
};

export const STATUS_BAR = STATUS_DOT;

export const T_SECTOR: RelationTarget = {
  endpoint: "/clinical_laboratory/sector/",
  labelFields: ["name", "code"],
  staticFilters: { active: true },
};

export type Indicator = {
  id: number;
  custom_id?: string | null;
  name: string;
  formula?: string;
  sector?: number | null;
  sector_display?: string | { id?: number; label?: string; name?: string; code?: string } | null;
  target_value?: string | number | null;
  current_value?: string | number | null;
  period?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export function formatNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString("pt-MZ", { maximumFractionDigits: 2 });
}

export function progressPercent(current: string | number | null | undefined, target: string | number | null | undefined) {
  const currentNumber = Number(current);
  const targetNumber = Number(target);
  if (!Number.isFinite(currentNumber) || !Number.isFinite(targetNumber) || targetNumber <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((currentNumber / targetNumber) * 100)));
}

export function targetDeviationLabel(current: string | number | null | undefined, target: string | number | null | undefined) {
  const currentNumber = Number(current);
  const targetNumber = Number(target);
  if (!Number.isFinite(currentNumber) || !Number.isFinite(targetNumber)) return null;
  if (currentNumber > targetNumber) return "Acima da meta";
  if (currentNumber < targetNumber) return "Abaixo da meta";
  return null;
}

export function indicatorStatusLabel(
  status: string,
  current?: string | number | null,
  target?: string | number | null,
) {
  if (status === "FORA_META") return targetDeviationLabel(current, target) ?? "Fora da meta";
  return STATUS_LABEL[status] ?? status;
}

export function sectorLabel(indicator: Pick<Indicator, "sector" | "sector_display">) {
  const display = indicator.sector_display;
  if (typeof display === "string" && display.trim()) return display;
  if (display && typeof display === "object") return display.label || display.name || display.code || null;
  return indicator.sector ? `Sector #${indicator.sector}` : null;
}

export function Card({ icon: Icon, title, children, accent }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <section className="relative z-0 overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:bg-white/5 dark:border-white/10">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-1.5 pl-4">
        <Icon size={11} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-2 p-2.5 pl-3">{children}</div>
    </section>
  );
}

export function SectionCard({ icon: Icon, title, children, accent }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5 pl-5">
        <Icon size={13} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4 pl-5">{children}</div>
    </section>
  );
}

export function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-[11px] font-semibold text-foreground">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/30 py-1.5 last:border-0">
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium text-foreground">{children ?? "—"}</span>
    </div>
  );
}

export function RelationSelect({
  value, onChange, target, placeholder, initialLabel = "", error,
}: {
  value: number | null;
  onChange: (v: number | null, label: string) => void;
  target: RelationTarget;
  placeholder?: string;
  initialLabel?: string;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [label, setLabel] = useState(initialLabel);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

  useEffect(() => { if (initialLabel) setLabel(initialLabel); }, [initialLabel]);

  function search(q: string) {
    setQuery(q); setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { items } = await apiFetchList<Record<string, any>>(target.endpoint, {
          page: 1, pageSize: 30,
          query: { ...(target.staticFilters ?? {}), ...(q.trim() ? { search: q.trim() } : {}) },
        });
        setResults(relationOptionsFromRows(items, target));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
  }

  function select(opt: { value: string; label: string }) {
    onChange(Number(opt.value), opt.label);
    setLabel(opt.label); setQuery(""); setOpen(false);
  }
  function clear() { onChange(null, ""); setLabel(""); setQuery(""); }

  return (
    <div className="space-y-1.5">
      {value !== null && label && (
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            {label}
            <button type="button" onClick={clear} className="ml-0.5 text-emerald-500 hover:text-red-500 transition">
              <X size={9} />
            </button>
          </span>
        </div>
      )}
      {(value === null || !label) && (
        <div className={`relative ${open ? "z-[9999]" : "z-[10]"}`}>
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => { setOpen(true); if (!query) search(""); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className={`w-full rounded-md border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:ring-2 focus:ring-emerald-500/25 ${error ? "border-red-300 focus:border-red-400" : "border-border focus:border-emerald-500"}`}
          />
          {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={listboxId} role="listbox" className="absolute left-0 right-0 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {results.length === 0 ? (
                <p className="px-3 py-2 text-[11px] text-muted-foreground">{searching ? "A pesquisar..." : "Nenhum sector."}</p>
              ) : (
                <ul className="max-h-48 overflow-y-auto divide-y divide-border/40">
                  {results.map((opt) => (
                    <li key={opt.value}>
                      <button type="button" onMouseDown={() => select(opt)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">
                        <CheckCircle2 size={10} className="text-emerald-500" /> {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25";
