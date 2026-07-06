"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  MessagesSquare,
  Save,
  Tag,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Choices ───────────────────────────────────────────────────────────────────

const STATUS_CHOICES = [
  { value: "RECEBIDA",     label: "Recebida" },
  { value: "INVESTIGACAO", label: "Em investigação" },
  { value: "RESPONDIDA",   label: "Respondida" },
  { value: "CAPA",         label: "Com ação corretiva" },
  { value: "FECHADA",      label: "Fechada" },
];

const STATUS_BAR: Record<string, string> = {
  RECEBIDA:     "bg-amber-400",
  INVESTIGACAO: "bg-sky-500",
  RESPONDIDA:   "bg-indigo-500",
  CAPA:         "bg-orange-500",
  FECHADA:      "bg-emerald-500",
};

const STATUS_COLOR: Record<string, string> = {
  RECEBIDA:     "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300",
  INVESTIGACAO: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300",
  RESPONDIDA:   "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700/40 dark:bg-indigo-900/20 dark:text-indigo-300",
  CAPA:         "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300",
  FECHADA:      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300",
};

const SOURCE_SUGGESTIONS = ["Paciente", "Médico", "Sector interno", "Enfermagem", "Recepção", "Entidade externa"];

// ── Design helpers ────────────────────────────────────────────────────────────

function Card({ icon: Icon, title, children, accent }: {
  icon: React.ElementType; title: string; children: React.ReactNode; accent?: string;
}) {
  return (
    <section className="relative z-0 overflow-visible rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-1.5 pl-4">
        <Icon size={11} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-2 p-2.5 pl-3">{children}</div>
    </section>
  );
}

function Field({ label, required, hint, error, children }: {
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

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/25";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewComplaintPage() {
  useAuthGuard();
  const router = useRouter();

  const [code,          setCode]          = useState("");
  const [source,        setSource]        = useState("");
  const [receivedAt,    setReceivedAt]    = useState("");
  const [description,   setDescription]   = useState("");
  const [investigation, setInvestigation] = useState("");
  const [response,      setResponse]      = useState("");
  const [status,        setStatus]        = useState("RECEBIDA");

  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentStatus = STATUS_CHOICES.find((s) => s.value === status);

  function validate() {
    const e: Record<string, string> = {};
    if (!description.trim()) e.description = "Descrição obrigatória.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const created = await apiFetch<{ id: number }>("/clinical_laboratory/complaint/", {
        method: "POST",
        body: JSON.stringify({
          code:          code.trim(),
          source:        source.trim(),
          received_at:   receivedAt ? new Date(receivedAt).toISOString() : undefined,
          description:   description.trim(),
          investigation: investigation.trim(),
          response:      response.trim(),
          status,
        }),
      });
      router.push(`/clinical-laboratory/quality-management/complaints/${created.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao criar reclamação.");
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-rose-500/10 blur-2xl" />
            <div className="absolute -bottom-6 left-8 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl" />
          </div>
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${STATUS_BAR[status] ?? "bg-slate-300"}`} />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 shadow-md shadow-rose-500/30">
              <MessagesSquare size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Gestão da qualidade</span>
                <span>/</span>
                <span>Reclamações</span>
                <span>/</span>
                <span className="font-medium text-foreground">Nova</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {code.trim() || "Nova reclamação"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {currentStatus && (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[status] ?? ""}`}>
                    {currentStatus.label}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-orange-600 px-4 text-xs font-semibold text-white shadow-md shadow-rose-500/30 transition hover:from-rose-700 hover:to-orange-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Criar reclamação
              </button>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {saveError}
          </div>
        )}

        <div className="grid gap-2 lg:grid-cols-2">

          {/* Identificação */}
          <Card icon={Tag} title="Identificação" accent="bg-rose-500">
            <Field label="Código interno" hint="Referência opcional da reclamação.">
              <input
                type="text" value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: REC-2026-014"
                className={inputCls}
              />
            </Field>
            <Field label="Origem" hint="Quem apresentou a reclamação.">
              <input
                type="text" value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Paciente, médico, sector interno…"
                list="complaint-sources"
                className={inputCls}
              />
              <datalist id="complaint-sources">
                {SOURCE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
              </datalist>
            </Field>
            <Field label="Recebida em">
              <input
                type="datetime-local" value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Descrição */}
          <Card icon={MessagesSquare} title="Reclamação" accent="bg-orange-500">
            <Field label="Descrição" required error={errors.description}>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, description: "" })); }}
                placeholder="Descrição do que foi reclamado…"
                rows={5}
                className={`${inputCls} resize-y ${errors.description ? "border-red-300 focus:border-red-400" : ""}`}
              />
            </Field>
          </Card>

          {/* Tratamento */}
          <div className="lg:col-span-2">
            <Card icon={FileText} title="Investigação e resposta" accent="bg-sky-500">
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Investigação" hint="Análise e apuramento de causa.">
                  <textarea
                    value={investigation}
                    onChange={(e) => setInvestigation(e.target.value)}
                    placeholder="Registo da investigação…"
                    rows={4}
                    className={`${inputCls} resize-y`}
                  />
                </Field>
                <Field label="Resposta ao reclamante" hint="Resposta dada e ações comunicadas.">
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Resposta enviada…"
                    rows={4}
                    className={`${inputCls} resize-y`}
                  />
                </Field>
              </div>
            </Card>
          </div>

          {/* Estado — chips clicáveis full width */}
          <div className="lg:col-span-2">
            <Card icon={CheckCircle2} title="Estado — clique para alterar">
              <div className="grid gap-1.5 sm:grid-cols-5">
                {STATUS_CHOICES.map(({ value, label }) => {
                  const isActive = status === value;
                  return (
                    <button key={value} type="button" onClick={() => setStatus(value)}
                      className={`relative overflow-hidden rounded-lg border px-3 py-2.5 text-left text-[11px] transition focus:outline-none focus:ring-2 focus:ring-rose-500/30 ${isActive ? STATUS_COLOR[value] + " ring-1 ring-current/30" : "border-border bg-background hover:bg-muted"}`}>
                      <span className={`absolute inset-y-0 left-0 w-0.5 ${STATUS_BAR[value]}`} />
                      <span className={`block pl-1.5 font-semibold ${isActive ? "" : "text-foreground"}`}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
