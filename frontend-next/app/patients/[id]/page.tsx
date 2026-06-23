"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Building2,
    Calendar,
    Droplets,
    FileText,
    HeartHandshake,
    Pencil,
    Phone,
    User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch } from "@/lib/api";
import { isNotFoundLikeError } from "@/lib/errors/api-error";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";
import type { Patient } from "@/lib/types";

type PatientDetail = Patient & {
    age_display?: string | null;
    age_years?: number | null;
    is_blood_donor?: boolean;
    updated_at?: string;
};

const VIEW_GROUPS = [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.ENFERMAGEM,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
];

const DOC_LABELS: Record<string, string> = {
    BI: "Bilhete de Identidade",
    PASS: "Passaporte",
    DIRE: "DIRE",
    CC: "Carta de Condução",
    NUIT: "NUIT",
    CE: "Cartão de Eleitor",
    CN: "Certidão de Nascimento",
    OUT: "Outro",
};

function fmtDate(value?: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("pt-PT", { dateStyle: "medium" });
}

function initials(name?: string): string {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function genderLabel(gender?: string): string {
    const value = (gender || "").trim().toLowerCase();
    if (value === "masculino") return "Masculino";
    if (value === "femenino" || value === "feminino") return "Feminino";
    return gender || "—";
}

function genderTone(gender?: string): string {
    switch ((gender || "").trim().toLowerCase()) {
        case "masculino":
            return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
        case "femenino":
        case "feminino":
            return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300";
        default:
            return "bg-[var(--gray-100)] text-[var(--gray-700)] dark:bg-[var(--gray-800)] dark:text-[var(--gray-200)]";
    }
}

function buildAddress(p: PatientDetail): string {
    const parts = [
        p.address_street,
        p.address_number,
        p.address_neighborhood,
        p.address_city,
        p.address_province,
        p.address_postal_code,
        p.address_complement,
    ].filter(Boolean);
    return parts.join(", ") || p.address || "—";
}

function documentValue(p: PatientDetail): string {
    if (!p.document_number) return "—";
    const label = DOC_LABELS[p.document_type || ""] || p.document_type || "";
    return `${label} ${p.document_number}`.trim();
}

function Badge({
    tone,
    icon: Icon,
    children,
}: {
    tone: string;
    icon?: React.ElementType;
    children: React.ReactNode;
}) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
            {Icon ? <Icon size={11} /> : null}
            {children}
        </span>
    );
}

function SectionCard({
    icon: Icon,
    title,
    children,
}: {
    icon: React.ElementType;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
            <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--primary-600)]/10 text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                    <Icon size={13} />
                </span>
                <h2 className="text-xs font-semibold text-foreground">{title}</h2>
            </div>
            <div className="divide-y divide-border/40 px-3">{children}</div>
        </section>
    );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-2 text-xs">
            <span className="shrink-0 font-medium text-muted-foreground">{label}</span>
            <span className="max-w-[62%] text-right font-medium text-foreground">{value ?? "—"}</span>
        </div>
    );
}

export default function PacienteDetalhePage() {
    useAuthGuard();
    const { user } = useAuth();
    const safeRefreshToken = useSafeDataRefreshSignal();
    const router = useRouter();

    const { id } = useParams() as { id?: string | string[] };
    const idStr = Array.isArray(id) ? id[0] : id;

    const podeEditar = userHasAnyGroup(user, [
        GROUPS.ADMIN,
        GROUPS.RECEPCAO,
        GROUPS.MEDICINA_OCUPACIONAL,
    ]);

    const canViewClinicalHistory = userHasAnyGroup(user, [
        GROUPS.ADMIN,
        GROUPS.MEDICINA,
        GROUPS.MEDICINA_OCUPACIONAL,
    ]);

    const [paciente, setPaciente] = useState<PatientDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const carregar = useCallback(async () => {
        if (!idStr) return;
        try {
            setLoading(true);
            setError(null);
            setPaciente(null);
            const data = await apiFetch<PatientDetail>(`/patients/${idStr}/`, {
                clientCache: safeRefreshToken === 0,
            });
            setPaciente(data);
        } catch (err: any) {
            setError(isNotFoundLikeError(err) ? null : err?.message || "Erro ao carregar paciente");
        } finally {
            setLoading(false);
        }
    }, [idStr, safeRefreshToken]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    const backButton = (
        <button
            type="button"
            onClick={() => router.push("/patients")}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground-2 transition hover:bg-muted"
        >
            <ArrowLeft size={14} />
            Voltar
        </button>
    );

    if (loading) {
        return (
            <AppLayout requiredGroups={VIEW_GROUPS}>
                <div className="space-y-3">
                    <div className="h-24 animate-pulse rounded-xl border border-white/20 bg-white/25 dark:bg-white/5 dark:border-white/10" />
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="h-40 animate-pulse rounded-xl border border-white/20 bg-white/25 dark:bg-white/5 dark:border-white/10" />
                        <div className="h-40 animate-pulse rounded-xl border border-white/20 bg-white/25 dark:bg-white/5 dark:border-white/10" />
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (error || !paciente) {
        return (
            <AppLayout requiredGroups={VIEW_GROUPS}>
                <div className="space-y-3">
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
                        {error || "Paciente não encontrado"}
                    </div>
                    {backButton}
                </div>
            </AppLayout>
        );
    }

    const p = paciente;
    const hasCompanion = Boolean(
        p.companion_name || p.companion_contact || p.companion_relationship || p.companion_email,
    );

    return (
        <AppLayout requiredGroups={VIEW_GROUPS}>
            <div className="space-y-3">
                {/* Hero de identidade */}
                <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 px-4 py-3 shadow-sm backdrop-blur-sm dark:bg-white/5 dark:border-white/10">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--primary-600)]/10 text-lg font-bold text-[var(--primary-700)] dark:text-[var(--primary-400)]">
                                {initials(p.name)}
                            </span>
                            <div className="min-w-0">
                                <h1 className="truncate text-lg font-bold leading-tight text-foreground">{p.name}</h1>
                                <p className="text-[11px] text-muted-foreground">{p.custom_id || `ID ${p.id}`}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    <Badge
                                        tone="bg-[var(--gray-100)] text-[var(--gray-700)] dark:bg-[var(--gray-800)] dark:text-[var(--gray-200)]"
                                        icon={Calendar}
                                    >
                                        {p.age_display || "—"}
                                    </Badge>
                                    <Badge tone={genderTone(p.gender)}>{genderLabel(p.gender)}</Badge>
                                    {p.pregnant ? (
                                        <Badge
                                            tone="bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300"
                                            icon={HeartHandshake}
                                        >
                                            Gestante{p.gestational_age_weeks ? ` · ${p.gestational_age_weeks}s` : ""}
                                        </Badge>
                                    ) : null}
                                    {p.is_blood_donor ? (
                                        <Badge
                                            tone="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
                                            icon={Droplets}
                                        >
                                            Doador de sangue
                                        </Badge>
                                    ) : null}
                                    {p.is_organ_donor ? (
                                        <Badge
                                            tone="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                            icon={HeartHandshake}
                                        >
                                            Doador de órgãos
                                        </Badge>
                                    ) : null}
                                    {p.provenance === "Medicina Ocupacional" ? (
                                        <Badge
                                            tone="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
                                            icon={Building2}
                                        >
                                            Med. Ocupacional
                                        </Badge>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {backButton}
                            {canViewClinicalHistory ? (
                                <button
                                    type="button"
                                    onClick={() => router.push(`/patients/${idStr}/medical-history`)}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground-2 transition hover:bg-muted"
                                >
                                    <FileText size={14} />
                                    História clínica
                                </button>
                            ) : null}
                            {podeEditar ? (
                                <button
                                    type="button"
                                    onClick={() => router.push(`/patients/${idStr}/edit`)}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
                                >
                                    <Pencil size={14} />
                                    Editar
                                </button>
                            ) : (
                                <span className="self-center text-xs text-muted-foreground">Somente leitura</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Secções */}
                <div className="grid gap-3 md:grid-cols-2">
                    <SectionCard icon={User} title="Identificação">
                        <InfoRow label="Género" value={genderLabel(p.gender)} />
                        <InfoRow label="Idade" value={p.age_display || "—"} />
                        <InfoRow label="Data de nascimento" value={fmtDate(p.birth_date)} />
                        <InfoRow label="Raça / origem" value={p.race_origin || "—"} />
                        <InfoRow
                            label="Tipo sanguíneo"
                            value={p.blood_type && p.blood_type !== "UNK" ? p.blood_type : "—"}
                        />
                        <InfoRow label="Documento" value={documentValue(p)} />
                    </SectionCard>

                    <SectionCard icon={Phone} title="Contacto e morada">
                        <InfoRow label="Telefone" value={p.contact || "—"} />
                        <InfoRow label="Email" value={p.email || "—"} />
                        <InfoRow label="Morada" value={buildAddress(p)} />
                    </SectionCard>

                    <SectionCard icon={HeartHandshake} title="Clínico">
                        <InfoRow
                            label="Gestante"
                            value={
                                p.pregnant
                                    ? `Sim${p.gestational_age_weeks ? ` · ${p.gestational_age_weeks} semanas` : ""}`
                                    : "Não"
                            }
                        />
                        <InfoRow label="Doador de sangue" value={p.is_blood_donor ? "Sim" : "Não"} />
                        <InfoRow label="Doador de órgãos" value={p.is_organ_donor ? "Sim" : "Não"} />
                    </SectionCard>

                    {hasCompanion ? (
                        <SectionCard icon={User} title="Acompanhante">
                            <InfoRow label="Nome" value={p.companion_name || "—"} />
                            <InfoRow label="Parentesco" value={p.companion_relationship || "—"} />
                            <InfoRow label="Telefone" value={p.companion_contact || "—"} />
                            <InfoRow label="Email" value={p.companion_email || "—"} />
                        </SectionCard>
                    ) : null}

                    {p.origin_company_name ? (
                        <SectionCard icon={Building2} title="Medicina Ocupacional">
                            <InfoRow label="Empresa de origem" value={p.origin_company_name} />
                        </SectionCard>
                    ) : null}

                    <SectionCard icon={FileText} title="Registo">
                        <InfoRow label="Proveniência" value={p.provenance || "—"} />
                        <InfoRow label="Criado em" value={fmtDate(p.created_at)} />
                        {p.updated_at ? <InfoRow label="Atualizado em" value={fmtDate(p.updated_at)} /> : null}
                    </SectionCard>
                </div>
            </div>
        </AppLayout>
    );
}
