"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, Droplet, Gauge, Heart, Loader2, Plus, Search, Thermometer, Wind } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type Reading = {
  id: number;
  custom_id?: string | null;
  patient_name?: string | null;
  device_label?: string | null;
  has_critical_value?: boolean;
  measured_at?: string | null;
  source?: string | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  glucose_mg_dl?: string | number | null;
  spo2_percent?: string | number | null;
  heart_rate_bpm?: number | null;
  respiratory_rate?: number | null;
  temperature_c?: string | number | null;
  weight_kg?: string | number | null;
  peak_flow_l_min?: number | null;
  notes?: string | null;
};

const SOURCE_LABEL: Record<string, string> = { DEVICE: "Dispositivo", MANUAL: "Manual", INTEGRATION: "Integração" };

function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}
function fmt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// Sinais individuais com o seu formato e o teste de criticidade (mesmos limites
// do has_critical_value do backend).
function vitals(r: Reading) {
  const sys = r.systolic_bp ?? null, dia = r.diastolic_bp ?? null;
  const spo2 = num(r.spo2_percent), glu = num(r.glucose_mg_dl), temp = num(r.temperature_c);
  return [
    sys != null || dia != null ? { icon: Gauge, label: "PA", value: `${sys ?? "—"}/${dia ?? "—"}`, unit: "mmHg", critical: (sys != null && sys >= 180) || (dia != null && dia >= 120) } : null,
    r.heart_rate_bpm != null ? { icon: Heart, label: "FC", value: String(r.heart_rate_bpm), unit: "bpm", critical: false } : null,
    spo2 != null ? { icon: Wind, label: "SpO2", value: String(spo2), unit: "%", critical: spo2 < 90 } : null,
    glu != null ? { icon: Droplet, label: "Glic.", value: String(glu), unit: "mg/dL", critical: glu < 54 || glu > 300 } : null,
    temp != null ? { icon: Thermometer, label: "Temp.", value: String(temp), unit: "°C", critical: false } : null,
    r.respiratory_rate != null ? { icon: Activity, label: "FR", value: String(r.respiratory_rate), unit: "rpm", critical: false } : null,
  ].filter(Boolean) as Array<{ icon: any; label: string; value: string; unit: string; critical: boolean }>;
}

export default function TelemedicineVitalsListPage() {
  const [items, setItems] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [onlyCritical, setOnlyCritical] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetchList<Reading>("/telemedicine/vital_reading/", { page: 1, pageSize: 200, clientPaginate: true, clientCache: false });
      setItems(res.items || []);
    } catch (e: any) {
      setError(e?.message || "Não foi possível carregar as leituras.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return items.filter((r) =>
      (!onlyCritical || r.has_critical_value) &&
      (!term || [r.patient_name, r.custom_id, r.device_label].filter(Boolean).join(" ").toLocaleLowerCase().includes(term))
    );
  }, [items, search, onlyCritical]);

  const criticalCount = useMemo(() => items.filter((r) => r.has_critical_value).length, [items]);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.RECEPCAO, GROUPS.ENFERMAGEM, GROUPS.TELEMEDICINA]}>
      <div className="mx-auto w-full max-w-[99vw] space-y-1 px-1 pb-2">
        {/* Header mínimo: título + indicadores inline + busca. */}
        <section className="relative flex flex-wrap items-center gap-x-2 gap-y-1 overflow-hidden rounded-lg border border-cyan-200/60 bg-white/55 px-2 py-1 shadow-sm backdrop-blur dark:border-cyan-900/35 dark:bg-slate-950/45">
          <span className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-cyan-500 to-violet-600" />
          <div className="flex items-center gap-1.5"><Activity size={16} className="text-cyan-600 dark:text-cyan-400" /><h1 className="text-sm font-bold leading-none text-foreground">Leituras remotas</h1></div>
          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap"><Activity size={13} className="shrink-0 text-sky-600" />Total<b className="text-xs font-bold text-sky-600">{loading ? "…" : items.length}</b></span>
            <button type="button" onClick={() => setOnlyCritical((v) => !v)} className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 transition ${onlyCritical ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" : ""}`}><AlertTriangle size={13} className="shrink-0 text-rose-600" />Críticas<b className="text-xs font-bold text-rose-600">{loading ? "…" : criticalCount}</b></button>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <div className="relative"><Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Paciente, código, dispositivo…" className="h-7 w-40 rounded-md border border-slate-200 bg-white/80 pl-6 pr-2 text-xs outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 sm:w-52 dark:border-slate-700 dark:bg-slate-900/70" /></div>
            <Link href="/telemedicine/vitals/new" title="Nova leitura" className="inline-flex h-7 items-center gap-1 rounded-md bg-gradient-to-r from-cyan-600 to-violet-600 px-2 text-xs font-semibold text-white transition hover:from-cyan-700 hover:to-violet-700"><Plus size={13} /> Nova</Link>
          </div>
        </section>

        {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error}</div> : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> A carregar leituras…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/65 px-3 py-10 text-center text-xs text-muted-foreground">Sem leituras para mostrar.</div>
        ) : (
          <div className="flex flex-wrap items-stretch gap-1.5">
            {filtered.map((r) => {
              const critical = !!r.has_critical_value;
              return (
                <Link
                  key={r.id}
                  href={`/telemedicine/vitals/${r.id}`}
                  className={`flex w-[17rem] flex-col overflow-hidden rounded-lg border bg-white/80 p-2 shadow-sm transition hover:-translate-y-px hover:shadow-md dark:bg-slate-900/65 ${critical ? "border-rose-300 dark:border-rose-700/50" : "border-white/60 dark:border-white/10 hover:border-cyan-300 dark:hover:border-cyan-600/60"}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold leading-tight text-foreground">{r.patient_name || "Paciente não identificado"}</p>
                      <p className="text-[10px] text-muted-foreground">{fmt(r.measured_at)} · {SOURCE_LABEL[String(r.source || "").toUpperCase()] || "—"}</p>
                    </div>
                    {critical ? <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300"><AlertTriangle size={9} /> Crítico</span> : null}
                  </div>
                  <div className="mt-1.5 grid grid-cols-3 gap-1">
                    {vitals(r).map((v) => {
                      const VIcon = v.icon;
                      return (
                        <div key={v.label} className={`rounded-md border px-1 py-0.5 ${v.critical ? "border-rose-200 bg-rose-50 dark:border-rose-800/40 dark:bg-rose-950/25" : "border-border/50 bg-muted/30"}`}>
                          <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground"><VIcon size={9} className={v.critical ? "text-rose-600" : ""} />{v.label}</div>
                          <div className={`text-[11px] font-bold leading-none ${v.critical ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>{v.value}<span className="ml-0.5 text-[8px] font-normal text-muted-foreground">{v.unit}</span></div>
                        </div>
                      );
                    })}
                  </div>
                  {r.device_label ? <p className="mt-1 truncate text-[9px] text-muted-foreground">Disp.: {r.device_label}</p> : null}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
