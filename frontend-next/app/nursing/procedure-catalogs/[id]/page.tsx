"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarClock,
  Clock3,
  FileText,
  Loader2,
  Pencil,
  Receipt,
  RefreshCw,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import ProcedureCatalogProducts from "@/components/nursing/ProcedureCatalogProducts";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
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
  created_at?: string | null;
  updated_at?: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "Não disponível";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" });
}

function formatVat(value: ProcedureCatalog["vat_percentage"]) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Não definido";
  return `${amount.toLocaleString("pt-PT", { maximumFractionDigits: 2 })}%`;
}

export default function ProcedureCatalogsDetailPage() {
  const params = useParams();
  const id = routeParamToString((params as { id?: string | string[] })?.id);
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [catalog, setCatalog] = useState<ProcedureCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<ProcedureCatalog>(`/nursing/procedure_catalog/${id}/`, {
        clientCache: safeRefreshToken === 0,
      });
      setCatalog(response);
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível carregar o catálogo.");
      setCatalog(null);
    } finally {
      setLoading(false);
    }
  }, [id, safeRefreshToken]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/nursing/procedure-catalogs"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/20 dark:border-white/10 dark:bg-white/5"
          >
            <ArrowLeft size={13} /> Catálogos
          </Link>
          {catalog ? (
            <Link
              href={`/nursing/procedure-catalogs/${catalog.id}/edit`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition hover:from-violet-700 hover:to-indigo-700"
            >
              <Pencil size={13} /> Editar catálogo
            </Link>
          ) : null}
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 text-sm text-muted-foreground shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-white/5">
            <Loader2 size={17} className="animate-spin" /> A carregar detalhes…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-800/40 dark:bg-red-950/20">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">Falha ao carregar o catálogo</p>
            <p className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
            >
              <RefreshCw size={13} /> Tentar novamente
            </button>
          </div>
        ) : catalog ? (
          <>
            <header className="relative overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-br from-violet-100/30 via-white/10 to-sky-100/20 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:from-violet-950/20 dark:via-white/5 dark:to-sky-950/10">
              <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-violet-300/20 blur-2xl dark:bg-violet-600/10" />
              <div className="relative flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
                  <BookOpen size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-violet-200 bg-white/70 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300">
                      {catalog.procedure_code || catalog.custom_id || `CAT-${catalog.id}`}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${catalog.active === false ? "bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"}`}>
                      {catalog.active === false ? "Inativo" : "Ativo"}
                    </span>
                  </div>
                  <h1 className="mt-2 text-xl font-bold leading-tight text-foreground sm:text-2xl">{catalog.name}</h1>
                  <p className="mt-1 text-xs text-muted-foreground">Definição clínica e operacional do procedimento</p>
                </div>
              </div>
            </header>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
              <section className="rounded-2xl border border-white/30 bg-gradient-to-br from-white/20 via-white/10 to-sky-100/10 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:from-white/10 dark:via-white/5 dark:to-sky-950/10">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                    <FileText size={15} />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Descrição do procedimento</h2>
                    <p className="text-[10px] text-muted-foreground">Orientação clínica e finalidade</p>
                  </div>
                </div>
                <div className="mt-4 min-h-28 rounded-xl border border-white/30 bg-white/10 p-4 shadow-inner backdrop-blur-xl dark:border-white/10 dark:bg-black/10">
                  <p className={`whitespace-pre-wrap text-sm leading-6 ${catalog.description?.trim() ? "text-foreground" : "italic text-muted-foreground"}`}>
                    {catalog.description?.trim() || "Ainda não foi registada uma descrição para este procedimento."}
                  </p>
                </div>
              </section>

              <aside className="space-y-3">
                <section className="rounded-2xl border border-white/30 bg-gradient-to-br from-white/20 via-white/10 to-violet-100/10 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:from-white/10 dark:via-white/5 dark:to-violet-950/10">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parâmetros operacionais</h2>
                  <dl className="mt-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                        <Clock3 size={15} />
                      </span>
                      <div>
                        <dt className="text-[10px] text-muted-foreground">Duração estimada</dt>
                        <dd className="text-sm font-semibold text-foreground">
                          {catalog.estimated_duration_minutes ? `${catalog.estimated_duration_minutes} minutos` : "Não definida"}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <Receipt size={15} />
                      </span>
                      <div>
                        <dt className="text-[10px] text-muted-foreground">Tributação padrão</dt>
                        <dd className="text-sm font-semibold text-foreground">
                          {catalog.applies_vat_by_default === false ? "Isento de IVA" : `${formatVat(catalog.vat_percentage)} de IVA`}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                        {catalog.active === false ? <Activity size={15} /> : <BadgeCheck size={15} />}
                      </span>
                      <div>
                        <dt className="text-[10px] text-muted-foreground">Disponibilidade</dt>
                        <dd className="text-sm font-semibold text-foreground">
                          {catalog.active === false ? "Indisponível para seleção" : "Disponível para utilização"}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </section>
              </aside>
            </div>

            <ProcedureCatalogProducts catalogId={catalog.id} />

            <section className="grid gap-2 rounded-xl border border-white/30 bg-white/10 p-3 shadow-lg shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-white/5 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 rounded-lg bg-white/10 px-3 py-2 backdrop-blur-xl dark:bg-white/5">
                <CalendarClock size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Criado em</p>
                  <p className="text-xs font-medium text-foreground">{formatDateTime(catalog.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg bg-white/10 px-3 py-2 backdrop-blur-xl dark:bg-white/5">
                <RefreshCw size={14} className="text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Última atualização</p>
                  <p className="text-xs font-medium text-foreground">{formatDateTime(catalog.updated_at)}</p>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
