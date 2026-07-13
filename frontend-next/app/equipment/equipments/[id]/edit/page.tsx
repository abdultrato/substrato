"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Package,
  Power,
  Save,
  ShieldAlert,
  Wrench,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { routeParamToString } from "@/lib/routeParams";
import {
  pickEquipmentIcon,
  type EquipmentRow,
} from "@/components/equipment/equipmentMeta";

const GLASS =
  "rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5";

const INPUT =
  "w-full rounded-lg border border-border bg-background/70 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40";

/** Cartão de secção do formulário, separado por função. */
function FormSection({
  title,
  icon: Icon,
  bar,
  children,
}: {
  title: string;
  icon: typeof Wrench;
  bar: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${GLASS} border-l-4 ${bar}`}>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Icon size={13} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">{title}</span>
      </div>
      <div className="grid gap-2 p-2 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
  full,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

type FormState = {
  name: string;
  serial_number: string;
  manufacturer: string;
  model: string;
  acquisition_date: string;
  acquisition_status: string;
  initial_operational_status: string;
  initial_failure_type: string;
  location: string;
  responsible: string;
  active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  serial_number: "",
  manufacturer: "",
  model: "",
  acquisition_date: "",
  acquisition_status: "NOVO",
  initial_operational_status: "FUNCIONANDO",
  initial_failure_type: "",
  location: "",
  responsible: "",
  active: true,
};

export default function EquipmentsEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = routeParamToString((params as any)?.id);
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [row, setRow] = useState<EquipmentRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErro(null);
    try {
      const result = await apiFetch<EquipmentRow>(
        `/equipment/equipment/${encodeURIComponent(id)}/`,
        { clientCache: false },
      );
      setRow(result || null);
      if (result) {
        setForm({
          name: String(result.name ?? ""),
          serial_number: String(result.serial_number ?? ""),
          manufacturer: String(result.manufacturer ?? ""),
          model: String(result.model ?? ""),
          acquisition_date: String(result.acquisition_date ?? "").slice(0, 10),
          acquisition_status: String(result.acquisition_status ?? "NOVO"),
          initial_operational_status: String(
            result.initial_operational_status ?? "FUNCIONANDO",
          ),
          initial_failure_type: String(result.initial_failure_type ?? ""),
          location: String(result.location ?? ""),
          responsible: String(result.responsible ?? ""),
          active: result.active !== false,
        });
      }
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar o equipamento.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load, safeRefreshToken]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || saving) return;
    setSaving(true);
    setErro(null);
    try {
      await apiFetch(`/equipment/equipment/${encodeURIComponent(id)}/`, {
        method: "PATCH",
        clientCache: false,
        body: JSON.stringify({
          ...form,
          acquisition_date: form.acquisition_date || null,
        }),
      });
      router.push(`/equipment/equipments/${id}`);
    } catch (e: any) {
      setErro(e?.message || "Falha ao guardar o equipamento.");
      setSaving(false);
    }
  }

  const Icon = row ? pickEquipmentIcon(row) : Wrench;

  return (
    <AppLayout>
      <form onSubmit={handleSubmit} className="space-y-1.5">
        {/* Cabeçalho fundido: identidade + acções num só bloco translúcido */}
        <section className="relative overflow-hidden rounded-2xl border border-teal-200/25 bg-gradient-to-br from-teal-100/[0.05] via-white/[0.015] to-cyan-100/[0.03] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-teal-800/20 dark:from-teal-950/[0.05] dark:via-white/[0.01] dark:to-cyan-950/[0.03]">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-teal-400/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-2.5 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25">
                <Icon size={15} />
              </span>
              <div className="min-w-0">
                <h1 className="line-clamp-1 text-base font-bold leading-tight text-foreground">
                  {row?.name ? `Editar · ${row.name}` : "Editar equipamento"}
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  {row
                    ? [row.custom_id, row.serial_number].filter(Boolean).join(" · ") || "—"
                    : "A carregar…"}
                </p>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <Link
                href={id ? `/equipment/equipments/${id}` : "/equipment/equipments"}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/[0.05] px-2.5 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
              >
                <ArrowLeft size={13} />
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving || loading || !row}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-2.5 text-xs font-semibold text-white shadow-sm transition hover:from-teal-700 hover:to-cyan-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Guardar
              </button>
            </div>
          </div>
        </section>

        {erro ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            {erro}
          </div>
        ) : null}

        {loading && !row ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-xs text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            A carregar equipamento...
          </div>
        ) : null}

        {!loading && !row ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-xs text-muted-foreground">
            <ShieldAlert size={14} />
            Equipamento não encontrado ou sem permissão de acesso.
          </div>
        ) : null}

        {row ? (
          <div className="grid grid-cols-2 gap-1.5">
            <FormSection title="Identificação" icon={Wrench} bar="border-l-teal-500 dark:border-l-teal-400">
              <Field label="Nome" required full>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                  className={INPUT}
                />
              </Field>
              <Field label="Nº de série" required>
                <input
                  type="text"
                  value={form.serial_number}
                  onChange={(e) => set("serial_number", e.target.value)}
                  required
                  className={INPUT}
                />
              </Field>
              <Field label="Fabricante">
                <input
                  type="text"
                  value={form.manufacturer}
                  onChange={(e) => set("manufacturer", e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="Modelo" full>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => set("model", e.target.value)}
                  className={INPUT}
                />
              </Field>
            </FormSection>

            <FormSection title="Aquisição" icon={Package} bar="border-l-blue-500 dark:border-l-blue-400">
              <Field label="Data de aquisição">
                <input
                  type="date"
                  value={form.acquisition_date}
                  onChange={(e) => set("acquisition_date", e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="Estado na aquisição">
                <select
                  value={form.acquisition_status}
                  onChange={(e) => set("acquisition_status", e.target.value)}
                  className={`${INPUT} [&>option]:bg-background`}
                >
                  <option value="NOVO">Novo</option>
                  <option value="USADO">Usado</option>
                </select>
              </Field>
              <Field label="Estado operacional inicial">
                <select
                  value={form.initial_operational_status}
                  onChange={(e) => set("initial_operational_status", e.target.value)}
                  className={`${INPUT} [&>option]:bg-background`}
                >
                  <option value="FUNCIONANDO">A funcionar</option>
                  <option value="AVARIADO">Avariado</option>
                  <option value="DESLIGADO">Desligado</option>
                </select>
              </Field>
              <Field label="Tipo de avaria inicial">
                <input
                  type="text"
                  value={form.initial_failure_type}
                  onChange={(e) => set("initial_failure_type", e.target.value)}
                  className={INPUT}
                />
              </Field>
            </FormSection>

            <FormSection title="Localização e responsável" icon={MapPin} bar="border-l-violet-500 dark:border-l-violet-400">
              <Field label="Localização" full>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="Responsável" full>
                <input
                  type="text"
                  value={form.responsible}
                  onChange={(e) => set("responsible", e.target.value)}
                  className={INPUT}
                />
              </Field>
            </FormSection>

            <FormSection title="Disponibilidade" icon={Power} bar="border-l-emerald-500 dark:border-l-emerald-400">
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => set("active", e.target.checked)}
                  className="h-3.5 w-3.5 accent-teal-600"
                />
                <span className="text-xs text-foreground">
                  Equipamento ativo (disponível para uso operacional)
                </span>
              </label>
            </FormSection>
          </div>
        ) : null}
      </form>
    </AppLayout>
  );
}
