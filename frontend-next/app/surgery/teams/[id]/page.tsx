"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Clock3,
  Edit3,
  FileText,
  Loader2,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import { apiFetch } from "@/lib/api"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

type Row = Record<string, any>

const ENDPOINT = "/surgery/equipa_cirurgica"
const ROUTE_BASE = "/surgery/teams"
const GLASS =
  "rounded-xl border border-white/20 bg-white/30 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]"

const ROLES: Record<string, { label: string; tone: string; bar: string }> = {
  MAIN_SURGEON: { label: "Cirurgião principal", tone: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-700/30 dark:bg-teal-900/20 dark:text-teal-300", bar: "bg-teal-500" },
  SURGEON: { label: "Cirurgião", tone: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-700/30 dark:bg-cyan-900/20 dark:text-cyan-300", bar: "bg-cyan-500" },
  ASSISTANT_SURGEON: { label: "Cirurgião assistente", tone: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300", bar: "bg-sky-500" },
  ASSISTANT: { label: "Assistente", tone: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600/40 dark:bg-slate-800/40 dark:text-slate-300", bar: "bg-slate-400" },
  ANESTHETIST: { label: "Anestesista", tone: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300", bar: "bg-violet-500" },
  SCRUB_NURSE: { label: "Instrumentista", tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300", bar: "bg-emerald-500" },
  CIRCULATING_NURSE: { label: "Circulante", tone: "border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-700/30 dark:bg-lime-900/20 dark:text-lime-300", bar: "bg-lime-500" },
  RECOVERY_NURSE: { label: "Recuperação", tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300", bar: "bg-amber-500" },
  ORDERLY: { label: "Maqueiro", tone: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700/30 dark:bg-orange-900/20 dark:text-orange-300", bar: "bg-orange-500" },
  PERFUSIONIST: { label: "Perfusionista", tone: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-700/30 dark:bg-fuchsia-900/20 dark:text-fuchsia-300", bar: "bg-fuchsia-500" },
  OTHER: { label: "Outro", tone: "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-600/40 dark:bg-zinc-800/40 dark:text-zinc-300", bar: "bg-zinc-400" },
}

const SURGERY_STATUS: Record<string, string> = {
  DRAFT: "Rascunho",
  REQUESTED: "Solicitada",
  AUTHORIZED: "Autorizada",
  AGENDADA: "Agendada",
  IN_OPERATING_ROOM: "Em sala operatória",
  SURGERY_STARTED: "Cirurgia iniciada",
  SURGERY_COMPLETED: "Cirurgia realizada",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
}

function roleOf(row: Row | null): string {
  return String(row?.role || "OTHER").toUpperCase()
}

function fmtDate(value: any): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

function durationLabel(entryAt: any, exitAt: any): string {
  if (!entryAt || !exitAt) return "—"
  const start = new Date(entryAt).getTime()
  const end = new Date(exitAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "—"
  const minutes = Math.round((end - start) / 60000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h}h ${m}min`
  if (h) return `${h}h`
  return `${m}min`
}

function surgeryHref(surgery: Row | null, fallbackId?: any): string {
  const id = surgery?.id ?? fallbackId
  if (!id) return "/surgery/surgeries"
  return surgery?.surgery_size === "GRANDE"
    ? `/surgery/large-surgeries/${id}`
    : `/surgery/small-surgeries/${id}`
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border border-white/20 bg-white/25 px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-foreground">{value || "—"}</div>
    </div>
  )
}

export default function SurgeryTeamMemberDetailPage() {
  const params = useParams()
  const id = routeParamToString((params as any)?.id)

  const [member, setMember] = useState<Row | null>(null)
  const [surgery, setSurgery] = useState<Row | null>(null)
  const [peers, setPeers] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const role = ROLES[roleOf(member)] || ROLES.OTHER
  const present = Boolean(member?.present)
  const operationHref = surgeryHref(surgery, member?.surgery)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const nextMember = await apiFetch<Row>(`${ENDPOINT}/${id}/`)
      setMember(nextMember)

      const [nextSurgery, peerResponse] = await Promise.all([
        nextMember?.surgery ? apiFetch<Row>(`/surgery/surgery/${nextMember.surgery}/`).catch(() => null) : Promise.resolve(null),
        nextMember?.surgery ? apiFetch<any>(`${ENDPOINT}/?surgery=${nextMember.surgery}&limit=100`).catch(() => null) : Promise.resolve(null),
      ])
      setSurgery(nextSurgery)
      setPeers(Array.isArray(peerResponse?.results) ? peerResponse.results : Array.isArray(peerResponse) ? peerResponse : [])
    } catch (e: any) {
      setError(e?.message || "Falha ao carregar membro da equipa cirúrgica.")
      setMember(null)
      setSurgery(null)
      setPeers([])
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const peerStats = useMemo(() => {
    const presentCount = peers.filter((item) => item.present).length
    const leadCount = peers.filter((item) => item.lead).length
    return { presentCount, leadCount, total: peers.length }
  }, [peers])

  if (loading) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin" /> Carregando...
        </div>
      </AppLayout>
    )
  }

  if (error || !member) {
    return (
      <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2 rounded-xl border border-rose-300/50 bg-rose-50/60 px-4 py-3 text-sm text-rose-700">
            <AlertCircle size={14} /> {error || "Membro não encontrado."}
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout fullWidth requiredGroups={requiredGroupsForResourceGroup("surgery")}>
      <div className="mx-auto w-full max-w-6xl space-y-2 px-1 py-1">
        <section className={`relative overflow-hidden ${GLASS}`}>
          <span className={`absolute left-0 top-0 h-full w-1 ${role.bar}`} />
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
          <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 pl-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                <Link href="/surgery" className="hover:text-foreground">Cirurgia</Link>
                <span>/</span>
                <Link href={ROUTE_BASE} className="hover:text-foreground">Equipa cirúrgica</Link>
                <span>/</span>
                <span className="font-mono text-foreground">{member.custom_id || `#${member.id}`}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold leading-tight text-foreground">{member.employee_name || "Profissional por definir"}</h1>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${role.tone}`}>
                  {role.label}
                </span>
                {member.lead ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300">
                    <BadgeCheck size={10} /> Responsável principal
                  </span>
                ) : null}
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${present ? "bg-teal-500/12 text-teal-700 dark:text-teal-300" : "bg-rose-500/12 text-rose-700 dark:text-rose-300"}`}>
                  <UserCheck size={10} /> {present ? "Presente" : "Ausente"}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Vinculado à cirurgia {member.surgery_code || `#${member.surgery}`} com responsabilidade operacional definida.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Link href={ROUTE_BASE} className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-card px-2.5 text-[11px] text-muted-foreground transition hover:bg-muted">
                <ArrowLeft size={11} /> Voltar
              </Link>
              <Link href={`${ROUTE_BASE}/${member.id}/edit`} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-teal-300 bg-teal-50 px-3 text-[11px] font-semibold text-teal-700 transition hover:bg-teal-100 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300">
                <Edit3 size={11} /> Editar
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-2 lg:grid-cols-[1.1fr_0.9fr]">
          <section className={`${GLASS} overflow-hidden`}>
            <div className="flex items-center gap-2 border-b border-white/20 px-4 py-3 dark:border-white/10">
              <Users size={16} className="text-teal-600 dark:text-teal-300" />
              <div>
                <h2 className="text-sm font-bold text-foreground">Participação na sala</h2>
                <p className="text-[11px] text-muted-foreground">Horários, presença e responsabilidade deste membro.</p>
              </div>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-3">
              <Field label="Entrada" value={fmtDate(member.entry_at)} />
              <Field label="Saída" value={fmtDate(member.exit_at)} />
              <Field label="Duração" value={durationLabel(member.entry_at, member.exit_at)} />
            </div>
            <div className="grid gap-2 px-4 pb-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/20 bg-white/25 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileText size={11} /> Responsabilidade
                </div>
                <p className="text-xs leading-relaxed text-foreground">{member.responsibility || "Sem responsabilidade descrita."}</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/25 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileText size={11} /> Notas
                </div>
                <p className="text-xs leading-relaxed text-foreground">{member.notes || "Sem notas adicionais."}</p>
              </div>
            </div>
          </section>

          <section className={`${GLASS} overflow-hidden`}>
            <div className="flex items-center justify-between gap-2 border-b border-white/20 px-4 py-3 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Stethoscope size={16} className="text-teal-600 dark:text-teal-300" />
                <div>
                  <h2 className="text-sm font-bold text-foreground">Contexto da cirurgia</h2>
                  <p className="text-[11px] text-muted-foreground">Paciente, estado e agenda associados.</p>
                </div>
              </div>
              <Link href={operationHref} className="text-[11px] font-semibold text-teal-700 hover:underline dark:text-teal-300">
                Abrir cirurgia
              </Link>
            </div>
            <div className="grid gap-2 p-4">
              <Field label="Código" value={member.surgery_code || surgery?.custom_id || `#${member.surgery}`} />
              <Field label="Paciente" value={surgery?.patient_name || surgery?.patient_detail?.name || "—"} />
              <Field label="Estado" value={SURGERY_STATUS[String(surgery?.status || "").toUpperCase()] || surgery?.status || "—"} />
              <Field label="Tipo" value={surgery?.surgery_size === "GRANDE" ? "Grande cirurgia" : surgery?.surgery_size === "PEQUENA" ? "Pequena cirurgia" : "—"} />
              <Field label="Agendada para" value={fmtDate(surgery?.scheduled_for)} />
              <Field label="Sala" value={surgery?.operating_room_name || surgery?.operating_room_detail?.name || "—"} />
            </div>
          </section>
        </div>

        <section className={`${GLASS} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/20 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-teal-600 dark:text-teal-300" />
              <div>
                <h2 className="text-sm font-bold text-foreground">Equipa desta cirurgia</h2>
                <p className="text-[11px] text-muted-foreground">
                  {peerStats.total} membro(s), {peerStats.presentCount} presente(s), {peerStats.leadCount} responsável(eis).
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-1.5 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {peers.map((peer) => {
              const peerRole = ROLES[roleOf(peer)] || ROLES.OTHER
              const active = Number(peer.id) === Number(member.id)
              return (
                <Link
                  key={peer.id}
                  href={`${ROUTE_BASE}/${peer.id}`}
                  className={`relative overflow-hidden rounded-lg border p-3 pl-4 transition hover:border-teal-300 hover:bg-teal-50/40 dark:hover:bg-teal-900/10 ${
                    active ? "border-teal-300 bg-teal-50/60 dark:border-teal-700/40 dark:bg-teal-900/20" : "border-white/20 bg-white/20 dark:border-white/10 dark:bg-white/[0.03]"
                  }`}
                >
                  <span className={`absolute left-0 top-0 h-full w-1 ${peerRole.bar}`} />
                  <div className="truncate text-xs font-bold text-foreground">{peer.employee_name || "Profissional por definir"}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${peerRole.tone}`}>{peerRole.label}</span>
                    {peer.lead ? <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Responsável</span> : null}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${peer.present ? "bg-teal-500/12 text-teal-700 dark:text-teal-300" : "bg-rose-500/12 text-rose-700 dark:text-rose-300"}`}>
                      {peer.present ? "Presente" : "Ausente"}
                    </span>
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <CalendarClock size={11} /> {fmtDate(peer.entry_at)}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </AppLayout>
  )
}
