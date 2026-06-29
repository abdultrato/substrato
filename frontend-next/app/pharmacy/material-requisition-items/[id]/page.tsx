"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Box, Calendar, CheckCircle2, ClipboardList, Loader2, Package, StickyNote } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

type ReqItem = {
  id: number;
  custom_id?: string;
  requisition?: number;
  product?: number;
  product_name?: string;
  warehouse_item?: number;
  warehouse_item_name?: string;
  warehouse_item_sku?: string;
  lot?: number;
  lot_number?: string;
  lot_expiration_date?: string;
  requested_quantity?: number;
  supplied_quantity?: number;
  available_quantity?: number;
  position?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
};

function classify(item: ReqItem): { label: string; badge: string; dot: string } {
  const req = Number(item.requested_quantity ?? 0);
  const sup = Number(item.supplied_quantity ?? 0);
  if (sup >= req && req > 0)
    return { label: "Totalmente aviada", badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300", dot: "bg-emerald-400" };
  if (sup > 0)
    return { label: "Parcialmente aviada", badge: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300", dot: "bg-blue-400" };
  return { label: "Pendente", badge: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300", dot: "bg-amber-400" };
}

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleString("pt-PT");
}

function MetaRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, accent, children }: {
  title: string; icon: React.ElementType; accent: string; children: React.ReactNode;
}) {
  return (
    <section className={`relative ${GLASS}`}>
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${accent}`} />
      <div className="px-4 py-3 pl-5">
        <div className="mb-3 flex items-center gap-2">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${accent.replace("bg-", "bg-").replace("-500", "-500/15")} ${accent.replace("bg-", "text-")}`}>
            <Icon size={12} />
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

export default function MaterialRequisitionItemsDetailPage() {
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [data, setData] = useState<ReqItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<ReqItem>(`/pharmacy/material_requisition_item/${id}/`)
      .then(setData)
      .catch(e => setError(e?.message || "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [id]);

  const st = data ? classify(data) : null;
  const name = data ? (data.product_name || data.warehouse_item_name || `Item #${id}`) : `Item #${id}`;
  const req = Number(data?.requested_quantity ?? 0);
  const sup = Number(data?.supplied_quantity ?? 0);
  const avail = data?.available_quantity;
  const remaining = Math.max(0, req - sup);
  const pct = req > 0 ? Math.round((sup / req) * 100) : 0;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <div className="w-full space-y-3 px-1">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${st?.dot ?? "bg-violet-500"}`} />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20">
                <Package size={17} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">
                  {loading ? "A carregar…" : name}
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-muted-foreground">{data?.custom_id || `MREI-${id}`}</p>
                  {st && (
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${st.badge}`}>
                      {st.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/pharmacy/material-requisition-items/${id}/edit`}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-4 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20">
                Editar
              </Link>
              <Link href="/pharmacy/material-requisition-items"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-4 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20">
                <ArrowLeft size={14} /> Voltar
              </Link>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : data && (
          <>
            {/* ── Produto / Lote ── */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <SectionCard title="Produto" icon={Package} accent="bg-violet-500">
                <div className="space-y-2">
                  <MetaRow icon={Package} label="Nome" value={name} />
                  {data.warehouse_item_sku && <MetaRow icon={ClipboardList} label="SKU" value={data.warehouse_item_sku} />}
                  {data.requisition && (
                    <MetaRow icon={ClipboardList} label="Requisição" value={
                      <Link href={`/pharmacy/material-requests/${data.requisition}`}
                        className="text-violet-500 hover:underline">
                        #{data.requisition}
                      </Link>
                    } />
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Lote" icon={ClipboardList} accent="bg-indigo-500">
                <div className="space-y-2">
                  <MetaRow icon={ClipboardList} label="Número do lote" value={data.lot_number || "—"} />
                  <MetaRow icon={Calendar} label="Validade" value={data.lot_expiration_date || "—"} />
                </div>
              </SectionCard>
            </div>

            {/* ── Quantidades ── */}
            <SectionCard title="Quantidades" icon={Box} accent="bg-emerald-500">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Solicitado</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{req}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Disponível</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{avail ?? "—"}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Aviado</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{sup}</p>
                </div>
              </div>
              {req > 0 && (
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>{pct}% aviado</span>
                    <span>Restante: {remaining}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-blue-500" : "bg-amber-400"}`}
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              )}
            </SectionCard>

            {/* ── Notas + Datas ── */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {data.notes && (
                <SectionCard title="Observações" icon={StickyNote} accent="bg-slate-500">
                  <p className="text-sm text-foreground">{data.notes}</p>
                </SectionCard>
              )}
              <SectionCard title="Datas" icon={Calendar} accent="bg-slate-500">
                <div className="space-y-2">
                  <MetaRow icon={Calendar} label="Criado em" value={fmtDate(data.created_at)} />
                  <MetaRow icon={Calendar} label="Atualizado em" value={fmtDate(data.updated_at)} />
                </div>
              </SectionCard>
            </div>
          </>
        )}

      </div>
    </AppLayout>
  );
}
