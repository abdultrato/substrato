"use client"

import Link from "next/link"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { AlertCircle, ArrowLeft, AtSign, Camera, CheckCircle2, Mail, Phone, Save, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import FormField from "@/components/ui/FormField"
import TextInput from "@/components/ui/TextInput"
import Button from "@/components/ui/Button"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { useSafeDataRefresh, useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"

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
}

const statPill =
    "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[10px] font-semibold backdrop-blur-xl"

function StatusPill ( { label, done }: { label: string; done: boolean } ) {
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

export default function EditarPerfilPage () {
    const router = useRouter()
    const { refreshUser } = useAuth()
    const safeRefreshToken = useSafeDataRefreshSignal()
    const { hasUnsavedInput } = useSafeDataRefresh()

    const [loading, setLoading] = useState( true )
    const [saving, setSaving] = useState( false )
    const [error, setError] = useState<string | null>( null )

    const [me, setMe] = useState<UserMe | null>( null )
    const [firstName, setFirstName] = useState( "" )
    const [lastName, setLastName] = useState( "" )
    const [email, setEmail] = useState( "" )
    const [phone, setPhone] = useState( "" )
    const [fotoFile, setFotoFile] = useState<File | null>( null )
    const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>( null )

    const displayName = useMemo( () => {
        const composed = `${firstName} ${lastName}`.trim()
        return composed || me?.full_name || me?.username || "Utilizador"
    }, [firstName, lastName, me] )
    const currentPhotoUrl = fotoPreviewUrl || me?.photo_url || me?.foto_url || null
    const initials = displayName
        .split( " " )
        .filter( Boolean )
        .slice( 0, 2 )
        .map( (part) => part.charAt( 0 ).toUpperCase() )
        .join( "" ) || "U"
    const hasContact = Boolean( email.trim() || phone.trim() )
    const hasIdentity = Boolean( firstName.trim() || lastName.trim() )
    const hasChanges = Boolean(
        fotoFile ||
        firstName !== ( me?.first_name || "" ) ||
        lastName !== ( me?.last_name || "" ) ||
        email !== ( me?.email || "" ) ||
        phone !== ( me?.phone || "" )
    )

    useEffect( () => {
        if ( safeRefreshToken > 0 && hasUnsavedInput ) return
        async function load () {
            try {
                setError( null )
                const data = await apiFetch<UserMe>( "/auth/user/", { clientCache: safeRefreshToken === 0 } )
                setMe( data )
                setFirstName( ( data?.first_name || "" ).toString() )
                setLastName( ( data?.last_name || "" ).toString() )
                setEmail( ( data?.email || "" ).toString() )
                setPhone( ( data?.phone || "" ).toString() )
            } catch (e) {
                setError( isNotFoundLikeError( e ) ? null : ( e instanceof Error ? e.message : "Falha ao carregar o perfil." ) )
            } finally {
                setLoading( false )
            }
        }

        load()
    }, [hasUnsavedInput, safeRefreshToken] )

    useEffect( () => {
        if ( !fotoFile ) {
            setFotoPreviewUrl( null )
            return
        }

        const url = URL.createObjectURL( fotoFile )
        setFotoPreviewUrl( url )
        return () => URL.revokeObjectURL( url )
    }, [fotoFile] )

    async function onSave () {
        try {
            setSaving( true )
            setError( null )

            const hasFoto = !!fotoFile
            const normalizedEmail = email.trim()
            const normalizedPhone = phone.trim()

            const payloadKeys = {
                first_name: firstName,
                last_name: lastName,
                email: normalizedEmail,
                phone: normalizedPhone,
            }

            let updated: UserMe | null = null

            if ( hasFoto ) {
                const fd = new FormData()
                for ( const [k, v] of Object.entries( payloadKeys ) ) {
                    fd.append( k, v ?? "" )
                }
                fd.append( "photo", fotoFile as File )
                updated = await apiFetch<UserMe>( "/auth/user/", {
                    method: "PATCH",
                    body: fd,
                } )
            } else {
                updated = await apiFetch<UserMe>( "/auth/user/", {
                    method: "PATCH",
                    body: JSON.stringify( payloadKeys ),
                } )
            }

            setMe( updated )
            setFotoFile( null )
            await refreshUser().catch( () => undefined )
            router.replace( "/profile" )
        } catch (e) {
            setError( isNotFoundLikeError( e ) ? null : ( e instanceof Error ? e.message : "Falha ao atualizar o perfil." ) )
        } finally {
            setSaving( false )
        }
    }

    return (
        <AppLayout>
            <div className="space-y-1.5 pb-24 md:pb-0">
                {/* Cabeçalho fundido: voltar + avatar + estado + guardar numa só fila */}
                <section className="relative overflow-hidden rounded-2xl border border-violet-200/25 bg-gradient-to-br from-violet-100/[0.05] via-white/[0.015] to-indigo-100/[0.03] shadow-xl shadow-slate-900/5 backdrop-blur-2xl dark:border-violet-800/20 dark:from-violet-950/[0.05] dark:via-white/[0.01] dark:to-indigo-950/[0.03]">
                    <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-violet-400/15 blur-3xl" />
                    <div className="relative flex flex-wrap items-center gap-2.5 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                            <Link
                                href="/profile"
                                aria-label="Voltar ao perfil"
                                title="Voltar ao perfil"
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/25 bg-white/[0.05] text-foreground backdrop-blur-xl transition hover:bg-white/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.08]"
                            >
                                <ArrowLeft size={13} />
                            </Link>
                            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg shadow-md shadow-violet-500/25">
                                {currentPhotoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={currentPhotoUrl} alt={displayName} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
                                        {initials}
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0">
                                <h1 className="truncate text-base font-bold leading-tight text-foreground">Editar perfil</h1>
                                <p className="truncate text-[10px] text-muted-foreground">
                                    {loading ? "A carregar…" : `@${me?.username || "sem utilizador"} · ${displayName}`}
                                </p>
                            </div>
                        </div>

                        {!loading ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <StatusPill label="Identidade" done={hasIdentity} />
                                <StatusPill label="Contacto" done={hasContact} />
                                {hasChanges ? <StatusPill label="Por guardar" done={false} /> : null}
                            </div>
                        ) : null}

                        <div className="ml-auto hidden md:block">
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={loading || saving || !me || !hasChanges}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 px-2.5 text-xs font-semibold text-white shadow-md shadow-violet-500/25 transition hover:from-violet-600 hover:to-indigo-700 disabled:opacity-50"
                            >
                                <Save size={13} />
                                {saving ? "A guardar…" : "Guardar alterações"}
                            </button>
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="grid gap-1.5 lg:grid-cols-[220px_1fr]">
                        <div className="h-56 animate-pulse rounded-xl border border-white/20 bg-white/25 dark:border-white/10 dark:bg-white/5" />
                        <div className="grid gap-1.5 sm:grid-cols-2">
                            {Array.from( { length: 4 } ).map( (_, index) => (
                                <div key={index} className="h-16 animate-pulse rounded-xl border border-white/20 bg-white/25 dark:border-white/10 dark:bg-white/5" />
                            ) )}
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-1.5 lg:grid-cols-[220px_1fr]">
                        <div className="overflow-hidden rounded-xl border border-l-4 border-white/20 border-l-indigo-500 bg-white/25 shadow-sm backdrop-blur-sm dark:border-white/10 dark:border-l-indigo-400 dark:bg-white/5">
                            <div className="relative h-44 bg-muted">
                                {currentPhotoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={currentPhotoUrl} alt={displayName} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 text-4xl font-bold text-white">
                                        {initials}
                                    </div>
                                )}
                                <label className="absolute bottom-2 left-2 inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md bg-background/90 px-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => setFotoFile( e.target.files?.[0] || null )}
                                    />
                                    <Camera size={13} />
                                    Alterar foto
                                </label>
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1.5">
                                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                                    <Camera size={12} />
                                </span>
                                <div className="min-w-0">
                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fotografia</div>
                                    <div className="truncate text-xs font-semibold text-foreground">
                                        {fotoFile ? "Nova foto por guardar" : currentPhotoUrl ? "Definida" : "Ausente"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/20 bg-white/25 p-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <FormField label="Utilizador" hint="Somente leitura.">
                                    <div className="relative">
                                        <AtSign className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                        <TextInput value={me?.username || ""} readOnly disabled className="pl-9" />
                                    </div>
                                </FormField>

                                <FormField label="Nome">
                                    <TextInput
                                        value={firstName}
                                        onChange={(e) => setFirstName( e.target.value )}
                                        placeholder="Nome"
                                    />
                                </FormField>

                                <FormField label="Apelido">
                                    <TextInput
                                        value={lastName}
                                        onChange={(e) => setLastName( e.target.value )}
                                        placeholder="Apelido"
                                    />
                                </FormField>

                                <FormField label="E-mail">
                                    <TextInput
                                        value={email}
                                        onChange={(e) => setEmail( e.target.value )}
                                        placeholder="Ex.: utilizador@empresa.com"
                                        inputMode="email"
                                    />
                                </FormField>

                                <FormField label="Telefone" hint="Use o número com indicativo (+258...).">
                                    <TextInput
                                        value={phone}
                                        onChange={(e) => setPhone( e.target.value )}
                                        placeholder="+258..."
                                        inputMode="tel"
                                    />
                                </FormField>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="fixed inset-x-0 bottom-10 z-30 border-t border-border bg-background/95 px-4 py-3 shadow-sm backdrop-blur md:hidden">
                <Button
                    type="button"
                    onClick={onSave}
                    loading={saving}
                    disabled={loading || !me || !hasChanges}
                    className="w-full"
                >
                    {!saving && <Save size={16} />}
                    Guardar alterações
                </Button>
            </div>
        </AppLayout>
    )
}
