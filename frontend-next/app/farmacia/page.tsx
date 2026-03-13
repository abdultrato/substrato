"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Boxes, Layers, Repeat, ShieldCheck } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import Card from "@/components/ui/Card"
import PageHeader from "@/components/ui/PageHeader"
import MetricCard from "@/components/ui/MetricCard"
import ActionTile from "@/components/ui/ActionTile"
import { apiFetch } from "@/lib/api"
import { GROUPS } from "@/lib/rbac"

export default function FarmaciaPage() {
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
          apiFetch<any>("/farmacia/produto/"),
          apiFetch<any>("/farmacia/lote/"),
          apiFetch<any>("/farmacia/movimentoestoque/"),
        ])

        const list = (v: any) => (v && v.results ? v.results : v) || []

        if (!mounted) return
        setProdutos(Array.isArray(list(prods)) ? list(prods).length : 0)
        setLotes(Array.isArray(list(lots)) ? list(lots).length : 0)
        setMovimentos(Array.isArray(list(movs)) ? list(movs).length : 0)
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
            <Link
              href="/admin/farmacia/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              <ShieldCheck size={16} />
              Abrir no admin
            </Link>
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
          <MetricCard label="Inventário" value="—" hint="Conferência/alertas em evolução" />
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
          title="Nota"
          subtitle="Este workspace é focado em almoxarifado (sem expor telas clínicas)."
        >
          <div className="text-sm text-slate-700">
            Se a jornada incluir "levantamento de medicação" ligada a uma requisição clínica, ainda precisamos
            do vínculo explícito entre requisição e saída de estoque no backend/serializers.
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
