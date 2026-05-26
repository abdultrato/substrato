"use client"

import Link from "next/link"
import AutoTranslateTree from "@/components/i18n/AutoTranslateTree"

const slides = [
  {
    title: "Prontuário e Clínica",
    body: "Fluxos completos de consultas, exames, resultados e histórico clínico com trilhas de auditoria.",
  },
  {
    title: "Faturamento e Pagamentos",
    body: "Emissão de faturas, recibos e reconciliação financeira integradas à jornada do paciente.",
  },
  {
    title: "Operações e Monitoramento",
    body: "Painéis, auditoria de atividades e métricas operacionais para decisões em tempo real.",
  },
  {
    title: "Integrações",
    body: "API aberta e catálogo de recursos para conectar equipamentos, seguradoras e aplicativos externos.",
  },
]

export default function SubstratoAboutPage() {
  return (
    <AutoTranslateTree>
      <div className="min-h-screen bg-gradient-to-br from-white via-rose-50 to-slate-50 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl space-y-10">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-rose-700">
              Plataforma Substrato
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Infraestrutura de base unificada de saúde
            </h1>
            <p className="text-base text-slate-600">
              Uma suíte integrada para clínicas e hospitais: pacientes, faturamento, operações, integrações e observabilidade em um só lugar.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-800"
              >
                Entrar
              </Link>
              <a
                href="mailto:substratosys@gmail.com"
                className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-800 shadow-sm transition hover:border-rose-300"
              >
                Solicitar demonstração
              </a>
              <a
                href="tel:+258847778476"
                className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-800 shadow-sm transition hover:border-rose-300"
              >
                +258 84 777 8476
              </a>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2">
            {slides.map((slide) => (
              <div
                key={slide.title}
                className="group rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-sm font-semibold text-rose-800">{slide.title}</div>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed">{slide.body}</p>
                <div className="mt-3 h-1 w-16 rounded-full bg-rose-200 transition group-hover:bg-rose-400" />
              </div>
            ))}
          </section>

          <section className="grid gap-6 rounded-3xl border border-rose-100 bg-white/80 p-6 shadow-sm md:grid-cols-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                Segurança
              </div>
              <p className="mt-2 text-sm text-slate-700">
                Controle de acesso baseado em grupos, auditoria e segregação multi-inquilino.
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                APIs
              </div>
              <p className="mt-2 text-sm text-slate-700">
                Catálogo de recursos REST com schemas documentados e gerador de clientes.
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                Observabilidade
              </div>
              <p className="mt-2 text-sm text-slate-700">
                Métricas, rastreio de eventos e monitoramento prontos para produção.
              </p>
            </div>
          </section>
        </div>
      </div>
    </AutoTranslateTree>
  )
}
