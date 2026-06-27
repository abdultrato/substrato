"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  Layers,
  Loader2,
  PackageCheck,
  Pencil,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch, apiFetchList } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";
import { routeParamToString } from "@/lib/routeParams";

type ProcedureItem = {
  id: number;
  custom_id?: string | null;
  procedure?: number;
  procedure_code?: string | null;
  patient_name?: string | null;
  ward_name?: string | null;
  catalog_name?: string | null;
  catalog_code?: string | null;
  description?: string | null;
  quantity?: number | null;
  position?: number | null;
  performed?: boolean;
  execution_status?: string | null;
  execution_status_display?: string | null;
  billed?: boolean;
  billed_at?: string | null;
  executed_at?: string | null;
  completed_at?: string | null;
  observation?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProcedureMaterial = {
  id: number;
  custom_id?: string | null;
  product_name?: string | null;
  product_type?: string | null;
  lot_number?: string | null;
  quantity?: number | null;
  observation?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Não registado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" });
}

function statusTone(status?: string | null) {
  switch (String(status || "").toUpperCase()) {
    case "CON":
      return { line: "bg-emerald-400", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-950/45 dark:text-emerald-300" };
    case "EXE":
      return { line: "bg-sky-400", badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-950/45 dark:text-sky-300" };
    case "NCO":
      return { line: "bg-rose-400", badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/30 dark:bg-rose-950/45 dark:text-rose-300" };
    default:
      return { line: "bg-amber-400", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-950/45 dark:text-amber-300" };
  }
}

const GLASS = "rounded-2xl border border-white/30 bg-gradient-to-br from-white/30 via-white/10 to-sky-100/20 shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:from-white/10 dark:via-white/5 dark:to-sky-950/10";

export default function ProcedureItemsDetailPage() {
  const params = useParams();
  const id = routeParamToString((params as { id?: string | string[] })?.id);
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [item, setItem] = useState<ProcedureItem | null>(null);
  const [materials, setMaterials] = useState<ProcedureMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [itemResponse, materialResponse] = await Promise.all([
        apiFetch<ProcedureItem>(`/nursing/procedure_item/${id}/`, { clientCache: safeRefreshToken === 0 }),
        apiFetchList<ProcedureMaterial>("/nursing/procedure_material/", {
          page: 1,
          pageSize: 200,
          query: { procedure_item: Number(id) },
          clientCache: safeRefreshToken === 0,
        }),
      ]);
      setItem(itemResponse);
      setMaterials(materialResponse.items || []);
    } catch (reason: any) {
      setError(reason?.message || "Não foi possível carregar o item do procedimento.");
      setItem(null);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, [id, safeRefreshToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}><div className="flex h-56 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> A carregar item…</div></AppLayout>;
  }

  if (!item) {
    return <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}><div className="mx-auto max-w-lg rounded-xl border border-red-200/60 bg-red-50/50 p-4 text-sm text-red-700 backdrop-blur-xl dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-300">{error || "Item não encontrado."}</div></AppLayout>;
  }

  const tone = statusTone(item.execution_status);
  const title = item.catalog_name || item.description || "Item de procedimento";
  const code = item.catalog_code || item.custom_id || `ITEM-${item.id}`;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.ENFERMAGEM]}>
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <header className={`relative overflow-hidden ${GLASS} p-4`}>
          <span className={`absolute inset-y-0 left-0 w-1 ${tone.line}`} />
          <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/25"><ClipboardCheck size={18} /></span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{code}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${tone.badge}`}>{item.execution_status_display || item.execution_status || "Pendente"}</span>
                </div>
                <h1 className="mt-0.5 truncate text-xl font-bold text-foreground">{title}</h1>
                <p className="truncate text-xs text-muted-foreground">{item.patient_name || "Paciente não identificado"}{item.ward_name ? ` · ${item.ward_name}` : ""}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Link href="/nursing/procedure-items" className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/40 bg-white/20 px-2.5 text-[11px] font-medium text-foreground backdrop-blur-xl transition hover:bg-white/40 dark:border-white/10 dark:bg-white/5"><ArrowLeft size={11} /> Voltar</Link>
              <Link href={`/nursing/procedure-items/${item.id}/edit`} className="inline-flex h-8 items-center gap-1 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 px-2.5 text-[11px] font-semibold text-white shadow-md shadow-sky-500/20"><Pencil size={11} /> Editar</Link>
            </div>
          </div>
        </header>

        <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <article className={`${GLASS} p-3`}><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/45 dark:text-violet-300"><User size={14} /></span><div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Procedimento</p><p className="truncate text-xs font-semibold text-foreground">{item.procedure_code || `#${item.procedure || "—"}`}</p></div></div></article>
          <article className={`${GLASS} p-3`}><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/45 dark:text-sky-300"><PackageCheck size={14} /></span><div><p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Quantidade</p><p className="text-xs font-semibold text-foreground">{Number(item.quantity || 0).toLocaleString("pt-PT")} unidade(s)</p></div></div></article>
          <article className={`${GLASS} p-3`}><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300"><CheckCircle2 size={14} /></span><div><p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Realização</p><p className="text-xs font-semibold text-foreground">{item.performed ? "Realizado" : "Por realizar"}</p></div></div></article>
          <article className={`${GLASS} p-3`}><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300"><Layers size={14} /></span><div><p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Materiais</p><p className="text-xs font-semibold text-foreground">{materials.length} associado(s)</p></div></div></article>
        </section>

        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <div className="grid gap-3">
            <section className={`${GLASS} p-4`}>
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/45 dark:text-sky-300"><FileText size={14} /></span><div><h2 className="text-sm font-semibold text-foreground">Descrição clínica</h2><p className="text-[10px] text-muted-foreground">Definição e observações do item</p></div></div>
              <div className="mt-3 grid gap-2">
                <div className="rounded-xl border border-white/30 bg-white/10 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/5"><p className="text-[9px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Descrição</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground">{item.description || item.catalog_name || "Sem descrição registada."}</p></div>
                {item.observation ? <div className="rounded-xl border border-violet-200/50 bg-violet-50/30 p-3 backdrop-blur-xl dark:border-violet-800/30 dark:bg-violet-950/15"><p className="text-[9px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">Observação</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground">{item.observation}</p></div> : null}
              </div>
            </section>

            <section className={`${GLASS} p-4`}>
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300"><Layers size={14} /></span><div><h2 className="text-sm font-semibold text-foreground">Materiais utilizados</h2><p className="text-[10px] text-muted-foreground">Produtos gerados a partir do catálogo</p></div></div><span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-950/45 dark:text-amber-300">{materials.length}</span></div>
              {materials.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{materials.map((material) => <article key={material.id} className="rounded-xl border border-white/30 bg-white/20 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-white/5"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate text-xs font-semibold text-foreground">{material.product_name || `Material ${material.custom_id || material.id}`}</h3><p className="text-[9px] uppercase tracking-wide text-muted-foreground">{material.product_type || "Produto"}{material.lot_number ? ` · Lote ${material.lot_number}` : ""}</p></div><span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Qtd. {Number(material.quantity || 0).toLocaleString("pt-PT")}</span></div>{material.observation ? <p className="mt-2 line-clamp-2 text-[10px] text-muted-foreground">{material.observation}</p> : null}</article>)}</div> : <p className="mt-3 rounded-xl border border-dashed border-white/40 bg-white/10 py-7 text-center text-xs text-muted-foreground dark:border-white/10">Nenhum material associado.</p>}
            </section>
          </div>

          <aside className="grid gap-3">
            <section className={`${GLASS} p-4`}><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Clock3 size={14} /></span><h2 className="text-sm font-semibold text-foreground">Execução</h2></div><dl className="mt-3 grid gap-2 text-xs"><div className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-white/5"><dt className="text-[9px] uppercase tracking-wide text-muted-foreground">Estado</dt><dd className="mt-0.5 font-semibold text-foreground">{item.execution_status_display || item.execution_status || "Pendente"}</dd></div><div className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-white/5"><dt className="text-[9px] uppercase tracking-wide text-muted-foreground">Faturação</dt><dd className="mt-0.5 font-semibold text-foreground">{item.billed ? "Faturado" : "Não faturado"}</dd></div></dl></section>
            <section className={`${GLASS} p-4`}><p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Última atualização</p><p className="mt-1 text-xs font-semibold text-foreground">{formatDate(item.updated_at)}</p></section>
          </aside>
        </div>

        <section className={`${GLASS} p-4`}>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/45 dark:text-violet-300"><CalendarClock size={14} /></span>
            <div><h2 className="text-sm font-semibold text-foreground">Linha do tempo</h2><p className="text-[10px] text-muted-foreground">Sequência operacional do item</p></div>
          </div>
          <div className="mt-3 overflow-x-auto pb-1">
            <ol className="grid min-w-[680px] grid-cols-4">
              {[["Criado", item.created_at], ["Executado", item.executed_at], ["Concluído", item.completed_at], ["Faturado", item.billed_at]].map(([label, date], index, steps) => (
                <li key={label || ""} className="relative min-w-0 px-2 first:pl-0 last:pr-0">
                  <div className="flex items-center">
                    <span className={`relative z-10 h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-sm dark:border-slate-900 ${date ? "bg-violet-500" : "bg-slate-300 dark:bg-slate-700"}`} />
                    {index < steps.length - 1 ? <span className={`h-px flex-1 ${date ? "bg-violet-300 dark:bg-violet-700/60" : "bg-slate-200 dark:bg-slate-700/50"}`} /> : null}
                  </div>
                  <div className="mt-2 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground">{label}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{formatDate(date)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
