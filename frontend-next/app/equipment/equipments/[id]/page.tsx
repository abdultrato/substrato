"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  History,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Power,
  PowerOff,
  RefreshCcw,
  ShieldAlert,
  Wrench,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { apiFetch } from "@/lib/api";
import { routeParamToString } from "@/lib/routeParams";
import {
  equipmentStatusMeta,
  pickEquipmentIcon,
  type EquipmentRow,
} from "@/components/equipment/equipmentMeta";
import EquipmentMaintenanceSection from "@/components/equipment/EquipmentMaintenanceSection";

const GLASS =
  "rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5";

function fmtDate(value: any, withTime = false): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return withTime
    ? d.toLocaleString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : d.toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}

function str(value: any): string {
  if (value === null || value === undefined || String(value).trim() === "") return "—";
  return String(value);
}

/** Cartão de secção com título característico. */
function Section({
  title,
  icon: Icon,
  bar,
  children,
}: {
  title: string;
  icon: typeof Wrench;
  bar: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${GLASS} border-l-4 ${bar}`}>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Icon size={13} className="text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">{title}</span>
      </div>
      <div className="space-y-1 p-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1 text-[11px]">
      <span className="shrink-0 font-semibold text-foreground">{label}</span>
      <span className="truncate text-right text-muted-foreground">{value}</span>
    </div>
  );
}

export default function EquipmentsDetailPage() {
  const params = useParams();
  const id = routeParamToString((params as any)?.id);
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [row, setRow] = useState<EquipmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErro(null);
    try {
      const result = await apiFetch<EquipmentRow>(
        `/equipment/equipment/${encodeURIComponent(id)}/`,
        { clientCache: false },
      );
      setRow(result || null);
    } catch (e: any) {
      setErro(e?.message || "Falha ao carregar o equipamento.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load, safeRefreshToken]);


  async function toggleActive() {
    if (!id || !row || toggling) return;
    setToggling(true);
    setErro(null);
    try {
      const action = row.active === false ? "ativar" : "inativar";
      const result = await apiFetch<EquipmentRow>(
        `/equipment/equipment/${encodeURIComponent(id)}/${action}/`,
        { method: "POST", clientCache: false },
      );
      setRow(result || row);
    } catch (e: any) {
      setErro(e?.message || "Falha ao alterar o estado do equipamento.");
    } finally {
      setToggling(false);
    }
  }

  const meta = row ? equipmentStatusMeta(row) : null;
  const Icon = row ? pickEquipmentIcon(row) : Wrench;
  const inactive = row?.active === false;

  return (
    <AppLayout>
      <div className="space-y-1.5">
        {/* Cabeçalho fundido: identidade + estado + acções num só bloco translúcido */}
        <section className="relative overflow-hidden rounded-2xl border border-teal-200/25 bg-gradient-to-br from-teal-100/[0.05] via-white/[0.015] to-cyan-100/[0.03] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-teal-800/20 dark:from-teal-950/[0.05] dark:via-white/[0.01] dark:to-cyan-950/[0.03]">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-teal-400/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-2.5 px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25">
                <Icon size={15} />
              </span>
              <div className="min-w-0">
                <h1 className="line-clamp-1 text-base font-bold leading-tight text-foreground">
                  {row?.name || "Equipamento"}
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  {row
                    ? [row.custom_id, row.serial_number].filter(Boolean).join(" · ") || "—"
                    : "A carregar…"}
                </p>
              </div>
            </div>

            {row && meta ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold backdrop-blur-xl ${meta.chip}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
                {row.requires_maintenance ? (
                  <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full border border-amber-200/50 bg-amber-100/30 px-2 text-[10px] font-semibold text-amber-700 backdrop-blur-xl dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300">
                    Requer manutenção
                  </span>
                ) : null}
                <span
                  className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold backdrop-blur-xl ${
                    inactive
                      ? "border-zinc-200/50 bg-zinc-100/30 text-zinc-600 dark:border-zinc-600/30 dark:bg-zinc-800/30 dark:text-zinc-300"
                      : "border-teal-200/50 bg-teal-100/30 text-teal-700 dark:border-teal-700/30 dark:bg-teal-900/20 dark:text-teal-300"
                  }`}
                >
                  {inactive ? "Inativo" : "Ativo"}
                </span>
              </div>
            ) : null}

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <Link
                href="/equipment/equipments"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/[0.05] px-2.5 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
              >
                <ArrowLeft size={13} />
                Equipamentos
              </Link>
              {row ? (
                <>
                  <Link
                    href={`/equipment/equipments/${row.id}/edit`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/25 bg-white/[0.05] px-2.5 text-xs font-medium text-foreground backdrop-blur-xl transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
                  >
                    <Pencil size={12} />
                    Editar
                  </Link>
                  <button
                    type="button"
                    onClick={() => void toggleActive()}
                    disabled={toggling}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-60 ${
                      inactive
                        ? "bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
                        : "bg-gradient-to-r from-zinc-500 to-slate-600 hover:from-zinc-600 hover:to-slate-700"
                    }`}
                  >
                    {toggling ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : inactive ? (
                      <Power size={12} />
                    ) : (
                      <PowerOff size={12} />
                    )}
                    {inactive ? "Ativar" : "Inativar"}
                  </button>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                aria-label="Actualizar"
                title="Actualizar"
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/25 bg-white/[0.05] text-foreground backdrop-blur-xl transition hover:bg-white/20 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />}
              </button>
            </div>
          </div>
        </section>

        {erro ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
            {erro}
          </div>
        ) : null}

        {loading && !row ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-xs text-muted-foreground">
            <Loader2 size={14} className="animate-spin" />
            A carregar equipamento...
          </div>
        ) : null}

        {!loading && !row ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-xs text-muted-foreground">
            <ShieldAlert size={14} />
            Equipamento não encontrado ou sem permissão de acesso.
          </div>
        ) : null}

        {row && meta ? (
          <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3">
            <Section title="Identificação" icon={Wrench} bar="border-l-teal-500 dark:border-l-teal-400">
              <Row label="Nome" value={str(row.name)} />
              <Row label="Código" value={str(row.custom_id)} />
              <Row label="Nº de série" value={str(row.serial_number)} />
              <Row label="Fabricante" value={str(row.manufacturer)} />
              <Row label="Modelo" value={str(row.model)} />
            </Section>

            <Section title="Aquisição" icon={Package} bar="border-l-blue-500 dark:border-l-blue-400">
              <Row label="Data de aquisição" value={fmtDate(row.acquisition_date)} />
              <Row
                label="Estado na aquisição"
                value={str(row.acquisition_status === "NOVO" ? "Novo" : row.acquisition_status === "USADO" ? "Usado" : row.acquisition_status)}
              />
              <Row
                label="Estado operacional inicial"
                value={str(
                  row.initial_operational_status === "FUNCIONANDO"
                    ? "A funcionar"
                    : row.initial_operational_status === "AVARIADO"
                      ? "Avariado"
                      : row.initial_operational_status === "DESLIGADO"
                        ? "Desligado"
                        : row.initial_operational_status,
                )}
              />
              {String(row.initial_failure_type ?? "").trim() ? (
                <Row label="Avaria inicial" value={str(row.initial_failure_type)} />
              ) : null}
            </Section>

            <Section title="Estado operacional" icon={Activity} bar={meta.bar}>
              <Row
                label="Estado actual"
                value={
                  <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${meta.chip}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                }
              />
              <Row label="Última inspeção" value={fmtDate(row.last_inspection)} />
              <Row label="Ativo" value={inactive ? "Não" : "Sim"} />
              <Row label="Requer manutenção" value={row.requires_maintenance ? "Sim" : "Não"} />
              {row.requires_maintenance ? (
                <Row label="Requerida desde" value={fmtDate(row.maintenance_required_since, true)} />
              ) : null}
            </Section>

            <Section title="Localização e responsável" icon={MapPin} bar="border-l-violet-500 dark:border-l-violet-400">
              <Row label="Localização" value={str(row.location)} />
              <Row label="Responsável" value={str(row.responsible)} />
            </Section>

            <Section title="Registo" icon={History} bar="border-l-slate-400 dark:border-l-slate-500">
              <Row label="Criado em" value={fmtDate(row.created_at, true)} />
              <Row label="Actualizado em" value={fmtDate(row.updated_at, true)} />
              <Row label="Versão" value={str(row.version)} />
            </Section>

            {/* Estado de manutenção: recorrências herdadas + manutenções por avaria */}
            <div className="md:col-span-2 xl:col-span-3">
              <EquipmentMaintenanceSection equipmentId={id} />
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
