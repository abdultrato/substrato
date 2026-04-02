"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Boxes, Layers, Repeat, ShieldCheck } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { pharmacyService } from "@/lib/api/typed-client"
import { useAuth } from "@/hooks/useAuth"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

export default function FarmaciaPage() {
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [produtos, setProdutos] = useState<number>(0)
  const [lotes, setLotes] = useState<number>(0)
  const [movimentos, setMovimentos] = useState<number>(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        setLoading(true)
        setErro(null)

        const [prods, lots, movs] = await Promise.all([
          pharmacyService.listProdutos(),
          pharmacyService.listLotes(),
          pharmacyService.listMovimentos(),
        ])

        if (!mounted) return
        setProdutos(prods.data?.length ?? 0)
        setLotes(lots.data?.length ?? 0)
        setMovimentos(movs.data?.length ?? 0)
      } catch (e: any) {
        if (!mounted) return
        setErro(e?.message || "Falha ao carregar o workspace da farmácia.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="space-y-6">
        <PageHeader
          title="Farmácia"
          subtitle="Almoxarifado: produtos, lotes e movimentos de estoque."
          actions={
            podeVerAdmin ? (
              <Link
                href="/admin/farmacia/"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <ShieldCheck size={16} />
                Abrir no admin
              </Link>
            ) : null
          }
        />

        {erro ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {erro}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Produtos" value={loading ? "..." : produtos} />
          <MetricCard label="Lotes" value={loading ? "..." : lotes} />
          <MetricCard label="Movimentos" value={loading ? "..." : movimentos} />
          <MetricCard label="Inventário" value="—" hint="Indisponível na API v1" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Produtos"
            description="Catálogo de produtos e itens de almoxarifado."
            href="/farmacia/produtos"
            icon={Boxes}
          />
          <ActionTile
            title="Lotes"
            description="Rastreio por lote e validade."
            href="/farmacia/lotes"
            icon={Layers}
          />
          <ActionTile
            title="Movimentos"
            description="Entradas, saídas e ajustes de estoque."
            href="/farmacia/movimentos"
            icon={Repeat}
          />
        </div>

        <Card
          title="Cobertura da API v1"
          subtitle="Escopo do módulo de almoxarifado."
        >
          <div className="text-sm text-slate-700">
            Integração entre requisição clínica e saída de estoque não está disponível na API v1.
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
