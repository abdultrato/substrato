"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  HeartPulse,
  Badge,
  Loader2,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { isNotFoundLikeError } from "@/lib/errors/api-error";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS } from "@/lib/rbac";

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE];

type PatientDetail = Record<string, any>;

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

function initials(name?: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "MO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function buildAddress(patient: PatientDetail) {
  return [
    patient.address_street,
    patient.address_number,
    patient.address_neighborhood,
    patient.address_city,
    patient.address_province,
    patient.address_postal_code,
  ].filter(Boolean).join(", ") || patient.address || "";
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "-") return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 py-1.5 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="max-w-[65%] text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function DetailCard({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon: React.ElementType;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 pl-4">
        <Icon size={15} className="text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-3 pl-4">{children}</div>
    </section>
  );
}

export default function OccupationalMedicineDetailPage() {
  const router = useRouter();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const { id } = useParams() as { id?: string | string[] };
  const idStr = Array.isArray(id) ? id[0] : id;

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!idStr) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<PatientDetail>(`/patients/${idStr}/`, {
        clientCache: safeRefreshToken === 0,
      });
      setPatient(data);
    } catch (err: any) {
      setError(isNotFoundLikeError(err) ? null : err?.message || "Erro ao carregar paciente ocupacional.");
    } finally {
      setLoading(false);
    }
  }, [idStr, safeRefreshToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="flex min-h-60 items-center justify-center text-muted-foreground">
          <Loader2 size={22} className="animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error || !patient) {
    return (
      <AppLayout requiredGroups={VIEW_GROUPS}>
        <div className="mx-auto max-w-3xl space-y-3 px-2">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
            {error || "Paciente ocupacional nao encontrado."}
          </div>
          <button
            type="button"
            onClick={() => router.push("/occupational-medicine")}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <ArrowLeft size={14} />
            Voltar
          </button>
        </div>
      </AppLayout>
    );
  }

  const address = buildAddress(patient);

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-full max-w-6xl space-y-3 px-1 pb-4">
        <section className="relative overflow-hidden rounded-xl border border-teal-200/70 bg-card shadow-sm dark:border-teal-900/40">
          <span className="absolute inset-y-0 left-0 w-1 bg-teal-500" />
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 pl-5">
            <button
              type="button"
              onClick={() => router.push("/occupational-medicine")}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <ArrowLeft size={14} />
              Voltar
            </button>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/12 text-sm font-bold text-teal-700 dark:text-teal-300">
              {initials(patient.name)}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold text-foreground">{display(patient.name)}</h1>
              <p className="truncate text-xs text-muted-foreground">
                {display(patient.custom_id || patient.id)} · {display(patient.origin_company_name, "Sem empresa")}
              </p>
            </div>
            <Link
              href={`/patients/${encodeURIComponent(String(patient.id))}`}
              className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground hover:bg-muted"
            >
              Ficha clinica
            </Link>
          </div>
        </section>

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Identificacao principal
          </h2>
          <div className="grid gap-3 lg:grid-cols-3">
            <DetailCard title="Paciente" icon={User} accent="bg-teal-500">
              <Field label="Nome" value={display(patient.name)} />
              <Field label="Codigo" value={display(patient.custom_id || patient.id)} />
              <Field label="Sexo" value={display(patient.gender)} />
              <Field label="Nascimento" value={fmtDate(patient.birth_date)} />
              <Field label="Idade" value={patient.age_display || patient.age_years} />
            </DetailCard>

            <DetailCard title="Documento" icon={Badge} accent="bg-sky-500">
              <Field label="Tipo" value={display(patient.document_type)} />
              <Field label="Numero" value={display(patient.document_number)} />
              <Field label="NUIT" value={display(patient.nuit)} />
              <Field label="Nacionalidade" value={display(patient.nationality)} />
            </DetailCard>

            <DetailCard title="Contacto" icon={Phone} accent="bg-violet-500">
              <Field label="Telefone" value={display(patient.contact)} />
              <Field label="Email" value={display(patient.email)} />
              <Field label="Endereco" value={address} />
            </DetailCard>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Contexto ocupacional
          </h2>
          <div className="grid gap-3 lg:grid-cols-3">
            <DetailCard title="Empresa" icon={Building2} accent="bg-emerald-500">
              <Field label="Empresa" value={display(patient.origin_company_name)} />
              <Field label="Proveniencia" value={display(patient.provenance || patient.proveniencia)} />
              <Field label="Cargo" value={display(patient.job_title || patient.profession)} />
              <Field label="Departamento" value={display(patient.department)} />
            </DetailCard>

            <DetailCard title="Admissao e seguimento" icon={CalendarDays} accent="bg-amber-500">
              <Field label="Criado em" value={fmtDate(patient.created_at)} />
              <Field label="Actualizado em" value={fmtDate(patient.updated_at)} />
              <Field label="Estado" value={display(patient.status)} />
              <Field label="Categoria" value={display(patient.category)} />
            </DetailCard>

            <DetailCard title="Notas clinicas" icon={HeartPulse} accent="bg-rose-500">
              <Field label="Alergias" value={display(patient.allergies)} />
              <Field label="Grupo sanguineo" value={display(patient.blood_type)} />
              <Field label="Observacoes" value={display(patient.notes || patient.observations)} />
            </DetailCard>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Fluxos relacionados
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/requests/new", label: "Nova requisicao", icon: ClipboardList, accent: "bg-violet-500" },
              { href: `/patients/${encodeURIComponent(String(patient.id))}/medical-history`, label: "Historico clinico", icon: FileText, accent: "bg-sky-500" },
              { href: "/nursing/procedures", label: "Procedimentos", icon: HeartPulse, accent: "bg-emerald-500" },
              { href: `mailto:${display(patient.email, "")}`, label: "Enviar email", icon: Mail, accent: "bg-amber-500" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="relative flex items-center gap-2 overflow-hidden rounded-lg border border-border/70 bg-card px-3 py-2 pl-4 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/30 hover:bg-muted/40"
                >
                  <span className={`absolute inset-y-0 left-0 w-1 ${item.accent}`} />
                  <Icon size={15} className="text-muted-foreground" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
