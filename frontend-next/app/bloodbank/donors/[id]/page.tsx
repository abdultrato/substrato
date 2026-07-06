"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Droplet,
  FileText,
  HeartPulse,
  Pencil,
  Phone,
  User,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

type PatientDetail = Record<string, any>
type DonationRow = Record<string, any>

const GLASS_CARD =
  "rounded-xl border border-white/20 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]"

const DONOR_ROLE: Record<string, string> = { VOL: "Voluntário", REP: "Substituição" }
const DONATION_TYPE: Record<string, string> = { WBL: "Sangue total", APH: "Aférese" }
const SCREENING_STATUS: Record<string, string> = { PEN: "Pendente", APR: "Aprovado", REJ: "Rejeitado" }
const DONATION_STATUS: Record<string, string> = { REG: "Registado", SCR: "Em triagem", COM: "Concluída", CAN: "Cancelada" }

function fmtDate(value?: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })
}

function ageLabel(value?: string | null): string {
  if (!value) return "—"
  const birth = new Date(value)
  if (Number.isNaN(birth.getTime())) return "—"
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return `${age} anos`
}

function bloodTypeLabel(value: any): string {
  const v = String(value || "").trim()
  return !v || v === "UNK" ? "—" : v
}

function initials(name?: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "—") return null
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-xs">
      <span className="shrink-0 font-medium text-muted-foreground">{label}</span>
      <span className="max-w-[62%] text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <section className={GLASS_CARD}>
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/35 text-[var(--primary-700)] shadow-sm backdrop-blur-sm dark:bg-white/10 dark:text-[var(--primary-300)]">
          <Icon size={14} />
        </span>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="divide-y divide-border/40 px-3">{children}</div>
    </section>
  )
}

export default function BloodDonorDetailsPage() {
  useAuthGuard()
  const router = useRouter()
  const safeRefreshToken = useSafeDataRefreshSignal()
  const params = useParams() as { id?: string | string[] }
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [donor, setDonor] = useState<PatientDetail | null>(null)
  const [donations, setDonations] = useState<DonationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const [patient, donationRes] = await Promise.all([
        apiFetch<PatientDetail>(`/patients/${id}/`, { clientCache: safeRefreshToken === 0 }),
        apiFetch<{ results?: DonationRow[] }>(`/blood-donations/?donor=${id}&page_size=20&ordering=-collected_at`, {
          clientCache: safeRefreshToken === 0,
        }),
      ])
      setDonor(patient)
      setDonations(Array.isArray(donationRes?.results) ? donationRes.results : [])
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar doador.")
    } finally {
      setLoading(false)
    }
  }, [id, safeRefreshToken])

  useEffect(() => {
    load()
  }, [load])

  const latestDonation = donations[0]

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO, GROUPS.RECEPCAO, GROUPS.MEDICINA]}>
      <div className="mx-auto flex w-[98vw] max-w-[98vw] flex-col gap-3 overflow-x-hidden px-2 pb-4">
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="h-32 animate-pulse rounded-xl border border-white/20 bg-white/25 dark:border-white/10 dark:bg-white/[0.05]" />
            <div className="h-32 animate-pulse rounded-xl border border-white/20 bg-white/25 dark:border-white/10 dark:bg-white/[0.05]" />
          </div>
        ) : error || !donor ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/15 dark:text-red-300">
            {error || "Doador não encontrado."}
          </div>
        ) : (
          <>
            <section className={`relative overflow-hidden ${GLASS_CARD}`}>
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-8 top-0 h-24 w-24 rounded-full bg-rose-500/10 blur-3xl" />
                <div className="absolute right-0 top-8 h-28 w-28 rounded-full bg-cyan-500/10 blur-3xl" />
              </div>
              <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b from-rose-500 via-pink-500 to-cyan-500" />

              <div className="relative flex flex-wrap items-center gap-3 px-4 py-3 pl-5">
                <button
                  type="button"
                  onClick={() => router.push("/bloodbank")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/35 px-3 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/50 dark:border-white/10 dark:bg-white/[0.08]"
                >
                  <ArrowLeft size={14} />
                  Voltar
                </button>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-cyan-600 text-sm font-bold text-white shadow-md shadow-rose-500/20">
                  {initials(donor.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {donor.custom_id || `#${donor.id}`}
                  </div>
                  <h1 className="text-lg font-bold text-foreground">{donor.name || "Doador"}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-rose-200/70 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:border-rose-400/20 dark:text-rose-300">
                      {bloodTypeLabel(donor.blood_type)}
                    </span>
                    <span className="rounded-full border border-cyan-200/70 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:border-cyan-400/20 dark:text-cyan-300">
                      {ageLabel(donor.birth_date)}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/patients/${donor.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/35 px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/50 dark:border-white/10 dark:bg-white/[0.08]"
                >
                  <Pencil size={13} />
                  Abrir paciente
                </Link>
              </div>
            </section>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="grid gap-3">
                <SectionCard icon={User} title="Identificação">
                  <InfoRow label="Nome" value={donor.name} />
                  <InfoRow label="Contacto" value={donor.contact || donor.email} />
                  <InfoRow label="Documento" value={donor.document_number} />
                  <InfoRow label="Nascimento" value={fmtDate(donor.birth_date)} />
                  <InfoRow label="Grupo sanguíneo" value={bloodTypeLabel(donor.blood_type)} />
                </SectionCard>

                <SectionCard icon={Droplet} title="Perfil de doação">
                  <InfoRow label="Total de doações visíveis" value={String(donations.length)} />
                  <InfoRow label="Última doação" value={fmtDate(latestDonation?.collected_at || latestDonation?.created_at)} />
                  <InfoRow label="Tipo de doador" value={DONOR_ROLE[String(latestDonation?.donor_role || "")] || latestDonation?.donor_role} />
                  <InfoRow label="Tipo de coleta" value={DONATION_TYPE[String(latestDonation?.donation_type || "")] || latestDonation?.donation_type} />
                  <InfoRow label="Triagem" value={SCREENING_STATUS[String(latestDonation?.screening_status || "")] || latestDonation?.screening_status} />
                  <InfoRow label="Estado" value={DONATION_STATUS[String(latestDonation?.status || "")] || latestDonation?.status} />
                </SectionCard>
              </div>

              <div className="grid gap-3">
                <SectionCard icon={HeartPulse} title="Sinais e elegibilidade">
                  <InfoRow label="Peso" value={latestDonation?.donor_weight_kg ? `${latestDonation.donor_weight_kg} kg` : undefined} />
                  <InfoRow label="Altura" value={latestDonation?.donor_height_cm ? `${latestDonation.donor_height_cm} cm` : undefined} />
                  <InfoRow label="Hemoglobina" value={latestDonation?.hemoglobin_g_dl ? `${latestDonation.hemoglobin_g_dl} g/dL` : undefined} />
                  <InfoRow label="Pulso" value={latestDonation?.pulse_bpm ? `${latestDonation.pulse_bpm} bpm` : undefined} />
                  <InfoRow label="Pressão arterial" value={latestDonation?.blood_pressure_systolic && latestDonation?.blood_pressure_diastolic ? `${latestDonation.blood_pressure_systolic}/${latestDonation.blood_pressure_diastolic} mmHg` : undefined} />
                </SectionCard>

                <SectionCard icon={Phone} title="Contacto e apoio">
                  <InfoRow label="Telefone" value={donor.contact} />
                  <InfoRow label="Email" value={donor.email} />
                  <InfoRow label="Acompanhante" value={donor.companion_name} />
                  <InfoRow label="Contacto do acompanhante" value={donor.companion_contact} />
                </SectionCard>
              </div>
            </div>

            <SectionCard icon={Activity} title="Histórico recente de doações">
              <div className="grid gap-2 py-3">
                {donations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/20 bg-white/18 px-4 py-6 text-center text-sm text-muted-foreground backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
                    Nenhuma doação recente encontrada para este doador.
                  </div>
                ) : (
                  donations.map((item) => (
                    <Link
                      key={item.id}
                      href={`/bloodbank/blood-donations/${item.id}`}
                      className="group relative overflow-hidden rounded-xl border border-white/20 bg-white/22 px-3 py-3 shadow-sm backdrop-blur-sm transition hover:bg-white/35 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
                    >
                      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rose-500 to-cyan-500" />
                      <div className="grid gap-2 md:grid-cols-4">
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Bolsa</div>
                          <div className="text-sm font-medium text-foreground">{item.bag_identifier || item.custom_id || `#${item.id}`}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Data</div>
                          <div className="text-sm font-medium text-foreground">{fmtDate(item.collected_at || item.created_at)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Triagem</div>
                          <div className="text-sm font-medium text-foreground">{SCREENING_STATUS[String(item.screening_status || "")] || item.screening_status || "—"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Estado</div>
                          <div className="text-sm font-medium text-foreground">{DONATION_STATUS[String(item.status || "")] || item.status || "—"}</div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard icon={FileText} title="Atalhos relacionados">
              <div className="flex flex-wrap gap-2 py-3">
                <Link href="/bloodbank/blood-donations" className="inline-flex h-9 items-center rounded-lg border border-white/20 bg-white/35 px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/50 dark:border-white/10 dark:bg-white/[0.08]">
                  Ver doações
                </Link>
                <Link href={`/bloodbank/blood-donations/new?donor=${donor.id}`} className="inline-flex h-9 items-center rounded-lg border border-white/20 bg-white/35 px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/50 dark:border-white/10 dark:bg-white/[0.08]">
                  Nova doação
                </Link>
                <Link href={`/patients/${donor.id}`} className="inline-flex h-9 items-center rounded-lg border border-white/20 bg-white/35 px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition hover:bg-white/50 dark:border-white/10 dark:bg-white/[0.08]">
                  Ficha clínica completa
                </Link>
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </AppLayout>
  )
}
