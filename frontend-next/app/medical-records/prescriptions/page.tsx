"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Loader2, Pill, Plus, Search, StickyNote, X } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import PageSizeInput from "@/components/ui/PageSizeInput";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const UNIT_LABEL: Record<string, string> = {
  MG: "mg", ML: "ml", G: "g", L: "L", KG: "kg",
};

type PrescItem = {
  id: number;
  custom_id?: string;
  record?: number;
  medication?: number;
  medication_name?: string;
  dosage_value?: string | number;
  dosage_unit?: string;
  dose_count?: number;
  interval_hours?: number;
  notes?: string;
};

function ItemCard({ item }: { item: PrescItem }) {
  const dose = item.dosage_value
    ? `${item.dosage_value} ${UNIT_LABEL[item.dosage_unit ?? ""] ?? item.dosage_unit ?? ""}`
    : null;
  const scheme = item.dose_count
    ? `${item.dose_count} dose${item.dose_count > 1 ? "s" : ""}${item.interval_hours ? ` · cada ${item.interval_hours}h` : ""}`
    : null;

  return (
    <Link href={`/medical-records/prescription-items/${item.id}`}
      className={`group relative block ${GLASS} transition hover:border-violet-500/30 hover:shadow-md`}>
      <span className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-violet-500" />
      <div className="px-4 py-3 pl-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <Pill size={13} />
            </span>
            <div>
              <p className="text-xs font-bold text-foreground group-hover:text-violet-500 transition">
                {item.medication_name || `Medicação #${item.medication}`}
              </p>
              <p className="text-[10px] text-muted-foreground">{item.custom_id || `PRTI-${item.id}`}</p>
            </div>
          </div>
          {dose && (
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-semibold text-violet-700 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-300">
              {dose}
            </span>
          )}
        </div>

        <div className="space-y-0.5 text-[11px] text-muted-foreground">
          {scheme && (
            <div className="flex items-center gap-1.5">
              <ClipboardList size={10} className="shrink-0" />
              <span>{scheme}</span>
            </div>
          )}
          {item.record && (
            <div className="flex items-center gap-1.5">
              <ClipboardList size={10} className="shrink-0" />
              <span>Cardex #{item.record}</span>
            </div>
          )}
          {item.notes && (
            <div className="flex items-center gap-1.5">
              <StickyNote size={10} className="shrink-0" />
              <span className="truncate">{item.notes}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function PrescriptionsListInner() {
  const [items, setItems] = useState<PrescItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search) params.set("search", search);
      const data = await apiFetch<{ results: PrescItem[]; count: number } | PrescItem[]>(
        `/medical_records/prescricaoitem/?${params}`
      );
      if (Array.isArray(data)) {
        setItems(data); setTotal(data.length);
      } else {
        setItems(data.results ?? []); setTotal(data.count ?? 0);
      }
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [search, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="w-full space-y-3 px-1">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 pl-5">
            <Link
              href="/medical-records"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20"
            >
              <ArrowLeft size={14} />
              Voltar
            </Link>

            <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Medicação, cardex, código…"
                className="w-full rounded-lg border border-border bg-background/60 py-2 pl-8 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && (
                <button type="button" onClick={() => { setSearch(""); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20">
                <Pill size={17} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Prescrições</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "A carregar…" : `${total} item${total !== 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1" title="Itens por página">
              <PageSizeInput value={pageSize} onChange={(value) => { setPageSize(value); setPage(1); }} ariaLabel="Itens por página" min={1} max={100} />
              <span className="text-[11px] text-muted-foreground">/pág</span>
            </div>
            <Link href="/medical-records/prescription-items/new"
              className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-gradient-to-br from-violet-600 to-purple-600 px-4 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 transition hover:opacity-90">
              <Plus size={15} /> Nova prescrição
            </Link>
          </div>
        </section>

        {/* ── Lista ── */}
        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <section className={`relative overflow-hidden ${GLASS}`}>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <Pill size={22} />
              </span>
              <p className="text-sm font-medium text-foreground">Nenhuma prescrição encontrada</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search ? "Tente ajustar a pesquisa." : "Crie a primeira prescrição clicando em «Nova prescrição»."}
              </p>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {items.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}

        {/* ── Paginação ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-1">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="inline-flex h-8 items-center rounded-md border border-white/20 bg-white/10 px-3 text-xs font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-40">
              ← Anterior
            </button>
            <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="inline-flex h-8 items-center rounded-md border border-white/20 bg-white/10 px-3 text-xs font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-40">
              Seguinte →
            </button>
          </div>
        )}

      </div>
    </AppLayout>
  );
}

export default function PrescriptionsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Carregando…</div>}>
      <PrescriptionsListInner />
    </Suspense>
  );
}
