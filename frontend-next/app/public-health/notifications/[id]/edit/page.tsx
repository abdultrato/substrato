"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ClipboardList,
  Loader2,
  Save,
  Search,
  X,
  Zap,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.SAUDE_PUBLICA];

const STATUSES = [
  { value: "PENDING",  label: "Pendente",  emoji: "⏳", bar: "bg-slate-400",   chip: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/40 dark:bg-slate-800/20 dark:text-slate-400",           grad: "from-slate-400 to-slate-500",   glow: "shadow-slate-400/30",   btn: "from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 shadow-slate-400/30",     blob1: "bg-slate-400/10",   blob2: "bg-slate-500/10"   },
  { value: "SENDING",  label: "Enviando",  emoji: "📡", bar: "bg-blue-500",    chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300",                 grad: "from-blue-500 to-indigo-600",   glow: "shadow-blue-500/30",    btn: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30",       blob1: "bg-blue-500/10",    blob2: "bg-indigo-500/10"  },
  { value: "SENT",     label: "Enviado",   emoji: "📤", bar: "bg-teal-500",    chip: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300",                 grad: "from-teal-500 to-cyan-600",     glow: "shadow-teal-500/30",    btn: "from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 shadow-teal-500/30",           blob1: "bg-teal-500/10",    blob2: "bg-cyan-500/10"    },
  { value: "ACCEPTED", label: "Aceito",    emoji: "✅", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300", grad: "from-emerald-500 to-teal-600",  glow: "shadow-emerald-500/30", btn: "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30",   blob1: "bg-emerald-500/10", blob2: "bg-teal-500/10"    },
  { value: "REJECTED", label: "Rejeitado", emoji: "✖️", bar: "bg-red-500",     chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300",                       grad: "from-red-500 to-rose-600",      glow: "shadow-red-500/30",     btn: "from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-500/30",             blob1: "bg-red-500/10",     blob2: "bg-rose-500/10"    },
  { value: "FAILED",   label: "Falhou",    emoji: "⚠️", bar: "bg-rose-500",    chip: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300",                 grad: "from-rose-500 to-red-600",      glow: "shadow-rose-500/30",    btn: "from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-500/30",             blob1: "bg-rose-500/10",    blob2: "bg-red-500/10"     },
];

const OFFICIAL_SYSTEMS = [
  { value: "E_SUS",  label: "e-SUS"  },
  { value: "SIPNI",  label: "SIPNI"  },
  { value: "DHIS2",  label: "DHIS2"  },
  { value: "CUSTOM", label: "Outro"  },
];

const EVENT_TYPES = [
  { value: "IMMUNIZATION",      label: "Imunização",           emoji: "💉" },
  { value: "AEFI",              label: "Evento adverso",        emoji: "⚠️" },
  { value: "CAMPAIGN_COVERAGE", label: "Cobertura de campanha", emoji: "📣" },
];

const T_CAMPAIGN:      RelationTarget = { endpoint: "/public_health/campaign/",       labelFields: ["name", "custom_id"] };
const T_IMMUNIZATION:  RelationTarget = { endpoint: "/public_health/immunization/",   labelFields: ["custom_id", "patient_name", "vaccine_name"] };
const T_ADVERSE_EVENT: RelationTarget = { endpoint: "/public_health/adverse_event/",  labelFields: ["custom_id", "patient_name", "vaccine_name"] };

function RelationSelect({ value, onChange, target, placeholder, initialLabel, zIndex = "z-[30]" }: {
  value: number | null; onChange: (v: number | null, label: string) => void;
  target: RelationTarget; placeholder?: string; initialLabel?: string; zIndex?: string;
}) {
  const [query, setQuery]     = useState("");
  const [label, setLabel]     = useState(initialLabel ?? "");
  const [open, setOpen]       = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [busy, setBusy]       = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lbId = useId();
  useEffect(() => { if (initialLabel) setLabel(initialLabel); }, [initialLabel]);

  function search(q: string) {
    setQuery(q); setOpen(true);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setBusy(true);
      try {
        const { items } = await apiFetchList<Record<string, unknown>>(target.endpoint, {
          page: 1, pageSize: 20,
          query: { ...(target.staticFilters ?? {}), ...(q.trim() ? { search: q.trim() } : {}) },
        });
        setResults(relationOptionsFromRows(items, target));
      } catch { setResults([]); }
      finally { setBusy(false); }
    }, 250);
  }
  function select(opt: { value: string; label: string }) {
    onChange(Number(opt.value), opt.label); setLabel(opt.label); setQuery(""); setOpen(false);
  }
  function clear() { onChange(null, ""); setLabel(""); }

  return (
    <div className="min-w-0 space-y-1">
      {value !== null && (
        <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-medium text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300">
          <span className="truncate">{label}</span>
          <button type="button" onClick={clear} className="ml-0.5 text-violet-400 transition hover:text-violet-600"><X size={9} /></button>
        </span>
      )}
      {value === null && (
        <div className={`relative ${zIndex}`}>
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => { setOpen(true); if (!query) search(""); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
          />
          {busy && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={lbId} role="listbox" className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {results.length === 0
                ? <p className="px-3 py-2 text-[11px] text-muted-foreground">{busy ? "A pesquisar…" : "Nenhum resultado."}</p>
                : <ul className="max-h-48 divide-y divide-border/40 overflow-y-auto">
                    {results.map((opt) => (
                      <li key={opt.value}>
                        <button type="button" onMouseDown={() => select(opt)}
                          className="flex w-full items-center px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">{opt.label}</button>
                      </li>
                    ))}
                  </ul>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Card({ icon: Icon, title, accent, children }: {
  icon: React.ElementType; title: string; accent?: string; children: React.ReactNode;
}) {
  return (
    <section className="relative z-0 min-w-0 overflow-visible rounded-md border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:border-white/10 dark:bg-white/5">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-md ${accent}`} />}
      <div className="flex min-w-0 items-center gap-1.5 whitespace-nowrap border-b border-border/50 px-3 py-1.5 pl-4">
        <Icon size={11} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="truncate text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-1.5 p-2 pl-3">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-2 whitespace-nowrap">
      <label className="min-w-0 truncate text-[11px] font-semibold text-foreground">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="min-w-0">{children}</div>
      {hint && !error && <p className="col-start-2 min-w-0 truncate text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="col-start-2 min-w-0 truncate text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

const inputCls = "w-full min-w-0 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20";

export default function EditNotificationPage() {
  useAuthGuard();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loadingData, setLoadingData] = useState(true);
  const [customId, setCustomId]       = useState("");

  const [officialSystem, setOfficialSystem] = useState("CUSTOM");
  const [eventType, setEventType]           = useState("IMMUNIZATION");
  const [status, setStatus]                 = useState("PENDING");

  const [campaignId, setCampaignId]                   = useState<number | null>(null);
  const [campaignLabel, setCampaignLabel]             = useState("");
  const [immunizationId, setImmunizationId]           = useState<number | null>(null);
  const [immunizationLabel, setImmunizationLabel]     = useState("");
  const [adverseEventId, setAdverseEventId]           = useState<number | null>(null);
  const [adverseEventLabel, setAdverseEventLabel]     = useState("");

  const [externalReference, setExternalReference]   = useState("");
  const [sentAt, setSentAt]                         = useState("");
  const [nextRetryAt, setNextRetryAt]               = useState("");
  const [errorMessage, setErrorMessage]             = useState("");
  const [notes, setNotes]                           = useState("");

  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch<Record<string, unknown>>(`/public_health/notification/${id}/`)
      .then((d) => {
        setCustomId(String(d.custom_id ?? ""));
        setOfficialSystem(String(d.official_system ?? "CUSTOM"));
        setEventType(String(d.event_type ?? "IMMUNIZATION"));
        setStatus(String(d.status ?? "PENDING"));
        setCampaignId(d.campaign as number ?? null);
        setCampaignLabel(String(d.campaign_name ?? (d.campaign ? `Campanha #${d.campaign}` : "")));
        setImmunizationId(d.immunization_record as number ?? null);
        setImmunizationLabel(String(d.immunization_record_label ?? (d.immunization_record ? `IMR #${d.immunization_record}` : "")));
        setAdverseEventId(d.adverse_event as number ?? null);
        setAdverseEventLabel(String(d.adverse_event_label ?? (d.adverse_event ? `AEFI #${d.adverse_event}` : "")));
        setExternalReference(String(d.external_reference ?? ""));
        setSentAt(d.sent_at ? String(d.sent_at).substring(0, 16) : "");
        setNextRetryAt(d.next_retry_at ? String(d.next_retry_at).substring(0, 16) : "");
        setErrorMessage(String(d.error_message ?? ""));
        setNotes(String(d.notes ?? ""));
      })
      .catch(() => setSaveError("Erro ao carregar notificação."))
      .finally(() => setLoadingData(false));
  }, [id]);

  const activeStatus = STATUSES.find((s) => s.value === status) ?? STATUSES[0];

  function validate() {
    const e: Record<string, string> = {};
    const hasLink = campaignId || immunizationId || adverseEventId;
    if (!hasLink) e.link = "É necessário associar uma campanha, imunização ou evento adverso.";
    if (eventType === "IMMUNIZATION" && !immunizationId) e.link = "Tipo Imunização exige registo de imunização.";
    if (eventType === "AEFI" && !adverseEventId) e.link = "Tipo AEFI exige evento adverso.";
    if (eventType === "CAMPAIGN_COVERAGE" && !campaignId) e.link = "Tipo Cobertura exige campanha.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      await apiFetch(`/public_health/notification/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          official_system: officialSystem,
          event_type: eventType,
          status,
          campaign: campaignId,
          immunization_record: immunizationId,
          adverse_event: adverseEventId,
          external_reference: externalReference.trim(),
          sent_at: sentAt || null,
          next_retry_at: nextRetryAt || null,
          error_message: errorMessage.trim(),
          notes: notes.trim(),
        }),
      });
      router.push(`/public-health/notifications/${id}`);
    } catch (err: unknown) {
      setSaveError((err as { message?: string })?.message || "Erro ao guardar alterações.");
    } finally { setSaving(false); }
  }

  if (loadingData) return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-[97vw] space-y-2">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl ${activeStatus.blob1}`} />
            <div className={`absolute -bottom-8 left-6 h-24 w-24 rounded-full blur-2xl ${activeStatus.blob2}`} />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${activeStatus.bar}`} />
          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${activeStatus.grad} shadow-md ${activeStatus.glow}`}>
              <Bell size={20} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Notificações</span><span>/</span>
                <span className="font-mono">{customId}</span><span>/</span>
                <span className="font-medium text-foreground">Editar</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">Editar notificação oficial</h1>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${activeStatus.chip}`}>
                  {activeStatus.emoji} {activeStatus.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving}
                className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 text-xs font-semibold text-white shadow-md transition disabled:opacity-50 ${activeStatus.btn}`}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Guardar alterações
              </button>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Card icon={Bell} title="Estado" accent={activeStatus.bar}>
            <div className="grid grid-cols-6 gap-1 whitespace-nowrap">
              {STATUSES.map((s) => (
                <button key={s.value} type="button" onClick={() => setStatus(s.value)}
                  className={`min-w-0 rounded-md border px-1 py-1.5 text-center text-[10px] font-medium transition ${status === s.value ? `${s.chip} shadow-sm ring-1 ring-current/30` : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                  <div className="text-sm leading-none">{s.emoji}</div>
                  <div className="mt-0.5 truncate leading-tight">{s.label}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Sistema e tipo */}
          <Card icon={Zap} title="Sistema e tipo de evento" accent="bg-violet-500">
            <Field label="Sistema oficial">
              <div className="grid grid-cols-4 gap-1 whitespace-nowrap">
                {OFFICIAL_SYSTEMS.map((s) => (
                  <button key={s.value} type="button" onClick={() => setOfficialSystem(s.value)}
                    className={`min-w-0 rounded-md border px-1 py-1.5 text-center text-[10px] font-semibold transition ${officialSystem === s.value ? "border-violet-200 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Tipo de evento">
              <div className="grid grid-cols-3 gap-1 whitespace-nowrap">
                {EVENT_TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => setEventType(t.value)}
                    className={`min-w-0 rounded-md border px-1 py-1.5 text-center text-[10px] font-medium transition ${eventType === t.value ? "border-violet-200 bg-violet-50 text-violet-700 shadow-sm ring-1 ring-violet-300/30 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300" : "border-border bg-background text-muted-foreground hover:bg-muted"}`}>
                    <div className="text-sm leading-none">{t.emoji}</div>
                    <div className="mt-0.5 truncate leading-tight">{t.label}</div>
                  </button>
                ))}
              </div>
            </Field>
          </Card>

          {/* Entidades vinculadas */}
          <Card icon={ClipboardList} title="Entidade notificada" accent={activeStatus.bar}>
            {errors.link && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                {errors.link}
              </p>
            )}
            <Field label="Campanha" hint={eventType === "CAMPAIGN_COVERAGE" ? "Obrigatório para este tipo" : undefined}>
              <RelationSelect target={T_CAMPAIGN} value={campaignId} zIndex="z-[30]"
                onChange={(v, lbl) => { setCampaignId(v); setCampaignLabel(lbl); setErrors((p) => ({ ...p, link: "" })); }}
                placeholder="Pesquisar campanha…" initialLabel={campaignLabel || undefined} />
            </Field>
            <Field label="Registo de imunização" hint={eventType === "IMMUNIZATION" ? "Obrigatório para este tipo" : undefined}>
              <RelationSelect target={T_IMMUNIZATION} value={immunizationId} zIndex="z-[20]"
                onChange={(v, lbl) => { setImmunizationId(v); setImmunizationLabel(lbl); setErrors((p) => ({ ...p, link: "" })); }}
                placeholder="Pesquisar imunização…" initialLabel={immunizationLabel || undefined} />
            </Field>
            <Field label="Evento adverso" hint={eventType === "AEFI" ? "Obrigatório para este tipo" : undefined}>
              <RelationSelect target={T_ADVERSE_EVENT} value={adverseEventId} zIndex="z-[10]"
                onChange={(v, lbl) => { setAdverseEventId(v); setAdverseEventLabel(lbl); setErrors((p) => ({ ...p, link: "" })); }}
                placeholder="Pesquisar evento adverso…" initialLabel={adverseEventLabel || undefined} />
            </Field>
          </Card>

          {/* Datas e referência */}
          <Card icon={CalendarDays} title="Datas e referência" accent="bg-blue-500">
            <Field label="Enviado em" hint="Preencha quando SENT ou ACCEPTED">
              <input type="datetime-local" value={sentAt} onChange={(e) => setSentAt(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Próxima tentativa">
              <input type="datetime-local" value={nextRetryAt} onChange={(e) => setNextRetryAt(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Referência externa">
              <input type="text" value={externalReference} onChange={(e) => setExternalReference(e.target.value)}
                placeholder="Ex.: REF-2026-001234" className={inputCls} />
            </Field>
          </Card>

          {/* Erro e observações */}
          <div className="col-span-2">
            <Card icon={Bell} title="Erro e observações" accent="bg-rose-400">
              <Field label="Mensagem de erro">
                <textarea value={errorMessage} onChange={(e) => setErrorMessage(e.target.value)}
                  rows={2} placeholder="Detalhe do erro de envio…" className={inputCls} />
              </Field>
              <Field label="Observações">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  rows={2} placeholder="Notas adicionais…" className={inputCls} />
              </Field>
            </Card>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
