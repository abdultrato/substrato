"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  Loader2,
  Save,
  Search,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

export const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];
export const ENDPOINT = "/clinical_laboratory/corrective_action/";
export const BASE_PATH = "/clinical-laboratory/quality-management/corrective-actions";

export const ACTION_TYPES = [
  { value: "CORRETIVA", label: "Corretiva", bar: "bg-orange-500", chip: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300" },
  { value: "PREVENTIVA", label: "Preventiva", bar: "bg-sky-500", chip: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/40 dark:bg-sky-900/20 dark:text-sky-300" },
  { value: "MELHORIA", label: "Melhoria", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" },
];

export const STATUS_CHOICES = [
  { value: "PLANEADA", label: "Planeada", bar: "bg-slate-400", chip: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700/40 dark:bg-slate-900/30 dark:text-slate-300" },
  { value: "EM_CURSO", label: "Em curso", bar: "bg-blue-500", chip: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300" },
  { value: "CONCLUIDA", label: "Concluída", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-300" },
  { value: "ATRASADA", label: "Atrasada", bar: "bg-red-500", chip: "border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-900/15 dark:text-red-300" },
  { value: "VERIFICADA", label: "Verificada", bar: "bg-violet-500", chip: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/40 dark:bg-violet-900/20 dark:text-violet-300" },
  { value: "INEFICAZ", label: "Ineficaz", bar: "bg-amber-500", chip: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300" },
  { value: "FECHADA", label: "Fechada", bar: "bg-zinc-500", chip: "border-border bg-muted text-muted-foreground" },
];

export const T_NONCONFORMITY: RelationTarget = {
  endpoint: "/clinical_laboratory/nonconformity/",
  labelFields: ["code", "custom_id", "description", "source_ref"],
};

export const T_RESPONSIBLE: RelationTarget = {
  endpoint: "/identity/user/",
  labelFields: ["full_name", "display_name", "name", "username", "email", "custom_id"],
};

export type CorrectiveAction = {
  id: number;
  custom_id?: string | null;
  action_type?: string;
  description?: string;
  due_date?: string | null;
  completion_date?: string | null;
  effectiveness_check?: string;
  status?: string;
  nonconformity?: number | null;
  responsible?: number | null;
};

export function pickLabel(row: Record<string, any>, target: RelationTarget) {
  return relationOptionsFromRows([row], target)[0]?.label || String(row?.custom_id || row?.code || row?.name || row?.id || "");
}

export function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function Card({ icon: Icon, title, children, accent }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section className="relative z-0 overflow-visible rounded-xl border border-white/25 bg-white/30 shadow-sm backdrop-blur-xl focus-within:z-50 dark:border-white/10 dark:bg-white/[0.05]">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-1.5 border-b border-border/40 px-3 py-2 pl-4">
        <Icon size={12} className="text-orange-600 dark:text-orange-300" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-2 p-3 pl-4">{children}</div>
    </section>
  );
}

function Field({ label, required, error, children }: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
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

function RelationSelect({
  value, label, onChange, target, placeholder,
}: {
  value: number | null;
  label: string;
  onChange: (value: number | null, label: string) => void;
  target: RelationTarget;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

  function search(q: string) {
    setQuery(q);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { items } = await apiFetchList<Record<string, any>>(target.endpoint, {
          page: 1,
          pageSize: 25,
          query: { ...(target.staticFilters ?? {}), ...(q.trim() ? { search: q.trim() } : {}) },
        });
        setResults(relationOptionsFromRows(items, target));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 220);
  }

  function select(option: { value: string; label: string }) {
    onChange(Number(option.value), option.label);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="space-y-1.5">
      {value !== null && label ? (
        <div className="flex flex-wrap gap-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:border-orange-700/40 dark:bg-orange-900/20 dark:text-orange-300">
            {label}
            <button type="button" onClick={() => onChange(null, "")} className="ml-0.5 text-orange-500 transition hover:text-red-500" aria-label="Limpar seleção">
              <X size={9} />
            </button>
          </span>
        </div>
      ) : (
        <div className={`relative ${open ? "z-[999]" : "z-[10]"}`}>
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(event) => search(event.target.value)}
            onFocus={() => { setOpen(true); if (!query) search(""); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-background/85 py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
          />
          {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={listboxId} role="listbox" className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
              {results.length === 0 ? (
                <p className="px-3 py-2 text-[11px] text-muted-foreground">{searching ? "A pesquisar..." : "Nenhum resultado."}</p>
              ) : (
                <ul className="max-h-48 overflow-y-auto divide-y divide-border/40">
                  {results.map((option) => (
                    <li key={option.value}>
                      <button type="button" onMouseDown={() => select(option)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">
                        <CheckCircle2 size={10} className="text-orange-500" /> {option.label}
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

const inputCls = "w-full rounded-md border border-border bg-background/85 px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25";

export default function CorrectiveActionForm({ id }: { id?: string }) {
  useAuthGuard();
  const router = useRouter();
  const editing = Boolean(id);
  const [customId, setCustomId] = useState("");
  const [actionType, setActionType] = useState("CORRETIVA");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [effectivenessCheck, setEffectivenessCheck] = useState("");
  const [status, setStatus] = useState("PLANEADA");
  const [nonconformity, setNonconformity] = useState<number | null>(null);
  const [nonconformityLabel, setNonconformityLabel] = useState("");
  const [responsible, setResponsible] = useState<number | null>(null);
  const [responsibleLabel, setResponsibleLabel] = useState("");
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const typeMeta = useMemo(() => ACTION_TYPES.find((item) => item.value === actionType) ?? ACTION_TYPES[0], [actionType]);
  const statusMeta = useMemo(() => STATUS_CHOICES.find((item) => item.value === status) ?? STATUS_CHOICES[0], [status]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<CorrectiveAction>(`${ENDPOINT}${id}/`)
      .then(async (record) => {
        setCustomId(record.custom_id ?? "");
        setActionType(record.action_type || "CORRETIVA");
        setDescription(record.description ?? "");
        setDueDate(toDateInput(record.due_date));
        setCompletionDate(toDateInput(record.completion_date));
        setEffectivenessCheck(record.effectiveness_check ?? "");
        setStatus(record.status || "PLANEADA");
        setNonconformity(record.nonconformity ?? null);
        setResponsible(record.responsible ?? null);

        if (record.nonconformity) {
          apiFetch<Record<string, any>>(`/clinical_laboratory/nonconformity/${record.nonconformity}/`)
            .then((row) => setNonconformityLabel(pickLabel(row, T_NONCONFORMITY)))
            .catch(() => setNonconformityLabel(`Não conformidade #${record.nonconformity}`));
        }
        if (record.responsible) {
          apiFetch<Record<string, any>>(`/identity/user/${record.responsible}/`)
            .then((row) => setResponsibleLabel(pickLabel(row, T_RESPONSIBLE)))
            .catch(() => setResponsibleLabel(`Responsável #${record.responsible}`));
        }
      })
      .catch((error) => setLoadError(error?.message || "Erro ao carregar ação corretiva."))
      .finally(() => setLoading(false));
  }, [id]);

  function validate() {
    const next: Record<string, string> = {};
    if (!description.trim()) next.description = "Descrição obrigatória.";
    if (completionDate && dueDate && completionDate < dueDate && status === "CONCLUIDA") {
      next.completionDate = "Confirme a data de conclusão antes do prazo ou ajuste o estado.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        action_type: actionType,
        description: description.trim(),
        due_date: dueDate || null,
        completion_date: completionDate || null,
        effectiveness_check: effectivenessCheck.trim(),
        status,
        nonconformity,
        responsible,
      };
      const saved = await apiFetch<{ id: number }>(editing ? `${ENDPOINT}${id}/` : ENDPOINT, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      router.push(`${BASE_PATH}/${editing ? id : saved.id}`);
    } catch (error: any) {
      setSaveError(error?.message || "Erro ao guardar ação corretiva.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout requiredGroups={EDIT_GROUPS}>
        <div className="flex h-48 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout requiredGroups={EDIT_GROUPS}>
        <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{loadError}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">
        <div className="relative overflow-hidden rounded-xl border border-white/25 bg-white/35 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
          <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${statusMeta.bar}`} />
          <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-orange-400/10 blur-2xl" />
          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3 pl-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/25">
              <Wrench size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/clinical-laboratory/quality-management" className="hover:underline">Gestão da qualidade</Link>
                <span>/</span>
                <Link href={BASE_PATH} className="hover:underline">CAPA</Link>
                <span>/</span>
                <span className="font-medium text-foreground">{editing ? "Editar" : "Nova"}</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">{description.trim() || customId || "Ação corretiva/preventiva"}</h1>
              <div className="mt-0.5 flex flex-wrap gap-1.5">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${typeMeta.chip}`}>{typeMeta.label}</span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusMeta.chip}`}>{statusMeta.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card/80 px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 px-4 text-xs font-semibold text-white shadow-md shadow-orange-500/25 transition hover:from-orange-700 hover:to-amber-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} {editing ? "Guardar" : "Criar CAPA"}
              </button>
            </div>
          </div>
        </div>

        {saveError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">{saveError}</div>}

        <div className="grid gap-2 lg:grid-cols-2">
          <Card icon={Sparkles} title="Tipo e vínculo" accent={typeMeta.bar}>
            <Field label="Tipo de ação">
              <div className="grid gap-1.5 sm:grid-cols-3">
                {ACTION_TYPES.map((item) => (
                  <button key={item.value} type="button" onClick={() => setActionType(item.value)} className={`relative overflow-hidden rounded-lg border px-3 py-2 text-left text-[11px] transition ${actionType === item.value ? `${item.chip} ring-1 ring-current/30` : "border-border bg-background/80 hover:bg-muted"}`}>
                    <span className={`absolute inset-y-0 left-0 w-0.5 ${item.bar}`} />
                    <span className="block pl-1.5 font-semibold">{item.label}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Não conformidade relacionada">
              <RelationSelect value={nonconformity} label={nonconformityLabel} onChange={(value, optionLabel) => { setNonconformity(value); setNonconformityLabel(optionLabel); }} target={T_NONCONFORMITY} placeholder="Pesquisar não conformidade..." />
            </Field>
            <Field label="Responsável">
              <RelationSelect value={responsible} label={responsibleLabel} onChange={(value, optionLabel) => { setResponsible(value); setResponsibleLabel(optionLabel); }} target={T_RESPONSIBLE} placeholder="Pesquisar responsável..." />
            </Field>
          </Card>

          <Card icon={CalendarDays} title="Prazos e estado" accent={statusMeta.bar}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Prazo">
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputCls} />
              </Field>
              <Field label="Conclusão" error={errors.completionDate}>
                <input type="date" value={completionDate} onChange={(event) => setCompletionDate(event.target.value)} className={`${inputCls} ${errors.completionDate ? "border-red-300 focus:border-red-400" : ""}`} />
              </Field>
            </div>
            <Field label="Estado">
              <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {STATUS_CHOICES.map((item) => (
                  <button key={item.value} type="button" onClick={() => setStatus(item.value)} className={`relative overflow-hidden rounded-lg border px-3 py-2 text-left text-[11px] transition ${status === item.value ? `${item.chip} ring-1 ring-current/30` : "border-border bg-background/80 hover:bg-muted"}`}>
                    <span className={`absolute inset-y-0 left-0 w-0.5 ${item.bar}`} />
                    <span className="block pl-1.5 font-semibold">{item.label}</span>
                  </button>
                ))}
              </div>
            </Field>
          </Card>

          <div className="lg:col-span-2">
            <Card icon={ClipboardCheck} title="Plano de ação" accent="bg-orange-500">
              <Field label="Descrição" required error={errors.description}>
                <textarea value={description} onChange={(event) => { setDescription(event.target.value); if (event.target.value.trim()) setErrors((prev) => ({ ...prev, description: "" })); }} rows={5} className={`${inputCls} resize-y ${errors.description ? "border-red-300 focus:border-red-400" : ""}`} />
              </Field>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card icon={FileWarning} title="Verificação de eficácia" accent="bg-violet-500">
              <Field label="Evidência / resultado da verificação">
                <textarea value={effectivenessCheck} onChange={(event) => setEffectivenessCheck(event.target.value)} rows={4} className={`${inputCls} resize-y`} />
              </Field>
            </Card>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
