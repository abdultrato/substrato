"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Globe, Loader2 } from "lucide-react";
import { login } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import useAuthGuard from "@/hooks/useAuthGuard";
import useAuth from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { getAccessGrantedRoleLabel } from "@/lib/rbac";
import { isSafeInternalPath } from "@/lib/lastVisited";
import { LOGO_LIGHT_SRC, LOGO_DARK_SRC } from "@/lib/brand";
import { getSmartPostLoginTarget } from "@/lib/loginRedirect";

type View = "login" | "reset_request" | "reset_confirm";

const FLOATING_INPUT_CLASS =
    "peer w-full rounded-lg border border-border bg-background px-3.5 pb-2 pt-5 text-sm text-foreground shadow-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25";

const FLOATING_LABEL_CLASS =
    "pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-medium text-muted-foreground transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-violet-500";

function FloatingInput({
    id,
    name,
    label,
    value,
    onChange,
    autoComplete,
    autoFocus,
}: {
    id: string;
    name: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    autoComplete?: string;
    autoFocus?: boolean;
}) {
    return (
        <div className="relative">
            <input
                id={id}
                name={name}
                placeholder=" "
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoComplete={autoComplete}
                autoFocus={autoFocus}
                className={FLOATING_INPUT_CLASS}
            />
            <label htmlFor={id} className={FLOATING_LABEL_CLASS}>{label}</label>
        </div>
    );
}

function FloatingPasswordInput({
    id,
    name,
    label,
    value,
    onChange,
    autoComplete,
}: {
    id: string;
    name: string;
    label: string;
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
                placeholder=" "
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoComplete={autoComplete}
                className={`${FLOATING_INPUT_CLASS} pr-10`}
            />
            <label htmlFor={id} className={FLOATING_LABEL_CLASS}>{label}</label>
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
    const { signIn, user: authUser } = useAuth();

    const [view, setView] = useState<View>("login");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [access, setAccess] = useState<null | "granted" | "denied">(null);
    const [grantedRoleLabel, setGrantedRoleLabel] = useState<string | null>(null);

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

    function resetAccessOverlay() {
        setAccess(null);
        setGrantedRoleLabel(null);
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const sessionUser = await login(user, pass);
            if (!sessionUser) {
                setAccess("denied");
                setGrantedRoleLabel(null);
                setError(t("Falha ao obter sessão. Tente novamente.", "Failed to retrieve session."));
                setLoading(false);
                window.setTimeout(() => resetAccessOverlay(), 1600);
                return;
            }
            signIn(sessionUser);
            setGrantedRoleLabel(getAccessGrantedRoleLabel(sessionUser));
            const rawNext =
                typeof window !== "undefined"
                    ? new URLSearchParams(window.location.search).get("next")
                    : null;
            const explicitNext = isSafeInternalPath(rawNext) ? rawNext : null;
            const target = getSmartPostLoginTarget(sessionUser, explicitNext);
            // Mostra o overlay "ACESSO GARANTIDO" com elegância antes de redirecionar.
            setAccess("granted");
            window.setTimeout(() => router.push(target), 1300);
        } catch (err) {
            setAccess("denied");
            setGrantedRoleLabel(null);
            setError(err instanceof Error ? err.message : t("Utilizador ou palavra-passe inválidos.", "Invalid credentials."));
            setLoading(false);
            window.setTimeout(() => resetAccessOverlay(), 1600);
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
        <div className="relative grid min-h-screen w-full place-items-center bg-gradient-to-br from-violet-50/60 via-transparent to-indigo-50/60 px-4 py-10 text-foreground dark:from-transparent dark:via-transparent dark:to-transparent">
            {/* Gradiente translúcido: deixa a marca d'água do body (substrato-brand-canvas) visível. */}

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
            {/* scale uniforme: reduz altura e largura na mesma proporção exata,
                preservando toda a estrutura/comportamento do formulário. */}
            <div className="substrato-brand-card w-full max-w-md origin-center scale-[0.70] overflow-hidden rounded-2xl border border-border shadow-xl lg:grid lg:max-w-3xl lg:grid-cols-2">

                {/* Brand panel — left on lg+, hidden on small (mobile shows it above the form) */}
                <aside className="relative hidden overflow-hidden bg-gradient-to-br from-violet-700 via-violet-800 to-indigo-900 p-10 text-white lg:flex lg:flex-col lg:justify-center">
                    <div aria-hidden className="pointer-events-none absolute inset-0">
                        <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/25 blur-3xl" />
                        <div className="absolute -bottom-20 -right-12 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
                        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:22px_22px]" />
                        <div
                            className="absolute inset-0 opacity-[0.12]"
                            style={{
                                backgroundImage: `url(${LOGO_DARK_SRC})`,
                                backgroundRepeat: "no-repeat",
                                backgroundSize: "60%",
                                backgroundPosition: "center",
                            }}
                        />
                    </div>
                    <div className="relative flex flex-col items-start gap-3">
                        <p className="text-2xl font-semibold tracking-tight">Substrato</p>
                        <p className="max-w-[15rem] text-sm leading-relaxed text-violet-100/80">
                            {t("A base para crescer.", "The foundation to grow.")}
                        </p>
                    </div>
                </aside>

                {/* Form panel */}
                <div className="p-7 sm:p-9">
                    {/* Mobile brand — full-width banner matching the aside, hidden on lg+ */}
                    <div className="relative -mx-7 -mt-7 mb-6 overflow-hidden bg-gradient-to-br from-violet-700 via-violet-800 to-indigo-900 px-7 py-8 text-white sm:-mx-9 sm:-mt-9 sm:px-9 lg:hidden">
                        <div aria-hidden className="pointer-events-none absolute inset-0">
                            <div className="absolute -left-10 -top-12 h-48 w-48 rounded-full bg-fuchsia-500/25 blur-3xl" />
                            <div className="absolute -bottom-12 -right-8 h-52 w-52 rounded-full bg-indigo-400/20 blur-3xl" />
                            <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#fff_1px,transparent_0)] [background-size:22px_22px]" />
                            <div
                                className="absolute inset-0 opacity-[0.12]"
                                style={{
                                    backgroundImage: `url(${LOGO_DARK_SRC})`,
                                    backgroundRepeat: "no-repeat",
                                    backgroundSize: "38%",
                                    backgroundPosition: "center",
                                }}
                            />
                        </div>
                        <div className="relative flex flex-col items-start gap-2">
                            <p className="text-xl font-semibold tracking-tight">Substrato</p>
                            <p className="text-sm text-violet-100/80">
                                {t("A base para crescer.", "The foundation to grow.")}
                            </p>
                        </div>
                    </div>

                    {/* Logo + Heading */}
                    <div className="mb-6">
                        <Image
                            src={LOGO_LIGHT_SRC}
                            alt="Substrato"
                            width={126}
                            height={28}
                            className="mb-4 h-7 w-auto dark:hidden"
                            draggable={false}
                            unoptimized
                        />
                        <Image
                            src={LOGO_DARK_SRC}
                            alt="Substrato"
                            width={126}
                            height={28}
                            className="mb-4 hidden h-7 w-auto dark:block"
                            draggable={false}
                            unoptimized
                        />
                        {view === "login" ? (
                            <h1 className="text-xl font-semibold tracking-tight text-foreground">
                                {t("Iniciar", "Sign")}{" "}
                                <span className="text-violet-600 dark:text-violet-400">{t("sessão", "in")}</span>
                            </h1>
                        ) : (
                            <>
                                <h1 className="text-xl font-semibold tracking-tight text-foreground">{heading.title}</h1>
                                <p className="mt-1 text-sm text-muted-foreground">{heading.sub}</p>
                            </>
                        )}
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
                                <FloatingInput
                                    id="utilizador"
                                    name="utilizador"
                                    label={t("Usuário", "Username")}
                                    value={user}
                                    onChange={setUser}
                                    autoComplete="username"
                                    autoFocus
                                />
                                <FloatingPasswordInput
                                    id="palavra-passe"
                                    name="palavra_passe"
                                    label={t("Palavra-passe", "Password")}
                                    value={pass}
                                    onChange={setPass}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
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
                                <FloatingInput
                                    id="identificador-reposicao"
                                    name="identificador_reposicao"
                                    label={t("E-mail, telefone ou utilizador", "E-mail, phone or username")}
                                    value={resetId}
                                    onChange={setResetId}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
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
                                <FloatingInput
                                    id="codigo-reposicao"
                                    name="codigo_reposicao"
                                    label={t("Código recebido", "Received code")}
                                    value={resetToken}
                                    onChange={setResetToken}
                                    autoFocus
                                />
                                <FloatingPasswordInput
                                    id="nova-palavra-passe"
                                    name="nova_palavra_passe"
                                    label={t("Nova palavra-passe", "New password")}
                                    value={resetPass}
                                    onChange={setResetPass}
                                    autoComplete="new-password"
                                />
                                <FloatingPasswordInput
                                    id="confirmar-palavra-passe"
                                    name="confirmar_palavra_passe"
                                    label={t("Confirmar palavra-passe", "Confirm password")}
                                    value={resetPass2}
                                    onChange={setResetPass2}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-500/30 transition hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
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

            {/* ─── Overlay de acesso: ACESSO GARANTIDO / NEGADO ─── */}
            {access && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md"
                    role="alert"
                    aria-live="assertive"
                >
                    <div className="animate-access-pop select-none px-6 text-center">
                        <div
                            className="font-[family-name:var(--font-bebas)] uppercase leading-none tracking-[0.06em]"
                            style={{ fontSize: "clamp(3.5rem, 16vw, 11rem)" }}
                        >
                            {access === "granted" ? (
                                <span className="bg-gradient-to-b from-violet-400 via-violet-500 to-fuchsia-600 bg-clip-text text-transparent [text-shadow:0_0_60px_rgba(139,92,246,0.45)]">
                                    {t("Acesso garantido", "Access granted")}
                                </span>
                            ) : (
                                <span className="bg-gradient-to-b from-rose-400 via-rose-500 to-red-600 bg-clip-text text-transparent [text-shadow:0_0_60px_rgba(244,63,94,0.45)]">
                                    {t("Acesso negado", "Access denied")}
                                </span>
                            )}
                        </div>
                        <div className={`mx-auto mt-4 h-0.5 w-40 origin-center animate-access-line rounded-full ${access === "granted" ? "bg-violet-500/70" : "bg-rose-500/70"}`} />
                        {access === "granted" && grantedRoleLabel && (
                            <div className="mx-auto mt-3 text-center text-sm font-medium uppercase tracking-[0.25em] text-violet-200/90">
                                {t("Acesso Garantido como", "Access granted as")} {t(grantedRoleLabel, grantedRoleLabel)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
