"use client"

import { useEffect, useMemo, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import FormField from "@/components/ui/FormField"
import TextInput from "@/components/ui/TextInput"
import Button from "@/components/ui/Button"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

type UserMe = {
    id: number
    username?: string | null
    email?: string | null
    telefone?: string | null
    first_name?: string | null
    last_name?: string | null
    foto_url?: string | null
    full_name?: string | null
}

export default function PerfilPage () {
    const { refreshUser } = useAuth()

    const [loading, setLoading] = useState( true )
    const [saving, setSaving] = useState( false )
    const [error, setError] = useState<string | null>( null )
    const [success, setSuccess] = useState<string | null>( null )

    const [me, setMe] = useState<UserMe | null>( null )
    const [firstName, setFirstName] = useState( "" )
    const [lastName, setLastName] = useState( "" )
    const [email, setEmail] = useState( "" )
    const [telefone, setTelefone] = useState( "" )
    const [fotoFile, setFotoFile] = useState<File | null>( null )
    const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string | null>( null )

    const displayName = useMemo( () => {
        const composed = `${firstName} ${lastName}`.trim()
        return composed || me?.full_name || me?.username || "Utilizador"
    }, [firstName, lastName, me] )

    useEffect( () => {
        async function load () {
            try {
                setError( null )
                const data = await apiFetch<UserMe>( "/auth/user/" )
                setMe( data )
                setFirstName( ( data?.first_name || "" ).toString() )
                setLastName( ( data?.last_name || "" ).toString() )
                setEmail( ( data?.email || "" ).toString() )
                setTelefone( ( data?.telefone || "" ).toString() )
            } catch (e) {
                setError( e instanceof Error ? e.message : "Falha ao carregar o perfil." )
            } finally {
                setLoading( false )
            }
        }

        load()
    }, [] )

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
            setSuccess( null )

            const hasFoto = !!fotoFile
            const payloadKeys = {
                first_name: firstName,
                last_name: lastName,
                email,
                telefone,
            }

            let updated: UserMe | null = null

            if ( hasFoto ) {
                const fd = new FormData()
                for ( const [k, v] of Object.entries( payloadKeys ) ) {
                    fd.append( k, v ?? "" )
                }
                fd.append( "foto", fotoFile as File )
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
            setSuccess( "Perfil atualizado com sucesso." )
            await refreshUser()
        } catch (e) {
            setError( e instanceof Error ? e.message : "Falha ao atualizar o perfil." )
        } finally {
            setSaving( false )
        }
    }

    return (
        <AppLayout>
            <div className="space-y-4">
                <PageHeader
                    title="Perfil"
                    subtitle="Atualize o seu nome, contactos e foto de perfil."
                />

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                        {success}
                    </div>
                )}

                <Card title="Dados do utilizador" subtitle="Campos básicos para identificação e notificações.">
                    {loading ? (
                        <div className="text-sm text-[var(--gray-500)]">Carregando...</div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-24 h-24 rounded-full overflow-hidden border border-[var(--border)] bg-[var(--gray-100)] flex items-center justify-center">
                                    {fotoPreviewUrl || me?.foto_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={fotoPreviewUrl || ( me?.foto_url as string )}
                                            alt={displayName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-2xl font-semibold text-[var(--gray-700)]">
                                            {displayName.charAt( 0 ).toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                <label className="text-xs font-medium text-[var(--gray-700)] cursor-pointer hover:text-[var(--hover-accent)]">
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
                                        placeholder="ex: utilizador@empresa.com"
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
                                        value={telefone}
                                        onChange={(e) => setTelefone( e.target.value )}
                                        placeholder="+258..."
                                        inputMode="tel"
                                    />
                                </FormField>

                                <div className="flex items-end justify-end sm:col-span-2">
                                    <Button
                                        type="button"
                                        onClick={onSave}
                                        loading={saving}
                                        className="min-w-40"
                                    >
                                        Guardar alterações
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </AppLayout>
    )
}

