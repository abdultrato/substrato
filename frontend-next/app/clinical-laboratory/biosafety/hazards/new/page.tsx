"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Biohazard,
  FileText,
  Loader2,
  Save,
  Shield,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import { GROUPS } from "@/lib/rbac";

const CREATE_GROUPS = [GROUPS.ADMIN, GROUPS.LABORATORIO];

// ── Design helpers ─────────────────────────────────────────────────────────────

function Card({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="relative z-0 rounded-lg border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm focus-within:z-50 dark:bg-white/5 dark:border-white/10">
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-1.5">
        <Icon size={11} className="text-[var(--primary-600)] dark:text-[var(--primary-400)]" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-2 p-2.5">{children}</div>
    </section>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:ring-offset-1 ${
        checked ? "bg-violet-600" : "bg-border"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25";
const selectCls = inputCls;
const textareaCls = inputCls + " resize-none";

const RISK_GROUPS = [
  { group: "RG1", label: "Grupo de risco 1", desc: "Agentes sem risco ou risco mínimo para o indivíduo e a comunidade." },
  { group: "RG2", label: "Grupo de risco 2", desc: "Risco moderado para o indivíduo; baixo risco para a comunidade. Tratamento disponível." },
  { group: "RG3", label: "Grupo de risco 3", desc: "Risco elevado para o indivíduo; baixo risco comunitário. Geralmente com tratamento." },
  { group: "RG4", label: "Grupo de risco 4", desc: "Risco muito elevado para o indivíduo e a comunidade. Sem tratamento disponível." },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewHazardPage() {
  useAuthGuard();
  const router = useRouter();

  const [name, setName] = useState("");
  const [hazardType, setHazardType] = useState("");
  const [riskGroup, setRiskGroup] = useState("RG2");
  const [transmissionRoute, setTransmissionRoute] = useState("");
  const [requiredPpe, setRequiredPpe] = useState("");
  const [containmentLevel, setContainmentLevel] = useState("");
  const [handlingNotes, setHandlingNotes] = useState("");
  const [active, setActive] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "O nome do agente é obrigatório.";
    if (!riskGroup) e.riskGroup = "Selecione o grupo de risco.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const data = await apiFetch<{ id?: number }>("/clinical_laboratory/hazard/", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          hazard_type: hazardType.trim(),
          risk_group: riskGroup,
          transmission_route: transmissionRoute.trim(),
          required_ppe: requiredPpe.trim(),
          containment_level: containmentLevel.trim(),
          handling_notes: handlingNotes.trim(),
          active,
        }),
      });
      if (!data?.id) throw new Error("Resposta inesperada do servidor.");
      router.push(`/clinical-laboratory/biosafety/hazards/${data.id}`);
    } catch (err: any) {
      setSaveError(err?.message || "Erro ao criar perigo biológico.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={CREATE_GROUPS}>
      <form onSubmit={handleSubmit} noValidate className="mx-auto w-[90%] space-y-2">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-2.5 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-bold leading-tight text-foreground">Novo perigo biológico</h1>
              <p className="text-[11px] text-muted-foreground">
                {name.trim() ? name.trim() : "Preencha os dados do agente/perigo abaixo"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                <ArrowLeft size={13} /> Voltar
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Criar registo
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
          <Card icon={Biohazard} title="Identificação">
            <Field label="Agente / perigo" required error={errors.name}>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setErrors((p) => ({ ...p, name: "" })); }}
                placeholder="Ex.: SARS-CoV-2, Mycobacterium tuberculosis…"
                className={`${inputCls} ${errors.name ? "border-red-300 focus:border-red-400" : ""}`}
              />
            </Field>
            <Field label="Tipo de perigo">
              <input
                type="text"
                value={hazardType}
                onChange={(e) => setHazardType(e.target.value)}
                placeholder="Ex.: Vírus, Bactéria, Fungo, Parasita…"
                className={inputCls}
              />
            </Field>
            <Field label="Grupo de risco" required error={errors.riskGroup}>
              <select value={riskGroup} onChange={(e) => { setRiskGroup(e.target.value); setErrors((p) => ({ ...p, riskGroup: "" })); }} className={selectCls}>
                {RISK_GROUPS.map(({ group, label }) => (
                  <option key={group} value={group}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Estado">
              <div className="flex items-center gap-2 py-0.5">
                <Toggle checked={active} onChange={setActive} />
                <span className="text-xs font-medium text-foreground">{active ? "Ativo" : "Inativo"}</span>
              </div>
            </Field>
          </Card>

          {/* Contenção e EPI */}
          <Card icon={Shield} title="Contenção e EPI">
            <Field label="Via de transmissão">
              <input
                type="text"
                value={transmissionRoute}
                onChange={(e) => setTransmissionRoute(e.target.value)}
                placeholder="Ex.: Aerossol, Contacto, Gotícula…"
                className={inputCls}
              />
            </Field>
            <Field label="EPI requerido">
              <input
                type="text"
                value={requiredPpe}
                onChange={(e) => setRequiredPpe(e.target.value)}
                placeholder="Ex.: Luvas, Máscara FFP2, Óculos de proteção…"
                className={inputCls}
              />
            </Field>
            <Field label="Nível de contenção">
              <input
                type="text"
                value={containmentLevel}
                onChange={(e) => setContainmentLevel(e.target.value)}
                placeholder="Ex.: NB-2, NB-3…"
                className={inputCls}
              />
            </Field>
          </Card>

          {/* Notas */}
          <Card icon={FileText} title="Notas de manipulação">
            <Field label="Instruções e notas">
              <textarea
                value={handlingNotes}
                onChange={(e) => setHandlingNotes(e.target.value)}
                placeholder="Procedimentos de segurança, cuidados especiais, desinfeção…"
                rows={5}
                className={textareaCls}
              />
            </Field>
          </Card>

          {/* Referência de grupos de risco — seleccionável */}
          <Card icon={AlertTriangle} title="Referência de grupos de risco">
            <div className="space-y-1 text-[11px] text-muted-foreground">
              {RISK_GROUPS.map(({ group, label, desc }) => {
                const active_ = riskGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => { setRiskGroup(group); setErrors((p) => ({ ...p, riskGroup: "" })); }}
                    className={`w-full rounded-md border px-2.5 py-1.5 text-left transition focus:outline-none focus:ring-2 focus:ring-violet-500/30 ${
                      active_
                        ? "border-violet-400/70 bg-violet-50 text-violet-900 dark:bg-violet-900/15 dark:text-violet-200"
                        : "border-border bg-background text-muted-foreground hover:border-violet-300 hover:bg-muted"
                    }`}
                  >
                    <span className={`font-semibold ${active_ ? "text-violet-700 dark:text-violet-300" : "text-foreground"}`}>{label}</span>
                    <p className="mt-0.5 leading-snug">{desc}</p>
                  </button>
                );
              })}
            </div>
          </Card>

        </div>
      </form>
    </AppLayout>
  );
}
