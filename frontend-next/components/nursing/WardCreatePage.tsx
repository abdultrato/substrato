"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CheckCircle2,
  Loader2,
  Save,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { useLanguage } from "@/hooks/useLanguage";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
          <Icon size={13} />
        </span>
        <h2 className="text-xs font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function localizeError(message: string | undefined, fallback: string) {
  const raw = (message || "").trim();
  if (!raw) return fallback;
  if (/^internal server error$/i.test(raw)) return fallback;
  return raw;
}

export default function WardCreatePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function createWard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setFormError(t("Informe o nome da enfermaria.", "Enter the ward name."));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      await apiFetch("/nursing/ward/", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim(),
          active,
        }),
      });
      router.push("/nursing/ward");
      router.refresh();
    } catch (error: any) {
      setFormError(
        localizeError(error?.message, t("Falha ao criar enfermaria.", "Failed to create ward.")),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-foreground">{t("Nova enfermaria", "New ward")}</h1>
              <p className="text-[11px] text-muted-foreground">
                {t("Crie uma ala para organizar camas, internamentos e registos de enfermagem.", "Create a ward to organize beds, admissions, and nursing records.")}
              </p>
            </div>
            <Link
              href="/nursing/ward"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
            >
              <ArrowLeft size={13} />
              {t("Voltar", "Back")}
            </Link>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <SectionCard icon={BedDouble} title={t("Dados da enfermaria", "Ward details")}>
            {formError ? (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
                {formError}
              </div>
            ) : null}

            <form onSubmit={createWard} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("Nome", "Name")}>
                  <input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
                    placeholder={t("Ex.: Enfermaria Cirúrgica", "E.g.: Surgical Ward")}
                    autoFocus
                  />
                </Field>

                <Field label={t("Estado", "Status")}>
                  <label className="inline-flex h-[38px] w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-card px-3 text-sm text-foreground transition hover:border-violet-400">
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 size={14} className={active ? "text-emerald-500" : "text-muted-foreground"} />
                      {active ? t("Ativa", "Active") : t("Inativa", "Inactive")}
                    </span>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(event) => setActive(event.target.checked)}
                      className="h-4 w-4 rounded border-border accent-violet-600"
                    />
                  </label>
                </Field>
              </div>

              <Field label={t("Descrição", "Description")}>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
                  placeholder={t("Área, perfil de pacientes, observações operacionais...", "Area, patient profile, operational notes...")}
                />
              </Field>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
                <Link
                  href="/nursing/ward"
                  className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
                >
                  {t("Cancelar", "Cancel")}
                </Link>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {saving ? t("A guardar...", "Saving...") : t("Guardar", "Save")}
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard icon={Building2} title={t("Contexto", "Context")}>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>
                {t(
                  "Depois de criar a enfermaria, associe camas para que os internamentos possam ser registados no painel.",
                  "After creating the ward, add beds so admissions can be managed on the board.",
                )}
              </p>
              <Link
                href="/nursing/ward-beds/new"
                className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                {t("Criar cama", "Create bed")}
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppLayout>
  );
}
