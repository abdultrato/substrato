"use client"

import Link from "next/link"
import { isNotFoundLikeError } from "@/lib/errors/api-error"
import { ArrowLeft, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
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
    full_name?: string | null
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
            <div className="space-y-4 pb-24 md:pb-4">
                <PageHeader
                    title="Editar perfil"
                    actions={
                        <Link
                            href="/profile"
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
                        >
                            <ArrowLeft size={16} />
                            Voltar
                        </Link>
                    }
                />

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
                        {error}
                    </div>
                )}

                <Card title="Dados do utilizador" subtitle="Campos básicos para identificação e notificações.">
                    {loading ? (
                        <div className="text-sm text-muted-foreground">Carregando...</div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                            <div className="flex flex-col items-center gap-2">
                                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                                    {fotoPreviewUrl || me?.photo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={fotoPreviewUrl || ( me?.photo_url as string )}
                                            alt={displayName}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-2xl font-semibold text-foreground">
                                            {displayName.charAt( 0 ).toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                <label className="cursor-pointer text-xs font-medium text-foreground-2 hover:text-foreground">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => setFotoFile( e.target.files?.[0] || null )}
                                    />
                                    Alterar foto
                                </label>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <FormField label="Utilizador" hint="Somente leitura.">
                                    <TextInput value={me?.username || ""} readOnly disabled />
                                </FormField>

                                <FormField label="E-mail">
                                    <TextInput
                                        value={email}
                                        onChange={(e) => setEmail( e.target.value )}
                                        placeholder="Ex.: utilizador@empresa.com"
                                        inputMode="email"
                                    />
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

                                <FormField label="Telefone" hint="Use o número com indicativo (+258...).">
                                    <TextInput
                                        value={phone}
                                        onChange={(e) => setPhone( e.target.value )}
                                        placeholder="+258..."
                                        inputMode="tel"
                                    />
                                </FormField>

                                <div className="hidden items-end justify-end sm:col-span-2 md:flex">
                                    <Button
                                        type="button"
                                        onClick={onSave}
                                        loading={saving}
                                        disabled={!me}
                                        className="min-w-40"
                                    >
                                        {!saving && <Save size={16} />}
                                        Guardar alterações
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            <div className="fixed inset-x-0 bottom-10 z-30 border-t border-border bg-background/95 px-4 py-3 shadow-sm backdrop-blur md:hidden">
                <Button
                    type="button"
                    onClick={onSave}
                    loading={saving}
                    disabled={loading || !me}
                    className="w-full"
                >
                    {!saving && <Save size={16} />}
                    Guardar alterações
                </Button>
            </div>
        </AppLayout>
    )
}
