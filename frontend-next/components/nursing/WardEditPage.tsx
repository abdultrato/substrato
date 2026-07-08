"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  BedDouble,
  CheckCircle2,
  Loader2,
  Plus,
  Save,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { useLanguage } from "@/hooks/useLanguage";
import { apiFetch, apiFetchList } from "@/lib/api";
import { routeParamToString } from "@/lib/routeParams";
import { GROUPS } from "@/lib/rbac";

type WardRecord = {
  id: number;
  custom_id?: string | null;
  name?: string | null;
  description?: string | null;
  active?: boolean | null;
};

type BedRow = {
  id: number;
  number?: string | null;
  active?: boolean | null;
  ward?: number;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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

export default function WardEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = routeParamToString((params as any)?.id);
  const { t } = useLanguage();

  const [ward, setWard] = useState<WardRecord | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [beds, setBeds] = useState<BedRow[]>([]);
  const [newBedNumber, setNewBedNumber] = useState("");
  const [addingBed, setAddingBed] = useState(false);
  const [bedError, setBedError] = useState<string | null>(null);

  const loadBeds = async (wardId: number) => {
    const res = await apiFetchList<BedRow>("/nursing/ward_bed/", {
      page: 1,
      pageSize: 200,
      clientPaginate: true,
      clientCache: false,
    });
    setBeds((res.items || []).filter((bed) => bed.ward === wardId));
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<WardRecord>(`/nursing/ward/${id}/`, { clientCache: false });
        if (!mounted) return;
        setWard(data);
        setName(data.name || "");
        setDescription(data.description || "");
        setActive(data.active ?? true);
        loadBeds(data.id).catch(() => {});
      } catch (e: any) {
        if (mounted) setError(e?.message || t("Erro ao carregar a enfermaria.", "Failed to load the ward."));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id, t]);

  async function saveWard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("Informe o nome da enfermaria.", "Enter the ward name."));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/nursing/ward/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim(),
          active,
        }),
      });
      router.push(`/nursing/ward/${id}`);
      router.refresh();
    } catch (e: any) {
      setError(localizeError(e?.message, t("Falha ao guardar a enfermaria.", "Failed to save the ward.")));
      setSaving(false);
    }
  }

  async function addBed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ward) return;
    const number = newBedNumber.trim();
    if (!number) {
      setBedError(t("Informe o número da cama.", "Enter the bed number."));
      return;
    }
    setAddingBed(true);
    setBedError(null);
    try {
      await apiFetch("/nursing/ward_bed/", {
        method: "POST",
        body: JSON.stringify({ ward: ward.id, number, active: true }),
      });
      setNewBedNumber("");
      await loadBeds(ward.id);
    } catch (e: any) {
      setBedError(localizeError(e?.message, t("Falha ao adicionar a cama.", "Failed to add the bed.")));
    } finally {
      setAddingBed(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-white/30 bg-white/40 px-3 py-2 text-sm text-foreground shadow-sm backdrop-blur-sm outline-none transition placeholder:text-muted-foreground hover:border-emerald-400/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 dark:border-white/10 dark:bg-white/10";

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-[95%] space-y-2 text-[0.9em]">
        {/* Header */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-xl border border-white/20 bg-gradient-to-r from-emerald-500/15 via-white/30 to-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:from-emerald-500/10 dark:via-white/5 dark:to-white/5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <BedDouble size={22} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold text-foreground">
                {t("Editar enfermaria", "Edit ward")}
              </h1>
              <p className="truncate text-[11px] text-muted-foreground">
                {ward?.custom_id || "—"}
                {ward?.name ? ` · ${ward.name}` : ""}
              </p>
            </div>
          </div>
          <Link
            href={id ? `/nursing/ward/${id}` : "/nursing/ward"}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/40 px-3 text-xs font-medium text-foreground-2 shadow-sm backdrop-blur-sm transition hover:bg-white/60 hover:text-foreground dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
          >
            <ArrowLeft size={13} />
            {t("Voltar", "Back")}
          </Link>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/20 dark:text-rose-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-1.5 py-6 text-xs text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> {t("Carregando…", "Loading…")}
          </div>
        ) : ward ? (
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <form
            onSubmit={saveWard}
            className="space-y-3 rounded-xl border border-white/25 bg-white/35 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("Nome", "Name")}>
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (error) setError(null);
                  }}
                  className={inputClass}
                  placeholder={t("Ex.: Enfermaria Cirúrgica", "E.g.: Surgical Ward")}
                  autoFocus
                />
              </Field>

              <Field label={t("Estado", "Status")}>
                <label className="inline-flex h-[38px] w-full cursor-pointer items-center justify-between rounded-lg border border-white/30 bg-white/40 px-3 text-sm text-foreground shadow-sm backdrop-blur-sm transition hover:border-emerald-400/60 dark:border-white/10 dark:bg-white/10">
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 size={14} className={active ? "text-emerald-500" : "text-muted-foreground"} />
                    {active ? t("Ativa", "Active") : t("Inativa", "Inactive")}
                  </span>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(event) => setActive(event.target.checked)}
                    className="h-4 w-4 rounded border-border accent-emerald-600"
                  />
                </label>
              </Field>
            </div>

            <Field label={t("Descrição", "Description")}>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                className={inputClass}
                placeholder={t("Área, perfil de pacientes, observações operacionais...", "Area, patient profile, operational notes...")}
              />
            </Field>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/40 pt-2.5">
              <Link
                href={`/nursing/ward/${id}`}
                className="inline-flex h-8 items-center rounded-lg border border-white/30 bg-white/40 px-3 text-xs font-medium text-foreground-2 shadow-sm backdrop-blur-sm transition hover:bg-white/60 hover:text-foreground dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
              >
                {t("Cancelar", "Cancel")}
              </Link>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? t("A guardar...", "Saving...") : t("Guardar", "Save")}
              </button>
            </div>
          </form>

          {/* Cartão lateral: camas da enfermaria */}
          <section className="flex flex-col rounded-xl border border-white/25 bg-white/35 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <BedDouble size={13} />
              </span>
              <h2 className="text-xs font-semibold text-foreground">{t("Camas", "Beds")}</h2>
              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                {beds.length}
              </span>
            </div>

            {bedError ? (
              <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[10px] text-rose-800 dark:border-rose-800/40 dark:bg-rose-900/20 dark:text-rose-300">
                {bedError}
              </div>
            ) : null}

            <form onSubmit={addBed} className="mb-2 flex gap-1.5">
              <input
                value={newBedNumber}
                onChange={(event) => {
                  setNewBedNumber(event.target.value);
                  if (bedError) setBedError(null);
                }}
                placeholder={t("Nº da cama (ex.: C2)", "Bed no. (e.g.: C2)")}
                className="min-w-0 flex-1 rounded-lg border border-white/30 bg-white/40 px-2.5 py-1.5 text-xs text-foreground shadow-sm backdrop-blur-sm outline-none transition placeholder:text-muted-foreground hover:border-emerald-400/60 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 dark:border-white/10 dark:bg-white/10"
              />
              <button
                type="submit"
                disabled={addingBed || !newBedNumber.trim()}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60"
              >
                {addingBed ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                {t("Adicionar", "Add")}
              </button>
            </form>

            {beds.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-2 py-3 text-center text-[10px] text-muted-foreground">
                {t("Sem camas cadastradas.", "No beds registered.")}
              </div>
            ) : (
              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
                {beds.map((bed) => (
                  <div
                    key={bed.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/30 bg-white/40 px-2 py-1.5 dark:border-white/10 dark:bg-white/5"
                  >
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-foreground">
                      <BedDouble size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="truncate">{t("Cama", "Bed")} {bed.number || bed.id}</span>
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${(bed.active ?? false)
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400"}`}
                    >
                      {(bed.active ?? false) ? t("Ativa", "Active") : t("Inativa", "Inactive")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            {t("Enfermaria não encontrada.", "Ward not found.")}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
