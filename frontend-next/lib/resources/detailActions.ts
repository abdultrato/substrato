// Registry de ações de workflow por registo (detail-level @actions do backend DRF).
//
// Cada entrada descreve um botão que faz POST a `/<recurso>/{id}/<action>/`.
// A visibilidade é sempre filtrada por `hasOpenApiMethod` — ou seja, um botão só
// aparece se o contrato OpenAPI expuser realmente a ação. Isto torna o registry
// seguro mesmo que o schema ainda não tenha sido regenerado para uma ação nova.
//
// Mantemos o mesmo espírito do WAREHOUSE_DETAIL_ACTIONS já existente em
// app/resources/[group]/[resource]/[id]/page.tsx, mas partilhável entre as
// páginas de detalhe geradas (GeneratedResourceDetailPage) módulo a módulo.

import { hasOpenApiMethod } from "@/lib/openapi/writeContract"

export type DetailActionFieldType =
  | "text"
  | "textarea"
  | "select"
  | "checkbox"
  | "number"
  | "date"
  | "datetime-local"

export type DetailActionFieldOption = { value: string; label: string }

export type DetailActionField = {
  name: string
  labelPt: string
  labelEn: string
  type: DetailActionFieldType
  required?: boolean
  defaultValue?: string | boolean | number
  placeholder?: string
  helperPt?: string
  helperEn?: string
  options?: DetailActionFieldOption[]
}

export type DetailActionDefinition = {
  key: string
  /** Segmento de URL após `{id}/` (ex.: "autorizar"). */
  action: string
  labelPt: string
  labelEn: string
  successPt: string
  successEn: string
  descriptionPt?: string
  descriptionEn?: string
  tone?: "primary" | "default" | "danger"
  /** Pede confirmação antes de executar (ex.: cancelar). */
  confirm?: boolean
  /** Campos recolhidos e enviados como corpo JSON do POST. */
  fields?: DetailActionField[]
}

export function normalizeDetailEndpoint(endpoint: string): string {
  const clean = String(endpoint || "").split("?")[0].split("#")[0].trim()
  if (!clean) return "/"
  const withoutApiPrefix = clean.replace(/^\/api\/v1(?=\/)/, "")
  const prefixed = withoutApiPrefix.startsWith("/") ? withoutApiPrefix : `/${withoutApiPrefix}`
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`
}

export function detailActionContractEndpoint(endpoint: string, action: string): string {
  return `${normalizeDetailEndpoint(endpoint)}{id}/${action}/`
}

export function recordActionEndpoint(endpoint: string, id: string | number, action: string): string {
  return `${normalizeDetailEndpoint(endpoint)}${encodeURIComponent(String(id))}/${action}/`
}

// ── Laboratório Clínico (LIS) ────────────────────────────────────────────────
const CLINICAL_LABORATORY_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/clinical_laboratory/sector/": [
    {
      key: "clinical_laboratory.sector.ativar",
      action: "ativar",
      labelPt: "Ativar",
      labelEn: "Activate",
      successPt: "Sector ativado.",
      successEn: "Sector activated.",
      tone: "primary",
    },
    {
      key: "clinical_laboratory.sector.inativar",
      action: "inativar",
      labelPt: "Inativar",
      labelEn: "Deactivate",
      successPt: "Sector inativado.",
      successEn: "Sector deactivated.",
      confirm: true,
    },
  ],
  "/clinical_laboratory/test/": [
    {
      key: "clinical_laboratory.test.ativar",
      action: "ativar",
      labelPt: "Ativar exame",
      labelEn: "Activate test",
      successPt: "Exame ativado no catálogo.",
      successEn: "Test activated in the catalog.",
      tone: "primary",
    },
    {
      key: "clinical_laboratory.test.inativar",
      action: "inativar",
      labelPt: "Inativar exame",
      labelEn: "Deactivate test",
      successPt: "Exame inativado no catálogo.",
      successEn: "Test deactivated in the catalog.",
      confirm: true,
    },
  ],
  "/clinical_laboratory/panel/": [
    {
      key: "clinical_laboratory.panel.ativar",
      action: "ativar",
      labelPt: "Ativar painel",
      labelEn: "Activate panel",
      successPt: "Painel ativado no catálogo.",
      successEn: "Panel activated in the catalog.",
      tone: "primary",
    },
    {
      key: "clinical_laboratory.panel.inativar",
      action: "inativar",
      labelPt: "Inativar painel",
      labelEn: "Deactivate panel",
      successPt: "Painel inativado no catálogo.",
      successEn: "Panel deactivated in the catalog.",
      confirm: true,
    },
  ],
  "/clinical_laboratory/order/": [
    {
      key: "clinical_laboratory.order.autorizar",
      action: "autorizar",
      labelPt: "Autorizar pedido",
      labelEn: "Authorize order",
      descriptionPt: "Liberta o pedido para a fase pré-analítica.",
      descriptionEn: "Releases the order to the pre-analytical phase.",
      successPt: "Pedido autorizado.",
      successEn: "Order authorized.",
      tone: "primary",
    },
    {
      key: "clinical_laboratory.order.cancelar",
      action: "cancelar",
      labelPt: "Cancelar pedido",
      labelEn: "Cancel order",
      successPt: "Pedido cancelado.",
      successEn: "Order cancelled.",
      tone: "danger",
      confirm: true,
    },
  ],
  "/clinical_laboratory/sample/": [
    {
      key: "clinical_laboratory.sample.receber",
      action: "receber",
      labelPt: "Receber amostra",
      labelEn: "Receive sample",
      successPt: "Amostra recebida.",
      successEn: "Sample received.",
      tone: "primary",
    },
    {
      key: "clinical_laboratory.sample.aceitar",
      action: "aceitar",
      labelPt: "Aceitar amostra",
      labelEn: "Accept sample",
      successPt: "Amostra aceite.",
      successEn: "Sample accepted.",
      tone: "primary",
    },
    {
      key: "clinical_laboratory.sample.rejeitar",
      action: "rejeitar",
      labelPt: "Rejeitar amostra",
      labelEn: "Reject sample",
      successPt: "Amostra rejeitada.",
      successEn: "Sample rejected.",
      tone: "danger",
      confirm: true,
    },
  ],
  "/clinical_laboratory/result/": [
    {
      key: "clinical_laboratory.result.inserir_resultado",
      action: "inserir-resultado",
      labelPt: "Inserir resultado",
      labelEn: "Enter result",
      successPt: "Resultado inserido.",
      successEn: "Result entered.",
      tone: "primary",
      fields: [
        {
          name: "value",
          labelPt: "Valor do resultado",
          labelEn: "Result value",
          type: "text",
          required: true,
          placeholder: "Ex.: 13.5",
        },
      ],
    },
    {
      key: "clinical_laboratory.result.validar",
      action: "validar",
      labelPt: "Validar resultado",
      labelEn: "Validate result",
      successPt: "Resultado validado.",
      successEn: "Result validated.",
      tone: "primary",
    },
  ],
  "/clinical_laboratory/validation/": [
    {
      key: "clinical_laboratory.validation.aprovar",
      action: "aprovar",
      labelPt: "Aprovar validação",
      labelEn: "Approve validation",
      successPt: "Validação aprovada.",
      successEn: "Validation approved.",
      tone: "primary",
    },
  ],
  "/clinical_laboratory/report/": [
    {
      key: "clinical_laboratory.report.assinar",
      action: "assinar",
      labelPt: "Assinar laudo",
      labelEn: "Sign report",
      successPt: "Laudo assinado.",
      successEn: "Report signed.",
      tone: "primary",
    },
    {
      key: "clinical_laboratory.report.entregar",
      action: "entregar",
      labelPt: "Entregar laudo",
      labelEn: "Deliver report",
      successPt: "Laudo entregue.",
      successEn: "Report delivered.",
      fields: [
        {
          name: "channel",
          labelPt: "Canal de entrega",
          labelEn: "Delivery channel",
          type: "select",
          defaultValue: "email",
          options: [
            { value: "email", label: "Email" },
            { value: "whatsapp", label: "WhatsApp" },
            { value: "portal", label: "Portal do paciente" },
            { value: "presencial", label: "Presencial" },
          ],
        },
      ],
    },
  ],
  "/clinical_laboratory/quality_document/": [
    {
      key: "clinical_laboratory.quality_document.aprovar",
      action: "aprovar",
      labelPt: "Aprovar documento",
      labelEn: "Approve document",
      successPt: "Documento aprovado.",
      successEn: "Document approved.",
      tone: "primary",
    },
  ],
  "/clinical_laboratory/nonconformity/": [
    {
      key: "clinical_laboratory.nonconformity.encerrar",
      action: "encerrar",
      labelPt: "Encerrar não-conformidade",
      labelEn: "Close nonconformity",
      successPt: "Não-conformidade encerrada.",
      successEn: "Nonconformity closed.",
      tone: "primary",
      confirm: true,
    },
  ],
  "/clinical_laboratory/corrective_action/": [
    {
      key: "clinical_laboratory.corrective_action.concluir",
      action: "concluir",
      labelPt: "Concluir ação",
      labelEn: "Complete action",
      successPt: "Ação corretiva concluída.",
      successEn: "Corrective action completed.",
      tone: "primary",
    },
    {
      key: "clinical_laboratory.corrective_action.verificar",
      action: "verificar",
      labelPt: "Verificar eficácia",
      labelEn: "Verify effectiveness",
      successPt: "Eficácia verificada.",
      successEn: "Effectiveness verified.",
      fields: [
        {
          name: "effective",
          labelPt: "Foi eficaz?",
          labelEn: "Was it effective?",
          type: "checkbox",
          defaultValue: true,
        },
        {
          name: "notes",
          labelPt: "Notas de verificação",
          labelEn: "Verification notes",
          type: "textarea",
        },
      ],
    },
    {
      key: "clinical_laboratory.corrective_action.fechar",
      action: "fechar",
      labelPt: "Fechar ação",
      labelEn: "Close action",
      successPt: "Ação corretiva fechada.",
      successEn: "Corrective action closed.",
      confirm: true,
    },
  ],
}

// ── Consultas ────────────────────────────────────────────────────────────────
const CONSULTATIONS_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/consultations/consultation/": [
    {
      key: "consultations.consultation.complete",
      action: "complete",
      labelPt: "Concluir consulta",
      labelEn: "Complete consultation",
      successPt: "Consulta concluída.",
      successEn: "Consultation completed.",
      tone: "primary",
    },
    {
      key: "consultations.consultation.reschedule",
      action: "reschedule",
      labelPt: "Reagendar",
      labelEn: "Reschedule",
      successPt: "Consulta reagendada.",
      successEn: "Consultation rescheduled.",
      fields: [
        {
          name: "scheduled_for",
          labelPt: "Nova data/hora",
          labelEn: "New date/time",
          type: "datetime-local",
          required: true,
        },
      ],
    },
    {
      key: "consultations.consultation.create_invoice",
      action: "create-invoice",
      labelPt: "Criar fatura",
      labelEn: "Create invoice",
      descriptionPt: "Gera a fatura da consulta a partir dos itens faturáveis.",
      descriptionEn: "Generates the consultation invoice from billable items.",
      successPt: "Fatura criada.",
      successEn: "Invoice created.",
      fields: [
        {
          name: "issue",
          labelPt: "Emitir já (não deixar em rascunho)",
          labelEn: "Issue now (not draft)",
          type: "checkbox",
          defaultValue: true,
        },
      ],
    },
    {
      key: "consultations.consultation.cancel",
      action: "cancel",
      labelPt: "Cancelar consulta",
      labelEn: "Cancel consultation",
      successPt: "Consulta cancelada.",
      successEn: "Consultation cancelled.",
      tone: "danger",
      confirm: true,
      fields: [
        {
          name: "reason",
          labelPt: "Motivo (opcional)",
          labelEn: "Reason (optional)",
          type: "textarea",
        },
      ],
    },
  ],
  "/consultations/specialty/": [
    {
      key: "consultations.specialty.ativar",
      action: "ativar",
      labelPt: "Ativar especialidade",
      labelEn: "Activate specialty",
      successPt: "Especialidade ativada.",
      successEn: "Specialty activated.",
      tone: "primary",
    },
    {
      key: "consultations.specialty.inativar",
      action: "inativar",
      labelPt: "Inativar especialidade",
      labelEn: "Deactivate specialty",
      successPt: "Especialidade inativada.",
      successEn: "Specialty deactivated.",
      confirm: true,
    },
  ],
}

// Registry global por endpoint-pai (normalizado). Cada módulo contribui o seu mapa.
export const RESOURCE_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  ...CLINICAL_LABORATORY_DETAIL_ACTIONS,
  ...CONSULTATIONS_DETAIL_ACTIONS,
}

/** Ações declaradas para um endpoint, sem filtro de contrato. */
export function getDeclaredDetailActions(endpoint: string): DetailActionDefinition[] {
  return RESOURCE_DETAIL_ACTIONS[normalizeDetailEndpoint(endpoint)] || []
}

/** Ações realmente disponíveis (filtradas pelo contrato OpenAPI). */
export function getAvailableDetailActions(endpoint: string): DetailActionDefinition[] {
  const key = normalizeDetailEndpoint(endpoint)
  return getDeclaredDetailActions(key).filter((definition) =>
    hasOpenApiMethod(detailActionContractEndpoint(key, definition.action), "post")
  )
}
