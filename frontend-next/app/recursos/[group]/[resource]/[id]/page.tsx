"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { apiFetch } from "@/lib/api"
import { findModuleResource } from "@/lib/modules"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

function ensureTrailingSlash(url: string) {
    return url.endsWith("/") ? url : `${url}/`
}

export default function RecursoDetalhePage() {
    const params = useParams()
    const groupKey = routeParamToString((params as any)?.group)
    const resourceKey = routeParamToString((params as any)?.resource)
    const id = routeParamToString((params as any)?.id)
    const { loading } = useAuthGuard()
    const router = useRouter()
    const { modules } = useModulesCatalog()
    const found = findModuleResource(groupKey, resourceKey, modules)
    const requiredGroups = requiredGroupsForResourceGroup(groupKey)
    const [data, setData] = useState<any | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loadingData, setLoadingData] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [actionId, setActionId] = useState<number | null>(null)
    const isCirurgia = groupKey === "cirurgia" && resourceKey === "cirurgia"

    const reloadResource = useCallback(async () => {
        if (!found) return
        setLoadingData(true)
        setError(null)
        try {
            const endpoint = ensureTrailingSlash(found.resource.endpoint) + `${id}/`
            const res = await apiFetch<any>(endpoint)
            setData(res)
        } catch (e: any) {
            setError(isNotFoundLikeError(e) ? null : (e?.message || "Erro ao carregar recurso."))
        } finally {
            setLoadingData(false)
        }
    }, [found, id])

    useEffect(() => {
        reloadResource().catch(() => { })
    }, [reloadResource])

    async function handleDelete() {
        if (!confirm("Apagar este registro?")) return
        setDeleting(true)
        setError(null)
        try {
            const endpoint = ensureTrailingSlash(found.resource.endpoint) + `${id}/`
            await apiFetch(endpoint, { method: "DELETE" })
            router.push(`/recursos/${groupKey}/${resourceKey}`)
        } catch (e: any) {
            setError(isNotFoundLikeError(e) ? null : (e?.message || "Erro ao apagar."))
        } finally {
            setDeleting(false)
        }
    }

    const basePath = `/recursos/${groupKey}/${resourceKey}`

    const criarFatura = useCallback(async () => {
        alert("Criar fatura apenas nos módulos Faturamento/Recepção.")
    }, [])

    const abrirPdf = useCallback(async () => {
        const faturaId = data?.fatura_id
        if (!faturaId) return
        try {
            setActionId(faturaId)
            const blob = await apiFetch<Blob>(`/faturas/${faturaId}/pdf/`, { responseType: "blob" })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `fatura_${faturaId}.pdf`
            a.click()
            window.URL.revokeObjectURL(url)
        } catch (e: any) {
            setError(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao gerar PDF."))
        } finally {
            setActionId(null)
        }
    }, [data?.fatura_id])

    if (loading) return null

    if (!found) {
        return (
            <AppLayout requiredGroups={requiredGroups}>
                <div className="space-y-6">
                    <PageHeader
                        title="Recurso não encontrado"
                        subtitle={`${groupKey}/${resourceKey}`}
                    />
                    <Link
                        href={`/recursos/${groupKey}`}
                        className="text-sm text-[var(--gray-700)] underline"
                    >
                        Voltar
                    </Link>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout requiredGroups={requiredGroups}>
            <div className="space-y-6">
                <PageHeader
                    title={`${found.resource.label} — ${id}`}
                    subtitle={found.resource.endpoint}
                    actions={
                        <div className="flex gap-3">
                            {isCirurgia ? (
                                data?.fatura_id ? (
                                    <button
                                        onClick={abrirPdf}
                                        disabled={actionId === data?.fatura_id}
                                        className="inline-flex items-center rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-50)] disabled:opacity-60"
                                    >
                                        PDF Fatura
                                    </button>
                                ) : (
                                    <button
                                        onClick={criarFatura}
                                        disabled={actionId !== null}
                                        className="inline-flex items-center rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-50)] disabled:opacity-60"
                                    >
                                        Criar fatura
                                    </button>
                                )
                            ) : null}
                            <Link
                                href={`${basePath}/${id}/editar`}
                                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
                            >
                                Editar
                            </Link>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
                            >
                                {deleting ? "Apagando..." : "Apagar"}
                            </button>
                            <Link
                                href={basePath}
                                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
                            >
                                Voltar
                            </Link>
                        </div>
                    }
                />

                {error && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {error}
                    </div>
                )}

                {loadingData ? (
                    <div className="text-sm text-[var(--gray-500)]">Carregando...</div>
                ) : (
                    <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--gray-100)] p-4 text-xs text-[var(--text)]">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                )}
            </div>
        </AppLayout>
    )
}


