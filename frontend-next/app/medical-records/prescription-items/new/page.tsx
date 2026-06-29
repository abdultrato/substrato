"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, FlaskConical, Pill, StickyNote } from "lucide-react";
import Link from "next/link";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const FIELD =
  "w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition";

const LABEL = "mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: typeof ClipboardList;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="px-3 py-2 pl-4">
        <div className="mb-3 flex items-start gap-2">
          <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent} text-white shadow-sm`}>
            <Icon size={14} />
          </span>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold leading-tight text-foreground">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

export default function PrescriptionItemCreatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    record: "",
    medication: "",
    dosage_value: "",
    dosage_unit: "MG",
    interval_hours: "",
    dose_count: "1",
    notes: "",
    position: "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, any> = {
        record: Number(form.record),
        medication: Number(form.medication),
        dosage_value: form.dosage_value,
        dosage_unit: form.dosage_unit,
        dose_count: Number(form.dose_count),
        notes: form.notes,
      };
      if (form.position) body.position = Number(form.position);
      if (form.interval_hours) body.interval_hours = Number(form.interval_hours);

      await apiFetch("/medical_records/prescricaoitem/", { method: "POST", body: JSON.stringify(body) });
      router.push("/medical-records/prescription-items");
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível criar o item de prescrição.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <form onSubmit={handleSubmit} className="w-full space-y-2 px-1">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20">
                <Pill size={17} />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight text-foreground">Novo item de prescrição</h1>
                <p className="text-[11px] text-muted-foreground">Associa uma medicação a um cardex com esquema de dosagem.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-violet-600 to-purple-600 px-4 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 transition hover:opacity-90 disabled:opacity-60"
              >
                <ClipboardList size={15} /> {saving ? "A guardar..." : "Criar item"}
              </button>
              <Link
                href="/medical-records/prescription-items"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20"
              >
                <ArrowLeft size={16} /> Voltar
              </Link>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {/* ── Cartões intermédios — 4 colunas ── */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">

          <SectionCard title="Cardex e medicação" subtitle="Referências obrigatórias." icon={ClipboardList} accent="bg-violet-500">
            <Field label="Cardex *">
              <input required type="number" min="1" placeholder="ID do cardex" className={FIELD} value={form.record} onChange={set("record")} />
            </Field>
            <Field label="Medicação *">
              <input required type="number" min="1" placeholder="ID do produto" className={FIELD} value={form.medication} onChange={set("medication")} />
            </Field>
          </SectionCard>

          <SectionCard title="Dosagem" subtitle="Quantidade e unidade da dose." icon={FlaskConical} accent="bg-sky-500">
            <Field label="Valor de dose *">
              <input required type="number" min="0.01" step="0.01" placeholder="Ex.: 500" className={FIELD} value={form.dosage_value} onChange={set("dosage_value")} />
            </Field>
            <Field label="Unidade *">
              <select required className={FIELD} value={form.dosage_unit} onChange={set("dosage_unit")}>
                <option value="MG">mg</option>
                <option value="ML">ml</option>
                <option value="G">g</option>
                <option value="L">L</option>
                <option value="KG">kg</option>
              </select>
            </Field>
          </SectionCard>

          <SectionCard title="Esquema" subtitle="Número de doses e intervalo." icon={Pill} accent="bg-teal-500">
            <Field label="Número de doses">
              <input type="number" min="1" placeholder="Ex.: 3" className={FIELD} value={form.dose_count} onChange={set("dose_count")} />
            </Field>
            <Field label="Intervalo (horas)">
              <input type="number" min="1" placeholder="Ex.: 8 (se >1 dose)" className={FIELD} value={form.interval_hours} onChange={set("interval_hours")} />
            </Field>
          </SectionCard>

          <SectionCard title="Posição" subtitle="Ordem na lista do cardex." icon={ClipboardList} accent="bg-indigo-500">
            <Field label="Posição">
              <input type="number" min="1" placeholder="Automático se vazio" className={FIELD} value={form.position} onChange={set("position")} />
            </Field>
          </SectionCard>

        </div>

        {/* ── Observações — largura total ── */}
        <SectionCard title="Observações" subtitle="Notas adicionais sobre a administração desta medicação." icon={StickyNote} accent="bg-amber-500">
          <Field label="Observações">
            <textarea rows={3} placeholder="Instruções especiais de administração, alergias conhecidas, etc." className={FIELD} value={form.notes} onChange={set("notes")} />
          </Field>
        </SectionCard>

      </form>
    </AppLayout>
  );
}
