"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import AppLayout from "@/components/layout/AppLayout"
import AutoForm from "@/components/form/AutoForm"
import PageHeader from "@/components/ui/PageHeader"
import { useAuth } from "@/hooks/useAuth"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { findModuleResource } from "@/lib/modules"
import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { canManageUserByHierarchy } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"
import { getResourceFormConfig } from "@/lib/resources/resourceFormConfig"

export default function EditarRecursoPage() {
    const params = useParams()
    const groupKey = routeParamToString((params as any)?.group)
    const resourceKey = routeParamToString((params as any)?.resource)
    const id = routeParamToString((params as any)?.id)
    const { loading } = useAuthGuard()
    const { user } = useAuth()
    const { t, tr } = useLanguage()
    const router = useRouter()
    const { modules } = useModulesCatalog("neutral")
    const found = findModuleResource(groupKey, resourceKey, modules)
    const requiredGroups = requiredGroupsForResourceGroup(groupKey)
    const [initial, setInitial] = useState<Record<string, any> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loadingData, setLoadingData] = useState(true)
    const detailContractEndpoint = found ? `${found.resource.endpoint.replace(/\/$/, "")}/{id}/` : ""
    const canUpdateContract = found
        ? hasOpenApiMethod(detailContractEndpoint, "put") || hasOpenApiMethod(detailContractEndpoint, "patch")
        : false
    const normalizedEndpoint = (found?.resource.endpoint || "").toLowerCase()
    const isIdentityUserResource =
        normalizedEndpoint === "/identity/user/" || normalizedEndpoint === "/identidade/user/"
    const canEditRecord =
        !isIdentityUserResource ||
        canManageUserByHierarchy(user, {
            id: Number(initial?.id || 0) || undefined,
            groups: Array.isArray(initial?.group_names) ? initial.group_names : [],
        })

    useEffect(() => {
        let mounted = true
        async function load() {
            if (!found || !canUpdateContract) {
                if (mounted) setLoadingData(false)
                return
            }
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
    }, [found, id, canUpdateContract])

    if (loading) return null

    if (!found) {
        return (
            <AppLayout requiredGroups={requiredGroups}>
                <div className="space-y-6">
                    <PageHeader
                        title={t("Recurso não encontrado", "Resource not found")}
                        subtitle={t("O recurso solicitado não existe no catálogo atual.", "The requested resource does not exist in the current catalog.")}
                    />
                    <Link
                        href={`/resources/${groupKey}`}
                        className="text-sm text-gray-700 underline"
                    >
                        {t("Voltar", "Back")}
                    </Link>
                </div>
            </AppLayout>
        )
    }

    const basePath = `/resources/${groupKey}/${resourceKey}`

    if (!canUpdateContract) {
        return (
            <AppLayout requiredGroups={requiredGroups}>
                <div className="mx-auto w-full max-w-5xl space-y-6">
                    <PageHeader
                        title={t("Edição indisponível", "Editing unavailable")}
                        subtitle={t("Este recurso não expõe edição no contrato atual da API.", "This resource does not expose editing in the current API contract.")}
                        actions={
                            <Link
                                href={basePath}
                                className="text-sm text-[var(--gray-700)] underline"
                            >
                                {t("Voltar", "Back")}
                            </Link>
                        }
                    />
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout requiredGroups={requiredGroups}>
            <div className="mx-auto w-full max-w-5xl space-y-6">
                <PageHeader
                    title={`${t("Editar", "Edit")} ${tr(found.resource.label)} — ${id}`}
                    subtitle={t("Atualize os dados do registo selecionado.", "Update the selected record data.")}
                    actions={
                        <Link
                            href={`${basePath}/${id}`}
                            className="text-sm text-[var(--gray-700)] underline"
                        >
                            {t("Voltar", "Back")}
                        </Link>
                    }
                />

                {error && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {error}
                    </div>
                )}

                {loadingData ? (
                    <div className="text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
                ) : !canEditRecord ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {t("Sem autoridade hierárquica para editar este utilizador.", "No hierarchy authority to edit this user.")}
                    </div>
                ) : (
                    <AutoForm
                        endpoint={`${found.resource.endpoint.replace(/\/$/, "")}/${id}/`}
                        method="put"
                        initialValues={initial || {}}
                        submitLabel={t("Salvar", "Save")}
                        config={getResourceFormConfig(groupKey, resourceKey, found.resource.endpoint)}
                        onSuccess={() => router.push(`/resources/${groupKey}/${resourceKey}/${id}`)}
                    />
                )}
            </div>
        </AppLayout>
    )
}

