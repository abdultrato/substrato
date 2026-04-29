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

  const group = findModuleGroup("banco_sangue", modules)

  if (loading) return null

  const tiles: Record<
    string,
    { icon: any; description: string }
  > = {
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
                href={`/recursos/${group.key}/${resource.key}`}
                icon={tiles[resource.key]?.icon || Droplet}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Catálogo do módulo não encontrado. Verifique `frontend-next/lib/modules.ts`.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
