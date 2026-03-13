"use client";

import { useState } from "react";
import { login } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import useAuthGuard from "@/hooks/useAuthGuard";
import { getDefaultWorkspaceHref } from "@/lib/rbac";

export default function LoginPage () {
    useAuthGuard( { requireAuth: false } )

    const router = useRouter();
    const searchParams = useSearchParams()
    const [user, setUser] = useState( "" );
    const [pass, setPass] = useState( "" );
    const [error, setError] = useState( "" );

    async function handleSubmit ( e: any ) {
        e.preventDefault();
        setError( "" );

        try {
            const sessionUser = await login( user, pass );
            const next = searchParams.get( "next" )
            router.push( next || getDefaultWorkspaceHref( sessionUser ) );
        } catch {
            setError( "Usuário ou senha inválidos" );
        }
    }

    return (
        <div className="login-wrapper">
            <div className="login-card">
                <div className="login-image">
                    <img src="/icon.png" alt="logo" />
                </div>

                <div className="login-form">
                    <h1 className="login-title">Sistema Substrato</h1>
                    <p className="login-subtitle">Acesso seguro</p>

                    {error && <div className="login-error">{error}</div>}

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
                </div>
            </div>
        </div>
    );
}
