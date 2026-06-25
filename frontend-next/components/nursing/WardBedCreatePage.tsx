"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  CheckCircle2,
  Loader2,
  Save,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { useLanguage } from "@/hooks/useLanguage";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

type WardOptionRow = {
  id: number;
  custom_id?: string | null;
  name?: string | null;
  active?: boolean | null;
};

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
    <div className="space-y-1">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function localizeError(message: string | undefined, fallback: string) {
  const raw = (message || "").trim();
  if (!raw) return fallback;
  if (/^internal server error$/i.test(raw)) return fallback;
  return raw;
}

export default function WardBedCreatePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [wards, setWards] = useState<WardOptionRow[]>([]);
  const [loadingWards, setLoadingWards] = useState(true);
  const [wardId, setWardId] = useState("");
  const [number, setNumber] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadWards() {
      try {
        setLoadingWards(true);
        const response = await apiFetchList<WardOptionRow>("/nursing/ward/", {
          page: 1,
          pageSize: 200,
          query: { active: true },
          clientCache: false,
        });
        if (!mounted) return;
        setWards(response.items || []);
      } catch (error: any) {
        if (!mounted) return;
        setFormError(
          localizeError(error?.message, t("Falha ao carregar enfermarias.", "Failed to load wards.")),
        );
      } finally {
        if (mounted) setLoadingWards(false);
      }
    }

    loadWards();
    return () => {
      mounted = false;
    };
  }, [t]);

  const wardOptions = useMemo(
    () =>
      wards.map((ward) => ({
        value: String(ward.id),
        label: ward.name || ward.custom_id || `${t("Enfermaria", "Ward")} ${ward.id}`,
        hint: ward.custom_id || undefined,
      })),
    [t, wards],
  );

  async function createBed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedNumber = number.trim();

    if (!wardId) {
      setFormError(t("Selecione a enfermaria.", "Select the ward."));
      return;
    }
    if (!trimmedNumber) {
      setFormError(t("Informe o número da cama.", "Enter the bed number."));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      await apiFetch("/nursing/ward_bed/", {
        method: "POST",
        body: JSON.stringify({
          ward: Number(wardId),
          number: trimmedNumber,
          active,
        }),
      });
      router.push("/nursing/ward-beds");
      router.refresh();
    } catch (error: any) {
      setFormError(
        localizeError(error?.message, t("Falha ao criar cama.", "Failed to create bed.")),
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
              <h1 className="text-lg font-bold text-foreground">{t("Nova cama", "New bed")}</h1>
              <p className="text-[11px] text-muted-foreground">
                {t("Registe uma cama e associe-a a uma enfermaria ativa.", "Register a bed and assign it to an active ward.")}
              </p>
            </div>
            <Link
              href="/nursing/ward-beds"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
            >
              <ArrowLeft size={13} />
              {t("Voltar", "Back")}
            </Link>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <SectionCard icon={BedDouble} title={t("Dados da cama", "Bed details")}>
            {formError ? (
              <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
                {formError}
              </div>
            ) : null}

            <form onSubmit={createBed} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1 sm:col-span-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {t("Enfermaria", "Ward")}
                  </span>
                  <SearchableSelect
                    value={wardId}
                    onChange={(value) => {
                      setWardId(value);
                      if (formError) setFormError(null);
                    }}
                    options={wardOptions}
                    disabled={loadingWards}
                    placeholder={loadingWards ? t("A carregar...", "Loading...") : t("Selecione", "Select")}
                    searchPlaceholder={t("Pesquisar enfermaria...", "Search ward...")}
                    emptyMessage={t("Nenhuma enfermaria ativa.", "No active ward.")}
                  />
                </div>

                <Field label={t("Número da cama", "Bed number")}>
                  <input
                    value={number}
                    onChange={(event) => {
                      setNumber(event.target.value);
                      if (formError) setFormError(null);
                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
                    placeholder={t("Ex.: A1", "E.g.: A1")}
                    autoFocus
                  />
                </Field>
              </div>

              <Field label={t("Estado", "Status")}>
                <label className="inline-flex h-[38px] w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-card px-3 text-sm text-foreground transition hover:border-violet-400 sm:max-w-xs">
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 size={14} className={active ? "text-emerald-500" : "text-muted-foreground"} />
                    {active ? t("Disponível", "Available") : t("Bloqueada", "Blocked")}
                  </span>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(event) => setActive(event.target.checked)}
                    className="h-4 w-4 rounded border-border accent-violet-600"
                  />
                </label>
              </Field>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-3">
                <Link
                  href="/nursing/ward-beds"
                  className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
                >
                  {t("Cancelar", "Cancel")}
                </Link>
                <button
                  type="submit"
                  disabled={saving || loadingWards || !wardId || !number.trim()}
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
                  "Cada cama pertence a uma enfermaria. Camas bloqueadas não devem ser usadas para novos internamentos.",
                  "Each bed belongs to a ward. Blocked beds should not be used for new admissions.",
                )}
              </p>
              <Link
                href="/nursing/ward/new"
                className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                {t("Criar enfermaria", "Create ward")}
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppLayout>
  );
}
