"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Search,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetchList } from "@/lib/api";
import { formatCount } from "@/lib/i18n/plural";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";

// ── Types ─────────────────────────────────────────────────────────────────────

type Patient = {
  id: number;
  custom_id: string;
  name: string;
  birth_date: string | null;
  gender: string | null;
  blood_type: string;
  race_origin: string | null;
  document_type: string;
  document_number: string | null;
  contact: string | null;
  email: string | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_province: string | null;
  address_postal_code: string | null;
  address_complement: string | null;
  pregnant: boolean;
  gestational_age_weeks: number | null;
  is_blood_donor: boolean;
  is_organ_donor: boolean;
  companion_name: string | null;
  companion_relationship: string | null;
  companion_contact: string | null;
  companion_email: string | null;
  provenance: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const GENDER_LABELS: Record<string, string> = {
  Masculino: "Masculino",
  Femenino: "Femenino",
  // Handle potential variations
  M: "Masculino",
  F: "Femenino",
  Masc: "Masculino",
  Fem: "Femenino",
};

const BLOOD_TYPE_LABELS: Record<string, string> = {
  "O-": "O-",
  "O+": "O+",
  "A-": "A-",
  "A+": "A+",
  "B-": "B-",
  "B+": "B+",
  "AB-": "AB-",
  "AB+": "AB+",
  UNK: "Desconhecido",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(value);
  }
}

function formatAge(birthDate: string | null | undefined): string {
  if (!birthDate) return "—";
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age} anos`;
  } catch {
    return "—";
  }
}

function formatGender(gender: string | null | undefined): string {
  if (!gender) return "—";
  return GENDER_LABELS[gender] || gender;
}

function formatBloodType(bloodType: string | null | undefined): string {
  if (!bloodType) return "—";
  return BLOOD_TYPE_LABELS[bloodType] || bloodType;
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 24;

export default function PatientsPage() {
  const safeRefreshToken = useSafeDataRefreshSignal();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState<"" | "Masculino" | "Femenino">("");
  const [filterBloodType, setFilterBloodType] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, any> = { page, page_size: PAGE_SIZE };
      if (debouncedSearch) query.search = debouncedSearch;
      if (filterGender) query.gender = filterGender;
      if (filterBloodType) query.blood_type = filterBloodType;
      const res = await apiFetchList<Patient>("/clinical/patient/", {
        page,
        pageSize: PAGE_SIZE,
        query,
        clientCache: safeRefreshToken === 0,
        clientCacheTtlMs: 20000,
      });
      setPatients(res.items);
      setTotal(res.meta.total ?? res.items.length);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar pacientes.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterGender, filterBloodType, safeRefreshToken]);

  useEffect(() => { setPage(1); }, [debouncedSearch, filterGender, filterBloodType]);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.RECEPCAO]}>
      <div className="space-y-3">

        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                <User size={16} />
              </span>
              <div>
                <h1 className="text-lg font-bold leading-tight text-foreground">Pacientes</h1>
                <p className="text-[11px] text-muted-foreground">
                  {loading ? "Carregando…" : formatCount(total, { one: "paciente cadastrado", other: "pacientes cadastrados" })}
                </p>
              </div>
            </div>
            <Link href="/patients/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700">
              <Plus size={13} /> Novo paciente
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          <div className="relative w-48">
            <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar…"
              className="w-full rounded-lg border border-border bg-background/60 py-1.5 pl-7 pr-6 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:w-72 focus:ring-2 focus:ring-violet-500/40 transition-all" />
          </div>
          <select value={filterGender} onChange={(e) => setFilterGender(e.target.value as any)}
            className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none transition focus:border-violet-500">
            <option value="">Todos os gêneros</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
          </select>
          <select value={filterBloodType} onChange={(e) => setFilterBloodType(e.target.value)}
            className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground outline-none transition focus:border-violet-500">
            <option value="">Todos os tipos</option>
            {Object.entries(BLOOD_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Carregando…
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <User size={28} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
            <Link href="/patients/new"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 text-xs font-semibold text-white">
              <Plus size={13} /> Cadastrar primeiro paciente
            </Link>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {patients.map((p) => (
              <Link key={p.id} href={`/patients/${p.id}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm transition hover:border-violet-300/50 hover:shadow-md dark:bg-white/5 dark:border-white/10 dark:hover:border-violet-500/30">

                {/* Active indicator */}
                <span className={`absolute left-0 top-0 h-full w-1 ${p.active ? "bg-emerald-400" : "bg-red-300 dark:bg-red-600"}`} />

                <div className="flex flex-1 flex-col gap-2 px-4 py-3 pl-5">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-muted-foreground">{p.custom_id || `#${p.id}`}</p>
                      <p className="font-semibold text-sm text-foreground leading-snug">{p.name || "—"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      p.active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400"
                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-400"
                    }`}>
                      {p.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  {/* Info row: age, gender, blood type */}
                  <div className="flex flex-wrap gap-1.5 text-[12px]">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatAge(p.birth_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      {formatGender(p.gender)}
                    </span>
                    <span className="flex items-center gap-1">
                      {formatBloodType(p.blood_type)}
                    </span>
                  </div>

                  {/* Contact info */}
                  <div className="flex flex-wrap gap-1.5 text-[12px]">
                    <span className="flex items-center gap-1">
                      Telefone: {p.contact || "—"}
                    </span>
                    {p.email && (
                      <span className="flex items-center gap-1">
                        Email: {p.email}
                      </span>
                    )}
                  </div>

                  {/* Footer: address snippet + created date */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-1.5">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      Endereço: {p.address_neighborhood || p.address_city || "—"}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{formatDate(p.created_at)}</span>
                    <ChevronRight size={13} className="text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-muted-foreground">
              Página {page} de {totalPages} · {total} pacientes
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="h-7 rounded-lg border border-border bg-card px-3 text-xs text-foreground transition hover:bg-muted disabled:opacity-40">
                ← Anterior
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="h-7 rounded-lg border border-border bg-card px-3 text-xs text-foreground transition hover:bg-muted disabled:opacity-40">
                Seguinte →
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
