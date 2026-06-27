"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, Check, Loader2, PackageCheck, RefreshCw, Save } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import ProcedureCatalogProducts from "@/components/nursing/ProcedureCatalogProducts";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

type ProcedureCatalog = {
  id: number;
  custom_id?: string | null;
  name: string;
  procedure_code?: string | null;
  description?: string | null;
  vat_percentage?: string | number | null;
  applies_vat_by_default?: boolean;
  estimated_duration_minutes?: number | null;
  active?: boolean;
  ward?: number | null;
};

export default function ProcedureCatalogsEditPage() {
  const params = useParams();
  const id = routeParamToString((params as { id?: string | string[] })?.id);
  const [catalog, setCatalog] = useState<ProcedureCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setCatalog(await apiFetch<ProcedureCatalog>(`/nursing/procedure_catalog/${id}/`, { clientCache: false }));
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível carregar o catálogo.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function updateCatalog<K extends keyof ProcedureCatalog>(field: K, value: ProcedureCatalog[K]) {
    setCatalog((current) => current ? { ...current, [field]: value } : current);
    setSaved(false);
  }

  async function saveCatalog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!catalog) return;
    if (!catalog.name.trim()) {
      setError("Informe o nome do procedimento.");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await apiFetch<ProcedureCatalog>(`/nursing/procedure_catalog/${catalog.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: catalog.name.trim(),
          procedure_code: catalog.procedure_code?.trim() || "",
          description: catalog.description?.trim() || "",
          estimated_duration_minutes: Number(catalog.estimated_duration_minutes || 0),
          vat_percentage: Number(catalog.vat_percentage || 0),
          applies_vat_by_default: catalog.applies_vat_by_default !== false,
          active: catalog.active !== false,
        }),
      });
      setCatalog(updated);
      setSaved(true);
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível guardar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <header className="relative overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-br from-violet-100/30 via-white/10 to-sky-100/20 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:from-violet-950/20 dark:via-white/5 dark:to-sky-950/10">
          <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-600/10" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25">
                <BookOpen size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">Configuração clínica</p>
                <h1 className="text-xl font-bold text-foreground">Editar catálogo de procedimento</h1>
                <p className="text-xs text-muted-foreground">Atualize a descrição, parâmetros e produtos necessários.</p>
              </div>
            </div>
            <Link
              href={id ? `/nursing/procedure-catalogs/${id}` : "/nursing/procedure-catalogs"}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 text-xs font-medium text-foreground shadow-sm backdrop-blur-xl transition hover:bg-white/20 dark:border-white/10 dark:bg-white/5"
            >
              <ArrowLeft size={13} /> Voltar aos detalhes
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/45 text-sm text-muted-foreground shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
            <Loader2 size={16} className="animate-spin" /> A carregar formulário…
          </div>
        ) : error && !catalog ? (
          <div className="rounded-2xl border border-red-200/70 bg-red-50/60 p-5 backdrop-blur-xl dark:border-red-800/40 dark:bg-red-950/20">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">Falha ao carregar o catálogo</p>
            <p className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>
            <button type="button" onClick={load} className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-white/70 px-3 text-xs font-semibold text-red-700 backdrop-blur">
              <RefreshCw size={12} /> Tentar novamente
            </button>
          </div>
        ) : catalog ? (
          <>
            <section className="rounded-2xl border border-white/30 bg-gradient-to-br from-white/20 via-white/10 to-violet-100/10 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:from-white/10 dark:via-white/5 dark:to-violet-950/10">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/35 pb-3 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                  <PackageCheck size={15} />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Dados do catálogo</h2>
                    <p className="text-[10px] text-muted-foreground">Informação essencial e regras padrão</p>
                  </div>
                </div>
                {saved ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"><Check size={12} /> Alterações guardadas</span> : null}
              </div>
              <form onSubmit={saveCatalog} className="space-y-3">
                {error ? <p className="rounded-lg border border-red-200/70 bg-red-50/60 px-3 py-2 text-xs text-red-700 backdrop-blur dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-300">{error}</p> : null}
                <div className="flex flex-nowrap items-start gap-3">
                  <label className="min-w-0 flex-[4_1_0%] space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Nome do procedimento</span>
                    <input required value={catalog.name} onChange={(event) => updateCatalog("name", event.target.value)} className="h-9 w-full rounded-lg border border-white/30 bg-white/10 px-3 text-xs text-foreground outline-none backdrop-blur-xl transition focus:border-violet-400 focus:bg-white/20 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/5" />
                  </label>
                  <label className="min-w-[100px] flex-[1_1_0%] space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Código operacional</span>
                    <input value={catalog.procedure_code || ""} onChange={(event) => updateCatalog("procedure_code", event.target.value)} placeholder="Ex.: PROC-001" className="h-9 w-full rounded-lg border border-white/30 bg-white/10 px-3 font-mono text-xs text-foreground outline-none backdrop-blur-xl transition focus:border-violet-400 focus:bg-white/20 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/5" />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Descrição clínica</span>
                  <textarea value={catalog.description || ""} onChange={(event) => updateCatalog("description", event.target.value)} rows={3} placeholder="Descreva a finalidade e orientações do procedimento…" className="w-full resize-y rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-xs leading-5 text-foreground outline-none backdrop-blur-xl transition focus:border-violet-400 focus:bg-white/20 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/5" />
                </label>

                <div className="overflow-x-auto pb-1">
                  <div className="flex min-w-[520px] flex-nowrap items-end gap-2">
                  <label className="w-[125px] shrink-0 space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Duração (min.)</span>
                    <input type="number" min="0" value={catalog.estimated_duration_minutes ?? 0} onChange={(event) => updateCatalog("estimated_duration_minutes", Number(event.target.value))} className="h-9 w-full rounded-lg border border-white/30 bg-white/10 px-3 text-xs text-foreground outline-none backdrop-blur-xl focus:border-violet-400 dark:border-white/10 dark:bg-white/5" />
                  </label>
                  <label className="w-[105px] shrink-0 space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">IVA (%)</span>
                    <input type="number" min="0" max="100" step="0.01" value={catalog.vat_percentage ?? 0} onChange={(event) => updateCatalog("vat_percentage", event.target.value)} disabled={catalog.applies_vat_by_default === false} className="h-9 w-full rounded-lg border border-white/30 bg-white/10 px-3 text-xs text-foreground outline-none backdrop-blur-xl focus:border-violet-400 disabled:opacity-40 dark:border-white/10 dark:bg-white/5" />
                  </label>
                  <label className="flex h-[57px] min-w-[150px] flex-1 items-end">
                    <span className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 text-xs text-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                      <input type="checkbox" checked={catalog.applies_vat_by_default !== false} onChange={(event) => updateCatalog("applies_vat_by_default", event.target.checked)} className="h-3.5 w-3.5 accent-violet-600" /> Aplicar IVA por padrão
                    </span>
                  </label>
                  <label className="flex h-[57px] min-w-[130px] flex-[0.85] items-end">
                    <span className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-3 text-xs text-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                      <input type="checkbox" checked={catalog.active !== false} onChange={(event) => updateCatalog("active", event.target.checked)} className="h-3.5 w-3.5 accent-emerald-600" /> Catálogo ativo
                    </span>
                  </label>
                  </div>
                </div>

                <div className="flex justify-end border-t border-white/35 pt-3 dark:border-white/10">
                  <button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-violet-500/20 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar alterações
                  </button>
                </div>
              </form>
            </section>

            <ProcedureCatalogProducts catalogId={catalog.id} editable />
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
