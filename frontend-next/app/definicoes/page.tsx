"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import FormField from "@/components/ui/FormField"
import TextInput from "@/components/ui/TextInput"
import Button from "@/components/ui/Button"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"

export default function DefinicoesPage () {
    const router = useRouter()
    const { signOut } = useAuth()

    const [saving, setSaving] = useState( false )
    const [error, setError] = useState<string | null>( null )
    const [success, setSuccess] = useState<string | null>( null )

    const [currentPassword, setCurrentPassword] = useState( "" )
    const [newPassword, setNewPassword] = useState( "" )
    const [confirmPassword, setConfirmPassword] = useState( "" )
    const [showCurrent, setShowCurrent] = useState( false )
    const [showNew, setShowNew] = useState( false )
    const [showConfirm, setShowConfirm] = useState( false )

    async function onSubmit ( e: FormEvent ) {
        e.preventDefault()
        setError( null )
        setSuccess( null )

        if ( newPassword !== confirmPassword ) {
            setError( "A confirmação da palavra-passe não coincide." )
            return
        }

        try {
            setSaving( true )
            await apiFetch( "/auth/password/change/", {
                method: "POST",
                body: JSON.stringify( {
                    current_password: currentPassword,
                    new_password: newPassword,
                } ),
            } )

            setSuccess( "Palavra-passe alterada. Entre novamente." )

            // Segurança: forçar novo login.
            signOut()
            router.replace( "/login" )
        } catch (e) {
            setError( e instanceof Error ? e.message : "Falha ao alterar a palavra-passe." )
        } finally {
            setSaving( false )
        }
    }

    return (
        <AppLayout>
            <div className="space-y-4">
                <PageHeader
                    title="Definições"
                    subtitle="Preferências e segurança da conta."
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

                <Card title="Segurança" subtitle="Alterar palavra-passe da conta.">
                    <form onSubmit={onSubmit} className="grid gap-3 sm:max-w-xl">
                        <FormField label="Palavra-passe atual" required>
                            <div className="flex items-center gap-2">
                                <input
                                    className="w-full flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm leading-tight text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                                    type={showCurrent ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword( e.target.value )}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent( (v) => !v )}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-sm transition hover:text-foreground"
                                    aria-label={showCurrent ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                                >
                                    {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </FormField>

                        <FormField label="Nova palavra-passe" required>
                            <div className="flex items-center gap-2">
                                <input
                                    className="w-full flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm leading-tight text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                                    type={showNew ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword( e.target.value )}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNew( (v) => !v )}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-sm transition hover:text-foreground"
                                    aria-label={showNew ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                                >
                                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </FormField>

                        <FormField label="Confirmar nova palavra-passe" required>
                            <div className="flex items-center gap-2">
                                <input
                                    className="w-full flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm leading-tight text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword( e.target.value )}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm( (v) => !v )}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-sm transition hover:text-foreground"
                                    aria-label={showConfirm ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                                >
                                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </FormField>

                        <div className="pt-1">
                            <Button type="submit" loading={saving}>
                                Atualizar palavra-passe
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AppLayout>
    )
}
