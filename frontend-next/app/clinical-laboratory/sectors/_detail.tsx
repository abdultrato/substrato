"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Microscope, Pencil } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess";

const ENDPOINT = "/clinical_laboratory/sector/";
const BASE_PATH = "/clinical-laboratory/sectors";

type LabSector = {
  id: number;
  custom_id?: string | null;
  code?: string;
  name?: string;
  active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 py-2 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function SectorDetail({ id }: { id: string }) {
  const [record, setRecord] = useState<LabSector | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<LabSector>(`${ENDPOINT}${id}/`)
      .then((data) => setRecord(data))
      .catch((err: any) => setError(err?.message || "Erro ao carregar sector."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AppLayout requiredGroups={requiredGroupsForResourceGroup("clinical_laboratory")}>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Carregando…</div>
      ) : error || !record ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {error || "Sector não encontrado."}
        </div>
      ) : (
        <div className="space-y-3">
          <section className="relative overflow-hidden rounded-xl border border-sky-200/50 bg-gradient-to-br from-sky-50/80 via-white/70 to-cyan-50/60 shadow-sm backdrop-blur-sm dark:border-sky-800/30 dark:from-sky-950/30 dark:via-slate-900/40 dark:to-cyan-950/20">
            <span className="absolute left-0 top-0 h-full w-1 bg-sky-400" />
            <div className="px-4 py-3 pl-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-500/20">
                    <Microscope size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">
                      Catálogo laboratorial <span className="mx-0.5">/</span> Sectores
                    </p>
                    <h1 className="text-sm font-bold text-foreground">{record.name || "Sector"}</h1>
                    <p className="text-[11px] text-muted-foreground">{record.code || record.custom_id || `#${record.id}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={BASE_PATH}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/40 bg-white/40 px-3 text-xs text-foreground transition hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
                  >
                    <ArrowLeft size={12} /> Voltar
                  </Link>
                  <Link
                    href={`${BASE_PATH}/${record.id}/edit`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-600 px-3 text-xs font-semibold text-white shadow-md shadow-sky-500/25 transition hover:from-sky-700 hover:to-cyan-700"
                  >
                    <Pencil size={12} /> Editar
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="rounded-xl border border-white/20 bg-white/30 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados do sector</h2>
              <Row label="Nome" value={record.name || "—"} />
              <Row label="Código" value={record.code || "—"} />
              <Row
                label="Estado"
                value={
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      record.active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300"
                    }`}
                  >
                    {record.active ? "Ativo" : "Inativo"}
                  </span>
                }
              />
            </section>

            <section className="rounded-xl border border-white/20 bg-white/30 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Auditoria</h2>
              <Row label="Identificador" value={record.custom_id || `#${record.id}`} />
              <Row label="Criado em" value={fmtDate(record.created_at)} />
              <Row label="Atualizado em" value={fmtDate(record.updated_at)} />
            </section>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
