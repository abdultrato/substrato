"use client"

import Link from "next/link"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { Pencil } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
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
}

function ProfileValue ( { label, value }: { label: string; value?: string | null } ) {
    const displayValue = value?.trim() || "Não informado"

    return (
        <div className="rounded-md border border-border bg-background px-3 py-2">
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <div className="mt-1 break-words text-sm font-semibold text-foreground">{displayValue}</div>
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

    return (
        <AppLayout>
            <div className="space-y-4">
                <PageHeader
                    title="Perfil"
                    actions={
                        <Link
                            href="/profile/edit"
                            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover"
                        >
                            <Pencil size={16} />
                            Editar perfil
                        </Link>
                    }
                />

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
                        {error}
                    </div>
                )}

                <Card title="Dados do utilizador" subtitle="Resumo atual do seu perfil.">
                    {loading ? (
                        <div className="text-sm text-muted-foreground">Carregando...</div>
                    ) : (
                        <div className="grid gap-5 md:grid-cols-[128px_1fr]">
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                                    {fotoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={fotoUrl}
                                            alt={displayName}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-3xl font-semibold text-foreground">
                                            {displayName.charAt( 0 ).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="max-w-32 text-center text-sm font-semibold text-foreground">
                                    {displayName}
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <ProfileValue label="Utilizador" value={me?.username} />
                                <ProfileValue label="Nome completo" value={displayName} />
                                <ProfileValue label="E-mail" value={me?.email} />
                                <ProfileValue label="Telefone" value={me?.phone} />
                                <ProfileValue label="Nome" value={me?.first_name} />
                                <ProfileValue label="Apelido" value={me?.last_name} />
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    )
}
