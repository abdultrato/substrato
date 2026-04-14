"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import AutoForm from "@/components/form/AutoForm"
import PageHeader from "@/components/ui/PageHeader"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { findModuleResource } from "@/lib/modules"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

export default function EditarRecursoPage() {
    const params = useParams()
    const groupKey = routeParamToString((params as any)?.group)
    const resourceKey = routeParamToString((params as any)?.resource)
    const id = routeParamToString((params as any)?.id)
    const { loading } = useAuthGuard()
    const router = useRouter()
    const { modules } = useModulesCatalog()
    const found = findModuleResource(groupKey, resourceKey, modules)
    const requiredGroups = requiredGroupsForResourceGroup(groupKey)
    const [initial, setInitial] = useState<Record<string, any> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loadingData, setLoadingData] = useState(true)

    useEffect(() => {
        let mounted = true
        async function load() {
            if (!found) return
            try {
                setLoadingData(true)
                setError(null)
                const endpoint = `${found.resource.endpoint.replace(/\/$/, "")}/${id}/`
                const res = await (await import("@/lib/api")).apiFetch<any>(endpoint)
                if (mounted) setInitial(res ?? {})
            } catch (e: any) {
                if (mounted) setError(isNotFoundLikeError(e) ? null : (e?.message || "Erro ao carregar recurso."))
            } finally {
                if (mounted) setLoadingData(false)
            }
        }
        load()
        return () => {
            mounted = false
        }
    }, [found, id])

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
                        className="text-sm text-gray-700 underline"
                    >
                        Voltar
                    </Link>
                </div>
            </AppLayout>
        )
    }

    const basePath = `/recursos/${groupKey}/${resourceKey}`

    return (
        <AppLayout requiredGroups={requiredGroups}>
            <div className="space-y-6">
                <PageHeader
                    title={`Editar ${found.resource.label} — ${id}`}
                    subtitle={found.resource.endpoint}
                    actions={
                        <Link
                            href={`${basePath}/${id}`}
                            className="text-sm text-[var(--gray-700)] underline"
                        >
                            Voltar
                        </Link>
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
                    <AutoForm
                        endpoint={`${found.resource.endpoint.replace(/\/$/, "")}/${id}/`}
                        method="put"
                        initialValues={initial || {}}
                        submitLabel="Salvar"
                        onSuccess={() => router.push(`/recursos/${groupKey}/${resourceKey}/${id}`)}
                    />
                )}
            </div>
        </AppLayout>
    )
}


