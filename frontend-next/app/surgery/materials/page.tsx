"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Loader2,
  PackageSearch,
  Scissors,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import PageSizeInput from "@/components/ui/PageSizeInput";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

type ProcedureMaterial = {
  id: number;
  name: string;
  type?: string;
  sale_price?: string;
  qty?: number;
};

type ProcedureRow = Record<string, any> & {
  id: number;
  name?: string;
  custom_id?: string;
  description?: string;
  active?: boolean;
  default_materials_detail?: ProcedureMaterial[];
};

function fmtMoney(value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("pt-PT", { style: "currency", currency: "MZN" });
}

function firstText(...values: any[]): string {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim()) return String(value);
  }
  return "—";
}

function Metric({
  label,
  value,
  hint,
  accent,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent: string;
  icon: React.ElementType;
}) {
  return (
    <section className={`relative overflow-hidden ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className="flex items-center gap-3 px-4 py-3 pl-5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent} text-white shadow-sm`}>
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <p className="font-display text-xl font-bold leading-tight text-foreground tabular-nums">{value}</p>
          {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
    </section>
  );
}

function ProcedureCard({ row }: { row: ProcedureRow }) {
  const materials = Array.isArray(row.default_materials_detail) ? row.default_materials_detail : [];
  const active = row.active !== false;

  return (
    <Link
      href={`/surgery/surgical-procedures/${row.id}`}
      className="group relative block overflow-hidden rounded-xl border border-white/20 bg-white/28 p-3 pl-4 shadow-sm backdrop-blur-sm transition hover:border-violet-300/50 hover:bg-white/36 hover:shadow-md dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
    >
      <span className={`absolute left-0 top-0 h-full w-1 ${active ? "bg-violet-500" : "bg-slate-400"}`} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{firstText(row.name, row.custom_id, row.id)}</p>
          <p className="text-[11px] text-muted-foreground">{firstText(row.custom_id, `#${row.id}`)}</p>
        </div>
        <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
          {active ? "Activo" : "Inactivo"}
        </span>
      </div>

      {row.description ? (
        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{row.description}</p>
      ) : null}

      <div className="mt-3 space-y-2 rounded-lg border border-white/20 bg-white/25 p-2.5 dark:bg-white/[0.04]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Materiais</span>
          <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
            {materials.length}
          </span>
        </div>

        {materials.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Nenhum material associado. Clique para adicionar materiais e quantidades.</p>
        ) : (
          <div className="space-y-1.5">
            {materials.slice(0, 5).map((material) => (
              <div key={material.id} className="flex items-center justify-between gap-2 rounded-md border border-white/20 bg-white/30 px-2 py-1 dark:bg-white/[0.03]">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-foreground">{material.name}</p>
                  <p className="text-[10px] text-muted-foreground">{firstText(material.type, "Material")}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-foreground">x{material.qty || 1}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtMoney(material.sale_price)}</p>
                </div>
              </div>
            ))}
            {materials.length > 5 ? (
              <p className="text-[10px] text-muted-foreground">+ {materials.length - 5} material(is)</p>
            ) : null}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function SurgeryMaterialsListPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [procedures, setProcedures] = useState<ProcedureRow[]>([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setErro(null);
        const res = await apiFetch<any>("/surgery/surgical_procedure/?limit=200&ordering=name", { clientCache: safeRefreshToken === 0 });
        if (!mounted) return;
        const items = res?.results ?? res;
        setProcedures(Array.isArray(items) ? items : []);
      } catch (e: any) {
        if (!mounted) return;
        setErro(e?.message || "Falha ao carregar procedimentos cirúrgicos.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [safeRefreshToken]);

  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return procedures;
    return procedures.filter((row) => {
      const materials = Array.isArray(row.default_materials_detail) ? row.default_materials_detail : [];
      const haystack = [
        row.name,
        row.custom_id,
        row.description,
        ...materials.flatMap((material) => [material.name, material.type, material.qty]),
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [procedures, q]);

  const visible = useMemo(() => filtered.slice(0, pageSize), [filtered, pageSize]);
  const withMaterials = useMemo(
    () => procedures.filter((row) => Array.isArray(row.default_materials_detail) && row.default_materials_detail.length > 0).length,
    [procedures]
  );
  const totalMaterialsLinked = useMemo(
    () => procedures.reduce((sum, row) => sum + (Array.isArray(row.default_materials_detail) ? row.default_materials_detail.length : 0), 0),
    [procedures]
  );

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.CIRURGIA, GROUPS.RECEPCAO]}>
      <div className="space-y-3">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="space-y-3 px-4 py-3 pl-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md shadow-violet-500/20">
                  <PackageSearch size={17} />
                </span>
                <div>
                  <h1 className="text-lg font-bold leading-tight text-foreground">Materiais por procedimento</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar…" : `${procedures.length} procedimentos cirúrgicos com materiais padrão`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[260px]">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Pesquisar procedimento ou material…"
                    className="w-full rounded-lg border border-border bg-background/60 py-1.5 pl-7 pr-6 text-xs text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search ? (
                    <button
                      type="button"
                      aria-label="Limpar pesquisa"
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={13} />
                    </button>
                  ) : null}
                </div>
                <div className="inline-flex h-9 items-center gap-1.5" title="Procedimentos por quadro">
                  <PageSizeInput value={pageSize} onChange={setPageSize} ariaLabel="Procedimentos por quadro" />
                  <span className="text-xs text-muted-foreground">/quadro</span>
                </div>
              </div>
            </div>

            {erro ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{erro}</div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              <Metric label="Procedimentos" value={loading ? "…" : procedures.length} accent="bg-violet-500" icon={Scissors} />
              <Metric label="Com materiais" value={loading ? "…" : withMaterials} accent="bg-emerald-500" icon={Boxes} />
              <Metric label="Linhas de material" value={loading ? "…" : totalMaterialsLinked} accent="bg-fuchsia-500" icon={PackageSearch} />
              <Metric label="Sem materiais" value={loading ? "…" : procedures.length - withMaterials} hint="Clique para adicionar materiais e quantidades" accent="bg-amber-500" icon={ShieldAlert} />
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <section className={`relative overflow-hidden ${GLASS}`}>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
                <PackageSearch size={22} />
              </span>
              <p className="text-sm font-medium text-foreground">Nenhum procedimento encontrado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search ? "Tente ajustar a pesquisa." : "Ainda não existem procedimentos cirúrgicos registados."}
              </p>
            </div>
          </section>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((row) => (
              <ProcedureCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
