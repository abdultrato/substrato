"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Building2,
  Calendar,
  Droplets,
  Edit2,
  FileText,
  FlaskConical,
  HeartHandshake,
  HeartPulse,
  Loader2,
  Phone,
  User,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { apiFetch, apiFetchList } from "@/lib/api";
import { isNotFoundLikeError } from "@/lib/errors/api-error";
import useAuthGuard from "@/hooks/useAuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh";
import { GROUPS, userHasAnyGroup } from "@/lib/rbac";
import type { Patient } from "@/lib/types";
import type { BloodDonation } from "@/lib/api-client/models/BloodDonation";

type PatientDetail = Patient & {
  age_display?: string | null;
  age_years?: number | null;
  is_blood_donor?: boolean;
  is_organ_donor?: boolean;
  is_replacement_donor_inapt?: boolean;
  replacement_donor_inapt_at?: string | null;
  replacement_donor_inapt_reason?: string;
  updated_at?: string;
};

const VIEW_GROUPS = [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.ENFERMAGEM, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL];

const DOC_LABELS: Record<string, string> = {
  BI: "BI", PASS: "Passaporte", DIRE: "DIRE", CC: "C. Condução",
  NUIT: "NUIT", CE: "C. Eleitor", CN: "Cert. Nascimento", OUT: "Outro",
};

const DONOR_ROLE:       Record<string, string> = { VOL: "Voluntário", REP: "Substituição" };
const DONATION_TYPE:    Record<string, string> = { WBL: "Sangue total", APH: "Aférese" };
const DONATION_STATUS:  Record<string, string> = { REG: "Registado", SCR: "Em rastreio", COM: "Concluído", CAN: "Cancelado" };
const SCREENING_STATUS: Record<string, string> = { PEN: "Pendente", APR: "Aprovado", REJ: "Rejeitado" };
const TEST_RESULT:      Record<string, string> = { PEN: "Pendente", NEG: "Negativo", POS: "Positivo", INC: "Inconclusivo", NDO: "N/D" };

const STATUS_CHIP: Record<string, string> = {
  REG: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/20 dark:text-slate-300",
  SCR: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-600/30 dark:bg-amber-900/20 dark:text-amber-300",
  COM: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-600/30 dark:bg-emerald-900/20 dark:text-emerald-300",
  CAN: "border-red-200 bg-red-50 text-red-700 dark:border-red-600/30 dark:bg-red-900/20 dark:text-red-300",
};

function fmtDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("pt-PT", { dateStyle: "medium" });
}

function initials(name?: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function genderLabel(g?: string) {
  const v = (g || "").trim().toLowerCase();
  if (v === "masculino") return "Masculino";
  if (v === "femenino" || v === "feminino") return "Feminino";
  return g || "—";
}

function buildAddress(p: PatientDetail): string {
  const parts = [p.address_street, p.address_number, p.address_neighborhood, p.address_city, p.address_province, p.address_postal_code].filter(Boolean);
  return parts.join(", ") || p.address || "";
}

function documentValue(p: PatientDetail): string {
  if (!p.document_number) return "";
  const label = DOC_LABELS[p.document_type || ""] || p.document_type || "";
  return `${label} ${p.document_number}`.trim();
}

function testBadge(val?: string): React.ReactNode {
  if (!val || val === "NDO") return <span className="text-muted-foreground text-[10px]">N/D</span>;
  const colors: Record<string, string> = {
    NEG: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-600/30 dark:bg-emerald-900/20 dark:text-emerald-300",
    POS: "border-red-200 bg-red-50 text-red-700 dark:border-red-600/30 dark:bg-red-900/20 dark:text-red-300",
    PEN: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-600/30 dark:bg-amber-900/20 dark:text-amber-300",
    INC: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-600/30 dark:bg-orange-900/20 dark:text-orange-300",
  };
  return <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${colors[val] ?? "border-border bg-muted text-muted-foreground"}`}>{TEST_RESULT[val] ?? val}</span>;
}

function Card({ title, accent, icon: Icon, children, colSpan }: {
  title: string; accent: string; icon: React.ElementType; children: React.ReactNode; colSpan?: string;
}) {
  return (
    <section className={`relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5 ${colSpan || ""}`}>
      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-1.5 pl-4">
        <Icon size={11} className="text-muted-foreground" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-0.5 p-3 pl-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-0.5">
      <span className="shrink-0 text-[10px] text-muted-foreground">{label}</span>
      <span className="text-right text-[11px] font-medium text-foreground">{value}</span>
    </div>
  );
}

function Chip({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color}`}>{children}</span>;
}

export default function PacienteDetalhePage() {
  useAuthGuard();
  const { user } = useAuth();
  const safeRefreshToken = useSafeDataRefreshSignal();
  const router = useRouter();
  const { id } = useParams() as { id?: string | string[] };
  const idStr = Array.isArray(id) ? id[0] : id;

  const podeEditar = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA_OCUPACIONAL]);
  const canViewHistory = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL]);

  const [paciente, setPaciente] = useState<PatientDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [donations, setDonations] = useState<BloodDonation[]>([]);

  const carregar = useCallback(async () => {
    if (!idStr) return;
    try {
      setLoading(true); setError(null); setPaciente(null);
      const data = await apiFetch<PatientDetail>(`/patients/${idStr}/`, { clientCache: safeRefreshToken === 0 });
      setPaciente(data);
      if (data.is_blood_donor) {
        try {
          const res = await apiFetchList<BloodDonation>("/bloodbank/donation/", {
            pageSize: 20,
            query: { donor: idStr, ordering: "-collected_at" },
            clientCache: safeRefreshToken === 0,
          });
          setDonations(Array.isArray(res?.items) ? res.items : []);
        } catch { setDonations([]); }
      }
    } catch (err: unknown) {
      setError(isNotFoundLikeError(err) ? null : (err as { message?: string })?.message || "Erro ao carregar paciente");
    } finally { setLoading(false); }
  }, [idStr, safeRefreshToken]);

  useEffect(() => { carregar(); }, [carregar]);

  if (loading) return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={22} className="animate-spin" />
      </div>
    </AppLayout>
  );

  if (error || !paciente) return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-3">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
          {error || "Paciente não encontrado."}
        </div>
        <button onClick={() => router.push("/patients")}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
          <ArrowLeft size={13} /> Voltar
        </button>
      </div>
    </AppLayout>
  );

  const p = paciente;
  const last = donations[0];
  const addr = buildAddress(p);
  const doc  = documentValue(p);
  const hasCompanion = Boolean(p.companion_name || p.companion_contact || p.companion_relationship || p.companion_email);

  return (
    <AppLayout requiredGroups={VIEW_GROUPS}>
      <div className="mx-auto w-[90%] space-y-2 pb-4">

        {/* ── Hero ───────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl" />
          </div>
          <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-blue-500 via-indigo-500 to-violet-500" />

          <div className="relative flex flex-wrap items-center gap-3 px-4 py-3 pl-5">
            <button type="button" onClick={() => router.push("/patients")}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
              <ArrowLeft size={13} /> Voltar
            </button>

            {/* Avatar */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-md shadow-blue-500/25">
              {initials(p.name)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] text-muted-foreground">{p.custom_id || `#${p.id}`}</div>
              <h1 className="text-base font-bold leading-tight text-foreground">{p.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {p.age_display && (
                  <Chip color="border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/20 dark:text-slate-300">
                    <Calendar size={9} /> {p.age_display}
                  </Chip>
                )}
                {p.gender && (
                  <Chip color={
                    (p.gender || "").toLowerCase() === "masculino"
                      ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-600/30 dark:bg-sky-900/20 dark:text-sky-300"
                      : "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-600/30 dark:bg-pink-900/20 dark:text-pink-300"
                  }>{genderLabel(p.gender)}</Chip>
                )}
                {p.blood_type && p.blood_type !== "UNK" && (
                  <Chip color="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-600/30 dark:bg-rose-900/20 dark:text-rose-300">
                    <Droplets size={9} /> {p.blood_type}
                  </Chip>
                )}
                {p.is_blood_donor && (
                  <Chip color="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-600/30 dark:bg-rose-900/20 dark:text-rose-300">
                    <Droplets size={9} /> Doador de sangue
                  </Chip>
                )}
                {p.is_organ_donor && (
                  <Chip color="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-600/30 dark:bg-amber-900/20 dark:text-amber-300">
                    <HeartHandshake size={9} /> Doador de órgãos
                  </Chip>
                )}
                {p.pregnant && (
                  <Chip color="border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-600/30 dark:bg-pink-900/20 dark:text-pink-300">
                    <HeartHandshake size={9} /> Gestante{p.gestational_age_weeks ? ` · ${p.gestational_age_weeks}s` : ""}
                  </Chip>
                )}
                {p.provenance === "Medicina Ocupacional" && (
                  <Chip color="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-600/30 dark:bg-violet-900/20 dark:text-violet-300">
                    <Building2 size={9} /> Med. Ocupacional
                  </Chip>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canViewHistory && (
                <button type="button" onClick={() => router.push(`/patients/${idStr}/medical-history`)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                  <FileText size={13} /> História clínica
                </button>
              )}
              {p.is_blood_donor && (
                <Link href={`/bloodbank/donors/${p.id}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
                  <Droplets size={13} /> Perfil doador
                </Link>
              )}
              {podeEditar ? (
                <button type="button" onClick={() => router.push(`/patients/${idStr}/edit`)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700">
                  <Edit2 size={13} /> Editar
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">Somente leitura</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Cartões de informação ───────────────────────────── */}
        <div className="grid gap-2 lg:grid-cols-3">

          <Card title="Identificação" accent="bg-gradient-to-b from-blue-500 to-indigo-600" icon={User}>
            <Row label="Género"        value={genderLabel(p.gender)} />
            <Row label="Data nasc."    value={fmtDate(p.birth_date)} />
            <Row label="Raça / origem" value={p.race_origin} />
            <Row label="Grupo sanguíneo" value={p.blood_type && p.blood_type !== "UNK"
              ? <Chip color="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-600/30 dark:bg-rose-900/20 dark:text-rose-300"><Droplets size={9} /> {p.blood_type}</Chip>
              : undefined} />
            <Row label="Documento"     value={doc || undefined} />
            <Row label="Proveniência"  value={p.provenance || undefined} />
          </Card>

          <Card title="Contacto e morada" accent="bg-indigo-500" icon={Phone}>
            <Row label="Telefone" value={p.contact} />
            <Row label="Email"    value={p.email} />
            <Row label="Morada"   value={addr || undefined} />
          </Card>

          <Card title="Clínico" accent="bg-gradient-to-b from-violet-500 to-purple-600" icon={HeartHandshake}>
            <Row label="Gestante" value={p.pregnant
              ? <Chip color="border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-600/30 dark:bg-pink-900/20 dark:text-pink-300">Sim{p.gestational_age_weeks ? ` · ${p.gestational_age_weeks}s` : ""}</Chip>
              : "Não"} />
            <Row label="Doador de sangue" value={p.is_blood_donor
              ? <Chip color="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-600/30 dark:bg-rose-900/20 dark:text-rose-300"><Droplets size={9} /> Sim</Chip>
              : "Não"} />
            <Row label="Doador de órgãos" value={p.is_organ_donor
              ? <Chip color="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-600/30 dark:bg-amber-900/20 dark:text-amber-300">Sim</Chip>
              : "Não"} />
            {p.origin_company_name && <Row label="Empresa" value={p.origin_company_name} />}
          </Card>

          {hasCompanion && (
            <Card title="Acompanhante" accent="bg-teal-500" icon={User}>
              <Row label="Nome"        value={p.companion_name} />
              <Row label="Parentesco"  value={p.companion_relationship} />
              <Row label="Telefone"    value={p.companion_contact} />
              <Row label="Email"       value={p.companion_email} />
            </Card>
          )}

          <Card title="Registo" accent="bg-slate-400" icon={FileText} colSpan={hasCompanion ? "" : "lg:col-span-3"}>
            <Row label="Criado em"     value={fmtDate(p.created_at)} />
            <Row label="Atualizado em" value={fmtDate(p.updated_at)} />
          </Card>

        </div>

        {/* ── Secções de doação (só se doador) ───────────────── */}
        {p.is_blood_donor && (
          <>
            <div className="grid gap-2 lg:grid-cols-3">

              <Card title="Perfil de doação" accent="bg-gradient-to-b from-rose-500 to-pink-600" icon={Droplets}>
                <Row label="Total de doações"  value={donations.length > 0 ? String(donations.length) : undefined} />
                <Row label="Última doação"     value={last ? fmtDate(last.collected_at) : undefined} />
                <Row label="Tipo de doador"    value={last?.donor_role ? (DONOR_ROLE[last.donor_role] ?? last.donor_role) : undefined} />
                <Row label="Tipo de colheita"  value={last?.donation_type ? (DONATION_TYPE[last.donation_type] ?? last.donation_type) : undefined} />
                <Row label="Volume colhido"    value={last?.volume_ml ? `${last.volume_ml} mL` : undefined} />
                <Row label="Estado" value={last?.status
                  ? <Chip color={STATUS_CHIP[last.status] ?? "border-border bg-muted text-muted-foreground"}>{DONATION_STATUS[last.status] ?? last.status}</Chip>
                  : undefined} />
                {p.is_replacement_donor_inapt && (
                  <Row label="Inapto (substituição)" value={
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      Sim{p.replacement_donor_inapt_at ? ` · ${fmtDate(p.replacement_donor_inapt_at)}` : ""}
                    </span>
                  } />
                )}
                {p.replacement_donor_inapt_reason && <Row label="Motivo inaptidão" value={p.replacement_donor_inapt_reason} />}
              </Card>

              {last && (last.donor_weight_kg || last.hemoglobin_g_dl || last.blood_pressure_systolic || last.pulse_bpm || last.temperature_c) && (
                <Card title="Sinais vitais (última doação)" accent="bg-cyan-500" icon={HeartPulse}>
                  {last.donor_weight_kg   && <Row label="Peso"          value={`${last.donor_weight_kg} kg`} />}
                  {last.donor_height_cm   && <Row label="Altura"         value={`${last.donor_height_cm} cm`} />}
                  {last.hemoglobin_g_dl   && <Row label="Hemoglobina"    value={`${last.hemoglobin_g_dl} g/dL`} />}
                  {last.blood_pressure_systolic && last.blood_pressure_diastolic && (
                    <Row label="Pressão art." value={`${last.blood_pressure_systolic}/${last.blood_pressure_diastolic} mmHg`} />
                  )}
                  {last.pulse_bpm         && <Row label="Pulso"          value={`${last.pulse_bpm} bpm`} />}
                  {last.temperature_c     && <Row label="Temperatura"    value={`${last.temperature_c} °C`} />}
                </Card>
              )}

              {last && (
                <Card title="Rastreio serológico" accent="bg-gradient-to-b from-amber-500 to-orange-500" icon={FlaskConical}>
                  <Row label="VIH"              value={testBadge(last.hiv_test)} />
                  <Row label="Sífilis (RPR)"    value={testBadge(last.syphilis_rpr_test)} />
                  <Row label="Hepatite B"       value={testBadge(last.hepatitis_b_hbsag_test)} />
                  <Row label="Hepatite C"       value={testBadge(last.hepatitis_c_anti_hcv_test)} />
                  <Row label="Malária"          value={testBadge(last.malaria_test)} />
                  {last.test_notes && <Row label="Notas" value={last.test_notes} />}
                </Card>
              )}
            </div>

            {/* Histórico de doações */}
            <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-rose-500 to-cyan-600" />
              <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1.5 pl-4">
                <Activity size={11} className="text-rose-500" />
                <h2 className="text-[11px] font-semibold text-foreground">Histórico de doações</h2>
                <span className="ml-auto rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
                  {donations.length}
                </span>
              </div>
              {donations.length === 0 ? (
                <p className="px-4 py-5 text-center text-[11px] text-muted-foreground">Nenhuma doação registada.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {donations.map((item) => {
                    const accentCls =
                      item.status === "COM" ? "bg-emerald-500" :
                      item.status === "SCR" ? "bg-amber-500"   :
                      item.status === "CAN" ? "bg-red-500"     : "bg-slate-400";
                    const screenColor =
                      item.screening_status === "APR"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-600/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : item.screening_status === "REJ"
                        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-600/30 dark:bg-red-900/20 dark:text-red-300"
                        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-600/30 dark:bg-amber-900/20 dark:text-amber-300";
                    return (
                      <button key={item.id} type="button"
                        onClick={() => router.push(`/bloodbank/blood-donations/${item.id}`)}
                        className="group text-left">
                        <div className="relative h-full overflow-hidden rounded-lg border border-white/30 bg-white/30 shadow-sm backdrop-blur-sm transition group-hover:bg-white/50 dark:border-white/10 dark:bg-white/5 dark:group-hover:bg-white/10">
                          <span className={`absolute inset-x-0 top-0 h-1 rounded-t-lg ${accentCls}`} />
                          <div className="flex flex-col gap-1 px-2.5 pb-2 pt-3">
                            <span className="truncate font-mono text-[10px] font-bold leading-tight text-foreground">
                              {item.bag_identifier || item.custom_id || `#${item.id}`}
                            </span>
                            {item.collected_at && (
                              <span className="text-[9px] text-muted-foreground">{fmtDate(item.collected_at)}</span>
                            )}
                            <div className="flex flex-wrap gap-1">
                              {item.donation_type && (
                                <span className="text-[8px] text-muted-foreground">{DONATION_TYPE[item.donation_type] ?? item.donation_type}</span>
                              )}
                              {item.volume_ml && (
                                <span className="text-[8px] text-muted-foreground">{item.volume_ml} mL</span>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 pt-0.5">
                              {item.screening_status && (
                                <span className={`rounded-full border px-1.5 py-0.5 text-center text-[8px] font-semibold ${screenColor}`}>
                                  {SCREENING_STATUS[item.screening_status] ?? item.screening_status}
                                </span>
                              )}
                              {item.status && (
                                <span className={`rounded-full border px-1.5 py-0.5 text-center text-[8px] font-semibold ${STATUS_CHIP[item.status] ?? "border-border bg-muted text-muted-foreground"}`}>
                                  {DONATION_STATUS[item.status] ?? item.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

      </div>
    </AppLayout>
  );
}
