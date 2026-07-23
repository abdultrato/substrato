"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Activity, ArrowLeft, BatteryFull, BatteryLow, Cpu, Loader2, Pause, Play, RadioTower, Trash2, User, XCircle } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

type Device = {
  id: number;
  custom_id?: string | null;
  patient?: number | null;
  patient_name?: string | null;
  reading_count?: number | null;
  device_type?: string | null;
  status?: string | null;
  manufacturer?: string | null;
  model_name?: string | null;
  serial_number?: string | null;
  external_device_id?: string | null;
  paired_at?: string | null;
  last_sync_at?: string | null;
  battery_percent?: string | number | null;
  notes?: string | null;
};

type Reading = { id: number; measured_at?: string | null; source?: string | null; systolic_bp?: number | null; diastolic_bp?: number | null; spo2_percent?: string | number | null; heart_rate_bpm?: number | null; glucose_mg_dl?: string | number | null; temperature_c?: string | number | null; has_critical_value?: boolean };

const TYPE_LABEL: Record<string, string> = { BLOOD_PRESSURE: "Medidor de pressão", GLUCOMETER: "Glicómetro", PULSE_OXIMETER: "Oxímetro", WEARABLE: "Wearable", SPIROMETER: "Espirómetro", SCALE: "Balança", OTHER: "Outro" };
const STATUS_META: Record<string, { label: string; tone: string; bar: string }> = {
  REGISTERED: { label: "Registado", tone: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/30 dark:text-sky-300", bar: "from-sky-500 to-cyan-500" },
  ACTIVE: { label: "Ativo", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300", bar: "from-emerald-500 to-teal-500" },
  PAUSED: { label: "Pausado", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300", bar: "from-amber-500 to-orange-500" },
  LOST: { label: "Perdido", tone: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-300", bar: "from-rose-500 to-red-500" },
  RETIRED: { label: "Retirado", tone: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400", bar: "from-slate-400 to-slate-500" },
};
const ACTIONS_BY_STATUS: Record<string, Array<{ endpoint: string; label: string; icon: any; kind: "primary" | "danger" }>> = {
  REGISTERED: [{ endpoint: "ativar", label: "Ativar", icon: Play, kind: "primary" }, { endpoint: "retirar", label: "Retirar", icon: Trash2, kind: "danger" }],
  ACTIVE: [{ endpoint: "pausar", label: "Pausar", icon: Pause, kind: "primary" }, { endpoint: "marcar-perdido", label: "Marcar perdido", icon: XCircle, kind: "danger" }],
  PAUSED: [{ endpoint: "ativar", label: "Reativar", icon: Play, kind: "primary" }, { endpoint: "retirar", label: "Retirar", icon: Trash2, kind: "danger" }],
  LOST: [{ endpoint: "retirar", label: "Retirar", icon: Trash2, kind: "danger" }],
};

function num(v: string | number | null | undefined): number | null { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isNaN(n) ? null : n; }
function fmt(value?: string | null) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
function readingSummary(r: Reading): string {
  const parts: string[] = [];
  if (r.systolic_bp != null || r.diastolic_bp != null) parts.push(`PA ${r.systolic_bp ?? "—"}/${r.diastolic_bp ?? "—"}`);
  if (r.heart_rate_bpm != null) parts.push(`FC ${r.heart_rate_bpm}`);
  if (num(r.spo2_percent) != null) parts.push(`SpO2 ${num(r.spo2_percent)}%`);
  if (num(r.glucose_mg_dl) != null) parts.push(`Glic ${num(r.glucose_mg_dl)}`);
  if (num(r.temperature_c) != null) parts.push(`${num(r.temperature_c)}°C`);
  return parts.join(" · ") || "sem valores";
}

export default function TelemedicineDeviceDetailPage() {
  const params = useParams();
  const id = routeParamToString((params as any)?.id);
  const [device, setDevice] = useState<Device | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Device>(`/telemedicine/device/${id}/`, { clientCache: false });
      setDevice(data);
      try {
        const res = await apiFetchList<Reading>(`/telemedicine/vital_reading/?device=${id}`, { page: 1, pageSize: 10, clientPaginate: true, clientCache: false });
        setReadings(res.items || []);
      } catch { /* leituras são opcionais */ }
    } catch (e: any) {
      setError(e?.message || "Não foi possível carregar o dispositivo.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const runAction = useCallback(async (endpoint: string) => {
    if (!id || busy) return;
    setBusy(endpoint);
    setError(null);
    try {
      const data = await apiFetch<Device>(`/telemedicine/device/${id}/${endpoint}/`, { method: "POST", body: JSON.stringify({}) });
      setDevice(data);
    } catch (e: any) {
      setError(e?.message || "Não foi possível executar a ação.");
    } finally {
      setBusy(null);
    }
  }, [id, busy]);

  const status = String(device?.status || "").toUpperCase();
  const meta = STATUS_META[status] || STATUS_META.REGISTERED;
  const actions = ACTIONS_BY_STATUS[status] || [];
  const battery = num(device?.battery_percent);
  const lowBattery = battery != null && battery <= 20;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.RECEPCAO, GROUPS.ENFERMAGEM, GROUPS.TELEMEDICINA]}>
      <div className="mx-auto w-full max-w-[99vw] space-y-2 px-1 pb-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> A carregar…</div>
        ) : !device ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error || "Dispositivo não encontrado."}</div>
        ) : (
          <>
            {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error}</div> : null}

            {/* Cabeçalho. */}
            <section className="relative overflow-hidden rounded-xl border border-cyan-200/60 bg-white/55 p-3 shadow-sm backdrop-blur dark:border-cyan-900/35 dark:bg-slate-950/45">
              <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${meta.bar}`} />
              <div className="flex flex-wrap items-start gap-2">
                <Link href="/telemedicine/devices" title="Voltar aos dispositivos" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-muted-foreground shadow-sm transition hover:border-cyan-300 hover:text-foreground"><ArrowLeft size={15} /></Link>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] text-muted-foreground">{device.custom_id || `RMD-${device.id}`}</p>
                  <h1 className="flex items-center gap-1.5 truncate text-lg font-bold leading-tight text-foreground"><Cpu size={18} className="shrink-0 text-cyan-600 dark:text-cyan-400" />{TYPE_LABEL[String(device.device_type || "").toUpperCase()] || "Dispositivo"}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${meta.tone}`}>{meta.label}</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><User size={11} />{device.patient_name || "Sem paciente"}</span>
                    <span className={`inline-flex items-center gap-1 ${lowBattery ? "font-semibold text-rose-600 dark:text-rose-400" : "text-muted-foreground"}`}>{lowBattery ? <BatteryLow size={11} /> : <BatteryFull size={11} />}{battery != null ? `${battery}%` : "—"}</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><Activity size={11} />{device.reading_count ?? 0} leituras</span>
                  </div>
                </div>
              </div>
              {actions.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/40 pt-2">
                  {actions.map((a) => {
                    const AIcon = a.icon;
                    return (
                      <button key={a.endpoint} type="button" disabled={!!busy} onClick={() => runAction(a.endpoint)}
                        className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition disabled:opacity-50 ${a.kind === "primary" ? "bg-gradient-to-r from-cyan-600 to-violet-600 text-white shadow-sm hover:from-cyan-700 hover:to-violet-700" : "border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800/40 dark:text-rose-300"}`}>
                        {busy === a.endpoint ? <Loader2 size={13} className="animate-spin" /> : <AIcon size={13} />}{a.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <div className="grid gap-2 md:grid-cols-3">
              {/* Especificações. */}
              <section className="rounded-xl border border-border/60 bg-card/60 p-3 md:col-span-2">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Especificações</h2>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <Field label="Fabricante" value={device.manufacturer} />
                  <Field label="Modelo" value={device.model_name} />
                  <Field label="Número de série" value={device.serial_number} mono />
                  <Field label="ID externo" value={device.external_device_id} mono />
                  <Field label="Pareado em" value={fmt(device.paired_at)} />
                  <Field label="Última sincronização" value={fmt(device.last_sync_at)} />
                </dl>
                {device.notes?.trim() ? (
                  <div className="mt-2 border-t border-border/40 pt-2">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Observações</dt>
                    <dd className="mt-0.5 text-xs text-foreground">{device.notes}</dd>
                  </div>
                ) : null}
              </section>

              {/* Estado de sincronização/bateria. */}
              <section className="rounded-xl border border-border/60 bg-card/60 p-3">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Sincronização</h2>
                <div className="space-y-1.5 text-xs">
                  <div className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${lowBattery ? "border-rose-200 bg-rose-50/60 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300" : "border-border/60"}`}>
                    {lowBattery ? <BatteryLow size={14} /> : <BatteryFull size={14} className="text-emerald-600 dark:text-emerald-400" />}
                    <span className="font-medium">Bateria</span><span className="ml-auto font-bold">{battery != null ? `${battery}%` : "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
                    <RadioTower size={14} className="text-cyan-600 dark:text-cyan-400" /><span className="font-medium">Última sinc.</span><span className="ml-auto text-[11px] text-muted-foreground">{fmt(device.last_sync_at)}</span>
                  </div>
                </div>
              </section>
            </div>

            {/* Leituras recentes deste dispositivo. */}
            <section className="rounded-xl border border-border/60 bg-card/60 p-3">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Leituras recentes</h2>
              {readings.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Sem leituras registadas por este dispositivo.</p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {readings.map((r) => (
                    <li key={r.id}>
                      <Link href={`/telemedicine/vitals/${r.id}`} className="flex items-center gap-2 py-1.5 text-xs transition hover:text-foreground">
                        {r.has_critical_value ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
                        <span className={`min-w-0 flex-1 truncate ${r.has_critical_value ? "font-semibold text-rose-600 dark:text-rose-400" : "text-foreground"}`}>{readingSummary(r)}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{fmt(r.measured_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 text-xs text-foreground ${mono ? "font-mono" : ""}`}>{value?.toString().trim() ? value : <span className="text-muted-foreground/60">—</span>}</dd>
    </div>
  );
}
