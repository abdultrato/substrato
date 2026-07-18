"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  HeartPulse,
  Loader2,
  Save,
  Search,
  Stethoscope,
  User,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import useDebounce from "@/hooks/useDebounce";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const REQUIRED_GROUPS = [
  GROUPS.ADMIN,
  GROUPS.MEDICINA,
  GROUPS.CARDIOLOGIA,
];

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Rascunho", tone: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/30 dark:text-slate-300" },
  { value: "PRELIMINARY", label: "Preliminar", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300" },
  { value: "FINAL", label: "Final", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300" },
  { value: "AMENDED", label: "Retificado", tone: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300" },
];

const MODALITY_LABELS: Record<string, string> = {
  ECG: "ECG",
  ECHOCARDIOGRAM: "Ecocardiograma",
  EXERCISE_TEST: "Teste ergométrico",
  HOLTER: "Holter",
  AMBULATORY_BP: "MAPA",
  OTHER: "Outra",
};

type DiagnosticOrder = {
  id: number;
  custom_id?: string;
  order_number?: string;
  patient_name?: string;
  specialist_name?: string;
  protocol_name?: string;
  equipment_name?: string;
  modality?: string;
  status?: string;
  priority?: string;
  clinical_indication?: string;
  requested_at?: string | null;
  performed_at?: string | null;
  report_count?: number;
};

type FieldProps = {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
};

function nowLocalInput() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toApiDatetime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function fmtDatetime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("pt-PT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function orderLabel(order: DiagnosticOrder) {
  return order.order_number || order.custom_id || `Exame #${order.id}`;
}

function Card({
  title,
  icon: Icon,
  children,
  accent = "bg-rose-500",
  className = "",
}: {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <section className={`relative overflow-visible ${GLASS} ${className}`}>
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

function Field({ label, children, hint, error }: FieldProps) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-[9px] text-muted-foreground">{hint}</span> : null}
      {error ? <span className="block text-[9px] font-medium text-rose-600 dark:text-rose-300">{error}</span> : null}
    </label>
  );
}

const inputClass =
  "h-8 w-full rounded-md border border-border bg-background/60 px-2 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-rose-500/40";

const textareaClass =
  "min-h-20 w-full resize-y rounded-md border border-border bg-background/60 px-2 py-1.5 text-xs leading-5 text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-rose-500/40";

export default function CardiologyReportsCreatePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<DiagnosticOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [status, setStatus] = useState("DRAFT");
  const [versionNumber, setVersionNumber] = useState(1);
  const [reportedAt, setReportedAt] = useState(nowLocalInput());
  const [signedAt, setSignedAt] = useState("");
  const [technique, setTechnique] = useState("");
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [criticalResult, setCriticalResult] = useState(false);
  const [criticalNotifiedAt, setCriticalNotifiedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const debouncedOrderSearch = useDebounce(orderSearch, 250);

  useEffect(() => {
    let mounted = true;
    async function loadOrders() {
      setLoadingOrders(true);
      try {
        const { items } = await apiFetchList<DiagnosticOrder>("/specialty_diagnostics/order/", {
          page: 1,
          pageSize: 200,
          query: { specialty: "CARDIOLOGY", ordering: "-performed_at" },
        });
        if (mounted) setOrders(items);
      } catch {
        if (mounted) setOrders([]);
      } finally {
        if (mounted) setLoadingOrders(false);
      }
    }
    loadOrders();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedOrder = useMemo(() => orders.find((order) => order.id === orderId) || null, [orderId, orders]);

  const filteredOrders = useMemo(() => {
    const query = debouncedOrderSearch.trim().toLowerCase();
    if (!query) return orders.slice(0, 24);
    return orders
      .filter((order) => {
        const haystack = [
          orderLabel(order),
          order.patient_name,
          order.specialist_name,
          order.protocol_name,
          order.equipment_name,
          MODALITY_LABELS[order.modality || ""] || order.modality,
          order.clinical_indication,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 24);
  }, [debouncedOrderSearch, orders]);

  useEffect(() => {
    if (!selectedOrder) return;
    setVersionNumber(Math.max(1, (selectedOrder.report_count || 0) + 1));
    if (!technique.trim()) {
      setTechnique(`${MODALITY_LABELS[selectedOrder.modality || ""] || "Exame cardiológico"} executado conforme protocolo institucional, com controlo de qualidade válido.`);
    }
  }, [selectedOrder, technique]);

  function validate() {
    const next: Record<string, string> = {};
    if (!orderId) next.order = "Selecione o exame cardiológico.";
    if (!reportedAt) next.reportedAt = "Informe a data de laudo.";
    if (!findings.trim()) next.findings = "Informe os achados.";
    if (!impression.trim()) next.impression = "Informe a conclusão.";
    if (criticalResult && ["FINAL", "AMENDED"].includes(status) && !criticalNotifiedAt) {
      next.criticalNotifiedAt = "Informe a notificação do resultado crítico.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      const report = await apiFetch<{ id: number }>("/specialty_diagnostics/report/", {
        method: "POST",
        body: JSON.stringify({
          order: orderId,
          status,
          version_number: versionNumber,
          reported_at: toApiDatetime(reportedAt),
          signed_at: signedAt ? toApiDatetime(signedAt) : null,
          technique: technique.trim(),
          findings: findings.trim(),
          impression: impression.trim(),
          recommendations: recommendations.trim(),
          critical_result: criticalResult,
          critical_notified_at: criticalResult && criticalNotifiedAt ? toApiDatetime(criticalNotifiedAt) : null,
          notes: notes.trim(),
        }),
      });
      router.push(`/cardiology/reports/${report.id}/`);
    } catch (err: any) {
      setError(err?.message || "Não foi possível guardar o laudo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={REQUIRED_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-[97vw] space-y-1 px-0.5">
        <section className={`relative overflow-visible ${GLASS}`}>
          <span className="absolute inset-y-0 left-0 w-1 bg-rose-500" />
          <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 pl-4 xl:flex-nowrap">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20">
              <FileText size={14} />
            </span>
            <div className="min-w-[12rem] flex-1">
              <h1 className="break-words text-sm font-bold leading-tight text-foreground xl:truncate">Novo laudo de cardiologia</h1>
              <p className="break-words text-[10px] text-muted-foreground">Laudo estruturado sem upload obrigatório de ficheiros.</p>
            </div>
            <Link
              href="/cardiology/reports/"
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded border border-white/20 bg-white/10 px-2 text-[11px] font-medium text-muted-foreground backdrop-blur-sm transition hover:bg-white/20 hover:text-foreground"
            >
              <ArrowLeft size={12} /> Voltar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded bg-gradient-to-br from-rose-500 to-red-600 px-2.5 text-[11px] font-semibold text-white shadow-sm shadow-rose-500/20 transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Guardar laudo
            </button>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
          <Card title="Exame cardiológico" icon={HeartPulse} accent="bg-rose-500">
            <div className="space-y-1">
              <Field label="Pesquisar exame" error={errors.order}>
                <div className="relative">
                  <Search size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(event) => setOrderSearch(event.target.value)}
                    placeholder="Paciente, exame, protocolo, modalidade..."
                    className={`${inputClass} pl-7 pr-7`}
                  />
                  {orderSearch ? (
                    <button
                      type="button"
                      onClick={() => setOrderSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={11} />
                    </button>
                  ) : null}
                </div>
              </Field>

              <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                {loadingOrders ? (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-background/40 px-2 py-1 text-[11px] text-muted-foreground">
                    <Loader2 size={12} className="animate-spin" /> A carregar exames...
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border px-2 py-2 text-[11px] text-muted-foreground">
                    Nenhum exame cardiológico encontrado.
                  </div>
                ) : (
                  filteredOrders.map((order) => {
                    const selected = order.id === orderId;
                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => {
                          setOrderId(order.id);
                          setErrors((prev) => ({ ...prev, order: "" }));
                        }}
                        className={`w-full rounded-md border px-2 py-1 text-left transition ${
                          selected
                            ? "border-rose-300 bg-rose-50 text-rose-800 ring-1 ring-rose-400/30 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-200"
                            : "border-border bg-background/40 hover:bg-muted"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="break-words text-[11px] font-bold">{order.patient_name || orderLabel(order)}</span>
                          <span className="shrink-0 rounded border border-border px-1 text-[9px] text-muted-foreground">
                            {MODALITY_LABELS[order.modality || ""] || order.modality || "Cardiologia"}
                          </span>
                        </div>
                        <div className="break-all font-mono text-[9px] text-muted-foreground">{orderLabel(order)}</div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </Card>

          <Card title="Resumo do exame" icon={User} accent="bg-blue-500">
            <div className="grid grid-cols-1 gap-1 text-[10px] leading-tight min-[420px]:grid-cols-[7rem_1fr]">
              <span className="text-muted-foreground">Paciente</span>
              <span className="break-words font-semibold">{selectedOrder?.patient_name || "-"}</span>
              <span className="text-muted-foreground">Exame</span>
              <span className="break-all font-mono">{selectedOrder ? orderLabel(selectedOrder) : "-"}</span>
              <span className="text-muted-foreground">Protocolo</span>
              <span className="break-words">{selectedOrder?.protocol_name || "-"}</span>
              <span className="text-muted-foreground">Realizado</span>
              <span className="break-words">{fmtDatetime(selectedOrder?.performed_at)}</span>
              <span className="text-muted-foreground">Indicação</span>
              <span className="break-words">{selectedOrder?.clinical_indication || "-"}</span>
            </div>
          </Card>

          <Card title="Estado e datas" icon={CalendarClock} accent="bg-amber-500">
            <div className="space-y-1">
              <Field label="Estado">
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatus(option.value)}
                      className={`rounded border px-1.5 py-1 text-[10px] font-semibold transition ${
                        status === option.value ? `${option.tone} ring-1 ring-current/20` : "border-border bg-background/40 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
                <Field label="Versão">
                  <input
                    type="number"
                    min={1}
                    value={versionNumber}
                    onChange={(event) => setVersionNumber(Math.max(1, Number(event.target.value) || 1))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Laudado em" error={errors.reportedAt}>
                  <input type="datetime-local" value={reportedAt} onChange={(event) => setReportedAt(event.target.value)} className={inputClass} />
                </Field>
                <Field label="Assinado em" hint="Opcional; final/retificado pode assinar automaticamente.">
                  <input type="datetime-local" value={signedAt} onChange={(event) => setSignedAt(event.target.value)} className={inputClass} />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Resultado crítico" icon={AlertTriangle} accent={criticalResult ? "bg-rose-500" : "bg-slate-400"}>
            <div className="space-y-1">
              <label className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-2 py-1 text-xs">
                <span className="font-semibold text-foreground">Resultado crítico</span>
                <input
                  type="checkbox"
                  checked={criticalResult}
                  onChange={(event) => setCriticalResult(event.target.checked)}
                  className="h-4 w-4 accent-rose-500"
                />
              </label>
              <Field label="Crítico notificado em" error={errors.criticalNotifiedAt}>
                <input
                  type="datetime-local"
                  value={criticalNotifiedAt}
                  onChange={(event) => setCriticalNotifiedAt(event.target.value)}
                  disabled={!criticalResult}
                  className={`${inputClass} disabled:opacity-50`}
                />
              </Field>
            </div>
          </Card>

          <Card title="Técnica" icon={Stethoscope} accent="bg-violet-500">
            <textarea value={technique} onChange={(event) => setTechnique(event.target.value)} placeholder="Método, equipamento, protocolo..." className={textareaClass} />
          </Card>

          <Card title="Achados" icon={ClipboardList} accent="bg-sky-500">
            <Field label="Achados" error={errors.findings}>
              <textarea value={findings} onChange={(event) => setFindings(event.target.value)} placeholder="Descreva os achados cardiológicos..." className={textareaClass} />
            </Field>
          </Card>

          <Card title="Conclusão" icon={CheckCircle2} accent="bg-emerald-500">
            <Field label="Conclusão" error={errors.impression}>
              <textarea value={impression} onChange={(event) => setImpression(event.target.value)} placeholder="Conclusão/Impressão diagnóstica..." className={textareaClass} />
            </Field>
          </Card>

          <Card title="Recomendações" icon={FileText} accent="bg-slate-500">
            <textarea value={recommendations} onChange={(event) => setRecommendations(event.target.value)} placeholder="Seguimento, conduta ou correlação clínica..." className={textareaClass} />
          </Card>

          <Card title="Observações" icon={FileText} accent="bg-slate-400" className="md:col-span-2">
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notas internas adicionais..." className="min-h-14 w-full resize-y rounded-md border border-border bg-background/60 px-2 py-1.5 text-xs leading-5 text-foreground outline-none focus:ring-2 focus:ring-rose-500/40" />
          </Card>
        </div>
      </form>
    </AppLayout>
  );
}
