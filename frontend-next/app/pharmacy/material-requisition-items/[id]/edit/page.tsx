"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Box, ClipboardList, Loader2, Package, StickyNote } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { GROUPS } from "@/lib/rbac";

const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]";

const inputCls =
  "w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition";

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
        <div className="space-y-3">{children}</div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

type ReqItem = {
  id: number;
  custom_id?: string;
  product_name?: string;
  warehouse_item_name?: string;
  requested_quantity?: number;
  supplied_quantity?: number;
  notes?: string;
  position?: number;
};

export default function MaterialRequisitionItemsEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = String((params as any)?.id || "");

  const [data, setData] = useState<ReqItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requestedQty, setRequestedQty] = useState("");
  const [suppliedQty, setSuppliedQty] = useState("");
  const [notes, setNotes] = useState("");
  const [position, setPosition] = useState("");

  useEffect(() => {
    apiFetch<ReqItem>(`/pharmacy/material_requisition_item/${id}/`)
      .then(d => {
        setData(d);
        setRequestedQty(String(d.requested_quantity ?? ""));
        setSuppliedQty(String(d.supplied_quantity ?? ""));
        setNotes(d.notes ?? "");
        setPosition(String(d.position ?? ""));
      })
      .catch(e => setError(e?.message || "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await apiFetch(`/pharmacy/material_requisition_item/${id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          requested_quantity: requestedQty ? Number(requestedQty) : undefined,
          supplied_quantity: suppliedQty ? Number(suppliedQty) : undefined,
          notes: notes || "",
          position: position ? Number(position) : undefined,
        }),
        headers: { "Content-Type": "application/json" },
      });
      router.push(`/pharmacy/material-requisition-items/${id}`);
    } catch (e: any) {
      setError(e?.message || "Erro ao guardar.");
    } finally {
      setSaving(false);
    }
  }

  const name = data ? (data.product_name || data.warehouse_item_name || `Item #${id}`) : `Item #${id}`;

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA, GROUPS.MEDICINA, GROUPS.ENFERMAGEM]}>
      <form onSubmit={handleSubmit} className="w-full space-y-3 px-1">

        {/* ── Cabeçalho ── */}
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className="absolute left-0 top-0 h-full w-1 bg-violet-500" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 pl-5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20">
                <Package size={17} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">
                  {loading ? "A carregar…" : `Editar — ${name}`}
                </h1>
                <p className="text-[11px] text-muted-foreground">{data?.custom_id || `MREI-${id}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.back()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-4 text-sm font-medium text-foreground backdrop-blur-sm transition hover:bg-white/20">
                <ArrowLeft size={14} /> Voltar
              </button>
              <button type="submit" disabled={saving || loading}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-gradient-to-br from-violet-600 to-purple-600 px-4 text-sm font-semibold text-white shadow-sm shadow-violet-500/20 transition hover:opacity-90 disabled:opacity-50">
                {saving ? <><Loader2 size={14} className="animate-spin" /> A guardar…</> : "Guardar"}
              </button>
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
        ) : (
          <>
            {/* ── Quantidades ── */}
            <SectionCard title="Quantidades" icon={Box} accent="bg-emerald-500">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <Field label="Solicitado">
                  <input type="number" min={0} className={inputCls} value={requestedQty}
                    onChange={e => setRequestedQty(e.target.value)} />
                </Field>
                <Field label="Aviado">
                  <input type="number" min={0} className={inputCls} value={suppliedQty}
                    onChange={e => setSuppliedQty(e.target.value)} />
                </Field>
                <Field label="Posição">
                  <input type="number" min={0} className={inputCls} value={position}
                    onChange={e => setPosition(e.target.value)} />
                </Field>
              </div>
            </SectionCard>

            {/* ── Observações ── */}
            <SectionCard title="Observações" icon={StickyNote} accent="bg-slate-500">
              <Field label="Notas">
                <textarea rows={3} className={inputCls} placeholder="Notas opcionais…"
                  value={notes} onChange={e => setNotes(e.target.value)} />
              </Field>
            </SectionCard>
          </>
        )}

      </form>
    </AppLayout>
  );
}
