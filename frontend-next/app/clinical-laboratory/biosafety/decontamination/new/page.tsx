"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  Droplets,
  FlaskConical,
  Loader2,
  MapPin,
  Save,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";
import { relationOptionsFromRows } from "@/lib/resources/relationOptions";
import type { RelationTarget } from "@/lib/resources/relationOptions";

const CREATE_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Suggestions ───────────────────────────────────────────────────────────────

const AREA_SUGGESTIONS = [
  "Sala de colheitas", "Laboratório de hematologia", "Laboratório de bioquímica",
  "Laboratório de microbiologia", "Laboratório de imunologia", "Sala de culturas",
  "Câmara de biossegurança nível II", "Zona de processamento de amostras",
  "Sala de PCR", "Laboratório de anatomia patológica", "Sala de lavagem e esterilização",
  "Corredor de acesso ao laboratório", "Sala de resíduos", "Laboratório de urgência",
];

const EQUIPMENT_SUGGESTIONS = [
  "Analisador hematológico", "Analisador de bioquímica", "Centrifugadora",
  "Autoclave", "Câmara de fluxo laminar", "Microscópio", "Estufa de cultura",
  "Termociclador (PCR)", "Espectrofotómetro", "Agitador de placas",
  "Bancada de trabalho", "Frigorífico de amostras", "Congelador -80°C",
  "Pipetador automático", "Leitor de ELISA",
];

const DISINFECTANT_SUGGESTIONS = [
  "Hipoclorito de sódio 0,5%", "Hipoclorito de sódio 1%",
  "Hipoclorito de sódio 5% (diluído 1:10)",
  "Álcool etílico 70%", "Álcool isopropílico 70%",
  "Glutaraldeído 2%", "Formaldeído 10%",
  "Ácido peracético 0,2%", "Cloreto de benzalcónio 0,1%",
  "Peróxido de hidrogénio 3%", "Desinfectante quaternário de amónia",
  "Virkon S 1%",
];

const REASON_SUGGESTIONS = [
  "Rotina diária", "Rotina semanal", "Rotina mensal",
  "Após derrame de material biológico",
  "Após incidente de exposição",
  "Após procedimento de alto risco biológico",
  "Descontaminação terminal pós-isolamento",
  "Manutenção preventiva de equipamento",
  "Antes de entrada em funcionamento de nova área",
  "Por determinação do responsável de biossegurança",
];

const T_USER: RelationTarget = {
  endpoint: "/identity/user/",
  labelFields: ["username", "first_name", "last_name"],
};

// ── RelationSelect ────────────────────────────────────────────────────────────

function RelationSelect({
  value, onChange, target, placeholder, safeRefreshToken,
}: {
  value: number | null;
  onChange: (v: number | null, label: string) => void;
  target: RelationTarget;
  placeholder?: string;
  safeRefreshToken?: number;
}) {
  const [query, setQuery]       = useState("");
  const [label, setLabel]       = useState("");
  const [open, setOpen]         = useState(false);
  const [results, setResults]   = useState<{ value: string; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lbId   = useId();

  function search(q: string) {
    setQuery(q); setOpen(true);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { items } = await apiFetchList<Record<string, any>>(target.endpoint, {
          page: 1, pageSize: 20,
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
  function clear() { onChange(null, ""); setLabel(""); }

  return (
    <div className="space-y-1.5">
      {value !== null && (
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-700 dark:border-cyan-700/40 dark:bg-cyan-900/20 dark:text-cyan-300">
          {label}
          <button type="button" onClick={clear} className="ml-0.5 text-cyan-400 hover:text-cyan-600 transition">
            <X size={9} />
          </button>
        </span>
      )}
      {value === null && (
        <div className="relative z-[999]">
          <Search size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => { setOpen(true); if (!query) search(""); }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-3 text-xs text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
          />
          {searching && <Loader2 size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
          {open && (
            <div id={lbId} role="listbox"
              className="absolute left-0 right-0 z-[999] mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
              {results.length === 0
                ? <p className="px-3 py-2 text-[11px] text-muted-foreground">{searching ? "A pesquisar…" : "Nenhum resultado."}</p>
                : <ul className="max-h-48 overflow-y-auto divide-y divide-border/40">
                    {results.map((opt) => (
                      <li key={opt.value}>
                        <button type="button" onMouseDown={() => select(opt)}
                          className="flex w-full items-center px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">
                          {opt.label}
                        </button>
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

// ── SuggestInput ─────────────────────────────────────────────────────────────

function SuggestInput({
  value, onChange, suggestions, placeholder, icon: Icon, zIndex = "z-[997]",
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  icon?: React.ElementType;
  zIndex?: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter((s) =>
    !value.trim() || s.toLowerCase().includes(value.toLowerCase())
  );
  const Ic = Icon;
  return (
    <div className={`relative ${zIndex}`}>
      {Ic && <Ic size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />}
      <input type="text" value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={`w-full rounded-md border border-border bg-background py-1.5 pr-3 text-xs text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 ${Ic ? "pl-7" : "px-2.5"}`}
      />
      {open && filtered.length > 0 && (
        <div className={`absolute left-0 right-0 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-lg ${zIndex}`}>
          <ul className="max-h-44 overflow-y-auto divide-y divide-border/40">
            {filtered.slice(0, 8).map((s) => (
              <li key={s}>
                <button type="button" onMouseDown={() => { onChange(s); setOpen(false); }}
                  className="flex w-full items-center px-3 py-1.5 text-left text-xs text-foreground transition hover:bg-muted">
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Design helpers ────────────────────────────────────────────────────────────

function Card({ icon: Icon, title, accent, children }: {
  icon: React.ElementType; title: string; accent?: string; children: React.ReactNode;
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

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-[11px] font-semibold text-foreground">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewDecontaminationPage() {
  useAuthGuard();
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [area,          setArea]          = useState("");
  const [equipment,     setEquipment]     = useState("");
  const [disinfectant,  setDisinfectant]  = useState("");
  const [concentration, setConcentration] = useState("");
  const [reason,        setReason]        = useState("");
  const [performedBy,   setPerformedBy]   = useState<number | null>(null);
  const [performedByLabel, setPerformedByLabel] = useState("");
  const [performedAt,   setPerformedAt]   = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [verifiedBy,    setVerifiedBy]    = useState<number | null>(null);
  const [verifiedByLabel, setVerifiedByLabel] = useState("");

  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function validate() {
    const e: Record<string, string> = {};
    if (!area.trim())         e.area        = "Área obrigatória.";
    if (!disinfectant.trim()) e.disinfectant = "Desinfectante obrigatório.";
    if (!performedBy)         e.performed_by = "Responsável pela descontaminação obrigatório.";
    if (!performedAt)         e.performed_at = "Data e hora obrigatórias.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const data = await apiFetch<{ id?: number }>("/clinical_laboratory/decontamination/", {
        method: "POST",
        body: JSON.stringify({
          area:          area.trim(),
          equipment:     equipment.trim(),
          disinfectant:  disinfectant.trim(),
          concentration: concentration.trim(),
          reason:        reason.trim(),
          performed_by:  performedBy,
          performed_at:  performedAt,
          verified_by:   verifiedBy ?? null,
        }),
      });
      if (!data?.id) throw new Error("Resposta inesperada do servidor.");
      router.push(`/clinical-laboratory/biosafety/decontamination/${data.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao registar descontaminação.");
    } finally { setSaving(false); }
  }

  return (
    <AppLayout requiredGroups={CREATE_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-sky-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-cyan-500" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 shadow-md shadow-cyan-500/30">
              <Droplets size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Biossegurança</span><span>/</span>
                <span>Descontaminação</span><span>/</span>
                <span className="font-medium text-foreground">Novo registo</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {area.trim() ? `Descontaminação — ${area}` : "Novo registo de descontaminação"}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {disinfectant && (
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-700 dark:border-cyan-700/40 dark:bg-cyan-900/20 dark:text-cyan-300">
                    <FlaskConical size={8} />{disinfectant}{concentration ? ` ${concentration}` : ""}
                  </span>
                )}
                {performedByLabel && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <User size={9} /> {performedByLabel}
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
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 px-4 text-xs font-semibold text-white shadow-md shadow-cyan-500/30 transition hover:from-cyan-700 hover:to-sky-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Registar descontaminação
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

          {/* Localização */}
          <Card icon={MapPin} title="Área e equipamento" accent="bg-cyan-500">
            <Field label="Área descontaminada" required error={errors.area}>
              <SuggestInput value={area}
                onChange={(v) => { setArea(v); if (v.trim()) setErrors((p) => ({ ...p, area: "" })); }}
                suggestions={AREA_SUGGESTIONS}
                placeholder="Ex.: Laboratório de microbiologia"
                icon={MapPin} zIndex="z-[997]"
              />
            </Field>
            <Field label="Equipamento / Superfície" hint="Deixar em branco se for toda a área">
              <SuggestInput value={equipment}
                onChange={setEquipment}
                suggestions={EQUIPMENT_SUGGESTIONS}
                placeholder="Ex.: Câmara de fluxo laminar, bancada"
                icon={Settings} zIndex="z-[996]"
              />
            </Field>
          </Card>

          {/* Desinfectante */}
          <Card icon={FlaskConical} title="Produto desinfectante" accent="bg-sky-500">
            <Field label="Desinfectante utilizado" required error={errors.disinfectant}>
              <SuggestInput value={disinfectant}
                onChange={(v) => { setDisinfectant(v); if (v.trim()) setErrors((p) => ({ ...p, disinfectant: "" })); }}
                suggestions={DISINFECTANT_SUGGESTIONS}
                placeholder="Ex.: Hipoclorito de sódio 1%"
                icon={FlaskConical} zIndex="z-[995]"
              />
            </Field>
            <Field label="Concentração / Diluição" hint="Se não estiver incluída no nome do produto">
              <input type="text" value={concentration}
                onChange={(e) => setConcentration(e.target.value)}
                placeholder="Ex.: 1:10, 0,5%, 70%"
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Responsável + Data */}
          <Card icon={User} title="Responsável e data" accent="bg-indigo-500">
            <Field label="Realizado por" required error={errors.performed_by}>
              <RelationSelect
                value={performedBy}
                onChange={(v, l) => { setPerformedBy(v); setPerformedByLabel(l); if (v) setErrors((p) => ({ ...p, performed_by: "" })); }}
                target={T_USER}
                placeholder="Pesquisar colaborador…"
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
            <Field label="Data e hora" required error={errors.performed_at}>
              <div className="relative">
                <CalendarDays size={11} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="datetime-local" value={performedAt}
                  onChange={(e) => { setPerformedAt(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, performed_at: "" })); }}
                  className={`${inputCls} pl-7 ${errors.performed_at ? "border-red-300" : ""}`}
                />
              </div>
            </Field>
          </Card>

          {/* Verificação + Motivo */}
          <Card icon={CheckCircle} title="Verificação e motivo" accent="bg-violet-500">
            <Field label="Verificado por" hint="Opcional — supervisor ou responsável de biossegurança">
              <RelationSelect
                value={verifiedBy}
                onChange={(v, l) => { setVerifiedBy(v); setVerifiedByLabel(l); }}
                target={T_USER}
                placeholder="Pesquisar verificador…"
                safeRefreshToken={safeRefreshToken}
              />
            </Field>
            <Field label="Motivo / Razão">
              <SuggestInput value={reason}
                onChange={setReason}
                suggestions={REASON_SUGGESTIONS}
                placeholder="Ex.: Rotina diária, após derrame…"
                zIndex="z-[994]"
              />
            </Field>
          </Card>

        </div>
      </form>
    </AppLayout>
  );
}
