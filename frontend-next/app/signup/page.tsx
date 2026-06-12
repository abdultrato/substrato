"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { fetchPublicPlans, signup, type PublicPlan } from "@/lib/onboarding";
import { login } from "@/lib/auth";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const planId = params.get("plan");

  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [form, setForm] = useState({
    company_name: "",
    admin_name: "",
    email: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicPlans().then(setPlans).catch(() => {});
  }, []);

  const selectedPlan = plans.find((p) => String(p.id) === String(planId));

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup({
        company_name: form.company_name,
        admin_name: form.admin_name,
        email: form.email,
        password: form.password,
        plan_id: planId ? Number(planId) : undefined,
      });
      // Estabelece a sessão (cookies) reutilizando o fluxo de login existente.
      await login(form.email, form.password);
      router.push("/checkout");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar a conta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Criar conta</h1>
        <p className="mt-1 text-sm text-slate-500">
          {selectedPlan
            ? `Plano selecionado: ${selectedPlan.name}`
            : "Comece com período de teste gratuito."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Nome da empresa / instituição" required>
            <input
              className="signup-input"
              value={form.company_name}
              onChange={(e) => update("company_name", e.target.value)}
              required
              placeholder="Ex.: Clínica Aurora"
            />
          </Field>
          <Field label="Seu nome">
            <input
              className="signup-input"
              value={form.admin_name}
              onChange={(e) => update("admin_name", e.target.value)}
              placeholder="Ex.: Ana Trato"
            />
          </Field>
          <Field label="E-mail" required>
            <input
              type="email"
              className="signup-input"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              placeholder="voce@empresa.co.mz"
            />
          </Field>
          <Field label="Palavra-passe" required>
            <input
              type="password"
              className="signup-input"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              minLength={8}
              placeholder="mínimo 8 caracteres"
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Criar conta e continuar
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <a href="/login" className="font-medium text-slate-900 underline">
            Entrar
          </a>
        </p>
      </div>

      <style jsx global>{`
        .signup-input {
          width: 100%;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          padding: 0.55rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .signup-input:focus {
          border-color: rgb(15 23 42);
          box-shadow: 0 0 0 1px rgb(15 23 42);
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">Carregando...</div>}>
      <SignupForm />
    </Suspense>
  );
}
