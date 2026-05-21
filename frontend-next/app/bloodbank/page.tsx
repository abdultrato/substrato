"use client"

import Link from "next/link"
import {
  Droplet,
  Shield,
  Package,
  Settings,
  ArrowLeftRight,
  Layers,
  HeartPulse,
  type LucideIcon,
} from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import ActionTile from "@/components/ui/ActionTile"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useAuth } from "@/hooks/useAuth"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { findModuleGroup } from "@/lib/modules"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

export default function BancoSanguePage() {
  const { loading } = useAuthGuard()
  const { user } = useAuth()
  const { modules } = useModulesCatalog()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

  const group = findModuleGroup("bloodbank", modules)

  if (loading) return null

  const tiles: Record<string, { icon: LucideIcon; description: string }> = {
    doacao: {
      icon: Droplet,
      description: "Registrar e acompanhar doacoes e triagem.",
    },
    unidade: {
      icon: Layers,
      description: "Controle de bolsas e hemocomponentes por estado.",
    },
    transfusao: {
      icon: HeartPulse,
      description: "Registros de transfusoes e pacientes receptores.",
    },
    armazenamento: {
      icon: Package,
      description: "Geladeiras, freezers e locais de armazenamento.",
    },
    movimentoestoque: {
      icon: ArrowLeftRight,
      description: "Entradas, saidas, reservas e transferencias.",
    },
    manutencaoarmazenamento: {
      icon: Settings,
      description: "Agendar e registrar manutencoes dos armazenamentos.",
    },
  }

  const eventCreateLinks = [
    {
      key: "movimentoestoque",
      label: "Novo evento de movimento",
      href: "/resources/bloodbank/movimentoestoque/new",
      description: "Entrada, saida, transferencia, reserva, liberacao, descarte e ajustes.",
    },
    {
      key: "transfusao",
      label: "Nova transfusao",
      href: "/resources/bloodbank/transfusao/new",
      description: "Solicitacao e execucao de transfusao com validacoes clinicas.",
    },
    {
      key: "manutencaoarmazenamento",
      label: "Nova manutencao",
      href: "/resources/bloodbank/manutencaoarmazenamento/new",
      description: "Plano preventivo/corretivo e registo de execucao tecnica.",
    },
  ]

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.LABORATORIO]}>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader
          title="Banco de Sangue"
          subtitle="Doações, unidades, transfusões, armazenamentos e manutenções."
          actions={
            podeVerAdmin ? (
              <Link
                href="/admin/bloodbank/"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <Shield size={16} />
                Abrir na administração
              </Link>
            ) : null
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {group?.resources?.length ? (
            group.resources.map((resource) => (
              <ActionTile
                key={resource.key}
                title={resource.label}
                description={tiles[resource.key]?.description || "Abrir lista e criar novos registros."}
                href={`/resources/${group.key}/${resource.key}`}
                icon={tiles[resource.key]?.icon || Droplet}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Catálogo do módulo não encontrado. Contacte o administrador do sistema.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Criacao de Eventos</h2>
          <p className="mt-1 text-xs text-slate-600">
            Use os atalhos abaixo para criar eventos operacionais do banco de sangue no frontend.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {eventCreateLinks.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="block rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 hover:font-semibold"
              >
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="mt-1 text-xs text-slate-600">{item.description}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Logica Operacional Exposta</h2>
          <div className="mt-2 space-y-1 text-xs text-slate-700">
            <p>
              1. Na unidade, a acao <strong>Reservar</strong> cria automaticamente um evento de estoque do tipo <code>RESERVE</code>.
            </p>
            <p>
              2. A acao <strong>Liberar reserva</strong> registra automaticamente o evento <code>RELEASE</code>.
            </p>
            <p>
              3. A acao <strong>Transfundir</strong> cria a transfusao concluida e registra a saida <code>OUTBOUND</code>.
            </p>
            <p>
              4. Eventos manuais de movimentacao/manutencao seguem as mesmas validacoes do backend por tenant e regras de negocio.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
