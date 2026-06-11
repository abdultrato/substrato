"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { lucideToDataUrl } from "@/lib/icon-svg";
import { fetchPublicPlans, type PublicPlan } from "@/lib/onboarding";

function formatPrice(value: string) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN" }).format(n);
}

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicPlans()
      .then(setPlans)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const checkUrl = lucideToDataUrl(Check);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900">Planos do Substrato</h1>
          <p className="mt-2 text-slate-600">
            Escolha um plano e comece com período de teste gratuito.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-20 text-slate-500">
            <Loader2 className="animate-spin" />
          </div>
        )}
        {error && (
          <p className="text-center text-red-600">{error}</p>
        )}

        {!loading && !error && (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
                {plan.description && (
                  <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                )}
                <div className="mt-4">
                  <span className="text-3xl font-bold text-slate-900">
                    {formatPrice(plan.monthly_price)}
                  </span>
                  <span className="text-slate-500">/mês</span>
                </div>
                <ul className="mt-6 space-y-2 text-sm text-slate-600 flex-1">
                  <li className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 rounded bg-emerald-50 relative">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background: "#059669",
                          WebkitMaskImage: `url("${checkUrl}")`,
                          WebkitMaskRepeat: "no-repeat",
                          WebkitMaskSize: "70%",
                          WebkitMaskPosition: "center",
                          maskImage: `url("${checkUrl}")`,
                          maskRepeat: "no-repeat",
                          maskSize: "70%",
                          maskPosition: "center",
                        }}
                      />
                    </span>
                    Até {plan.user_limit} utilizador(es)
                  </li>
                  {plan.monthly_request_limit > 0 && (
                    <li className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 rounded bg-emerald-50 relative">
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background: "#059669",
                            WebkitMaskImage: `url("${checkUrl}")`,
                            WebkitMaskRepeat: "no-repeat",
                            WebkitMaskSize: "70%",
                            WebkitMaskPosition: "center",
                            maskImage: `url("${checkUrl}")`,
                            maskRepeat: "no-repeat",
                            maskSize: "70%",
                            maskPosition: "center",
                          }}
                        />
                      </span>
                      {plan.monthly_request_limit.toLocaleString("pt-MZ")} req/mês
                    </li>
                  )}
                  {plan.priority_support && (
                    <li className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 rounded bg-emerald-50 relative">
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background: "#059669",
                            WebkitMaskImage: `url("${checkUrl}")`,
                            WebkitMaskRepeat: "no-repeat",
                            WebkitMaskSize: "70%",
                            WebkitMaskPosition: "center",
                            maskImage: `url("${checkUrl}")`,
                            maskRepeat: "no-repeat",
                            maskSize: "70%",
                            maskPosition: "center",
                          }}
                        />
                      </span>
                      Suporte prioritário
                    </li>
                  )}
                  {plan.allows_multi_unit && (
                    <li className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 shrink-0 rounded bg-emerald-50 relative">
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background: "#059669",
                            WebkitMaskImage: `url("${checkUrl}")`,
                            WebkitMaskRepeat: "no-repeat",
                            WebkitMaskSize: "70%",
                            WebkitMaskPosition: "center",
                            maskImage: `url("${checkUrl}")`,
                            maskRepeat: "no-repeat",
                            maskSize: "70%",
                            maskPosition: "center",
                          }}
                        />
                      </span>
                      Multiunidade
                    </li>
                  )}
                </ul>
                <button
                  onClick={() => router.push(`/signup?plan=${plan.id}`)}
                  className="mt-6 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                >
                  Começar
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-sm text-slate-500">
          Já tem conta?{" "}
          <a href="/login" className="font-medium text-slate-900 underline">
            Entrar
          </a>
        </p>
      </div>
    </main>
  );
}
