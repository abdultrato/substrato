"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Boxes, Layers, Repeat, ShieldCheck } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetchList } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { isNotFoundLikeError } from "@/lib/errors/api-error"

export default function FarmaciaPage() {
  const { user } = useAuth()
  const podeVerAdmin = userHasAnyGroup(user, [GROUPS.ADMIN])
  const safeRefreshToken = useSafeDataRefreshSignal()

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

        const countWithFallback = async (endpoint: string): Promise<number> => {
          try {
            const { meta } = await apiFetchList(endpoint, {
              page: 1,
              pageSize: 1,
              clientCache: false,
              timeoutMs: 4000,
              retryOnTimeout: 0,
            })
            return meta.total ?? 0
          } catch (error) {
            if (isNotFoundLikeError(error)) {
              return 0
            }
            throw error
          }
        }

        const [produtosCount, lotesCount, movimentosCount] = await Promise.all([
          countWithFallback("/pharmacy/product/"),
          countWithFallback("/pharmacy/lot/"),
          countWithFallback("/pharmacy/inventory_movement/"),
        ])

        if (!mounted) return
        setProdutos(produtosCount)
        setLotes(lotesCount)
        setMovimentos(movimentosCount)
      } catch (e: any) {
        if (!mounted) return
        setErro(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao carregar o workspace da farmácia."))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [safeRefreshToken])

  return (
    <AppLayout requiredGroups={[GROUPS.ADMIN, GROUPS.FARMACIA]}>
      <div className="space-y-6">
        <PageHeader
          title="Farmácia"
          actions={
            podeVerAdmin ? (
              <Link
                href="/admin/pharmacy/"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <ShieldCheck size={16} />
                Abrir na Administração
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
          <MetricCard label="Inventário" value="—" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            title="Produtos"
            description="Catálogo de produtos e itens de almoxarifado."
            href="/pharmacy/products"
            icon={Boxes}
          />
          <ActionTile
            title="Lotes"
            description="Rastreio por lote e validade."
            href="/pharmacy/lots"
            icon={Layers}
          />
          <ActionTile
            title="Movimentos"
            description="Entradas, saídas e ajustes de estoque."
            href="/pharmacy/movements"
            icon={Repeat}
          />
          <ActionTile
            title="Requisições"
            description="Pendentes/parciais de outros setores."
            href="/pharmacy/material-requests"
            icon={Layers}
          />
        </div>

        <Card
          title="Visão do módulo"
          subtitle="Escopo do módulo de almoxarifado."
        >
          <div className="text-sm text-slate-700">
            Requisições internas de materiais por setor, avio parcial/total e baixa de estoque já estão disponíveis.
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}



