"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Boxes,
  CalendarClock,
  FileText,
  Loader2,
  PackageSearch,
  Search,
  ShieldAlert,
  Syringe,
  X,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import PageSizeInput from "@/components/ui/PageSizeInput";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

type MaterialRow = Record<string, any>;
type ConsumptionRow = Record<string, any>;

function fmtMoney(value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("pt-PT", { style: "currency", currency: "MZN" });
}

function fmtDate(value: any): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
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

function MaterialCard({ row }: { row: MaterialRow }) {
  const code = firstText(row.code, row.internal_code, row.custom_id, row.id ? `#${row.id}` : null);
  const name = firstText(row.name, row.product_name, row.product_label);
  const product = firstText(row.product_name, row.product_label, row.product);
  const unit = firstText(row.unit, "—");
  const type = firstText(row.material_type_display, row.material_type);
  const price = row.sale_price ?? row.cost_price;
  const active = row.active !== false;

  return (
    <article className={`relative overflow-hidden rounded-lg border p-3 pl-4 shadow-sm backdrop-blur-sm ${active ? "border-white/20 bg-white/24" : "border-amber-200/70 bg-amber-50/80 dark:bg-amber-950/20"}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${active ? "bg-yellow-500" : "bg-amber-500"}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{name}</p>
          <p className="text-[11px] text-muted-foreground">{code}</p>
        </div>
        <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
          {active ? "Activo" : "Inactivo"}
        </span>
      </div>
      <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground">
        <div className="truncate">Produto: <span className="font-medium text-foreground">{product}</span></div>
        <div>Tipo: <span className="font-medium text-foreground">{type}</span></div>
        <div>Unidade: <span className="font-medium text-foreground">{unit}</span></div>
        <div>Preço: <span className="font-medium text-foreground">{fmtMoney(price)}</span></div>
      </div>
    </article>
  );
}

function ConsumptionCard({ row }: { row: ConsumptionRow }) {
  const surgeryCode = firstText(row.surgery_code, row.surgery_label, row.surgery);
  const material = firstText(row.material_name, row.product_name, row.material);
  const patient = firstText(row.patient_name, row.surgery_patient_name);
  const qty = firstText(row.quantity, row.quantidade);
  const billed = firstText(row.billing_status_display, row.billing_status, "—");
  const consumedAt = fmtDate(row.consumed_at ?? row.created_at);

  return (
    <article className="relative overflow-hidden rounded-lg border border-white/20 bg-white/24 p-3 pl-4 shadow-sm backdrop-blur-sm">
      <span className="absolute left-0 top-0 h-full w-1 bg-rose-500" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-foreground">{material}</p>
          <p className="text-[11px] text-muted-foreground">{surgeryCode}</p>
        </div>
        <span className="shrink-0 rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
          {qty}
        </span>
      </div>
      <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground">
        <div className="truncate">Cirurgia: <span className="font-medium text-foreground">{surgeryCode}</span></div>
        <div className="truncate">Paciente: <span className="font-medium text-foreground">{patient}</span></div>
        <div>Consumido: <span className="font-medium text-foreground">{consumedAt}</span></div>
        <div>Faturação: <span className="font-medium text-foreground">{billed}</span></div>
      </div>
    </article>
  );
}

export default function SurgeryMaterialsListPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [materiais, setMateriais] = useState<MaterialRow[]>([]);
  const [consumos, setConsumos] = useState<ConsumptionRow[]>([]);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setErro(null);
        const [materialsRes, consumptionsRes] = await Promise.all([
          apiFetch<any>("/surgery/materiais/?page_size=200", { clientCache: safeRefreshToken === 0 }),
          apiFetch<any>("/surgery/consumos/?page_size=200", { clientCache: safeRefreshToken === 0 }),
        ]);
        if (!mounted) return;
        const materialList = materialsRes?.results ?? materialsRes;
        const consumptionList = consumptionsRes?.results ?? consumptionsRes;
        setMateriais(Array.isArray(materialList) ? materialList : []);
        setConsumos(Array.isArray(consumptionList) ? consumptionList : []);
      } catch (e: any) {
        if (!mounted) return;
        setErro(e?.message || "Falha ao carregar materiais cirúrgicos.");
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

  const materiaisFiltrados = useMemo(() => {
    const rows = materiais.filter((row) => row.deleted !== true);
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.name,
        row.code,
        row.internal_code,
        row.custom_id,
        row.product_name,
        row.product_label,
        row.material_type,
        row.material_type_display,
        row.unit,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [materiais, q]);

  const consumosFiltrados = useMemo(() => {
    const rows = consumos.filter((row) => row.deleted !== true);
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.material_name,
        row.product_name,
        row.surgery_code,
        row.surgery_label,
        row.patient_name,
        row.surgery_patient_name,
        row.billing_status,
        row.billing_status_display,
        row.batch_number,
        row.notes,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [consumos, q]);

  const materiaisVisiveis = useMemo(() => materiaisFiltrados.slice(0, pageSize), [materiaisFiltrados, pageSize]);
  const consumosVisiveis = useMemo(() => consumosFiltrados.slice(0, pageSize), [consumosFiltrados, pageSize]);

  const activos = useMemo(() => materiais.filter((row) => row.deleted !== true && row.active !== false).length, [materiais]);

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.CIRURGIA, GROUPS.RECEPCAO]}>
      <div className="space-y-3">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-yellow-500" />
          <div className="space-y-3 px-4 py-3 pl-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 text-white shadow-md shadow-yellow-500/20">
                  <PackageSearch size={17} />
                </span>
                <div>
                  <h1 className="text-lg font-bold leading-tight text-foreground">Materiais cirúrgicos</h1>
                  <p className="text-[11px] text-muted-foreground">
                    {loading ? "A carregar…" : `${materiais.length} materiais no catálogo · ${consumos.length} consumos em cirurgias`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[240px]">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Pesquisar material, produto, cirurgia ou paciente…"
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
                <div className="inline-flex h-9 items-center gap-1.5" title="Registos por quadro">
                  <PageSizeInput value={pageSize} onChange={setPageSize} ariaLabel="Registos por quadro" />
                  <span className="text-xs text-muted-foreground">/quadro</span>
                </div>
              </div>
            </div>

            {erro ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{erro}</div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              <Metric label="Catálogo" value={loading ? "…" : materiais.length} accent="bg-yellow-500" icon={Boxes} />
              <Metric label="Activos" value={loading ? "…" : activos} accent="bg-emerald-500" icon={Activity} />
              <Metric label="Consumos" value={loading ? "…" : consumos.length} accent="bg-rose-500" icon={Syringe} />
              <Metric label="Sem catálogo" value={loading ? "…" : Math.max(consumos.length - materiais.length, 0)} hint="Consumidos sem espelho visível no catálogo" accent="bg-amber-500" icon={ShieldAlert} />
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            <section className={`relative overflow-hidden ${GLASS}`}>
              <span className="absolute left-0 top-0 h-full w-1 bg-yellow-500" />
              <div className="space-y-3 px-4 py-3 pl-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Catálogo de materiais</h2>
                    <p className="text-[11px] text-muted-foreground">
                      {materiaisVisiveis.length} de {materiaisFiltrados.length} materiais visíveis
                    </p>
                  </div>
                  <Link href="/admin/surgery/surgicalmaterial/" className="text-xs font-medium text-yellow-700 hover:underline">
                    Administração
                  </Link>
                </div>
                {materiaisFiltrados.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">Nenhum material do catálogo encontrado.</div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {materiaisVisiveis.map((row) => (
                      <MaterialCard key={row.id} row={row} />
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className={`relative overflow-hidden ${GLASS}`}>
              <span className="absolute left-0 top-0 h-full w-1 bg-rose-500" />
              <div className="space-y-3 px-4 py-3 pl-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Materiais consumidos em cirurgias</h2>
                    <p className="text-[11px] text-muted-foreground">
                      {consumosVisiveis.length} de {consumosFiltrados.length} consumos visíveis
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock size={12} />
                    Cirurgias e procedimentos realizados
                  </div>
                </div>
                {consumosFiltrados.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">Nenhum consumo cirúrgico encontrado.</div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {consumosVisiveis.map((row) => (
                      <ConsumptionCard key={row.id} row={row} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
