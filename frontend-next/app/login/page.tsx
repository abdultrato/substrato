"use client";

import { useState } from "react";
import { login } from "@/lib/auth";
import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import { getDefaultWorkspaceHref } from "@/lib/rbac";
import useAuth from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

export default function LoginPage () {
    useAuthGuard( { requireAuth: false } )

    const router = useRouter();
    const { signIn } = useAuth()
    const [view, setView] = useState<"login" | "reset_request" | "reset_confirm">( "login" )
    const [user, setUser] = useState( "" );
    const [pass, setPass] = useState( "" );
    const [error, setError] = useState( "" );

    const [resetId, setResetId] = useState( "" )
    const [resetToken, setResetToken] = useState( "" )
    const [resetPass, setResetPass] = useState( "" )
    const [resetPass2, setResetPass2] = useState( "" )
    const [resetInfo, setResetInfo] = useState( "" )

    async function handleSubmit ( e: any ) {
        e.preventDefault();
        setError( "" );

        try {
            const sessionUser = await login( user, pass );
            if ( sessionUser ) signIn( sessionUser )
            const next =
                typeof window !== "undefined"
                    ? new URLSearchParams( window.location.search ).get( "next" )
                    : null
            router.push( next || getDefaultWorkspaceHref( sessionUser ) );
        } catch {
            setError( "Usuário ou senha inválidos" );
        }
    }

    async function handleResetRequest ( e: any ) {
        e.preventDefault()
        setError( "" )
        setResetInfo( "" )

        const v = resetId.trim()
        if ( !v ) {
            setError( "Informe e-mail, telefone ou utilizador." )
            return
        }

        const payload: any = {}
        if ( v.includes( "@" ) ) payload.email = v
        else if ( /^[+0-9\\s-]{6,}$/.test( v ) ) payload.telefone = v.replace( /\\s+/g, "" )
        else payload.username = v

        try {
            const res = await apiFetch<{ detail?: string }>( "/auth/password-reset/request/", {
                method: "POST",
                body: JSON.stringify( payload ),
            } )
            setResetInfo( res?.detail || "Se o utilizador existir, enviaremos instruções." )
            setView( "reset_confirm" )
        } catch (e) {
            setError( e instanceof Error ? e.message : "Falha ao solicitar reposição de palavra-passe." )
        }
    }

    async function handleResetConfirm ( e: any ) {
        e.preventDefault()
        setError( "" )
        setResetInfo( "" )

        if ( !resetToken.trim() ) {
            setError( "Informe o código recebido." )
            return
        }
        if ( !resetPass ) {
            setError( "Informe a nova palavra-passe." )
            return
        }
        if ( resetPass !== resetPass2 ) {
            setError( "A confirmação da palavra-passe não coincide." )
            return
        }

        try {
            await apiFetch( "/auth/password-reset/confirm/", {
                method: "POST",
                body: JSON.stringify( { token: resetToken.trim(), new_password: resetPass } ),
            } )
            setResetInfo( "Palavra-passe reposta com sucesso. Já pode entrar." )
            setView( "login" )
            setResetId( "" )
            setResetToken( "" )
            setResetPass( "" )
            setResetPass2( "" )
        } catch (e) {
            setError( e instanceof Error ? e.message : "Falha ao repor a palavra-passe." )
        }
    }

    return (
        <div className="login-wrapper">
                <div className="login-card">
                    <div className="login-image">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/icon.png" alt="logo" />
                    </div>

                <div className="login-form">
                    <h1 className="login-title">Substrato</h1>
                    <p className="login-subtitle">Infraestrutura unificada de saúde</p>

                    {error && <div className="login-error">{error}</div>}
                    {resetInfo && (
                        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                            {resetInfo}
                        </div>
                    )}

                    {view === "login" ? (
                        <>
                            <form onSubmit={handleSubmit}>
                                <input
                                    placeholder="Usuário"
                                    value={user}
                                    onChange={e => setUser( e.target.value )}
                                />

                                <input
                                    type="password"
                                    placeholder="Senha"
                                    value={pass}
                                    onChange={e => setPass( e.target.value )}
                                />

                                <button>Entrar</button>
                            </form>

                            <button
                                type="button"
                                className="mt-3 text-xs font-semibold text-[var(--gray-700)] hover:text-[var(--hover-accent)]"
                                onClick={() => {
                                    setError( "" )
                                    setResetInfo( "" )
                                    setView( "reset_request" )
                                }}
                            >
                                Esqueci a palavra-passe
                            </button>
                        </>
                    ) : view === "reset_request" ? (
                        <>
                            <form onSubmit={handleResetRequest}>
                                <input
                                    placeholder="E-mail, telefone ou utilizador"
                                    value={resetId}
                                    onChange={e => setResetId( e.target.value )}
                                />

                                <button>Enviar código</button>
                            </form>

                            <button
                                type="button"
                                className="mt-3 text-xs font-semibold text-[var(--gray-700)] hover:text-[var(--hover-accent)]"
                                onClick={() => {
                                    setError( "" )
                                    setResetInfo( "" )
                                    setView( "login" )
                                }}
                            >
                                Voltar ao login
                            </button>
                        </>
                    ) : (
                        <>
                            <form onSubmit={handleResetConfirm}>
                                <input
                                    placeholder="Código recebido"
                                    value={resetToken}
                                    onChange={e => setResetToken( e.target.value )}
                                />

                                <input
                                    type="password"
                                    placeholder="Nova palavra-passe"
                                    value={resetPass}
                                    onChange={e => setResetPass( e.target.value )}
                                />

                                <input
                                    type="password"
                                    placeholder="Confirmar nova palavra-passe"
                                    value={resetPass2}
                                    onChange={e => setResetPass2( e.target.value )}
                                />

                                <button>Repor palavra-passe</button>
                            </form>

                            <button
                                type="button"
                                className="mt-3 text-xs font-semibold text-[var(--gray-700)] hover:text-[var(--hover-accent)]"
                                onClick={() => {
                                    setError( "" )
                                    setResetInfo( "" )
                                    setView( "login" )
                                }}
                            >
                                Voltar ao login
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
