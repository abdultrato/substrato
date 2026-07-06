"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, Loader2, Search, X } from "lucide-react";

import { apiFetchList } from "@/lib/api";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

export const SOURCE_CHOICES = [
  { value: "REJEICAO", label: "Rejeição de amostra" },
  { value: "FALHA_QC", label: "Falha de controlo de qualidade" },
  { value: "RECLAMACAO", label: "Reclamação" },
  { value: "AUDITORIA", label: "Achado de auditoria" },
  { value: "EXPOSICAO", label: "Incidente de exposição" },
  { value: "EQUIPAMENTO", label: "Equipamento" },
  { value: "INTERNA", label: "Deteção interna" },
  { value: "OUTRA", label: "Outra" },
];

export const SEVERITY_CHOICES = [
  { value: "MENOR", label: "Menor" },
  { value: "MAIOR", label: "Maior" },
  { value: "CRITICA", label: "Crítica" },
];

export const STATUS_CHOICES = [
  { value: "ABERTA", label: "Aberta" },
  { value: "INVESTIGACAO", label: "Em investigação" },
  { value: "ACAO_REQUERIDA", label: "Ação requerida" },
  { value: "CAPA_EM_CURSO", label: "CAPA em curso" },
  { value: "VERIFICACAO", label: "Pendente de verificação" },
  { value: "FECHADA", label: "Fechada" },
  { value: "CANCELADA", label: "Cancelada" },
];

export const SOURCE_LABEL = Object.fromEntries(SOURCE_CHOICES.map((x) => [x.value, x.label])) as Record<string, string>;
export const SEVERITY_LABEL = Object.fromEntries(SEVERITY_CHOICES.map((x) => [x.value, x.label])) as Record<string, string>;
export const STATUS_LABEL = Object.fromEntries(STATUS_CHOICES.map((x) => [x.value, x.label])) as Record<string, string>;

export const SEVERITY_COLOR: Record<string, string> = {
  MENOR: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  MAIOR: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/15 dark:text-red-300",
  CRITICA: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",
};

export const STATUS_COLOR: Record<string, string> = {
  ABERTA: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",
  INVESTIGACAO: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300",
  ACAO_REQUERIDA: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  CAPA_EM_CURSO: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300",
  VERIFICACAO: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  FECHADA: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
  CANCELADA: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/30 dark:text-slate-300",
};

export const SEVERITY_BAR: Record<string, string> = {
  MENOR: "bg-amber-400",
  MAIOR: "bg-red-500",
  CRITICA: "bg-rose-600",
};

export const T_SECTOR: RelationTarget = {
  endpoint: "/clinical_laboratory/sector/",
  labelFields: ["name", "code"],
  staticFilters: { active: true },
};

export const T_ORDER: RelationTarget = {
  endpoint: "/clinical_laboratory/order/",
  labelFields: ["custom_id", "patient_name", "created_at"],
};

export const T_PATIENT: RelationTarget = {
  endpoint: "/clinical/patient/",
  labelFields: ["name", "document_number", "custom_id"],
};

export const T_ORDER_ITEM: RelationTarget = {
  endpoint: "/clinical_laboratory/order_item/",
  labelFields: ["test_name", "test_code", "custom_id"],
};

export const T_TEST: RelationTarget = {
  endpoint: "/clinical_laboratory/test/",
  labelFields: ["name", "code", "custom_id"],
  staticFilters: { active: true },
};

export const T_RESULT: RelationTarget = {
  endpoint: "/clinical_laboratory/result/",
  labelFields: ["custom_id", "test_name", "field_name", "value", "unit", "flag"],
};

export const T_SAMPLE: RelationTarget = {
  endpoint: "/clinical_laboratory/sample/",
  labelFields: ["barcode", "sample_type_display", "status_display", "custom_id", "sample_type", "status"],
};

export const T_EQUIPMENT: RelationTarget = {
  endpoint: "/equipment/equipment/",
  labelFields: ["name", "serial_number", "custom_id"],
};

export const T_TEST_FIELD: RelationTarget = {
  endpoint: "/clinical_laboratory/test_field/",
  labelFields: ["name", "code", "unit", "custom_id"],
};

export const T_EXPOSURE_INCIDENT: RelationTarget = {
  endpoint: "/clinical_laboratory/exposure_incident/",
  labelFields: ["custom_id", "incident_type", "incident_at"],
};

export type DisplayValue = string | { id?: number; label?: string; name?: string; code?: string; username?: string; email?: string } | null;

export type Nonconformity = {
  id: number;
  custom_id?: string | null;
  code?: string;
  sector?: number | null;
  sector_display?: DisplayValue;
  source: string;
  source_ref?: string;
  detected_by?: number | null;
  detected_by_display?: DisplayValue;
  detected_at?: string | null;
  description: string;
  severity: string;
  immediate_action?: string;
  root_cause?: string;
  patient_impact?: boolean;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export function displayLabel(value: DisplayValue) {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") return value.label || value.name || value.code || value.username || value.email || null;
  return null;
}

export function sectorLabel(rec: Pick<Nonconformity, "sector" | "sector_display">) {
  return displayLabel(rec.sector_display) ?? (rec.sector ? `Sector #${rec.sector}` : null);
}

export function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-MZ", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function toDateInput(d: string | null | undefined) {
  if (!d) return "";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "";
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

const TRACE_MARKER = "Rastreabilidade da origem:";

export function splitRootCauseTrace(value: string | null | undefined) {
  const text = value ?? "";
  const markerIndex = text.indexOf(TRACE_MARKER);
  if (markerIndex < 0) return { rootCause: text.trim(), traceability: "" };
  return {
    rootCause: text.slice(0, markerIndex).trim(),
    traceability: text.slice(markerIndex).trim(),
  };
}

export function composeRootCauseTrace(rootCause: string, traceability: string) {
  return [rootCause.trim(), traceability.trim()].filter(Boolean).join("\n\n");
}

const TRACE_REF_LABELS = ["Paciente", "Requisição", "Exame", "Resultado", "Amostra", "Equipamento relacionado", "Analito/campo de exame", "Incidente de exposição"] as const;

type TraceRefLabel = typeof TRACE_REF_LABELS[number];

export function parseTraceReference(traceability: string, label: TraceRefLabel) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = traceability.match(new RegExp(`${escaped}:\\s*(.*?)\\s*\\(#(\\d+)\\)`, "u"));
  if (!match) return { id: null as number | null, label: "" };
  return { id: Number(match[2]), label: match[1].trim() };
}

export function parseTraceChainNote(traceability: string) {
  const match = traceability.match(/(?:^|\n)- Cadeia raiz-fruto:\s*([\s\S]*)$/u);
  return match?.[1]?.trim() ?? "";
}

export function Card({ icon: Icon, title, children, accent }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <section className="relative z-0 overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:bg-white/5 dark:border-white/10">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-1.5 pl-4">
        <Icon size={11} className="text-rose-600 dark:text-rose-300" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-1.5 p-2 pl-3">{children}</div>
    </section>
  );
}

export function SectionCard({ icon: Icon, title, children, accent }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-1.5 border-b border-border/50 px-4 py-2 pl-5">
        <Icon size={13} className="text-rose-600 dark:text-rose-300" />
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-3 pl-5">{children}</div>
    </section>
  );
}

export function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-[11px] font-semibold text-foreground">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
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
  value, onChange, target, placeholder, initialLabel = "", disabled = false, disabledMessage = "Selecione o campo anterior primeiro.",
}: {
  value: number | null;
  onChange: (v: number | null, label: string) => void;
  target: RelationTarget;
  placeholder?: string;
  initialLabel?: string;
  disabled?: boolean;
  disabledMessage?: string;
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
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
            {label}
            <button type="button" onClick={clear} className="ml-0.5 text-rose-500 transition hover:text-red-500">
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
            onFocus={() => { if (!disabled) { setOpen(true); if (!query) search(""); } }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {disabled ? (
            <p className="mt-1 text-[10px] text-muted-foreground">{disabledMessage}</p>
          ) : open && (
            <div id={listboxId} role="listbox" className="absolute left-0 right-0 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {results.length === 0 ? (
                <p className="px-3 py-2 text-[11px] text-muted-foreground">{searching ? "A pesquisar..." : "Nenhum resultado."}</p>
              ) : (
                <ul className="max-h-48 overflow-y-auto divide-y divide-border/40">
                  {results.map((opt) => (
                    <li key={opt.value}>
                      <button type="button" onMouseDown={() => select(opt)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">
                        <CheckCircle2 size={10} className="text-rose-500" /> {opt.label}
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

export const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/25";
