"use client";

import { isNotFoundLikeError } from "@/lib/errors/api-error";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FilePlus2,
  HeartPulse,
  ScrollText,
  Pill,
  UserPlus,
  Search,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/ui/PageHeader";
import MetricCard from "@/components/ui/MetricCard";
import ActionTile from "@/components/ui/ActionTile";
import DataTable from "@/components/ui/DataTable";
import Pagination from "@/components/ui/Pagination";
import useDebounce from "@/hooks/useDebounce";
import { apiFetch, apiFetchList, extractTotalCount } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";

const OCCUPATIONAL_PROVENANCE = "Medicina Ocupacional";

type PatientRow = Record<string, any>;

export default function MedicinaOcupacionalPage() {
  const { user } = useAuth();
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN]);
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [requisicoes, setRequisicoes] = useState<number>(0);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
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
        const reqs = await apiFetch<any>("/clinical/labrequest/", {
          clientCache: safeRefreshToken === 0,
        });
        if (!mounted) return;
        setRequisicoes(extractTotalCount(reqs));
      } catch (e: any) {
        if (!mounted) return;
        setErro(
          isNotFoundLikeError(e)
            ? null
            : e?.message ||
                "Falha ao carregar o workspace de medicina ocupacional.",
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
            ...(debouncedSearch.trim()
              ? { search: debouncedSearch.trim() }
              : {}),
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

  const columns = useMemo(
    () => [
      { header: "ID", render: (r: PatientRow) => r.custom_id || r.id || "-" },
      {
        header: "Nome",
        render: (r: PatientRow) => (
          <Link
            href={`/patients/${r.id}`}
            className="font-medium text-[var(--primary-700)] underline-offset-2 hover:underline"
          >
            {r.name || "-"}
          </Link>
        ),
      },
      {
        header: "Empresa",
        render: (r: PatientRow) => r.origin_company_name || "—",
      },
      { header: "Contacto", render: (r: PatientRow) => r.contact || "—" },
      { header: "Nascimento", render: (r: PatientRow) => r.birth_date || "—" },
      {
        header: "",
        render: (r: PatientRow) => (
          <Link
            href={`/patients/${r.id}`}
            className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-xs font-semibold text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
          >
            Abrir ficha
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.MEDICINA_OCUPACIONAL]}>
      <div className="space-y-6">
        <PageHeader title="Medicina Ocupacional" />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Pacientes (ocupacional)"
            value={listLoading ? "..." : totalItems}
          />
          <MetricCard
            label="Requisições (lab)"
            value={loading ? "..." : requisicoes}
          />
          <MetricCard label="Procedimentos" value="—" />
          <MetricCard label="Medicação" value="—" />
        </div>

        {/* Registo de pacientes centralizado na Recepção */}
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <UserPlus size={18} className="shrink-0 text-blue-600" />
          <div className="flex-1 text-sm text-blue-800">
            O registo de novos pacientes ocupacionais é feito na{" "}
            <Link
              href="/reception"
              className="font-semibold underline underline-offset-2 hover:text-blue-600"
            >
              Recepção
            </Link>{" "}
            — seleccione <strong>Medicina Ocupacional</strong> no fluxo de
            entrada de paciente.
          </div>
          <Link
            href="/reception"
            className="shrink-0 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
          >
            Ir para Recepção
          </Link>
        </div>

        <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              Pacientes de Medicina Ocupacional
            </h2>
            <div className="relative w-48">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar…"
                className="w-full rounded-lg border border-border bg-background/60 py-1.5 pl-7 pr-6 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:w-72 focus:ring-2 focus:ring-violet-500/40 transition-all"
              />
            </div>
          </div>

          {listErro ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {listErro}
            </div>
          ) : null}

          {listLoading ? (
            <div className="py-6 text-center text-sm text-[var(--gray-500)]">
              Carregando...
            </div>
          ) : (
            <>
              <DataTable<PatientRow>
                columns={columns as any}
                data={patients}
                emptyMessage="Nenhum paciente de Medicina Ocupacional encontrado."
                searchable={false}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-[var(--gray-600)]">
                  Total: {totalItems} · Página {page} de {totalPages}
                </div>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={setPage}
                />
              </div>
            </>
          )}
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Criar requisição laboratorial"
            description="Solicitar análises laboratoriais."
            href="/requests/new"
            icon={FilePlus2}
          />
          <ActionTile
            title="Prontuário (Cardex)"
            description="Ver/registar cardex e prescrição."
            href="/medical-records"
            icon={ScrollText}
          />
          <ActionTile
            title="Procedimentos (Enfermagem)"
            description="Encaminhar para execução e registo de procedimentos."
            href="/nursing/procedures"
            icon={HeartPulse}
          />
          <ActionTile
            title="Almoxarifado/Farmácia"
            description="Solicitar materiais e acompanhar o estado de avio."
            href="/pharmacy/material-requests"
            icon={Pill}
          />
        </div>
      </div>
    </AppLayout>
  );
}
