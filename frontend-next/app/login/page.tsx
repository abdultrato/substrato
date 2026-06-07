"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { login } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import useAuth from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { getDefaultWorkspaceHref } from "@/lib/rbac";

type View = "login" | "reset_request" | "reset_confirm";

function PasswordInput({
    id,
    name,
    placeholder,
    value,
    onChange,
    autoComplete,
}: {
    id: string;
    name: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    autoComplete?: string;
}) {
    const [show, setShow] = useState(false);
    const { t } = useLanguage();
    return (
        <div className="relative">
            <input
                id={id}
                name={name}
                type={show ? "text" : "password"}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoComplete={autoComplete}
                className="login-input pr-10"
            />
            <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={show ? t("Ocultar", "Hide") : t("Mostrar", "Show")}
            >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
        </div>
    );
}

export default function LoginPage() {
    useAuthGuard({ requireAuth: false });
    const { t } = useLanguage();
    const router = useRouter();
    const { signIn } = useAuth();

    const [view, setView] = useState<View>("login");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");

    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");

    const [resetId, setResetId] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [resetPass, setResetPass] = useState("");
    const [resetPass2, setResetPass2] = useState("");

    useEffect(() => {
        router.prefetch("/");
        router.prefetch("/workspaces");
        router.prefetch("/patients");
    }, [router]);

    function switchView(next: View) {
        setError("");
        setInfo("");
        setView(next);
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const sessionUser = await login(user, pass);
            if (!sessionUser) {
                setError(t("Falha ao obter sessão. Tente novamente.", "Failed to retrieve session."));
                return;
            }
            signIn(sessionUser);
            const next =
                typeof window !== "undefined"
                    ? new URLSearchParams(window.location.search).get("next")
                    : null;
            router.push(next || getDefaultWorkspaceHref(sessionUser));
        } catch (err) {
            setError(err instanceof Error ? err.message : t("Utilizador ou palavra-passe inválidos.", "Invalid credentials."));
        } finally {
            setLoading(false);
        }
    }

    async function handleResetRequest(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setInfo("");
        const v = resetId.trim();
        if (!v) {
            setError(t("Informe e-mail, telefone ou utilizador.", "Provide e-mail, phone or username."));
            return;
        }
        const payload: Record<string, string> = {};
        if (v.includes("@")) payload.email = v;
        else if (/^[+0-9\s-]{6,}$/.test(v)) payload.telefone = v.replace(/\s+/g, "");
        else payload.username = v;

        setLoading(true);
        try {
            const res = await apiFetch<{ detail?: string }>("/auth/password-reset/request/", {
                method: "POST",
                body: JSON.stringify(payload),
            });
            setInfo(res?.detail || t("Se o utilizador existir, enviaremos instruções.", "If the user exists, we'll send instructions."));
            setView("reset_confirm");
        } catch (err) {
            setError(err instanceof Error ? err.message : t("Falha ao solicitar reposição.", "Reset request failed."));
        } finally {
            setLoading(false);
        }
    }

    async function handleResetConfirm(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        if (!resetToken.trim()) { setError(t("Informe o código recebido.", "Provide the received code.")); return; }
        if (!resetPass) { setError(t("Informe a nova palavra-passe.", "Provide the new password.")); return; }
        if (resetPass !== resetPass2) { setError(t("As palavras-passe não coincidem.", "Passwords do not match.")); return; }

        setLoading(true);
        try {
            await apiFetch("/auth/password-reset/confirm/", {
                method: "POST",
                body: JSON.stringify({ token: resetToken.trim(), new_password: resetPass }),
            });
            setInfo(t("Palavra-passe reposta. Já pode entrar.", "Password reset. You can sign in now."));
            setResetId(""); setResetToken(""); setResetPass(""); setResetPass2("");
            setView("login");
        } catch (err) {
            setError(err instanceof Error ? err.message : t("Falha ao repor a palavra-passe.", "Failed to reset password."));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen grid place-items-center px-4 py-12 bg-gradient-to-b from-background to-muted/40">
            <div className="w-full max-w-sm">

                {/* Brand */}
                <div className="mb-6 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/static/img/logo.png"
                        alt="Substrato"
                        className="mx-auto mb-4 h-14 w-14 rounded-xl object-contain bg-white p-1.5 shadow-sm border border-border"
                    />
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">Substrato</h1>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("Sistema Unificado de Base Sustentável", "Unified Sustainable Base System")}
                    </p>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-border bg-card shadow-md px-6 py-7">

                    {/* Feedback */}
                    {error && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                            {error}
                        </div>
                    )}
                    {info && (
                        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                            {info}
                        </div>
                    )}

                    {view === "login" && (
                        <>
                            <p className="mb-4 text-sm font-medium text-foreground">
                                {t("Iniciar sessão", "Sign in")}
                            </p>
                            <form onSubmit={handleLogin} className="flex flex-col gap-3">
                                <input
                                    id="utilizador"
                                    name="utilizador"
                                    autoComplete="username"
                                    placeholder={t("Utilizador", "Username")}
                                    value={user}
                                    onChange={(e) => setUser(e.target.value)}
                                    className="login-input"
                                />
                                <PasswordInput
                                    id="palavra-passe"
                                    name="palavra_passe"
                                    placeholder={t("Palavra-passe", "Password")}
                                    value={pass}
                                    onChange={setPass}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
                                >
                                    {loading && <Loader2 size={14} className="animate-spin" />}
                                    {t("Entrar", "Sign in")}
                                </button>
                            </form>
                            <div className="mt-4 text-center">
                                <button
                                    type="button"
                                    onClick={() => switchView("reset_request")}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {t("Esqueci a palavra-passe", "Forgot password")}
                                </button>
                            </div>
                        </>
                    )}

                    {view === "reset_request" && (
                        <>
                            <p className="mb-1 text-sm font-medium text-foreground">
                                {t("Recuperar acesso", "Recover access")}
                            </p>
                            <p className="mb-4 text-xs text-muted-foreground">
                                {t("Introduza o e-mail, telefone ou nome de utilizador associado à conta.", "Enter the e-mail, phone or username linked to the account.")}
                            </p>
                            <form onSubmit={handleResetRequest} className="flex flex-col gap-3">
                                <input
                                    id="identificador-reposicao"
                                    name="identificador_reposicao"
                                    placeholder={t("E-mail, telefone ou utilizador", "E-mail, phone or username")}
                                    value={resetId}
                                    onChange={(e) => setResetId(e.target.value)}
                                    className="login-input"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
                                >
                                    {loading && <Loader2 size={14} className="animate-spin" />}
                                    {t("Enviar código", "Send code")}
                                </button>
                            </form>
                            <div className="mt-4 text-center">
                                <button
                                    type="button"
                                    onClick={() => switchView("login")}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    ← {t("Voltar ao login", "Back to login")}
                                </button>
                            </div>
                        </>
                    )}

                    {view === "reset_confirm" && (
                        <>
                            <p className="mb-1 text-sm font-medium text-foreground">
                                {t("Nova palavra-passe", "New password")}
                            </p>
                            <p className="mb-4 text-xs text-muted-foreground">
                                {t("Introduza o código recebido e defina a nova palavra-passe.", "Enter the received code and set a new password.")}
                            </p>
                            <form onSubmit={handleResetConfirm} className="flex flex-col gap-3">
                                <input
                                    id="codigo-reposicao"
                                    name="codigo_reposicao"
                                    placeholder={t("Código recebido", "Received code")}
                                    value={resetToken}
                                    onChange={(e) => setResetToken(e.target.value)}
                                    className="login-input"
                                />
                                <PasswordInput
                                    id="nova-palavra-passe"
                                    name="nova_palavra_passe"
                                    placeholder={t("Nova palavra-passe", "New password")}
                                    value={resetPass}
                                    onChange={setResetPass}
                                    autoComplete="new-password"
                                />
                                <PasswordInput
                                    id="confirmar-palavra-passe"
                                    name="confirmar_palavra_passe"
                                    placeholder={t("Confirmar palavra-passe", "Confirm password")}
                                    value={resetPass2}
                                    onChange={setResetPass2}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-60"
                                >
                                    {loading && <Loader2 size={14} className="animate-spin" />}
                                    {t("Repor palavra-passe", "Reset password")}
                                </button>
                            </form>
                            <div className="mt-4 text-center">
                                <button
                                    type="button"
                                    onClick={() => switchView("login")}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    ← {t("Voltar ao login", "Back to login")}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
