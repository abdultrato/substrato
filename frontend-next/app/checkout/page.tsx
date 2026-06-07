"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { checkout } from "@/lib/onboarding";

type Result = {
  invoice: { amount: string; currency: string; status: string };
  charge: { status: string | null };
  subscription: { status: string };
};

const STATUS_UI: Record<string, { icon: any; color: string; text: string }> = {
  PAGA: { icon: CheckCircle2, color: "text-emerald-600", text: "Pagamento confirmado" },
  SUCESSO: { icon: CheckCircle2, color: "text-emerald-600", text: "Pagamento confirmado" },
  PENDENTE: { icon: Clock, color: "text-amber-600", text: "Pagamento pendente de confirmação" },
  FALHOU: { icon: XCircle, color: "text-red-600", text: "Pagamento falhou" },
};

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setError(null);
    setLoading(true);
    try {
      const res = (await checkout({})) as Result;
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no checkout.");
    } finally {
      setLoading(false);
    }
  }

  const status = result?.charge?.status || result?.invoice?.status || "";
  const ui = STATUS_UI[status];

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Ativar assinatura</h1>
        <p className="mt-1 text-sm text-slate-500">
          Confirme o pagamento do primeiro período para ativar o seu plano.
        </p>

        {!result && (
          <button
            onClick={pay}
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Pagar agora
          </button>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {result && ui && (
          <div className="mt-6 rounded-xl bg-slate-50 p-5 text-center">
            <ui.icon className={`mx-auto ${ui.color}`} size={40} />
            <p className={`mt-2 font-medium ${ui.color}`}>{ui.text}</p>
            <p className="mt-1 text-sm text-slate-600">
              {Number(result.invoice.amount).toLocaleString("pt-MZ")} {result.invoice.currency}
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Ir para o painel
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Ambiente de testes: o gateway sandbox simula a confirmação do pagamento.
        </p>
      </div>
    </main>
  );
}
