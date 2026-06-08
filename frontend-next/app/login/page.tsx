"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Globe, Loader2 } from "lucide-react";
import { login } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import useAuth from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { getDefaultWorkspaceHref } from "@/lib/rbac";
import { LOGO_SRC } from "@/lib/brand";

type View = "login" | "reset_request" | "reset_confirm";

// Token-based surface (light/dark aware) + brand-violet focus ring.
const INPUT_CLASS =
    "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25";

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
                className={`${INPUT_CLASS} pr-10`}
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
    const { t, isPortuguese, toggleLanguage } = useLanguage();
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

    const heading =
        view === "login"
            ? { title: t("Bem-vindo de volta", "Welcome back"), sub: t("Inicie sessão para aceder à plataforma.", "Sign in to access the platform.") }
            : view === "reset_request"
                ? { title: t("Recuperar acesso", "Recover access"), sub: t("Enviaremos instruções para repor a palavra-passe.", "We'll send instructions to reset your password.") }
                : { title: t("Nova palavra-passe", "New password"), sub: t("Introduza o código recebido e defina a nova palavra-passe.", "Enter the received code and set a new password.") };

    return (
        <div className="relative grid min-h-screen w-full place-items-center bg-gradient-to-br from-violet-50 via-background to-indigo-50 px-4 py-10 text-foreground dark:from-background dark:via-background dark:to-background">

            {/* language toggle */}
            <button
                type="button"
                onClick={() => { void toggleLanguage(); }}
                className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:text-foreground"
                aria-label={t("Mudar idioma", "Change language")}
            >
                <Globe size={13} />
                {isPortuguese ? "EN" : "PT"}
            </button>

            {/* ─── Centered card ─── */}
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl lg:grid lg:max-w-3xl lg:grid-cols-2">

                {/* Brand panel — left on lg+, hidden on small (mobile shows it above the form) */}
                <aside className="relative hidden overflow-hidden bg-gradient-to-br from-violet-700 via-violet-800 to-indigo-900 p-10 text-white lg:flex lg:flex-col lg:justify-center">
                    <div aria-hidden className="pointer-events-none absolute inset-0">
                        <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/25 blur-3xl" />
                        <div className="absolute -bottom-20 -right-12 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
                        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:22px_22px]" />
                    </div>
                    <div className="relative flex flex-col items-start gap-5">
                        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={LOGO_SRC} alt="Substrato" className="h-11 w-11 object-contain" />
                        </span>
                        <div>
                            <p className="text-2xl font-semibold tracking-tight">Substrato</p>
                            <p className="mt-2 max-w-[15rem] text-sm leading-relaxed text-violet-100/80">
                                {t("A base para crescer.", "The foundation to grow.")}
                            </p>
                        </div>
                    </div>
                </aside>

                {/* Form panel */}
                <div className="p-7 sm:p-9">
                    {/* Mobile brand — above the form on small screens */}
                    <div className="mb-6 flex flex-col items-center text-center lg:hidden">
                        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-600/10 ring-1 ring-violet-600/15">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={LOGO_SRC} alt="Substrato" className="h-10 w-10 object-contain" />
                        </span>
                        <p className="mt-3 text-base font-semibold tracking-tight text-foreground">Substrato</p>
                    </div>

                    {/* Heading */}
                    <div className="mb-6">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground">{heading.title}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">{heading.sub}</p>
                    </div>

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
                            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs font-medium text-foreground">{t("Utilizador", "Username")}</span>
                                    <input
                                        id="utilizador"
                                        name="utilizador"
                                        autoComplete="username"
                                        placeholder={t("O seu utilizador", "Your username")}
                                        value={user}
                                        onChange={(e) => setUser(e.target.value)}
                                        className={INPUT_CLASS}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs font-medium text-foreground">{t("Palavra-passe", "Password")}</span>
                                    <PasswordInput
                                        id="palavra-passe"
                                        name="palavra_passe"
                                        placeholder="••••••••"
                                        value={pass}
                                        onChange={setPass}
                                        autoComplete="current-password"
                                    />
                                </label>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
                                >
                                    {loading && <Loader2 size={15} className="animate-spin" />}
                                    {t("Entrar", "Sign in")}
                                </button>
                            </form>
                            <div className="mt-5 text-center">
                                <button
                                    type="button"
                                    onClick={() => switchView("reset_request")}
                                    className="text-xs font-medium text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                                >
                                    {t("Esqueci a palavra-passe", "Forgot password")}
                                </button>
                            </div>
                        </>
                    )}

                    {view === "reset_request" && (
                        <>
                            <form onSubmit={handleResetRequest} className="flex flex-col gap-4">
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs font-medium text-foreground">{t("Identificação", "Identification")}</span>
                                    <input
                                        id="identificador-reposicao"
                                        name="identificador_reposicao"
                                        placeholder={t("E-mail, telefone ou utilizador", "E-mail, phone or username")}
                                        value={resetId}
                                        onChange={(e) => setResetId(e.target.value)}
                                        className={INPUT_CLASS}
                                    />
                                </label>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
                                >
                                    {loading && <Loader2 size={15} className="animate-spin" />}
                                    {t("Enviar código", "Send code")}
                                </button>
                            </form>
                            <div className="mt-5 text-center">
                                <button
                                    type="button"
                                    onClick={() => switchView("login")}
                                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    ← {t("Voltar ao login", "Back to login")}
                                </button>
                            </div>
                        </>
                    )}

                    {view === "reset_confirm" && (
                        <>
                            <form onSubmit={handleResetConfirm} className="flex flex-col gap-4">
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs font-medium text-foreground">{t("Código recebido", "Received code")}</span>
                                    <input
                                        id="codigo-reposicao"
                                        name="codigo_reposicao"
                                        placeholder={t("Código recebido", "Received code")}
                                        value={resetToken}
                                        onChange={(e) => setResetToken(e.target.value)}
                                        className={INPUT_CLASS}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs font-medium text-foreground">{t("Nova palavra-passe", "New password")}</span>
                                    <PasswordInput
                                        id="nova-palavra-passe"
                                        name="nova_palavra_passe"
                                        placeholder="••••••••"
                                        value={resetPass}
                                        onChange={setResetPass}
                                        autoComplete="new-password"
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5">
                                    <span className="text-xs font-medium text-foreground">{t("Confirmar palavra-passe", "Confirm password")}</span>
                                    <PasswordInput
                                        id="confirmar-palavra-passe"
                                        name="confirmar_palavra_passe"
                                        placeholder="••••••••"
                                        value={resetPass2}
                                        onChange={setResetPass2}
                                        autoComplete="new-password"
                                    />
                                </label>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
                                >
                                    {loading && <Loader2 size={15} className="animate-spin" />}
                                    {t("Repor palavra-passe", "Reset password")}
                                </button>
                            </form>
                            <div className="mt-5 text-center">
                                <button
                                    type="button"
                                    onClick={() => switchView("login")}
                                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
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
