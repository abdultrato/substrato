"use client"

import Link from "next/link"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import {
    AlertCircle,
    AtSign,
    BadgeCheck,
    Camera,
    CheckCircle2,
    Mail,
    Pencil,
    Phone,
    ShieldCheck,
    User,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"

type UserMe = {
    id: number
    username?: string | null
    email?: string | null
    phone?: string | null
    first_name?: string | null
    last_name?: string | null
    photo_url?: string | null
    foto_url?: string | null
    full_name?: string | null
    is_active?: boolean | null
    is_staff?: boolean | null
    last_login?: string | null
    date_joined?: string | null
}

const statPill =
    "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold backdrop-blur-xl"

function ReadinessPill ( { label, done }: { label: string; done: boolean } ) {
    return (
        <span
            className={`${statPill} ${done
                ? "border-emerald-200/50 bg-emerald-100/30 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                : "border-amber-200/50 bg-amber-100/30 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"}`}
        >
            {done ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
            {label}
        </span>
    )
}

function ProfileCard ( {
    label,
    value,
    icon: Icon,
    bar,
    chip,
}: {
    label: string
    value?: string | null
    icon: typeof User
    bar: string
    chip: string
} ) {
    const displayValue = value?.trim() || "Não informado"
    const empty = !value?.trim()

    return (
        <div
            className={`flex min-w-0 items-center gap-2 rounded-xl border border-l-4 border-white/20 bg-white/25 p-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5 ${empty ? "border-l-amber-500 dark:border-l-amber-400" : bar}`}
        >
            <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${empty ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" : chip}`}>
                <Icon size={12} />
            </span>
            <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className={`truncate text-xs font-semibold ${empty ? "text-muted-foreground" : "text-foreground"}`}>
                    {displayValue}
                </div>
            </div>
        </div>
    )
}

export default function PerfilPage () {
    const safeRefreshToken = useSafeDataRefreshSignal()
    const [loading, setLoading] = useState( true )
    const [error, setError] = useState<string | null>( null )
    const [me, setMe] = useState<UserMe | null>( null )

    useEffect( () => {
        async function load () {
            try {
                setError( null )
                const data = await apiFetch<UserMe>( "/auth/user/", { clientCache: safeRefreshToken === 0 } )
                setMe( data )
            } catch (e) {
                setError( isNotFoundLikeError( e ) ? null : ( e instanceof Error ? e.message : "Falha ao carregar o perfil." ) )
            } finally {
                setLoading( false )
            }
        }

        load()
    }, [safeRefreshToken] )

    const displayName = useMemo( () => {
        const composed = `${me?.first_name || ""} ${me?.last_name || ""}`.trim()
        return composed || me?.full_name || me?.username || "Utilizador"
    }, [me] )

    const fotoUrl = me?.photo_url || me?.foto_url || null
    const initials = displayName
        .split( " " )
        .filter( Boolean )
        .slice( 0, 2 )
        .map( (part) => part.charAt( 0 ).toUpperCase() )
        .join( "" ) || "U"
    const hasName = Boolean( me?.first_name?.trim() || me?.last_name?.trim() || me?.full_name?.trim() )
    const hasEmail = Boolean( me?.email?.trim() )
    const hasPhone = Boolean( me?.phone?.trim() )
    const hasPhoto = Boolean( fotoUrl )
    const completedItems = [hasName, hasEmail, hasPhone, hasPhoto].filter( Boolean ).length
    const completionPercent = Math.round( ( completedItems / 4 ) * 100 )
    const accountActive = me?.is_active !== false
    const accessState = me?.is_staff ? "Equipa interna" : "Utilizador operacional"

    return (
        <AppLayout>
            <div className="space-y-1.5">
                {/* Cabeçalho fundido: avatar + estado + acção numa fila; completude + prontidão na segunda */}
                <section className="relative overflow-hidden rounded-2xl border border-violet-200/25 bg-gradient-to-br from-violet-100/[0.05] via-white/[0.015] to-indigo-100/[0.03] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-violet-800/20 dark:from-violet-950/[0.05] dark:via-white/[0.01] dark:to-indigo-950/[0.03]">
                    <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-violet-400/15 blur-3xl" />
                    <div className="relative flex flex-wrap items-center gap-2.5 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg shadow-md shadow-violet-500/25">
                                {fotoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={fotoUrl} alt={displayName} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
                                        {initials}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <h1 className="truncate text-base font-bold leading-tight text-foreground">
                                    {loading ? "A carregar…" : displayName}
                                </h1>
                                <p className="truncate text-[10px] text-muted-foreground">
                                    {loading ? " " : `@${me?.username || "sem utilizador"}${me?.email ? ` · ${me.email}` : ""}`}
                                </p>
                            </div>
                        </div>

                        {!loading && me ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                    className={`${statPill} ${accountActive
                                        ? "border-emerald-200/50 bg-emerald-100/30 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                                        : "border-rose-200/50 bg-rose-100/30 text-rose-700 dark:border-rose-700/30 dark:bg-rose-900/20 dark:text-rose-300"}`}
                                >
                                    <BadgeCheck size={11} /> Conta {accountActive ? "ativa" : "inativa"}
                                </span>
                                <span className={`${statPill} border-sky-200/50 bg-sky-100/30 text-sky-700 dark:border-sky-700/30 dark:bg-sky-900/20 dark:text-sky-300`}>
                                    <ShieldCheck size={11} /> {accessState}
                                </span>
                                <span className={`${statPill} border-violet-200/50 bg-violet-100/30 text-violet-700 dark:border-violet-700/30 dark:bg-violet-900/20 dark:text-violet-300`}>
                                    <User size={11} /> Completude <strong className="text-[11px]">{completionPercent}%</strong>
                                </span>
                            </div>
                        ) : null}

                        <div className="ml-auto flex flex-wrap items-center gap-1.5">
                            <Link
                                href="/profile/edit"
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 px-2.5 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition hover:from-violet-600 hover:to-indigo-700"
                            >
                                <Pencil size={13} />
                                Editar perfil
                            </Link>
                        </div>
                    </div>

                    {!loading && me ? (
                        <div className="relative flex flex-wrap items-center gap-1.5 border-t border-white/15 px-3 py-1.5 dark:border-white/[0.06]">
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className={`h-full rounded-full ${completionPercent === 100 ? "bg-emerald-500" : "bg-[var(--primary-600)]"}`}
                                        style={{ width: `${completionPercent}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-semibold text-muted-foreground">Perfil {completionPercent}% completo</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
                                <ReadinessPill label="Nome" done={hasName} />
                                <ReadinessPill label="E-mail" done={hasEmail} />
                                <ReadinessPill label="Telefone" done={hasPhone} />
                                <ReadinessPill label="Foto" done={hasPhoto} />
                            </div>
                        </div>
                    ) : null}
                </section>

                {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                        {Array.from( { length: 6 } ).map( (_, index) => (
                            <div key={index} className="h-14 animate-pulse rounded-xl border border-white/20 bg-white/25 dark:border-white/10 dark:bg-white/5" />
                        ) )}
                    </div>
                ) : me ? (
                    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                        <ProfileCard
                            label="Utilizador"
                            value={me.username}
                            icon={AtSign}
                            bar="border-l-violet-500 dark:border-l-violet-400"
                            chip="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
                        />
                        <ProfileCard
                            label="Nome"
                            value={me.first_name}
                            icon={User}
                            bar="border-l-sky-500 dark:border-l-sky-400"
                            chip="bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400"
                        />
                        <ProfileCard
                            label="Apelido"
                            value={me.last_name}
                            icon={User}
                            bar="border-l-sky-500 dark:border-l-sky-400"
                            chip="bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400"
                        />
                        <ProfileCard
                            label="E-mail"
                            value={me.email}
                            icon={Mail}
                            bar="border-l-emerald-500 dark:border-l-emerald-400"
                            chip="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                        />
                        <ProfileCard
                            label="Telefone"
                            value={me.phone}
                            icon={Phone}
                            bar="border-l-teal-500 dark:border-l-teal-400"
                            chip="bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400"
                        />
                        <ProfileCard
                            label="Fotografia"
                            value={hasPhoto ? "Definida" : null}
                            icon={Camera}
                            bar="border-l-indigo-500 dark:border-l-indigo-400"
                            chip="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                        />
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
                        Perfil não disponível.
                    </div>
                )}
            </div>
        </AppLayout>
    )
}
