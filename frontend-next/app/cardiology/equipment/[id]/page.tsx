"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  Loader2,
  MapPin,
  Power,
  Stethoscope,
  Wrench,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const REQUIRED_GROUPS = [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.CARDIOLOGIA];

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_META: Record<string, { label: string; bar: string; chip: string; Icon: typeof Wrench }> = {
  ACTIVE: {
    label: "Ativo",
    bar: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300",
    Icon: CheckCircle2,
  },
  MAINTENANCE: {
    label: "Em manutenção",
    bar: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300",
    Icon: Wrench,
  },
  INACTIVE: {
    label: "Inativo",
    bar: "bg-rose-500",
    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300",
    Icon: AlertTriangle,
  },
};

const MODALITY_LABELS: Record<string, string> = {
  ECG: "ECG",
  ECHOCARDIOGRAM: "Ecocardiograma",
  EXERCISE_TEST: "Teste ergométrico",
  HOLTER: "Holter",
  AMBULATORY_BP: "MAPA",
  OTHER: "Outra",
};

type CardiologyEquipment = {
  id: number;
  custom_id?: string;
  code?: string;
  name?: string;
  specialty?: string;
  modality?: string;
  status?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  station_name?: string;
  location?: string;
  integration_endpoint?: string;
  last_quality_control?: string | null;
  next_quality_control?: string | null;
  notes?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type DiagnosticOrder = {
  id: number;
  order_number?: string;
  custom_id?: string;
  patient_name?: string;
  status?: string;
  priority?: string;
  requested_at?: string | null;
  performed_at?: string | null;
  report_count?: number;
};

type CardProps = {
  title: string;
  icon: typeof Wrench;
  children: React.ReactNode;
  accent?: string;
  className?: string;
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDatetime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function todayInputDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function textValue(value?: string | null) {
  const clean = String(value || "").trim();
  return clean || "-";
}

function orderLabel(order: DiagnosticOrder) {
  return order.order_number || order.custom_id || `Exame #${order.id}`;
}

function Card({ title, icon: Icon, children, accent = "bg-rose-500", className = "" }: CardProps) {
  return (
    <section className={`relative overflow-hidden ${GLASS} ${className}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="space-y-1 px-2 py-1.5 pl-4">
        <div className="flex items-center gap-1 border-b border-border/40 pb-1">
          <Icon size={12} className="shrink-0 text-rose-500" />
          <h2 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 text-[10px] leading-tight min-[420px]:grid-cols-[7.5rem_1fr]">
      <span className="whitespace-nowrap text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium text-foreground">{value}</span>
    </div>
  );
}

function HeaderMetric({ label, value, tone = "rose" }: { label: string; value: string | number; tone?: "rose" | "emerald" | "amber" | "slate" }) {
  const tones = {
    rose: "border-l-rose-500 bg-rose-500/5",
    emerald: "border-l-emerald-500 bg-emerald-500/5",
    amber: "border-l-amber-500 bg-amber-500/5",
    slate: "border-l-slate-500 bg-slate-500/5",
  };
  return (
    <div className={`min-w-0 rounded border border-border/60 border-l-2 px-1.5 py-0.5 ${tones[tone]}`}>
      <div className="truncate text-[9px] font-medium leading-tight text-muted-foreground">{label}</div>
      <div className="break-words text-[11px] font-bold leading-tight text-foreground md:truncate">{value}</div>
    </div>
  );
}

export default function CardiologyEquipmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [equipment, setEquipment] = useState<CardiologyEquipment | null>(null);
  const [orders, setOrders] = useState<DiagnosticOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"maintenance" | "available" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [equipmentData, ordersData] = await Promise.all([
        apiFetch<CardiologyEquipment>(`/specialty_diagnostics/equipment/${id}/`),
        apiFetchList<DiagnosticOrder>("/specialty_diagnostics/order/", {
          page: 1,
          pageSize: 12,
          query: { specialty: "CARDIOLOGY", equipment: id, ordering: "-requested_at" },
        }),
      ]);
      setEquipment(equipmentData);
      setOrders(ordersData.items);
    } catch (err: any) {
      setEquipment(null);
      setOrders([]);
      setError(err?.message || "Não foi possível carregar o equipamento.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const statusMeta = useMemo(() => STATUS_META[equipment?.status || ""] || STATUS_META.ACTIVE, [equipment?.status]);
  const StatusIcon = statusMeta.Icon;
  const modality = MODALITY_LABELS[equipment?.modality || ""] || equipment?.modality || "Cardiologia";
  const qcDays = daysUntil(equipment?.next_quality_control);
  const qcStatus =
    qcDays === null
      ? "-"
      : qcDays < 0
        ? `${Math.abs(qcDays)}d vencido`
        : qcDays === 0
          ? "vence hoje"
          : `${qcDays}d restantes`;

  async function markMaintenance() {
    if (!equipment) return;
    const notes = window.prompt("Motivo/observação de manutenção:", "Manutenção preventiva") ?? "";
    setBusy("maintenance");
    setError(null);
    try {
      const updated = await apiFetch<CardiologyEquipment>(`/specialty_diagnostics/equipment/${equipment.id}/marcar-manutencao/`, {
        method: "POST",
        body: JSON.stringify({ notes }),
      });
      setEquipment(updated);
    } catch (err: any) {
      setError(err?.message || "Não foi possível marcar manutenção.");
    } finally {
      setBusy(null);
    }
  }

  async function markAvailable() {
    if (!equipment) return;
    setBusy("available");
    setError(null);
    try {
      const updated = await apiFetch<CardiologyEquipment>(`/specialty_diagnostics/equipment/${equipment.id}/marcar-disponivel/`, {
        method: "POST",
        body: JSON.stringify({
          last_quality_control: todayInputDate(0),
          next_quality_control: todayInputDate(90),
        }),
      });
      setEquipment(updated);
    } catch (err: any) {
      setError(err?.message || "Não foi possível marcar disponível.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <div className="mx-auto w-full max-w-[97vw] space-y-1 px-0.5">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : error && !equipment ? (
          <section className={`relative overflow-hidden ${GLASS}`}>
            <span className="absolute inset-y-0 left-0 w-1 bg-rose-500" />
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 pl-4">
              <AlertTriangle size={18} className="text-rose-500" />
              <div className="min-w-0 flex-1">
                <h1 className="text-sm font-bold text-foreground">Equipamento não encontrado</h1>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Link href="/cardiology/equipment/" className="inline-flex h-7 items-center gap-1 rounded border border-border px-2 text-[11px]">
                <ArrowLeft size={12} /> Voltar
              </Link>
            </div>
          </section>
        ) : equipment ? (
          <>
            <section className={`relative overflow-hidden ${GLASS}`}>
              <span className={`absolute inset-y-0 left-0 w-1 ${statusMeta.bar}`} />
              <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 pl-4 xl:flex-nowrap">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20">
                  <StatusIcon size={14} />
                </span>
                <div className="min-w-[12rem] flex-1">
                  <h1 className="break-words text-sm font-bold leading-tight text-foreground xl:truncate">
                    {equipment.name || equipment.code || equipment.custom_id || `Equipamento #${equipment.id}`}
                  </h1>
                  <p className="break-all font-mono text-[10px] leading-tight text-muted-foreground md:truncate">
                    {equipment.code || equipment.custom_id || `SDE-${equipment.id}`} · {equipment.serial_number || "sem série"}
                  </p>
                </div>
                <span className={`inline-flex h-7 shrink-0 items-center rounded border px-2 text-[11px] font-semibold ${statusMeta.chip}`}>
                  {statusMeta.label}
                </span>
                <Link
                  href="/cardiology/equipment/"
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-white/20 bg-white/10 px-2 text-[11px] font-medium text-muted-foreground backdrop-blur-sm transition hover:bg-white/20 hover:text-foreground"
                >
                  <ArrowLeft size={12} /> Voltar
                </Link>
                {equipment.status !== "MAINTENANCE" ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={markMaintenance}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300"
                  >
                    {busy === "maintenance" ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />}
                    Manutenção
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={markAvailable}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                  >
                    {busy === "available" ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
                    Disponível
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1 border-t border-white/20 px-2 py-1 pl-4 min-[520px]:grid-cols-3 md:grid-cols-6 dark:border-white/10">
                <HeaderMetric label="Modalidade" value={modality} />
                <HeaderMetric label="Fabricante" value={textValue(equipment.manufacturer)} tone="slate" />
                <HeaderMetric label="Modelo" value={textValue(equipment.model)} tone="slate" />
                <HeaderMetric label="Local" value={textValue(equipment.location || equipment.station_name)} />
                <HeaderMetric label="Próximo CQ" value={fmtDate(equipment.next_quality_control)} tone={qcDays !== null && qcDays <= 30 ? "amber" : "emerald"} />
                <HeaderMetric label="Estado CQ" value={qcStatus} tone={qcDays !== null && qcDays < 0 ? "amber" : "emerald"} />
              </div>
            </section>

            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
              <Card title="Identificação técnica" icon={Wrench} accent="bg-rose-500">
                <div className="space-y-1">
                  <Row label="Código" value={textValue(equipment.code || equipment.custom_id)} />
                  <Row label="Nome" value={textValue(equipment.name)} />
                  <Row label="Número de série" value={textValue(equipment.serial_number)} />
                  <Row label="Modalidade" value={modality} />
                </div>
              </Card>

              <Card title="Localização" icon={MapPin} accent="bg-blue-500">
                <div className="space-y-1">
                  <Row label="Estação" value={textValue(equipment.station_name)} />
                  <Row label="Local" value={textValue(equipment.location)} />
                  <Row label="Integração" value={textValue(equipment.integration_endpoint)} />
                  <Row label="Actualizado" value={fmtDatetime(equipment.updated_at)} />
                </div>
              </Card>

              <Card title="Controlo de qualidade" icon={CalendarClock} accent={qcDays !== null && qcDays <= 30 ? "bg-amber-500" : "bg-emerald-500"}>
                <div className="space-y-1">
                  <Row label="Último CQ" value={fmtDate(equipment.last_quality_control)} />
                  <Row label="Próximo CQ" value={fmtDate(equipment.next_quality_control)} />
                  <Row label="Tempo" value={qcStatus} />
                  <Row label="Estado operacional" value={statusMeta.label} />
                </div>
              </Card>

              <Card title="Uso recente" icon={ClipboardList} accent="bg-violet-500">
                {orders.length === 0 ? (
                  <div className="rounded border border-dashed border-border px-2 py-2 text-[11px] text-muted-foreground">
                    Nenhum exame recente ligado a este equipamento.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {orders.slice(0, 5).map((order) => (
                      <Link
                        key={order.id}
                        href={`/cardiology/exams/${order.id}/`}
                        className="block rounded border border-border/60 bg-background/40 px-2 py-1 transition hover:bg-muted"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="break-words text-[11px] font-semibold text-foreground">{order.patient_name || orderLabel(order)}</span>
                          <span className="shrink-0 rounded border border-border px-1 text-[9px] text-muted-foreground">{order.status || "-"}</span>
                        </div>
                        <div className="break-all font-mono text-[9px] text-muted-foreground">{orderLabel(order)} · {fmtDatetime(order.performed_at || order.requested_at)}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              {String(equipment.notes || "").trim() ? (
                <Card title="Observações" icon={Stethoscope} accent="bg-slate-500" className="md:col-span-2">
                  <p className="whitespace-pre-wrap break-words text-[11px] leading-4 text-foreground">{equipment.notes}</p>
                </Card>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
