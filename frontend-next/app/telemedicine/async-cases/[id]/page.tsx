"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronRight, FileStack, HelpCircle, Loader2, Paperclip, Stethoscope, User, XCircle } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

type MediaItem = { type?: string; status?: string; url?: string; name?: string; [k: string]: unknown };
type Case = {
  id: number;
  custom_id?: string | null;
  patient_name?: string | null;
  reviewer_name?: string | null;
  consultation_label?: string | null;
  specialty_area?: string | null;
  status?: string | null;
  title?: string | null;
  clinical_question?: string | null;
  clinical_summary?: string | null;
  findings?: string | null;
  recommendation?: string | null;
  notes?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  media_manifest?: MediaItem[] | null;
};

const AREA_LABEL: Record<string, string> = { DERMATOLOGY: "Dermatologia", RADIOLOGY: "Radiologia", OPHTHALMOLOGY: "Oftalmologia", WOUND_CARE: "Feridas", OTHER: "Outra" };
const STATUS_META: Record<string, { label: string; tone: string; bar: string }> = {
  SUBMITTED: { label: "Submetido", tone: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/30 dark:text-sky-300", bar: "from-sky-500 to-cyan-500" },
  TRIAGED: { label: "Triado", tone: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800/40 dark:bg-cyan-950/30 dark:text-cyan-300", bar: "from-cyan-500 to-teal-500" },
  IN_REVIEW: { label: "Em revisão", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300", bar: "from-amber-500 to-orange-500" },
  NEEDS_INFO: { label: "Requer informação", tone: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800/40 dark:bg-orange-950/30 dark:text-orange-300", bar: "from-orange-500 to-red-500" },
  COMPLETED: { label: "Concluído", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300", bar: "from-emerald-500 to-teal-500" },
  CANCELLED: { label: "Cancelado", tone: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400", bar: "from-slate-400 to-slate-500" },
};
const ACTIONS_BY_STATUS: Record<string, Array<{ endpoint: string; label: string; icon: any; kind: "primary" | "danger" }>> = {
  SUBMITTED: [{ endpoint: "triar", label: "Triar", icon: ChevronRight, kind: "primary" }, { endpoint: "cancelar", label: "Cancelar", icon: XCircle, kind: "danger" }],
  TRIAGED: [{ endpoint: "iniciar-revisao", label: "Iniciar revisão", icon: Stethoscope, kind: "primary" }, { endpoint: "cancelar", label: "Cancelar", icon: XCircle, kind: "danger" }],
  IN_REVIEW: [{ endpoint: "pedir-informacao", label: "Pedir informação", icon: HelpCircle, kind: "primary" }, { endpoint: "concluir", label: "Concluir", icon: CheckCircle2, kind: "primary" }, { endpoint: "cancelar", label: "Cancelar", icon: XCircle, kind: "danger" }],
  NEEDS_INFO: [{ endpoint: "iniciar-revisao", label: "Retomar revisão", icon: Stethoscope, kind: "primary" }, { endpoint: "cancelar", label: "Cancelar", icon: XCircle, kind: "danger" }],
};

function fmt(value?: string | null) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }

export default function TelemedicineAsyncCaseDetailPage() {
  const params = useParams();
  const id = routeParamToString((params as any)?.id);
  const [item, setItem] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<Case>(`/telemedicine/async_case/${id}/`, { clientCache: false });
      setItem(data);
    } catch (e: any) {
      setError(e?.message || "Não foi possível carregar o caso.");
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
      const data = await apiFetch<Case>(`/telemedicine/async_case/${id}/${endpoint}/`, { method: "POST", body: JSON.stringify({}) });
      setItem(data);
    } catch (e: any) {
      setError(e?.message || "Não foi possível executar a ação.");
    } finally {
      setBusy(null);
    }
  }, [id, busy]);

  const status = String(item?.status || "").toUpperCase();
  const meta = STATUS_META[status] || STATUS_META.SUBMITTED;
  const actions = ACTIONS_BY_STATUS[status] || [];
  const media = Array.isArray(item?.media_manifest) ? item!.media_manifest : [];

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.RECEPCAO, GROUPS.TELEMEDICINA]}>
      <div className="mx-auto w-full max-w-[99vw] space-y-2 px-1 pb-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin" /> A carregar…</div>
        ) : !item ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error || "Caso não encontrado."}</div>
        ) : (
          <>
            {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">{error}</div> : null}

            {/* Cabeçalho. */}
            <section className="relative overflow-hidden rounded-xl border border-cyan-200/60 bg-white/55 p-3 shadow-sm backdrop-blur dark:border-cyan-900/35 dark:bg-slate-950/45">
              <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${meta.bar}`} />
              <div className="flex flex-wrap items-start gap-2">
                <Link href="/telemedicine/async-cases" title="Voltar aos casos" className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background/70 text-muted-foreground shadow-sm transition hover:border-cyan-300 hover:text-foreground"><ArrowLeft size={15} /></Link>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] text-muted-foreground">{item.custom_id || `SFC-${item.id}`}{item.consultation_label ? ` · ${item.consultation_label}` : ""}</p>
                  <h1 className="truncate text-lg font-bold leading-tight text-foreground">{item.title || "Sem título"}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className={`rounded-full border px-2 py-0.5 font-semibold ${meta.tone}`}>{meta.label}</span>
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-muted-foreground">{AREA_LABEL[String(item.specialty_area || "").toUpperCase()] || "Área —"}</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><User size={11} />{item.patient_name || "Sem paciente"}</span>
                    {item.reviewer_name ? <span className="inline-flex items-center gap-1 text-muted-foreground"><Stethoscope size={11} />{item.reviewer_name}</span> : null}
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
              {/* Conteúdo clínico. */}
              <section className="space-y-2 md:col-span-2">
                <Block title="Pergunta clínica" value={item.clinical_question} highlight />
                <Block title="Resumo clínico" value={item.clinical_summary} />
                <Block title="Achados" value={item.findings} />
                <Block title="Recomendação" value={item.recommendation} highlightTone="emerald" />
                <Block title="Observações" value={item.notes} />
              </section>

              {/* Lateral: cronologia e anexos. */}
              <section className="space-y-2">
                <div className="rounded-xl border border-border/60 bg-card/60 p-3">
                  <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Cronologia</h2>
                  <ol className="space-y-1.5 text-xs">
                    <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" /><span className="text-foreground">Submetido</span><span className="ml-auto text-[11px] text-muted-foreground">{fmt(item.submitted_at)}</span></li>
                    <li className="flex items-center gap-2"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.reviewed_at ? "bg-emerald-500" : "bg-muted-foreground/40"}`} /><span className={item.reviewed_at ? "text-foreground" : "text-muted-foreground/70"}>Revisto</span><span className="ml-auto text-[11px] text-muted-foreground">{fmt(item.reviewed_at)}</span></li>
                  </ol>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/60 p-3">
                  <h2 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"><Paperclip size={12} /> Ficheiros ({media.length})</h2>
                  {media.length === 0 ? (
                    <p className="py-2 text-center text-xs text-muted-foreground">Sem ficheiros anexados.</p>
                  ) : (
                    <ul className="space-y-1">
                      {media.map((m, i) => {
                        const label = m.name || m.type || `Ficheiro ${i + 1}`;
                        const chip = <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2 py-1 text-xs"><FileStack size={12} className="shrink-0 text-cyan-600 dark:text-cyan-400" /><span className="min-w-0 flex-1 truncate">{label}</span>{m.status ? <span className="shrink-0 text-[9px] uppercase text-muted-foreground">{m.status}</span> : null}</span>;
                        return <li key={i}>{m.url ? <a href={String(m.url)} target="_blank" rel="noreferrer" className="block transition hover:opacity-80">{chip}</a> : chip}</li>;
                      })}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function Block({ title, value, highlight, highlightTone }: { title: string; value?: string | null; highlight?: boolean; highlightTone?: "emerald" }) {
  const empty = !value?.trim();
  const tone = highlightTone === "emerald"
    ? "border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/20"
    : highlight
      ? "border-cyan-200/70 bg-cyan-50/50 dark:border-cyan-800/40 dark:bg-cyan-950/20"
      : "border-border/60 bg-card/60";
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <p className={`whitespace-pre-wrap text-sm ${empty ? "text-muted-foreground/60" : "text-foreground"}`}>{empty ? "—" : value}</p>
    </div>
  );
}
