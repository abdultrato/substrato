"use client";

import { isNotFoundLikeError } from "@/lib/errors/api-error";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarDays,
  FilePlus2,
  HeartPulse,
  Pill,
  Search,
  ScrollText,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import Pagination from "@/components/ui/Pagination";
import useDebounce from "@/hooks/useDebounce";
import { apiFetchList } from "@/lib/api";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";

const OCCUPATIONAL_PROVENANCE = "Medicina Ocupacional";
const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE];

type PatientRow = Record<string, any>;

function display(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function fmtDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("pt-PT", { dateStyle: "medium" });
}

function patientInitials(name?: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "MO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className={`min-w-[7.5rem] rounded-lg border px-2.5 py-1.5 ${tone}`}>
      <div className="text-[10px] font-medium text-muted-foreground">{label}</div>
      <div className="text-base font-bold leading-tight text-foreground">{value}</div>
    </div>
  );
}

function OccupationalPatientCard({ patient, accent }: { patient: PatientRow; accent: string }) {
  const href = `/occupational-medicine/${encodeURIComponent(String(patient.id))}`;
  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-lg border border-white/40 bg-white/20 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="flex min-w-0 items-center gap-2 px-3 py-2 pl-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
          {patientInitials(patient.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">
            {display(patient.name)}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Building2 size={11} />
              {display(patient.origin_company_name, "Sem empresa")}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={11} />
              {fmtDate(patient.birth_date)}
            </span>
          </div>
        </div>
        <div className="hidden min-w-[5.5rem] text-right text-[11px] text-muted-foreground sm:block">
          <div className="font-semibold text-foreground">{display(patient.custom_id || patient.id)}</div>
          <div>{display(patient.contact, "Sem contacto")}</div>
        </div>
        <ArrowRight size={15} className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}

export default function MedicinaOcupacionalPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [requisicoes, setRequisicoes] = useState<number>(0);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listErro, setListErro] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setErro(null);
        // Conta o número de requisições (não de exames) com proveniência de
        // Medicina Ocupacional — meta.total vem do total de labrequests.
        const reqs = await apiFetchList("/clinical/labrequest/", {
          page: 1,
          pageSize: 1,
          query: { proveniencia: OCCUPATIONAL_PROVENANCE },
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        setRequisicoes(reqs.meta.total ?? reqs.items.length ?? 0);
      } catch (e: any) {
        if (!mounted) return;
        setErro(
          isNotFoundLikeError(e)
            ? null
            : e?.message || "Falha ao carregar o workspace de medicina ocupacional.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [safeRefreshToken]);

  useEffect(() => {
    let mounted = true;
    async function loadPatients() {
      try {
        setListLoading(true);
        setListErro(null);
        const res = await apiFetchList<PatientRow>("/clinical/patient/", {
          page,
          pageSize,
          query: {
            proveniencia: OCCUPATIONAL_PROVENANCE,
            ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
          },
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        const items = Array.isArray(res?.items) ? res.items : [];
        const total = res?.meta?.total ?? items.length;
        const computedTotalPages =
          res?.meta?.totalPages ??
          (total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1);
        setPatients(items);
        setTotalItems(total || 0);
        setTotalPages(computedTotalPages);
        if (page > computedTotalPages) setPage(computedTotalPages);
      } catch (e: any) {
        if (!mounted) return;
        setListErro(
          isNotFoundLikeError(e)
            ? null
            : e?.message || "Falha ao carregar pacientes ocupacionais.",
        );
      } finally {
        if (mounted) setListLoading(false);
      }
    }
    loadPatients();
    return () => {
      mounted = false;
    };
  }, [debouncedSearch, page, safeRefreshToken]);

  const cardAccents = useMemo(
    () => ["bg-teal-500", "bg-sky-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500"],
    [],
  );

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-full max-w-[96rem] space-y-3 px-1 pb-4">
        <section className="rounded-xl border border-teal-200/50 bg-white/20 shadow-sm backdrop-blur-sm dark:border-teal-900/40 dark:bg-white/[0.04]">
          <div className="grid gap-2 px-3 py-2 lg:grid-cols-[minmax(16rem,1fr)_minmax(18rem,0.8fr)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/12 text-teal-700 dark:text-teal-300">
                  <Briefcase size={17} />
                </span>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold leading-tight text-foreground">
                    Medicina Ocupacional
                  </h1>
                  <p className="truncate text-[11px] text-muted-foreground">
                    Pacientes, requisições e encaminhamentos ocupacionais.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar paciente, empresa ou contacto"
                className="h-9 w-full rounded-lg border border-border bg-background/70 pl-8 pr-3 text-sm text-foreground outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:flex lg:justify-end">
              <MetricPill
                label="Pacientes"
                value={listLoading ? "..." : totalItems}
                tone="border-teal-200 bg-teal-50/70 dark:border-teal-800/40 dark:bg-teal-950/20"
              />
              <MetricPill
                label="Requisições"
                value={loading ? "..." : requisicoes}
                tone="border-sky-200 bg-sky-50/70 dark:border-sky-800/40 dark:bg-sky-950/20"
              />
              <MetricPill
                label="Procedimentos"
                value="—"
                tone="border-violet-200 bg-violet-50/70 dark:border-violet-800/40 dark:bg-violet-950/20"
              />
              <MetricPill
                label="Farmácia"
                value="—"
                tone="border-amber-200 bg-amber-50/70 dark:border-amber-800/40 dark:bg-amber-950/20"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-teal-200/60 px-3 py-2 dark:border-teal-900/40">
            <p className="min-w-0 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Registo centralizado</span>
              {" — "}Novos pacientes ocupacionais entram pela Recepção com proveniência de Medicina Ocupacional.
            </p>
            <Link
              href="/reception"
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-teal-300 bg-white px-2.5 text-xs font-semibold text-teal-700 shadow-sm hover:bg-teal-50 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-200"
            >
              Ir para Recepção <ArrowRight size={13} />
            </Link>
          </div>
        </section>

        {erro ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        {/* Ações rápidas — logo após o cabeçalho */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Criar requisição laboratorial", href: "/requests/new", icon: FilePlus2, accent: "bg-violet-500" },
            { title: "Prontuário e cardex", href: "/medical-records", icon: ScrollText, accent: "bg-sky-500" },
            { title: "Procedimentos", href: "/nursing/procedures", icon: HeartPulse, accent: "bg-emerald-500" },
            { title: "Materiais e farmácia", href: "/pharmacy/material-requests", icon: Pill, accent: "bg-amber-500" },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="relative flex items-center gap-2 overflow-hidden rounded-lg border border-white/40 bg-white/20 px-3 py-2 pl-4 text-sm font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:border-primary/30 hover:bg-white/30 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
              >
                <span className={`absolute inset-y-0 left-0 w-1 ${action.accent}`} />
                <Icon size={15} className="text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{action.title}</span>
                <ArrowRight size={14} className="text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        <section className="rounded-xl border border-white/40 bg-white/20 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Pacientes ocupacionais</h2>
                <p className="text-[11px] text-muted-foreground">
                  Cards curtos com abertura directa para detalhe ocupacional.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Total: {totalItems} · Pagina {page} de {totalPages}
              </div>
            </div>

            {listErro ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {listErro}
              </div>
            ) : null}

            {listLoading ? (
              <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Carregando pacientes...
              </div>
            ) : patients.length ? (
              <div className="grid gap-2 md:grid-cols-2 2xl:grid-cols-3">
                {patients.map((patient, index) => (
                  <OccupationalPatientCard
                    key={patient.id || patient.custom_id || index}
                    patient={patient}
                    accent={cardAccents[index % cardAccents.length]}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Nenhum paciente de Medicina Ocupacional encontrado.
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
              <span className="text-xs text-muted-foreground">
                {debouncedSearch ? `Filtro activo: ${debouncedSearch}` : "Sem filtro de pesquisa"}
              </span>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </section>
      </div>
    </AppLayout>
  );
}
