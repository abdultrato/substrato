"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Droplet,
  Edit2,
  HeartPulse,
  Loader2,
  Phone,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch, apiFetchList } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type PatientDetail = Record<string, unknown>
type DonationRow   = Record<string, unknown>

const DONOR_ROLE:      Record<string, string> = { VOL: "Voluntário", REP: "Substituição" }
const DONATION_TYPE:   Record<string, string> = { WBL: "Sangue total", APH: "Aférese" }
const SCREENING_STATUS:Record<string, string> = { PEN: "Pendente", APR: "Aprovado", REJ: "Rejeitado" }
const DONATION_STATUS: Record<string, string> = { REG: "Registado", SCR: "Em triagem", COM: "Concluída", CAN: "Cancelada" }

const STATUS_CHIP: Record<string, string> = {
  REG: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-600/30 dark:bg-slate-800/20 dark:text-slate-300",
  SCR: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-600/30 dark:bg-amber-900/20 dark:text-amber-300",
  COM: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-600/30 dark:bg-emerald-900/20 dark:text-emerald-300",
  CAN: "border-red-200 bg-red-50 text-red-700 dark:border-red-600/30 dark:bg-red-900/20 dark:text-red-300",
}

const SCREEN_CHIP: Record<string, string> = {
  PEN: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-600/30 dark:bg-amber-900/20 dark:text-amber-300",
  APR: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-600/30 dark:bg-emerald-900/20 dark:text-emerald-300",
  REJ: "border-red-200 bg-red-50 text-red-700 dark:border-red-600/30 dark:bg-red-900/20 dark:text-red-300",
}

function fmtDate(v?: unknown): string {
  const s = String(v || "")
  if (!s) return "—"
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })
}

function ageLabel(v?: unknown): string {
  const s = String(v || "")
  if (!s) return "—"
  const b = new Date(s)
  if (isNaN(b.getTime())) return "—"
  const t = new Date()
  let age = t.getFullYear() - b.getFullYear()
  if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--
  return `${age} anos`
}

function bloodTypeLabel(v: unknown): string {
  const s = String(v || "").trim()
  return !s || s === "UNK" ? "—" : s
}

function parseEligibilityBlock(donor: PatientDetail | null, latestDonation: DonationRow | undefined) {
  if (!donor || !latestDonation?.collected_at) return null
  const gender = String(donor.gender || "").trim().toLowerCase()
  const isFemale = gender.includes("femin") || gender.includes("femenin") || gender === "f"
  const daysRequired = isFemale ? 120 : 90
  const lastDate = new Date(String(latestDonation.collected_at))
  if (Number.isNaN(lastDate.getTime())) return null
  const today = new Date()
  const daysElapsed = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
  if (daysElapsed >= daysRequired) return null
  const releaseDate = new Date(lastDate)
  releaseDate.setDate(releaseDate.getDate() + daysRequired)
  return {
    daysRequired,
    daysElapsed,
    releaseDate: releaseDate.toLocaleDateString("pt-PT", { dateStyle: "long" }),
    lastDate: lastDate.toLocaleDateString("pt-PT", { dateStyle: "long" }),
    summary: isFemale
      ? "Doadoras do sexo feminino devem aguardar 120 dias entre doações."
      : "Doadores do sexo masculino devem aguardar 90 dias entre doações.",
  }
}

function initials(name?: unknown): string {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function Card({ title, accent, icon: Icon, children }: {
  title: string; accent?: string; icon: React.ElementType; children: React.ReactNode
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      {accent && <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${accent}`} />}
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1.5 pl-4">
        <Icon size={11} className="text-rose-500 dark:text-rose-400" />
        <h2 className="text-[11px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-3 pl-4">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "—") return null
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-right text-[11px] font-medium text-foreground">{value}</span>
    </div>
  )
}

export default function BloodDonorDetailsPage() {
  useAuthGuard()
  const router = useRouter()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const params = useParams() as { id?: string | string[] }
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [donor, setDonor]       = useState<PatientDetail | null>(null)
  const [donations, setDonations] = useState<DonationRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true); setError(null)
      const [patient, donationRes] = await Promise.all([
        apiFetch<PatientDetail>(`/patients/${id}/`, { clientCache: safeRefreshToken === 0 }),
        apiFetchList<DonationRow>("/bloodbank/donation/", {
          pageSize: 20, query: { donor: id, ordering: "-collected_at" }, clientCache: safeRefreshToken === 0,
        }),
      ])
      setDonor(patient)
      setDonations(Array.isArray(donationRes?.items) ? donationRes.items : [])
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || "Erro ao carregar doador.")
    } finally { setLoading(false) }
  }, [id, safeRefreshToken])

  useEffect(() => { load() }, [load])

  const latestDonation = donations[0]
  const eligibilityBlock = parseEligibilityBlock(donor, latestDonation)

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO, GROUPS.RECEPCAO, GROUPS.MEDICINA]}>
      <div className="mx-auto w-[90%] space-y-2 pb-4">

        {loading && (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}

        {!loading && (error || !donor) && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error || "Doador não encontrado."}
          </div>
        )}

        {!loading && donor && (
          <>
            {/* ── Hero ───────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/10 blur-2xl" />
                <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
                <div className="absolute bottom-0 right-1/3 h-20 w-20 rounded-full bg-pink-500/10 blur-2xl" />
              </div>
              <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-rose-500 via-pink-500 to-cyan-500" />

              <div className="relative flex flex-wrap items-center gap-3 px-4 py-3 pl-5">
                <button type="button" onClick={() => router.push("/bloodbank")}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                  <ArrowLeft size={13} /> Voltar
                </button>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-cyan-600 text-sm font-bold text-white shadow-md shadow-rose-500/25">
                  {initials(donor.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {String(donor.custom_id || `#${donor.id}`)}
                  </div>
                  <h1 className="text-base font-bold leading-tight text-foreground">
                    {String(donor.name || "Doador")}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-rose-200/70 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-900/20 dark:text-rose-300">
                      {bloodTypeLabel(donor.blood_type)}
                    </span>
                    <span className="rounded-full border border-cyan-200/70 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-900/20 dark:text-cyan-300">
                      <CalendarDays size={8} className="mr-0.5 inline" />
                      {ageLabel(donor.birth_date)}
                    </span>
                    <span className="rounded-full border border-indigo-200/70 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:border-indigo-400/20 dark:bg-indigo-900/20 dark:text-indigo-300">
                      <Droplet size={8} className="mr-0.5 inline" />
                      {donations.length} {donations.length === 1 ? "doação" : "doações"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!eligibilityBlock ? (
                    <Link href={`/bloodbank/blood-donations/new?donor=${donor.id}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 px-3 text-xs font-semibold text-white shadow-md shadow-rose-500/20 transition hover:from-rose-700 hover:to-pink-700">
                      Nova doação
                    </Link>
                  ) : null}
                  <Link href={`/patients/${donor.id}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-muted">
                    <Edit2 size={12} /> Ficha clínica
                  </Link>
                </div>
              </div>
            </div>

            {eligibilityBlock ? (
              <div className="relative overflow-hidden rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-100">
                <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  Nova doação temporariamente bloqueada
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">{eligibilityBlock.summary}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2 dark:border-amber-700/30 dark:bg-white/[0.04]">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Última doação</div>
                    <div className="mt-0.5 text-[11px] font-medium">{eligibilityBlock.lastDate}</div>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2 dark:border-amber-700/30 dark:bg-white/[0.04]">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Dias decorridos</div>
                    <div className="mt-0.5 text-[11px] font-medium">{eligibilityBlock.daysElapsed} de {eligibilityBlock.daysRequired}</div>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2 dark:border-amber-700/30 dark:bg-white/[0.04]">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Liberado em</div>
                    <div className="mt-0.5 text-[11px] font-medium">{eligibilityBlock.releaseDate}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* ── Grid de cartões ────────────────────────────────── */}
            <div className="grid gap-2 lg:grid-cols-3">

              <Card title="Identificação" icon={User} accent="bg-gradient-to-b from-rose-500 to-pink-600">
                <div className="space-y-0.5">
                  <Row label="Nome completo" value={String(donor.name || "—")} />
                  <Row label="Documento"     value={donor.document_number ? String(donor.document_number) : undefined} />
                  <Row label="Data nasc."    value={fmtDate(donor.birth_date)} />
                  <Row label="Idade"         value={ageLabel(donor.birth_date)} />
                  <Row label="Grupo sanguíneo" value={
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:border-rose-400/20 dark:bg-rose-900/20 dark:text-rose-300">
                      {bloodTypeLabel(donor.blood_type)}
                    </span>
                  } />
                </div>
              </Card>

              <Card title="Contacto e apoio" icon={Phone} accent="bg-cyan-500">
                <div className="space-y-0.5">
                  <Row label="Telefone"    value={donor.contact ? String(donor.contact) : undefined} />
                  <Row label="Email"       value={donor.email ? String(donor.email) : undefined} />
                  <Row label="Acompanhante" value={donor.companion_name ? String(donor.companion_name) : undefined} />
                  <Row label="Tel. acompanhante" value={donor.companion_contact ? String(donor.companion_contact) : undefined} />
                </div>
              </Card>

              <Card title="Sinais e elegibilidade" icon={HeartPulse} accent="bg-gradient-to-b from-pink-500 to-rose-600">
                <div className="space-y-0.5">
                  <Row label="Peso"         value={latestDonation?.donor_weight_kg ? `${latestDonation.donor_weight_kg} kg` : undefined} />
                  <Row label="Altura"       value={latestDonation?.donor_height_cm ? `${latestDonation.donor_height_cm} cm` : undefined} />
                  <Row label="Hemoglobina" value={latestDonation?.hemoglobin_g_dl ? `${latestDonation.hemoglobin_g_dl} g/dL` : undefined} />
                  <Row label="Pulso"        value={latestDonation?.pulse_bpm ? `${latestDonation.pulse_bpm} bpm` : undefined} />
                  <Row label="Pressão art." value={
                    latestDonation?.blood_pressure_systolic && latestDonation?.blood_pressure_diastolic
                      ? `${latestDonation.blood_pressure_systolic}/${latestDonation.blood_pressure_diastolic} mmHg`
                      : undefined
                  } />
                </div>
              </Card>

            </div>

            {/* ── Histórico de doações ────────────────────────────── */}
            <section className="relative overflow-hidden rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-rose-500 to-cyan-600" />
              <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1.5 pl-4">
                <Activity size={11} className="text-rose-500 dark:text-rose-400" />
                <h2 className="text-[11px] font-semibold text-foreground">Histórico de doações</h2>
                <span className="ml-auto rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300">
                  {donations.length}
                </span>
              </div>

              {donations.length === 0 ? (
                <p className="px-4 py-6 text-center text-[11px] text-muted-foreground">
                  Nenhuma doação registada para este doador.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {donations.map((item) => {
                    const st = String(item.status || "")
                    const accentCls = st === "COM" ? "bg-emerald-500" : st === "SCR" ? "bg-amber-500" : st === "CAN" ? "bg-red-500" : "bg-slate-400"
                    return (
                      <button key={String(item.id)} type="button"
                        onClick={() => router.push(`/bloodbank/blood-donations/${item.id}`)}
                        className="group text-left">
                        <div className="relative overflow-hidden rounded-lg border border-white/30 bg-white/30 shadow-sm backdrop-blur-sm transition group-hover:bg-white/50 dark:border-white/10 dark:bg-white/5 dark:group-hover:bg-white/10 h-full">
                          <span className={`absolute inset-x-0 top-0 h-1 rounded-t-lg ${accentCls}`} />
                          <div className="flex flex-col gap-1 px-2.5 pb-2 pt-3">
                            <span className="font-mono text-[10px] font-bold leading-tight text-foreground truncate">
                              {String(item.bag_identifier || item.custom_id || `#${item.id}`)}
                            </span>
                            {(item.collected_at || item.created_at) && (
                              <span className="text-[9px] text-muted-foreground">
                                {fmtDate(String(item.collected_at || item.created_at))}
                              </span>
                            )}
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {item.donation_type && (
                                <span className="text-[8px] text-muted-foreground">
                                  {DONATION_TYPE[String(item.donation_type)] || String(item.donation_type)}
                                </span>
                              )}
                              {item.volume_ml && (
                                <span className="text-[8px] text-muted-foreground">{String(item.volume_ml)} mL</span>
                              )}
                            </div>
                            <div className="flex flex-col gap-1 pt-0.5">
                              <span className={`rounded-full border px-1.5 py-0.5 text-center text-[8px] font-semibold ${SCREEN_CHIP[String(item.screening_status || "")] ?? "border-border bg-muted text-muted-foreground"}`}>
                                {SCREENING_STATUS[String(item.screening_status || "")] || String(item.screening_status || "—")}
                              </span>
                              <span className={`rounded-full border px-1.5 py-0.5 text-center text-[8px] font-semibold ${STATUS_CHIP[String(item.status || "")] ?? "border-border bg-muted text-muted-foreground"}`}>
                                {DONATION_STATUS[String(item.status || "")] || String(item.status || "—")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>

          </>
        )}
      </div>
    </AppLayout>
  )
}
