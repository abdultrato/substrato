"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Package,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import RelationSelect from "@/components/ui/RelationSelect";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const EDIT_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

const DEPARTMENTS = [
  "Laboratório Clínico",
  "Banco de Sangue",
  "Microbiologia",
  "Imunologia",
  "Bioquímica",
  "Hematologia",
  "Urgência / Emergência",
  "Bloco Operatório",
  "Unidade de Cuidados Intensivos",
  "Enfermaria Geral",
  "Maternidade",
  "Imagiologia / Radiologia",
  "Medicina Interna",
  "Pediatria",
  "Cirurgia Geral",
  "Fisioterapia",
  "Farmácia",
  "Consulta Externa",
  "Administração",
];

const PURPOSES = [
  "Uso diário / rotina",
  "Procedimento cirúrgico",
  "Colheita de amostras",
  "Isolamento de doente",
  "Limpeza e desinfecção",
  "Reposto de stock",
  "Actividade de alto risco biológico",
  "Treino / Simulação",
];

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

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20";

function SuggestInput({ value, onChange, suggestions, placeholder, zIndex = "z-[997]" }: {
  value: string; onChange: (v: string) => void;
  suggestions: string[]; placeholder?: string; zIndex?: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={inputCls}
      />
      {open && filtered.length > 0 && (
        <ul className={`absolute left-0 right-0 top-full mt-0.5 rounded-lg border border-border bg-card shadow-lg ${zIndex} max-h-48 overflow-y-auto`}>
          {filtered.map((s) => (
            <li key={s}
              onMouseDown={() => { onChange(s); setOpen(false); }}
              className="cursor-pointer px-2.5 py-1.5 text-xs text-foreground hover:bg-muted">
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewPPEDistributionPage() {
  useAuthGuard();
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);

  const [ppeId,          setPpeId]          = useState<number | null>(null);
  const [ppeName,        setPpeName]        = useState("");
  const [staffId,        setStaffId]        = useState<number | null>(null);
  const [department,     setDepartment]     = useState("");
  const [quantity,       setQuantity]       = useState(1);
  const [distributedById, setDistributedById] = useState<number | null>(null);
  const [distributionDate, setDistributionDate] = useState(today);
  const [purpose,        setPurpose]        = useState("");

  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function validate() {
    const e: Record<string, string> = {};
    if (!ppeId)         e.ppe      = "Seleccione um EPI.";
    if (!staffId && !department.trim()) e.recipient = "Indique o colaborador ou o sector de destino.";
    if (quantity < 1)   e.quantity = "Quantidade mínima é 1.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true); setSaveError(null);
    try {
      const body: Record<string, any> = {
        ppe:               ppeId,
        quantity,
        distribution_date: distributionDate,
      };
      if (staffId)              body.staff          = staffId;
      if (department.trim())    body.department     = department.trim();
      if (distributedById)      body.distributed_by = distributedById;
      if (purpose.trim())       body.purpose        = purpose.trim();

      const res = await apiFetch<{ id: number }>("/clinical_laboratory/ppe_distribution/", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.push(`/clinical-laboratory/biosafety/ppe-distribution/${res.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao registar distribuição.");
    } finally { setSaving(false); }
  }

  return (
    <AppLayout requiredGroups={EDIT_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-teal-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-teal-500 to-emerald-500" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-md shadow-teal-500/30">
              <ShieldCheck size={20} className="text-white" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Biossegurança</span><span>/</span>
                <span>Distribuição de EPI</span><span>/</span>
                <span className="font-medium text-foreground">Nova distribuição</span>
              </div>
              <h1 className="text-base font-bold leading-tight text-foreground">
                {ppeName ? `Distribuição — ${ppeName}` : "Nova distribuição de EPI"}
              </h1>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Registe a entrega de EPI a colaborador ou sector
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 px-4 text-xs font-semibold text-white shadow-md shadow-teal-500/30 transition hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Registar distribuição
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

          {/* EPI */}
          <Card icon={Package} title="EPI a distribuir" accent="bg-teal-500">
            <Field label="EPI" required error={errors.ppe}>
              <RelationSelect
                endpoint="/clinical_laboratory/ppe/"
                value={ppeId}
                onChange={(id, label) => {
                  setPpeId(id);
                  setPpeName(label ?? "");
                  if (id) setErrors((p) => ({ ...p, ppe: "" }));
                }}
                labelKey="name"
                placeholder="Procurar EPI…"
              />
            </Field>
            <Field label="Quantidade" required error={errors.quantity}>
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-sm font-bold text-foreground transition hover:bg-muted">−</button>
                <input type="number" min={1} value={quantity}
                  onChange={(e) => { setQuantity(Math.max(1, Number(e.target.value))); setErrors((p) => ({ ...p, quantity: "" })); }}
                  className={`${inputCls} text-center`} />
                <button type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-sm font-bold text-foreground transition hover:bg-muted">+</button>
              </div>
            </Field>
            <Field label="Data da distribuição" required>
              <input type="date" value={distributionDate}
                onChange={(e) => setDistributionDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Destinatário */}
          <Card icon={User} title="Destinatário" accent="bg-emerald-500">
            <p className="text-[10px] text-muted-foreground">Preencha o colaborador, o sector, ou ambos.</p>
            {errors.recipient && (
              <p className="text-[10px] font-medium text-red-600 dark:text-red-400">{errors.recipient}</p>
            )}
            <Field label="Colaborador">
              <RelationSelect
                endpoint="/identity/users/"
                value={staffId}
                onChange={(id) => {
                  setStaffId(id);
                  setErrors((p) => ({ ...p, recipient: "" }));
                }}
                labelKey="full_name"
                placeholder="Procurar colaborador…"
              />
            </Field>
            <Field label="Sector / Departamento" hint="Preencha se a distribuição for para um sector">
              <SuggestInput value={department} onChange={(v) => { setDepartment(v); setErrors((p) => ({ ...p, recipient: "" })); }}
                suggestions={DEPARTMENTS} placeholder="Ex.: Laboratório Clínico, Bloco Operatório…" zIndex="z-[997]" />
            </Field>
          </Card>

          {/* Responsável + Finalidade — full width */}
          <div className="lg:col-span-2">
            <Card icon={CalendarDays} title="Responsável e finalidade" accent="bg-indigo-500">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Distribuído por">
                  <RelationSelect
                    endpoint="/identity/users/"
                    value={distributedById}
                    onChange={(id) => setDistributedById(id)}
                    labelKey="full_name"
                    placeholder="Procurar responsável…"
                  />
                </Field>
                <Field label="Finalidade" hint="Descreva o motivo ou seleccione da lista">
                  <SuggestInput value={purpose} onChange={setPurpose}
                    suggestions={PURPOSES} placeholder="Ex.: Uso diário / rotina, Procedimento cirúrgico…" zIndex="z-[996]" />
                </Field>
              </div>
            </Card>
          </div>

        </div>
      </form>
    </AppLayout>
  );
}
