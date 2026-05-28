"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
import ResourceDetailsCard from "@/components/resources/ResourceDetailsCard"
import { useAuth } from "@/hooks/useAuth"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { apiFetch } from "@/lib/api"
import { canonicalModuleGroupKey, findModuleResource } from "@/lib/modules"
import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { canManageUserByHierarchy } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

function ensureTrailingSlash(url: string) {
    return url.endsWith("/") ? url : `${url}/`
}

export default function ResourceDetailPage() {
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
    const canonicalGroupKey = canonicalModuleGroupKey(groupKey)
    const [data, setData] = useState<any | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loadingData, setLoadingData] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [actionId, setActionId] = useState<number | null>(null)
    const detailContractEndpoint = found ? ensureTrailingSlash(found.resource.endpoint) + "{id}/" : ""
    const canReadDetail = found ? hasOpenApiMethod(detailContractEndpoint, "get") : false
    const canDeleteRecord = found ? hasOpenApiMethod(detailContractEndpoint, "delete") : false
    const canEditRecordContract = found
        ? hasOpenApiMethod(detailContractEndpoint, "put") || hasOpenApiMethod(detailContractEndpoint, "patch")
        : false
    const surgeryKeys = ["surgery", "small_surgery", "large_surgery"]
    const isSurgery =
        canonicalGroupKey === "surgery" &&
        surgeryKeys.includes(resourceKey.toLocaleLowerCase())

    const reloadResource = useCallback(async () => {
        if (!found || !canReadDetail) {
            setLoadingData(false)
            return
        }
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
    }, [found, id, canReadDetail])

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
            router.push(`/resources/${groupKey}/${resourceKey}`)
        } catch (e: any) {
            setError(isNotFoundLikeError(e) ? null : (e?.message || "Erro ao apagar."))
        } finally {
            setDeleting(false)
        }
    }

    const basePath = `/resources/${groupKey}/${resourceKey}`
    const isBloodUnit =
        canonicalGroupKey === "bloodbank" &&
        resourceKey.toLocaleLowerCase() === "unit"
    const isBloodbank = canonicalGroupKey === "bloodbank"
    const normalizedEndpoint = (found?.resource.endpoint || "").toLowerCase()
    const isIdentityUserResource =
        normalizedEndpoint === "/identity/user/" || normalizedEndpoint === "/identidade/user/"
    const canManageCurrentRecord =
        !isIdentityUserResource ||
        canManageUserByHierarchy(user, {
            id: Number(data?.id || 0) || undefined,
            groups: Array.isArray(data?.group_names) ? data.group_names : [],
        })

    const createInvoice = useCallback(async () => {
        alert("Criar fatura apenas nos módulos Faturamento/Recepção.")
    }, [])

    const openPdf = useCallback(async () => {
        const faturaId = data?.fatura_id
        if (!faturaId) return
        try {
            setActionId(faturaId)
            const blob = await apiFetch<Blob>(`/invoices/${faturaId}/pdf/`, { responseType: "blob" })
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

    const reserveUnit = useCallback(async () => {
        const recipientRaw = prompt("ID do paciente receptor para reserva:")
        if (!recipientRaw) return
        const recipient = Number(recipientRaw)
        if (!Number.isFinite(recipient)) {
            alert("ID inválido.")
            return
        }

        try {
            setActionId(recipient)
            const endpoint = ensureTrailingSlash(found!.resource.endpoint) + `${id}/reserve/`
            await apiFetch(endpoint, { method: "POST", body: JSON.stringify({ recipient }) })
            await reloadResource()
        } catch (e: any) {
            setError(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao reservar."))
        } finally {
            setActionId(null)
        }
    }, [found, id, reloadResource])

    const releaseReservation = useCallback(async () => {
        try {
            setActionId(-1)
            const endpoint = ensureTrailingSlash(found!.resource.endpoint) + `${id}/release/`
            await apiFetch(endpoint, { method: "POST" })
            await reloadResource()
        } catch (e: any) {
            setError(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao liberar reserva."))
        } finally {
            setActionId(null)
        }
    }, [found, id, reloadResource])

    const transfuseUnit = useCallback(async () => {
        const recipientRaw = prompt("ID do paciente receptor para transfusão:")
        if (!recipientRaw) return
        const recipient = Number(recipientRaw)
        if (!Number.isFinite(recipient)) {
            alert("ID inválido.")
            return
        }

        const indication = prompt("Indicação clínica (opcional):") || ""

        try {
            setActionId(recipient)
            const endpoint = ensureTrailingSlash(found!.resource.endpoint) + `${id}/transfuse/`
            await apiFetch(endpoint, {
                method: "POST",
                body: JSON.stringify({ recipient, indication }),
            })
            await reloadResource()
        } catch (e: any) {
            setError(isNotFoundLikeError(e) ? null : (e?.message || "Falha ao transfundir."))
        } finally {
            setActionId(null)
        }
    }, [found, id, reloadResource])

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
                        className="text-sm text-[var(--gray-700)] underline"
                    >
                        {t("Voltar", "Back")}
                    </Link>
                </div>
            </AppLayout>
        )
    }

    if (!canReadDetail) {
        return (
            <AppLayout requiredGroups={requiredGroups}>
                <div className="space-y-6">
                    <PageHeader
                        title={t("Detalhe indisponível", "Detail unavailable")}
                        subtitle={t("Este recurso não expõe consulta por identificador no contrato atual da API.", "This resource does not expose detail lookup in the current API contract.")}
                    />
                    <Link
                        href={`/resources/${found.group.key}/${found.resource.key}`}
                        className="text-sm text-[var(--gray-700)] underline"
                    >
                        {t("Voltar à listagem", "Back to list")}
                    </Link>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout requiredGroups={requiredGroups}>
            <div className="space-y-6">
                <PageHeader
                    title={`${tr(found.resource.label)} — ${id}`}
                    subtitle={t("Detalhes do registo selecionado.", "Details of the selected record.")}
                    actions={
                        <div className="flex gap-3">
                            {isBloodUnit ? (
                                <>
                                    <button
                                        onClick={reserveUnit}
                                        disabled={actionId !== null}
                                        className="inline-flex items-center rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-50)] disabled:opacity-60"
                                    >
                                        Reservar
                                    </button>
                                    <button
                                        onClick={releaseReservation}
                                        disabled={actionId !== null}
                                        className="inline-flex items-center rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-50)] disabled:opacity-60"
                                    >
                                        Liberar reserva
                                    </button>
                                    <button
                                        onClick={transfuseUnit}
                                        disabled={actionId !== null}
                                        className="inline-flex items-center rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-50)] disabled:opacity-60"
                                    >
                                        Transfundir
                                    </button>
                                </>
                            ) : null}
                            {isSurgery ? (
                                data?.fatura_id ? (
                                    <button
                                        onClick={openPdf}
                                        disabled={actionId === data?.fatura_id}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-50)] disabled:opacity-60"
                                    >
                                        <PdfActionLabel loading={actionId === data?.fatura_id} loadingLabel="PDF...">
                                            PDF Fatura
                                        </PdfActionLabel>
                                    </button>
                                ) : (
                                    <button
                                        onClick={createInvoice}
                                        disabled={actionId !== null}
                                        className="inline-flex items-center rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-50)] disabled:opacity-60"
                                    >
                                        Criar fatura
                                    </button>
                                )
                            ) : null}
                            {canManageCurrentRecord && (canEditRecordContract || canDeleteRecord) ? (
                                <>
                                    {canEditRecordContract ? (
                                        <Link
                                            href={`${basePath}/${id}/edit`}
                                            className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
                                        >
                                            {t("Editar", "Edit")}
                                        </Link>
                                    ) : null}
                                    {canDeleteRecord ? (
                                        <button
                                            onClick={handleDelete}
                                            disabled={deleting}
                                            className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
                                        >
                                            {deleting ? t("Apagando...", "Deleting...") : t("Apagar", "Delete")}
                                        </button>
                                    ) : null}
                                </>
                            ) : null}
                            <Link
                                href={basePath}
                                className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-100)]"
                            >
                                {t("Voltar", "Back")}
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
                    <div className="text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
                ) : (
                    isBloodbank && data ? (
                        <ResourceDetailsCard endpoint={found.resource.endpoint} data={data} />
                    ) : (
                        <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--gray-100)] p-4 text-xs text-[var(--text)]">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    )
                )}
            </div>
        </AppLayout>
    )
}

