"use client"

import { isNotFoundLikeError } from "@/lib/errors/api-error"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import PdfActionLabel from "@/components/ui/PdfActionLabel"
import ConfirmDialog from "@/components/ui/ConfirmDialog"
import ResourceDetailsCard from "@/components/resources/ResourceDetailsCard"
import { useAuth } from "@/hooks/useAuth"
import useAuthGuard from "@/hooks/useAuthGuard"
import { useLanguage } from "@/hooks/useLanguage"
import { useModulesCatalog } from "@/hooks/useModulesCatalog"
import { useSafeDataRefreshSignal } from "@/hooks/useSafeDataRefresh"
import { apiFetch } from "@/lib/api"
import { canonicalModuleGroupKey, findModuleResource } from "@/lib/modules"
import { hasOpenApiMethod } from "@/lib/openapi/writeContract"
import { canManageUserByHierarchy } from "@/lib/rbac"
import { routeParamToString } from "@/lib/routeParams"
import { requiredGroupsForResourceGroup } from "@/lib/resourcesAccess"

function ensureTrailingSlash(url: string) {
    return url.endsWith("/") ? url : `${url}/`
}

function detailActionContractEndpoint(endpoint: string, action: string) {
    return `${ensureTrailingSlash(endpoint)}{id}/${action}/`
}

function recordActionEndpoint(endpoint: string, id: string, action: string) {
    return `${ensureTrailingSlash(endpoint)}${id}/${action}/`
}

type DetailActionDefinition = {
    key: string
    action: string
    labelPt: string
    labelEn: string
    successPt: string
    successEn: string
    tone?: "primary" | "default"
}

const WAREHOUSE_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
    sales_order: [
        {
            key: "warehouse.sales_order.confirm",
            action: "confirm",
            labelPt: "Confirmar",
            labelEn: "Confirm",
            successPt: "Pedido confirmado.",
            successEn: "Order confirmed.",
        },
        {
            key: "warehouse.sales_order.allocate",
            action: "allocate",
            labelPt: "Reservar estoque",
            labelEn: "Allocate stock",
            successPt: "Estoque reservado.",
            successEn: "Stock allocated.",
            tone: "primary",
        },
        {
            key: "warehouse.sales_order.pick",
            action: "create-pick-list",
            labelPt: "Gerar separação",
            labelEn: "Create pick list",
            successPt: "Lista de separação criada.",
            successEn: "Pick list created.",
        },
        {
            key: "warehouse.sales_order.ship",
            action: "ship",
            labelPt: "Expedir",
            labelEn: "Ship",
            successPt: "Expedição criada.",
            successEn: "Shipment created.",
            tone: "primary",
        },
    ],
    stock_reservation: [
        {
            key: "warehouse.stock_reservation.release",
            action: "release",
            labelPt: "Liberar reserva",
            labelEn: "Release reservation",
            successPt: "Reserva liberada.",
            successEn: "Reservation released.",
        },
    ],
    pick_list: [
        {
            key: "warehouse.pick_list.complete",
            action: "complete",
            labelPt: "Concluir separação",
            labelEn: "Complete picking",
            successPt: "Separação concluída.",
            successEn: "Picking completed.",
            tone: "primary",
        },
    ],
    shipment: [
        {
            key: "warehouse.shipment.ship",
            action: "ship",
            labelPt: "Baixar expedição",
            labelEn: "Post shipment",
            successPt: "Expedição lançada.",
            successEn: "Shipment posted.",
            tone: "primary",
        },
    ],
    replenishment_plan: [
        {
            key: "warehouse.replenishment_plan.generate",
            action: "generate",
            labelPt: "Gerar sugestões",
            labelEn: "Generate suggestions",
            successPt: "Sugestões geradas.",
            successEn: "Suggestions generated.",
        },
        {
            key: "warehouse.replenishment_plan.purchase",
            action: "create-purchase-order",
            labelPt: "Criar compra",
            labelEn: "Create purchase",
            successPt: "Pedido de compra criado.",
            successEn: "Purchase order created.",
            tone: "primary",
        },
    ],
    goods_receipt: [
        {
            key: "warehouse.goods_receipt.post",
            action: "post",
            labelPt: "Lançar recebimento",
            labelEn: "Post receipt",
            successPt: "Recebimento lançado.",
            successEn: "Receipt posted.",
            tone: "primary",
        },
    ],
    stock_transfer: [
        {
            key: "warehouse.stock_transfer.post",
            action: "post",
            labelPt: "Lançar transferência",
            labelEn: "Post transfer",
            successPt: "Transferência lançada.",
            successEn: "Transfer posted.",
            tone: "primary",
        },
    ],
    cycle_count: [
        {
            key: "warehouse.cycle_count.post",
            action: "post",
            labelPt: "Lançar inventário",
            labelEn: "Post count",
            successPt: "Inventário lançado.",
            successEn: "Cycle count posted.",
            tone: "primary",
        },
    ],
}

function warehouseActionButtonClass(tone?: DetailActionDefinition["tone"]) {
    if (tone === "primary") {
        return "inline-flex h-9 items-center rounded-md bg-[var(--primary-600)] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-700)] disabled:opacity-60"
    }
    return "inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-50)] disabled:opacity-60"
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
    const safeRefreshToken = useSafeDataRefreshSignal()
    const found = findModuleResource(groupKey, resourceKey, modules)
    const requiredGroups = requiredGroupsForResourceGroup(groupKey)
    const canonicalGroupKey = canonicalModuleGroupKey(groupKey)
    const [data, setData] = useState<any | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<string | null>(null)
    const [loadingData, setLoadingData] = useState(true)
    const [deleting, setDeleting] = useState(false)
    const [activeAction, setActiveAction] = useState<string | null>(null)
    const [bloodRecipient, setBloodRecipient] = useState("")
    const [bloodIndication, setBloodIndication] = useState("")
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
    const canReserveUnit = found ? hasOpenApiMethod(detailActionContractEndpoint(found.resource.endpoint, "reserve"), "post") : false
    const canReleaseUnit = found ? hasOpenApiMethod(detailActionContractEndpoint(found.resource.endpoint, "release"), "post") : false
    const canTransfuseUnit = found ? hasOpenApiMethod(detailActionContractEndpoint(found.resource.endpoint, "transfuse"), "post") : false
    const canCreateSurgeryInvoice = found
        ? hasOpenApiMethod(detailActionContractEndpoint(found.resource.endpoint, "create-invoice"), "post")
        : false
    const canDownloadInvoicePdf = hasOpenApiMethod("/billing/invoice/{id}/pdf/", "get")
    const warehouseDetailActions =
        found && canonicalGroupKey === "warehouse"
            ? (WAREHOUSE_DETAIL_ACTIONS[resourceKey.toLocaleLowerCase()] || []).filter((definition) =>
                hasOpenApiMethod(detailActionContractEndpoint(found.resource.endpoint, definition.action), "post")
            )
            : []

    const reloadResource = useCallback(async () => {
        if (!found || !canReadDetail) {
            setLoadingData(false)
            return
        }
        setLoadingData(true)
        setError(null)
        try {
            const endpoint = ensureTrailingSlash(found.resource.endpoint) + `${id}/`
            const res = await apiFetch<any>(endpoint, { clientCache: safeRefreshToken === 0 })
            setData(res)
        } catch (e: any) {
            setError(isNotFoundLikeError(e) ? null : (e?.message || "Erro ao carregar recurso."))
        } finally {
            setLoadingData(false)
        }
    }, [found, id, canReadDetail, safeRefreshToken])

    useEffect(() => {
        reloadResource().catch(() => { })
    }, [reloadResource])

    async function handleDelete() {
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
    const normalizedEndpoint = (found?.resource.endpoint || "").toLowerCase()
    const isIdentityUserResource =
        normalizedEndpoint === "/identity/user/" || normalizedEndpoint === "/identidade/user/"
    const canManageCurrentRecord =
        !isIdentityUserResource ||
        canManageUserByHierarchy(user, {
            id: Number(data?.id || 0) || undefined,
            groups: Array.isArray(data?.group_names) ? data.group_names : [],
        })
    const invoiceId = data?.fatura_id ?? data?.invoice_id ?? data?.invoice?.id ?? null

    const createInvoice = useCallback(async () => {
        if (!found || !canCreateSurgeryInvoice) return
        try {
            setActiveAction("invoice")
            setError(null)
            setFeedback(null)
            const result = await apiFetch<any>(recordActionEndpoint(found.resource.endpoint, id, "create-invoice"), {
                method: "POST",
                body: JSON.stringify({ issue: true }),
            })
            const createdInvoiceId = result?.invoice_id ?? result?.fatura_id ?? result?.invoice?.id
            if (createdInvoiceId) {
                setData((current: any) => ({ ...(current || {}), fatura_id: createdInvoiceId }))
            }
            setFeedback(t("Fatura criada.", "Invoice created."))
            await reloadResource()
        } catch (e: any) {
            setError(isNotFoundLikeError(e) ? null : (e?.message || t("Falha ao criar fatura.", "Failed to create invoice.")))
        } finally {
            setActiveAction(null)
        }
    }, [found, id, canCreateSurgeryInvoice, reloadResource, t])

    const openPdf = useCallback(async () => {
        if (!invoiceId || !canDownloadInvoicePdf) return
        try {
            setActiveAction("invoice-pdf")
            setError(null)
            setFeedback(null)
            const blob = await apiFetch<Blob>(`/billing/invoice/${invoiceId}/pdf/`, { responseType: "blob" })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `fatura_${invoiceId}.pdf`
            a.click()
            window.URL.revokeObjectURL(url)
            setFeedback(t("PDF da fatura baixado.", "Invoice PDF downloaded."))
        } catch (e: any) {
            setError(isNotFoundLikeError(e) ? null : (e?.message || t("Falha ao gerar PDF.", "Failed to generate PDF.")))
        } finally {
            setActiveAction(null)
        }
    }, [invoiceId, canDownloadInvoicePdf, t])

    const runWarehouseDetailAction = useCallback(async (definition: DetailActionDefinition) => {
        if (!found) return
        try {
            setActiveAction(definition.key)
            setError(null)
            setFeedback(null)
            await apiFetch(recordActionEndpoint(found.resource.endpoint, id, definition.action), {
                method: "POST",
                body: JSON.stringify({}),
            })
            setFeedback(t(definition.successPt, definition.successEn))
            await reloadResource()
        } catch (e: any) {
            setError(isNotFoundLikeError(e) ? null : (e?.message || t("Falha ao executar operação WMS.", "Failed to run WMS operation.")))
        } finally {
            setActiveAction(null)
        }
    }, [found, id, reloadResource, t])

    function parseRecipientId(value: string) {
        const parsed = Number(value)
        if (!Number.isInteger(parsed) || parsed < 1) {
            setError(t("Informe um ID numérico válido para o paciente receptor.", "Enter a valid numeric recipient patient ID."))
            return null
        }
        return parsed
    }

    async function runBloodUnitAction(action: "reserve" | "release" | "transfuse", payload?: Record<string, unknown>) {
        if (!found) return
        try {
            setActiveAction(action)
            setError(null)
            setFeedback(null)
            await apiFetch(recordActionEndpoint(found.resource.endpoint, id, action), {
                method: "POST",
                ...(payload ? { body: JSON.stringify(payload) } : {}),
            })
            setFeedback(
                action === "reserve"
                    ? t("Unidade reservada.", "Unit reserved.")
                    : action === "release"
                        ? t("Reserva liberada.", "Reservation released.")
                        : t("Unidade transfundida.", "Unit transfused.")
            )
            await reloadResource()
        } catch (e: any) {
            const fallback =
                action === "reserve"
                    ? t("Falha ao reservar.", "Failed to reserve.")
                    : action === "release"
                        ? t("Falha ao liberar reserva.", "Failed to release reservation.")
                        : t("Falha ao transfundir.", "Failed to transfuse.")
            setError(isNotFoundLikeError(e) ? null : (e?.message || fallback))
        } finally {
            setActiveAction(null)
        }
    }

    async function reserveUnit() {
        const recipient = parseRecipientId(bloodRecipient)
        if (recipient === null) return
        await runBloodUnitAction("reserve", { recipient })
    }

    async function releaseReservation() {
        await runBloodUnitAction("release")
    }

    async function transfuseUnit() {
        const recipient = parseRecipientId(bloodRecipient)
        if (recipient === null) return
        await runBloodUnitAction("transfuse", {
            recipient,
            indication: bloodIndication.trim(),
        })
    }

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
                            {isSurgery ? (
                                invoiceId && canDownloadInvoicePdf ? (
                                    <button
                                        onClick={openPdf}
                                        disabled={activeAction === "invoice-pdf"}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-50)] disabled:opacity-60"
                                    >
                                        <PdfActionLabel loading={activeAction === "invoice-pdf"} loadingLabel="PDF...">
                                            PDF Fatura
                                        </PdfActionLabel>
                                    </button>
                                ) : canCreateSurgeryInvoice ? (
                                    <button
                                        onClick={createInvoice}
                                        disabled={activeAction === "invoice"}
                                        className="inline-flex items-center rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--gray-700)] transition hover:bg-[var(--gray-50)] disabled:opacity-60"
                                    >
                                        {activeAction === "invoice" ? t("Criando...", "Creating...") : t("Criar fatura", "Create invoice")}
                                    </button>
                                ) : null
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
                                        <ConfirmDialog
                                            title={t("Apagar registo", "Delete record")}
                                            message={t("Esta ação apaga o registo selecionado.", "This action deletes the selected record.")}
                                            confirmText={t("Apagar", "Delete")}
                                            onConfirm={handleDelete}
                                            disabled={deleting}
                                        >
                                            <button
                                                type="button"
                                                disabled={deleting}
                                                className="inline-flex items-center rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
                                            >
                                                {deleting ? t("Apagando...", "Deleting...") : t("Apagar", "Delete")}
                                            </button>
                                        </ConfirmDialog>
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

                {feedback && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {feedback}
                    </div>
                )}

                {warehouseDetailActions.length ? (
                    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-[var(--text)]">
                                    {t("Operação WMS", "WMS operation")}
                                </h2>
                                <p className="mt-1 text-xs text-[var(--gray-600)]">
                                    {t("Comandos disponíveis para este documento.", "Commands available for this document.")}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {warehouseDetailActions.map((definition) => (
                                    <button
                                        key={definition.key}
                                        type="button"
                                        onClick={() => void runWarehouseDetailAction(definition)}
                                        disabled={activeAction !== null}
                                        className={warehouseActionButtonClass(definition.tone)}
                                    >
                                        {activeAction === definition.key
                                            ? t("A executar...", "Running...")
                                            : t(definition.labelPt, definition.labelEn)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                ) : null}

                {isBloodUnit && (canReserveUnit || canReleaseUnit || canTransfuseUnit) ? (
                    <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                        <div className="grid gap-3 md:grid-cols-3">
                            {canReserveUnit || canTransfuseUnit ? (
                                <label className="space-y-1">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                                        {t("Paciente receptor", "Recipient patient")}
                                    </span>
                                    <input
                                        type="number"
                                        min={1}
                                        value={bloodRecipient}
                                        onChange={(event) => setBloodRecipient(event.target.value)}
                                        disabled={activeAction !== null}
                                        className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] shadow-sm outline-none transition-colors hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:ring-2 focus:ring-[var(--primary-100)] disabled:opacity-60"
                                    />
                                </label>
                            ) : null}

                            {canTransfuseUnit ? (
                                <label className="space-y-1 md:col-span-2">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-600)]">
                                        {t("Indicação clínica", "Clinical indication")}
                                    </span>
                                    <input
                                        type="text"
                                        value={bloodIndication}
                                        onChange={(event) => setBloodIndication(event.target.value)}
                                        disabled={activeAction !== null}
                                        className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text)] shadow-sm outline-none transition-colors hover:border-[var(--primary-400)] focus:border-[var(--primary-500)] focus:ring-2 focus:ring-[var(--primary-100)] disabled:opacity-60"
                                    />
                                </label>
                            ) : null}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            {canReserveUnit ? (
                                <button
                                    type="button"
                                    onClick={() => void reserveUnit()}
                                    disabled={activeAction !== null}
                                    className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-50)] disabled:opacity-60"
                                >
                                    {activeAction === "reserve" ? t("Reservando...", "Reserving...") : t("Reservar", "Reserve")}
                                </button>
                            ) : null}
                            {canReleaseUnit ? (
                                <button
                                    type="button"
                                    onClick={() => void releaseReservation()}
                                    disabled={activeAction !== null}
                                    className="inline-flex h-9 items-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium text-[var(--gray-700)] shadow-sm transition hover:bg-[var(--gray-50)] disabled:opacity-60"
                                >
                                    {activeAction === "release" ? t("Liberando...", "Releasing...") : t("Liberar reserva", "Release reservation")}
                                </button>
                            ) : null}
                            {canTransfuseUnit ? (
                                <button
                                    type="button"
                                    onClick={() => void transfuseUnit()}
                                    disabled={activeAction !== null}
                                    className="inline-flex h-9 items-center rounded-md bg-red-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-60"
                                >
                                    {activeAction === "transfuse" ? t("Transfundindo...", "Transfusing...") : t("Transfundir", "Transfuse")}
                                </button>
                            ) : null}
                        </div>
                    </section>
                ) : null}

                {loadingData ? (
                    <div className="text-sm text-[var(--gray-500)]">{t("Carregando...", "Loading...")}</div>
                ) : data ? (
                    <ResourceDetailsCard endpoint={found.resource.endpoint} data={data} />
                ) : (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {t("Registo não encontrado.", "Record not found.")}
                    </div>
                )}
            </div>
        </AppLayout>
    )
}

