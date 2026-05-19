"use client";

import { useState } from "react";
import { login } from "@/lib/auth";
import { useRouter } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import { getDefaultWorkspaceHref } from "@/lib/rbac";
import useAuth from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";
import { useEffect } from "react";

export default function LoginPage () {
    useAuthGuard( { requireAuth: false } )

    const router = useRouter();
    const { signIn } = useAuth()
    const [view, setView] = useState<"login" | "reset_request" | "reset_confirm">( "login" )
    const [user, setUser] = useState( "" );
    const [pass, setPass] = useState( "" );
    const [error, setError] = useState( "" );
    const [showPass, setShowPass] = useState( false )

    const [resetId, setResetId] = useState( "" )
    const [resetToken, setResetToken] = useState( "" )
    const [resetPass, setResetPass] = useState( "" )
    const [resetPass2, setResetPass2] = useState( "" )
    const [resetInfo, setResetInfo] = useState( "" )
    const [showResetPass, setShowResetPass] = useState( false )
    const [showResetPass2, setShowResetPass2] = useState( false )

    /**
     * Pré-carrega as rotas protegidas mais acessadas para que,
     * depois do login, a navegação seja imediata (evita o tempo
     * de compilação/carregamento inicial do app router).
     */
    useEffect(() => {
        router.prefetch( "/" )
        router.prefetch( "/patients" )
        router.prefetch( "/laboratory/requests" )
        router.prefetch( "/education" )
        router.prefetch( "/education/student" )
        router.prefetch( "/healthcare" )
    }, [router])

    async function handleSubmit ( e: any ) {
        e.preventDefault();
        setError( "" );

        try {
            const sessionUser = await login( user, pass );
            if ( !sessionUser ) {
                setError( "Falha ao obter sessão. Tente novamente." )
                return
            }
            signIn( sessionUser )
            const next =
                typeof window !== "undefined"
                    ? new URLSearchParams( window.location.search ).get( "next" )
                    : null
            router.push( next || getDefaultWorkspaceHref( sessionUser ) );
        } catch (e) {
            setError( e instanceof Error ? e.message : "Utilizador ou palavra-passe inválidos" );
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
                        <img src="/static/img/logo.png" alt="Logo do Substrato" />
                    </div>

                <div className="login-form">
                    <h1 className="login-title">Substrato</h1>
                    <p className="login-subtitle">Infraestrutura unificada de gestão em saúde</p>

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
                                    className="login-input"
                                    id="utilizador"
                                    name="utilizador"
                                    autoComplete="username"
                                    placeholder="Utilizador"
                                    value={user}
                                    onChange={e => setUser( e.target.value )}
                                />

                                <div className="flex items-center gap-2">
                                    <input
                                        className="login-input flex-1"
                                        id="palavra-passe"
                                        name="palavra_passe"
                                        type={showPass ? "text" : "password"}
                                        placeholder="Palavra-passe"
                                        value={pass}
                                        onChange={e => setPass( e.target.value )}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass( (v) => !v )}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-sm transition hover:text-foreground"
                                        aria-label={showPass ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                                    >
                                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>

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
                                    className="login-input"
                                    id="identificador-reposicao"
                                    name="identificador_reposicao"
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
                                    className="login-input"
                                    id="codigo-reposicao"
                                    name="codigo_reposicao"
                                    placeholder="Código recebido"
                                    value={resetToken}
                                    onChange={e => setResetToken( e.target.value )}
                                />

                                <div className="flex items-center gap-2">
                                    <input
                                        className="login-input flex-1"
                                        id="nova-palavra-passe"
                                        name="nova_palavra_passe"
                                        type={showResetPass ? "text" : "password"}
                                        placeholder="Nova palavra-passe"
                                        value={resetPass}
                                        onChange={e => setResetPass( e.target.value )}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowResetPass( (v) => !v )}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-sm transition hover:text-foreground"
                                        aria-label={showResetPass ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                                    >
                                        {showResetPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        className="login-input flex-1"
                                        id="confirmacao-nova-palavra-passe"
                                        name="confirmacao_nova_palavra_passe"
                                        type={showResetPass2 ? "text" : "password"}
                                        placeholder="Confirmar nova palavra-passe"
                                        value={resetPass2}
                                        onChange={e => setResetPass2( e.target.value )}
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowResetPass2( (v) => !v )}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-sm transition hover:text-foreground"
                                        aria-label={showResetPass2 ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                                    >
                                        {showResetPass2 ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>

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
