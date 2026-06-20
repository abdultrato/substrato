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
  /**
   * Só mostra a ação quando o registo satisfaz esta condição. Se omitido,
   * as ações de ativar/inativar alternam automaticamente pelo estado do
   * registo (ver `isDetailActionVisibleForRecord`).
   */
  visibleWhen?: (record: Record<string, unknown>) => boolean
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
      key: "consultations.consultation.create_invoice",
      action: "create-invoice",
      labelPt: "Criar fatura",
      labelEn: "Create invoice",
      descriptionPt: "Gera a fatura da consulta a partir dos itens faturáveis.",
      descriptionEn: "Generates the consultation invoice from billable items.",
      successPt: "Fatura criada.",
      successEn: "Invoice created.",
      visibleWhen: (r) => r.status !== "CONCLUIDA" && r.status !== "CANCELADA",
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
      key: "consultations.consultation.request_credit_note",
      action: "request-credit-note",
      labelPt: "Solicitar nota de crédito",
      labelEn: "Request credit note",
      successPt: "Pedido de nota de crédito criado.",
      successEn: "Credit note request created.",
      visibleWhen: (r) => r.status === "CONCLUIDA",
      fields: [
        {
          name: "reason",
          labelPt: "Motivo (opcional)",
          labelEn: "Reason (optional)",
          type: "textarea",
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
      visibleWhen: (r) => r.status !== "CONCLUIDA" && r.status !== "CANCELADA",
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

// ── Processo clínico / Prontuário ────────────────────────────────────────────
const MEDICAL_RECORDS_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/medical_records/record/": [
    {
      key: "medical_records.record.finalizar",
      action: "finalizar",
      labelPt: "Finalizar registo",
      labelEn: "Finalize record",
      successPt: "Registo finalizado.",
      successEn: "Record finalized.",
      tone: "primary",
    },
    {
      key: "medical_records.record.cancelar",
      action: "cancelar",
      labelPt: "Cancelar registo",
      labelEn: "Cancel record",
      successPt: "Registo cancelado.",
      successEn: "Record cancelled.",
      tone: "danger",
      confirm: true,
      fields: [
        { name: "reason", labelPt: "Motivo (opcional)", labelEn: "Reason (optional)", type: "textarea" },
      ],
    },
  ],
}

// ── Maternidade ──────────────────────────────────────────────────────────────
const MATERNITY_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/maternity/gestacao/": [
    {
      key: "maternity.gestacao.registar_parto",
      action: "registar-parto",
      labelPt: "Registar parto",
      labelEn: "Register delivery",
      successPt: "Parto registado.",
      successEn: "Delivery registered.",
      tone: "primary",
      fields: [
        { name: "cesarean", labelPt: "Cesariana", labelEn: "Cesarean", type: "checkbox", defaultValue: false },
      ],
    },
    {
      key: "maternity.gestacao.encerrar",
      action: "encerrar",
      labelPt: "Encerrar gestação",
      labelEn: "Close pregnancy",
      successPt: "Gestação encerrada.",
      successEn: "Pregnancy closed.",
      confirm: true,
    },
    {
      key: "maternity.gestacao.cancelar",
      action: "cancelar",
      labelPt: "Cancelar gestação",
      labelEn: "Cancel pregnancy",
      successPt: "Gestação cancelada.",
      successEn: "Pregnancy cancelled.",
      tone: "danger",
      confirm: true,
      fields: [
        { name: "reason", labelPt: "Motivo (opcional)", labelEn: "Reason (optional)", type: "textarea" },
      ],
    },
  ],
}

// Campos opcionais reutilizados (o backend lê via request.data.get(x, default)).
const reasonField: DetailActionField = {
  name: "reason",
  labelPt: "Motivo (opcional)",
  labelEn: "Reason (optional)",
  type: "textarea",
}
const notesField: DetailActionField = {
  name: "notes",
  labelPt: "Notas (opcional)",
  labelEn: "Notes (optional)",
  type: "textarea",
}

// ── Radiologia ───────────────────────────────────────────────────────────────
const RADIOLOGY_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/radiology/equipment/": [
    { key: "radiology.equipment.marcar-disponivel", action: "marcar-disponivel", labelPt: "Marcar disponível", labelEn: "Mark available", successPt: "Equipamento disponível.", successEn: "Equipment available.", tone: "primary" },
    { key: "radiology.equipment.marcar-manutencao", action: "marcar-manutencao", labelPt: "Marcar em manutenção", labelEn: "Mark under maintenance", successPt: "Equipamento em manutenção.", successEn: "Equipment under maintenance.", fields: [notesField] },
  ],
  "/radiology/study/": [
    { key: "radiology.study.agendar", action: "agendar", labelPt: "Agendar estudo", labelEn: "Schedule study", successPt: "Estudo agendado.", successEn: "Study scheduled.", tone: "primary", fields: [{ name: "scheduled_at", labelPt: "Data/hora (opcional)", labelEn: "Date/time (optional)", type: "datetime-local" }] },
    { key: "radiology.study.iniciar", action: "iniciar", labelPt: "Iniciar aquisição", labelEn: "Start acquisition", successPt: "Aquisição iniciada.", successEn: "Acquisition started.", tone: "primary" },
    { key: "radiology.study.marcar-adquirido", action: "marcar-adquirido", labelPt: "Marcar adquirido", labelEn: "Mark acquired", successPt: "Estudo adquirido.", successEn: "Study acquired.", tone: "primary", fields: [{ name: "image_count", labelPt: "Nº de imagens (opcional)", labelEn: "Image count (optional)", type: "number" }] },
    { key: "radiology.study.cancelar", action: "cancelar", labelPt: "Cancelar estudo", labelEn: "Cancel study", successPt: "Estudo cancelado.", successEn: "Study cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/radiology/report/": [
    { key: "radiology.report.assinar", action: "assinar", labelPt: "Assinar laudo", labelEn: "Sign report", successPt: "Laudo assinado.", successEn: "Report signed.", tone: "primary" },
    { key: "radiology.report.liberar", action: "liberar", labelPt: "Liberar laudo", labelEn: "Release report", successPt: "Laudo liberado.", successEn: "Report released.", tone: "primary" },
    { key: "radiology.report.comunicar-critico", action: "comunicar-critico", labelPt: "Comunicar resultado crítico", labelEn: "Communicate critical result", successPt: "Resultado crítico comunicado.", successEn: "Critical result communicated.", fields: [{ name: "communication", labelPt: "Comunicação", labelEn: "Communication", type: "textarea" }] },
    { key: "radiology.report.retificar", action: "retificar", labelPt: "Retificar laudo", labelEn: "Amend report", successPt: "Laudo retificado.", successEn: "Report amended.", confirm: true, fields: [reasonField] },
  ],
  "/radiology/pacs_event/": [
    { key: "radiology.pacs_event.reprocessar", action: "reprocessar", labelPt: "Reprocessar evento", labelEn: "Reprocess event", successPt: "Evento reprocessado.", successEn: "Event reprocessed.", tone: "primary" },
  ],
}

// ── Diagnósticos especializados ──────────────────────────────────────────────
const SPECIALTY_DIAGNOSTICS_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/specialty_diagnostics/equipment/": [
    { key: "specialty_diagnostics.equipment.marcar-disponivel", action: "marcar-disponivel", labelPt: "Marcar disponível", labelEn: "Mark available", successPt: "Equipamento disponível.", successEn: "Equipment available.", tone: "primary" },
    { key: "specialty_diagnostics.equipment.marcar-manutencao", action: "marcar-manutencao", labelPt: "Marcar em manutenção", labelEn: "Mark under maintenance", successPt: "Equipamento em manutenção.", successEn: "Equipment under maintenance.", fields: [notesField] },
  ],
  "/specialty_diagnostics/order/": [
    { key: "specialty_diagnostics.order.agendar", action: "agendar", labelPt: "Agendar", labelEn: "Schedule", successPt: "Exame agendado.", successEn: "Order scheduled.", tone: "primary", fields: [{ name: "scheduled_at", labelPt: "Data/hora (opcional)", labelEn: "Date/time (optional)", type: "datetime-local" }] },
    { key: "specialty_diagnostics.order.iniciar", action: "iniciar", labelPt: "Iniciar exame", labelEn: "Start exam", successPt: "Exame iniciado.", successEn: "Exam started.", tone: "primary" },
    { key: "specialty_diagnostics.order.finalizar-execucao", action: "finalizar-execucao", labelPt: "Finalizar execução", labelEn: "Finish execution", successPt: "Execução finalizada.", successEn: "Execution finished.", tone: "primary" },
    { key: "specialty_diagnostics.order.cancelar", action: "cancelar", labelPt: "Cancelar exame", labelEn: "Cancel order", successPt: "Exame cancelado.", successEn: "Order cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/specialty_diagnostics/report/": [
    { key: "specialty_diagnostics.report.assinar", action: "assinar", labelPt: "Assinar laudo", labelEn: "Sign report", successPt: "Laudo assinado.", successEn: "Report signed.", tone: "primary" },
    { key: "specialty_diagnostics.report.liberar", action: "liberar", labelPt: "Liberar laudo", labelEn: "Release report", successPt: "Laudo liberado.", successEn: "Report released.", tone: "primary" },
    { key: "specialty_diagnostics.report.comunicar-critico", action: "comunicar-critico", labelPt: "Comunicar resultado crítico", labelEn: "Communicate critical result", successPt: "Resultado crítico comunicado.", successEn: "Critical result communicated.", fields: [{ name: "communication", labelPt: "Comunicação", labelEn: "Communication", type: "textarea" }] },
    { key: "specialty_diagnostics.report.retificar", action: "retificar", labelPt: "Retificar laudo", labelEn: "Amend report", successPt: "Laudo retificado.", successEn: "Report amended.", confirm: true, fields: [reasonField] },
  ],
  "/specialty_diagnostics/integration_event/": [
    { key: "specialty_diagnostics.integration_event.reprocessar", action: "reprocessar", labelPt: "Reprocessar evento", labelEn: "Reprocess event", successPt: "Evento reprocessado.", successEn: "Event reprocessed.", tone: "primary" },
  ],
}

// ── Anatomia Patológica ──────────────────────────────────────────────────────
const PATHOLOGY_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/pathology/pedidos/": [
    { key: "pathology.pedidos.cancelar", action: "cancelar", labelPt: "Cancelar pedido", labelEn: "Cancel request", successPt: "Pedido cancelado.", successEn: "Request cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
    { key: "pathology.pedidos.rejeitar", action: "rejeitar", labelPt: "Rejeitar pedido", labelEn: "Reject request", successPt: "Pedido rejeitado.", successEn: "Request rejected.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/pathology/recepcao_amostras/": [
    { key: "pathology.recepcao.aceitar", action: "aceitar", labelPt: "Aceitar amostra", labelEn: "Accept sample", successPt: "Amostra aceite.", successEn: "Sample accepted.", tone: "primary", fields: [{ name: "restriction", labelPt: "Restrição (opcional)", labelEn: "Restriction (optional)", type: "text" }] },
    { key: "pathology.recepcao.rejeitar", action: "rejeitar", labelPt: "Rejeitar amostra", labelEn: "Reject sample", successPt: "Amostra rejeitada.", successEn: "Sample rejected.", tone: "danger", confirm: true, fields: [reasonField] },
    { key: "pathology.recepcao.acessionar", action: "acessionar", labelPt: "Acessionar", labelEn: "Accession", successPt: "Amostra acessionada.", successEn: "Sample accessioned.", tone: "primary", fields: [{ name: "sub_sample_code", labelPt: "Código da sub-amostra", labelEn: "Sub-sample code", type: "text", placeholder: "A" }] },
  ],
  "/pathology/macroscopia/": [
    { key: "pathology.macroscopia.finalizar", action: "finalizar", labelPt: "Finalizar macroscopia", labelEn: "Finalize grossing", successPt: "Macroscopia finalizada.", successEn: "Grossing finalized.", tone: "primary", fields: [{ name: "gross_description", labelPt: "Descrição macroscópica (opcional)", labelEn: "Gross description (optional)", type: "textarea" }] },
  ],
  "/pathology/processamento/": [
    { key: "pathology.processamento.iniciar", action: "iniciar", labelPt: "Iniciar processamento", labelEn: "Start processing", successPt: "Processamento iniciado.", successEn: "Processing started.", tone: "primary" },
    { key: "pathology.processamento.concluir", action: "concluir", labelPt: "Concluir processamento", labelEn: "Complete processing", successPt: "Processamento concluído.", successEn: "Processing completed.", tone: "primary" },
    { key: "pathology.processamento.falhar", action: "falhar", labelPt: "Marcar falha", labelEn: "Mark failed", successPt: "Processamento marcado como falha.", successEn: "Processing marked failed.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/pathology/inclusao/": [
    { key: "pathology.inclusao.incluir", action: "incluir", labelPt: "Incluir em bloco", labelEn: "Embed", successPt: "Inclusão registada.", successEn: "Embedding recorded.", tone: "primary" },
  ],
  "/pathology/microtomia/": [
    { key: "pathology.microtomia.cortar", action: "cortar", labelPt: "Cortar", labelEn: "Cut", successPt: "Corte registado.", successEn: "Cut recorded.", tone: "primary" },
    { key: "pathology.microtomia.produzir-lamina", action: "produzir-lamina", labelPt: "Produzir lâmina", labelEn: "Produce slide", successPt: "Lâmina produzida.", successEn: "Slide produced.", tone: "primary", fields: [{ name: "slide_number", labelPt: "Nº da lâmina (opcional)", labelEn: "Slide number (optional)", type: "text" }, { name: "stain", labelPt: "Coloração", labelEn: "Stain", type: "text", placeholder: "H&E" }] },
  ],
  "/pathology/histologia/": [
    { key: "pathology.histologia.pronta", action: "pronta", labelPt: "Marcar pronta", labelEn: "Mark ready", successPt: "Lâmina pronta.", successEn: "Slide ready.", tone: "primary" },
    { key: "pathology.histologia.perdida", action: "perdida", labelPt: "Marcar perdida", labelEn: "Mark lost", successPt: "Lâmina marcada como perdida.", successEn: "Slide marked lost.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/pathology/coloracoes/": [
    { key: "pathology.coloracoes.concluir", action: "concluir", labelPt: "Concluir coloração", labelEn: "Complete staining", successPt: "Coloração concluída.", successEn: "Staining completed.", tone: "primary" },
    { key: "pathology.coloracoes.repetir", action: "repetir", labelPt: "Repetir coloração", labelEn: "Repeat staining", successPt: "Coloração marcada para repetição.", successEn: "Staining set to repeat.", fields: [reasonField] },
  ],
  "/pathology/diagnosticos/": [
    { key: "pathology.diagnosticos.finalizar", action: "finalizar", labelPt: "Finalizar diagnóstico", labelEn: "Finalize diagnosis", successPt: "Diagnóstico finalizado.", successEn: "Diagnosis finalized.", tone: "primary", fields: [{ name: "diagnosis", labelPt: "Diagnóstico (opcional)", labelEn: "Diagnosis (optional)", type: "textarea" }, { name: "comments", labelPt: "Comentários", labelEn: "Comments", type: "textarea" }] },
  ],
  "/pathology/laudos/": [
    { key: "pathology.laudos.assinar", action: "assinar", labelPt: "Assinar laudo", labelEn: "Sign report", successPt: "Laudo assinado.", successEn: "Report signed.", tone: "primary" },
    { key: "pathology.laudos.liberar", action: "liberar", labelPt: "Liberar laudo", labelEn: "Release report", successPt: "Laudo liberado.", successEn: "Report released.", tone: "primary", fields: [{ name: "generate_base_billing", labelPt: "Gerar faturação base", labelEn: "Generate base billing", type: "checkbox", defaultValue: false }] },
    { key: "pathology.laudos.retificar", action: "retificar", labelPt: "Retificar laudo", labelEn: "Amend report", successPt: "Laudo retificado.", successEn: "Report amended.", confirm: true, fields: [reasonField] },
  ],
  "/pathology/faturacao/": [
    { key: "pathology.faturacao.faturar", action: "faturar", labelPt: "Faturar", labelEn: "Invoice", successPt: "Faturação registada.", successEn: "Billing recorded.", tone: "primary" },
  ],
  "/pathology/arquivamento/": [
    { key: "pathology.arquivamento.emprestar", action: "emprestar", labelPt: "Emprestar", labelEn: "Lend", successPt: "Empréstimo registado.", successEn: "Loan recorded.", fields: [reasonField] },
    { key: "pathology.arquivamento.devolver", action: "devolver", labelPt: "Devolver", labelEn: "Return", successPt: "Devolução registada.", successEn: "Return recorded.", tone: "primary" },
  ],
}

// ── Enfermagem ───────────────────────────────────────────────────────────────
const NURSING_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/nursing/procedure_item/": [
    { key: "nursing.procedure_item.execute", action: "execute", labelPt: "Executar", labelEn: "Execute", successPt: "Procedimento executado.", successEn: "Procedure executed.", tone: "primary" },
    { key: "nursing.procedure_item.complete", action: "complete", labelPt: "Concluir", labelEn: "Complete", successPt: "Procedimento concluído.", successEn: "Procedure completed.", tone: "primary" },
    { key: "nursing.procedure_item.mark-not-completed", action: "mark-not-completed", labelPt: "Marcar não concluído", labelEn: "Mark not completed", successPt: "Procedimento marcado como não concluído.", successEn: "Procedure marked not completed." },
    { key: "nursing.procedure_item.mark-billed", action: "mark-billed", labelPt: "Marcar faturado", labelEn: "Mark billed", successPt: "Procedimento marcado como faturado.", successEn: "Procedure marked billed." },
  ],
  "/nursing/ward/": [
    { key: "nursing.ward.ativar", action: "ativar", labelPt: "Ativar enfermaria", labelEn: "Activate ward", successPt: "Enfermaria ativada.", successEn: "Ward activated.", tone: "primary" },
    { key: "nursing.ward.inativar", action: "inativar", labelPt: "Inativar enfermaria", labelEn: "Deactivate ward", successPt: "Enfermaria inativada.", successEn: "Ward deactivated.", confirm: true },
  ],
  "/nursing/ward_admission/": [
    { key: "nursing.ward_admission.alta", action: "alta", labelPt: "Dar alta", labelEn: "Discharge", successPt: "Alta registada.", successEn: "Discharge registered.", tone: "primary", fields: [{ name: "condition", labelPt: "Condição na alta (opcional)", labelEn: "Discharge condition (optional)", type: "text" }, notesField] },
    { key: "nursing.ward_admission.registrar-obito", action: "registrar-obito", labelPt: "Registar óbito", labelEn: "Register death", successPt: "Óbito registado.", successEn: "Death registered.", tone: "danger", confirm: true, fields: [notesField] },
  ],
  "/nursing/ward_bed/": [
    { key: "nursing.ward_bed.marcar-disponivel", action: "marcar-disponivel", labelPt: "Marcar disponível", labelEn: "Mark available", successPt: "Cama disponível.", successEn: "Bed available.", tone: "primary" },
    { key: "nursing.ward_bed.bloquear", action: "bloquear", labelPt: "Bloquear cama", labelEn: "Block bed", successPt: "Cama bloqueada.", successEn: "Bed blocked.", confirm: true },
  ],
}

// ── Cirurgia (pedido cirúrgico; create-invoice fica no mecanismo /resources) ──
const SURGERY_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/surgery/pedido_cirurgico/": [
    { key: "surgery.pedido_cirurgico.submeter", action: "submeter", labelPt: "Submeter pedido", labelEn: "Submit request", successPt: "Pedido submetido.", successEn: "Request submitted.", tone: "primary" },
    { key: "surgery.pedido_cirurgico.aprovar", action: "aprovar", labelPt: "Aprovar pedido", labelEn: "Approve request", successPt: "Pedido aprovado.", successEn: "Request approved.", tone: "primary" },
    { key: "surgery.pedido_cirurgico.rejeitar", action: "rejeitar", labelPt: "Rejeitar pedido", labelEn: "Reject request", successPt: "Pedido rejeitado.", successEn: "Request rejected.", tone: "danger", confirm: true, fields: [reasonField] },
    { key: "surgery.pedido_cirurgico.cancelar", action: "cancelar", labelPt: "Cancelar pedido", labelEn: "Cancel request", successPt: "Pedido cancelado.", successEn: "Request cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
}

// ── Telemedicina ─────────────────────────────────────────────────────────────
const TELEMEDICINE_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/telemedicine/waiting_room/": [
    { key: "telemedicine.waiting_room.iniciar-triagem", action: "iniciar-triagem", labelPt: "Iniciar triagem", labelEn: "Start triage", successPt: "Triagem iniciada.", successEn: "Triage started.", tone: "primary" },
    { key: "telemedicine.waiting_room.marcar-pronto", action: "marcar-pronto", labelPt: "Marcar pronto", labelEn: "Mark ready", successPt: "Paciente pronto.", successEn: "Patient ready.", tone: "primary", fields: [{ name: "triage_notes", labelPt: "Notas de triagem (opcional)", labelEn: "Triage notes (optional)", type: "textarea" }] },
    { key: "telemedicine.waiting_room.iniciar-chamada", action: "iniciar-chamada", labelPt: "Iniciar chamada", labelEn: "Start call", successPt: "Chamada iniciada.", successEn: "Call started.", tone: "primary", fields: [{ name: "video_room_url", labelPt: "URL da sala (opcional)", labelEn: "Room URL (optional)", type: "text" }] },
    { key: "telemedicine.waiting_room.concluir", action: "concluir", labelPt: "Concluir atendimento", labelEn: "Complete", successPt: "Atendimento concluído.", successEn: "Visit completed.", tone: "primary" },
    { key: "telemedicine.waiting_room.faltou", action: "faltou", labelPt: "Marcar falta", labelEn: "Mark no-show", successPt: "Falta registada.", successEn: "No-show registered.", fields: [notesField] },
    { key: "telemedicine.waiting_room.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Entrada cancelada.", successEn: "Entry cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/telemedicine/device/": [
    { key: "telemedicine.device.ativar", action: "ativar", labelPt: "Ativar dispositivo", labelEn: "Activate device", successPt: "Dispositivo ativado.", successEn: "Device activated.", tone: "primary", fields: [{ name: "paired_at", labelPt: "Emparelhado em (opcional)", labelEn: "Paired at (optional)", type: "datetime-local" }] },
    { key: "telemedicine.device.pausar", action: "pausar", labelPt: "Pausar", labelEn: "Pause", successPt: "Dispositivo pausado.", successEn: "Device paused.", fields: [notesField] },
    { key: "telemedicine.device.marcar-perdido", action: "marcar-perdido", labelPt: "Marcar perdido", labelEn: "Mark lost", successPt: "Dispositivo marcado como perdido.", successEn: "Device marked lost.", tone: "danger", confirm: true, fields: [notesField] },
    { key: "telemedicine.device.retirar", action: "retirar", labelPt: "Retirar de uso", labelEn: "Retire", successPt: "Dispositivo retirado.", successEn: "Device retired.", confirm: true, fields: [notesField] },
  ],
  "/telemedicine/async_case/": [
    { key: "telemedicine.async_case.triar", action: "triar", labelPt: "Triar caso", labelEn: "Triage case", successPt: "Caso triado.", successEn: "Case triaged.", tone: "primary" },
    { key: "telemedicine.async_case.iniciar-revisao", action: "iniciar-revisao", labelPt: "Iniciar revisão", labelEn: "Start review", successPt: "Revisão iniciada.", successEn: "Review started.", tone: "primary" },
    { key: "telemedicine.async_case.pedir-informacao", action: "pedir-informacao", labelPt: "Pedir informação", labelEn: "Request info", successPt: "Pedido de informação enviado.", successEn: "Information requested.", fields: [{ name: "message", labelPt: "Mensagem", labelEn: "Message", type: "textarea" }] },
    { key: "telemedicine.async_case.concluir", action: "concluir", labelPt: "Concluir caso", labelEn: "Complete case", successPt: "Caso concluído.", successEn: "Case completed.", tone: "primary", fields: [{ name: "findings", labelPt: "Achados (opcional)", labelEn: "Findings (optional)", type: "textarea" }, { name: "recommendation", labelPt: "Recomendação (opcional)", labelEn: "Recommendation (optional)", type: "textarea" }] },
    { key: "telemedicine.async_case.cancelar", action: "cancelar", labelPt: "Cancelar caso", labelEn: "Cancel case", successPt: "Caso cancelado.", successEn: "Case cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/telemedicine/program/": [
    { key: "telemedicine.program.ativar", action: "ativar", labelPt: "Ativar programa", labelEn: "Activate program", successPt: "Programa ativado.", successEn: "Program activated.", tone: "primary" },
    { key: "telemedicine.program.pausar", action: "pausar", labelPt: "Pausar programa", labelEn: "Pause program", successPt: "Programa pausado.", successEn: "Program paused.", fields: [reasonField] },
    { key: "telemedicine.program.registar-revisao", action: "registar-revisao", labelPt: "Registar revisão", labelEn: "Record review", successPt: "Revisão registada.", successEn: "Review recorded.", fields: [{ name: "next_review_date", labelPt: "Próxima revisão (opcional)", labelEn: "Next review (optional)", type: "date" }] },
    { key: "telemedicine.program.concluir", action: "concluir", labelPt: "Concluir programa", labelEn: "Complete program", successPt: "Programa concluído.", successEn: "Program completed.", tone: "primary", fields: [{ name: "end_date", labelPt: "Data de fim (opcional)", labelEn: "End date (optional)", type: "date" }] },
    { key: "telemedicine.program.cancelar", action: "cancelar", labelPt: "Cancelar programa", labelEn: "Cancel program", successPt: "Programa cancelado.", successEn: "Program cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/telemedicine/alert/": [
    { key: "telemedicine.alert.reconhecer", action: "reconhecer", labelPt: "Reconhecer", labelEn: "Acknowledge", successPt: "Alerta reconhecido.", successEn: "Alert acknowledged.", tone: "primary" },
    { key: "telemedicine.alert.escalar", action: "escalar", labelPt: "Escalar", labelEn: "Escalate", successPt: "Alerta escalado.", successEn: "Alert escalated.", fields: [notesField] },
    { key: "telemedicine.alert.resolver", action: "resolver", labelPt: "Resolver", labelEn: "Resolve", successPt: "Alerta resolvido.", successEn: "Alert resolved.", tone: "primary", fields: [{ name: "action_taken", labelPt: "Ação tomada (opcional)", labelEn: "Action taken (optional)", type: "textarea" }] },
    { key: "telemedicine.alert.descartar", action: "descartar", labelPt: "Descartar", labelEn: "Dismiss", successPt: "Alerta descartado.", successEn: "Alert dismissed.", fields: [reasonField] },
  ],
  "/telemedicine/vital_reading/": [
    { key: "telemedicine.vital_reading.gerar-alerta", action: "gerar-alerta", labelPt: "Gerar alerta", labelEn: "Raise alert", successPt: "Alerta gerado.", successEn: "Alert raised.", fields: [{ name: "severity", labelPt: "Severidade (opcional)", labelEn: "Severity (optional)", type: "text" }, { name: "message", labelPt: "Mensagem (opcional)", labelEn: "Message (optional)", type: "textarea" }] },
  ],
}

// ── Veterinária ──────────────────────────────────────────────────────────────
const VETERINARY_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/veterinary/appointment/": [
    { key: "veterinary.appointment.confirmar", action: "confirmar", labelPt: "Confirmar", labelEn: "Confirm", successPt: "Consulta confirmada.", successEn: "Appointment confirmed.", tone: "primary" },
    { key: "veterinary.appointment.iniciar-atendimento", action: "iniciar-atendimento", labelPt: "Iniciar atendimento", labelEn: "Start visit", successPt: "Atendimento iniciado.", successEn: "Visit started.", tone: "primary", fields: [{ name: "anamnesis", labelPt: "Anamnese (opcional)", labelEn: "Anamnesis (optional)", type: "textarea" }] },
    { key: "veterinary.appointment.finalizar", action: "finalizar", labelPt: "Finalizar", labelEn: "Finalize", successPt: "Atendimento finalizado.", successEn: "Visit finalized.", tone: "primary" },
    { key: "veterinary.appointment.faltou", action: "faltou", labelPt: "Marcar falta", labelEn: "Mark no-show", successPt: "Falta registada.", successEn: "No-show registered." },
    { key: "veterinary.appointment.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Consulta cancelada.", successEn: "Appointment cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/veterinary/vaccination/": [
    { key: "veterinary.vaccination.aplicar", action: "aplicar", labelPt: "Aplicar vacina", labelEn: "Administer vaccine", successPt: "Vacina aplicada.", successEn: "Vaccine administered.", tone: "primary", fields: [{ name: "lot_number", labelPt: "Lote (opcional)", labelEn: "Lot (optional)", type: "text" }] },
    { key: "veterinary.vaccination.reacao-adversa", action: "reacao-adversa", labelPt: "Registar reação adversa", labelEn: "Register adverse reaction", successPt: "Reação adversa registada.", successEn: "Adverse reaction registered.", tone: "danger", fields: [{ name: "description", labelPt: "Descrição", labelEn: "Description", type: "textarea" }] },
    { key: "veterinary.vaccination.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Vacinação cancelada.", successEn: "Vaccination cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/veterinary/lab_request/": [
    { key: "veterinary.lab_request.colher-amostra", action: "colher-amostra", labelPt: "Colher amostra", labelEn: "Collect sample", successPt: "Amostra colhida.", successEn: "Sample collected.", tone: "primary", fields: [{ name: "sample_identifier", labelPt: "Identificador da amostra (opcional)", labelEn: "Sample identifier (optional)", type: "text" }] },
    { key: "veterinary.lab_request.processar", action: "processar", labelPt: "Processar", labelEn: "Process", successPt: "Pedido em processamento.", successEn: "Request processing.", tone: "primary" },
    { key: "veterinary.lab_request.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Pedido cancelado.", successEn: "Request cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/veterinary/lab_request_item/": [
    { key: "veterinary.lab_request_item.registrar-resultado", action: "registrar-resultado", labelPt: "Registar resultado", labelEn: "Record result", successPt: "Resultado registado.", successEn: "Result recorded.", tone: "primary", fields: [{ name: "result_value", labelPt: "Valor (opcional)", labelEn: "Value (optional)", type: "text" }, { name: "result_summary", labelPt: "Resumo (opcional)", labelEn: "Summary (optional)", type: "textarea" }] },
  ],
  "/veterinary/prescription/": [
    { key: "veterinary.prescription.emitir", action: "emitir", labelPt: "Emitir prescrição", labelEn: "Issue prescription", successPt: "Prescrição emitida.", successEn: "Prescription issued.", tone: "primary" },
    { key: "veterinary.prescription.concluir", action: "concluir", labelPt: "Concluir", labelEn: "Complete", successPt: "Prescrição concluída.", successEn: "Prescription completed.", tone: "primary" },
    { key: "veterinary.prescription.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Prescrição cancelada.", successEn: "Prescription cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/veterinary/admission/": [
    { key: "veterinary.admission.alta", action: "alta", labelPt: "Dar alta", labelEn: "Discharge", successPt: "Alta registada.", successEn: "Discharge registered.", tone: "primary", fields: [{ name: "condition", labelPt: "Condição (opcional)", labelEn: "Condition (optional)", type: "text" }, { name: "summary", labelPt: "Resumo (opcional)", labelEn: "Summary (optional)", type: "textarea" }] },
    { key: "veterinary.admission.registrar-evolucao", action: "registrar-evolucao", labelPt: "Registar evolução", labelEn: "Record progress", successPt: "Evolução registada.", successEn: "Progress recorded.", fields: [{ name: "text", labelPt: "Evolução", labelEn: "Progress note", type: "textarea" }] },
    { key: "veterinary.admission.transferir", action: "transferir", labelPt: "Transferir", labelEn: "Transfer", successPt: "Transferência registada.", successEn: "Transfer recorded.", fields: [{ name: "destination", labelPt: "Destino (opcional)", labelEn: "Destination (optional)", type: "text" }, reasonField] },
    { key: "veterinary.admission.registrar-obito", action: "registrar-obito", labelPt: "Registar óbito", labelEn: "Register death", successPt: "Óbito registado.", successEn: "Death registered.", tone: "danger", confirm: true, fields: [notesField] },
  ],
}

// ── Fisioterapia ─────────────────────────────────────────────────────────────
const PHYSIOTHERAPY_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/physiotherapy/device/": [
    { key: "physiotherapy.device.marcar-disponivel", action: "marcar-disponivel", labelPt: "Marcar disponível", labelEn: "Mark available", successPt: "Aparelho disponível.", successEn: "Device available.", tone: "primary" },
    { key: "physiotherapy.device.marcar-manutencao", action: "marcar-manutencao", labelPt: "Marcar em manutenção", labelEn: "Mark under maintenance", successPt: "Aparelho em manutenção.", successEn: "Device under maintenance.", fields: [notesField] },
  ],
  "/physiotherapy/assessment/": [
    { key: "physiotherapy.assessment.finalizar", action: "finalizar", labelPt: "Finalizar avaliação", labelEn: "Finalize assessment", successPt: "Avaliação finalizada.", successEn: "Assessment finalized.", tone: "primary" },
    { key: "physiotherapy.assessment.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Avaliação cancelada.", successEn: "Assessment cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/physiotherapy/treatment_plan/": [
    { key: "physiotherapy.treatment_plan.aprovar", action: "aprovar", labelPt: "Aprovar plano", labelEn: "Approve plan", successPt: "Plano aprovado.", successEn: "Plan approved.", tone: "primary" },
    { key: "physiotherapy.treatment_plan.agendar-sessao", action: "agendar-sessao", labelPt: "Agendar sessão", labelEn: "Schedule session", successPt: "Sessão agendada.", successEn: "Session scheduled.", fields: [{ name: "scheduled_at", labelPt: "Data/hora (opcional)", labelEn: "Date/time (optional)", type: "datetime-local" }] },
    { key: "physiotherapy.treatment_plan.suspender", action: "suspender", labelPt: "Suspender", labelEn: "Suspend", successPt: "Plano suspenso.", successEn: "Plan suspended.", fields: [reasonField] },
    { key: "physiotherapy.treatment_plan.retomar", action: "retomar", labelPt: "Retomar", labelEn: "Resume", successPt: "Plano retomado.", successEn: "Plan resumed.", tone: "primary" },
    { key: "physiotherapy.treatment_plan.alta", action: "alta", labelPt: "Dar alta", labelEn: "Discharge", successPt: "Alta registada.", successEn: "Discharge registered.", tone: "primary", fields: [{ name: "summary", labelPt: "Resumo (opcional)", labelEn: "Summary (optional)", type: "textarea" }, { name: "recommendations", labelPt: "Recomendações (opcional)", labelEn: "Recommendations (optional)", type: "textarea" }] },
    { key: "physiotherapy.treatment_plan.concluir", action: "concluir", labelPt: "Concluir", labelEn: "Complete", successPt: "Plano concluído.", successEn: "Plan completed.", tone: "primary" },
    { key: "physiotherapy.treatment_plan.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Plano cancelado.", successEn: "Plan cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/physiotherapy/session/": [
    { key: "physiotherapy.session.iniciar", action: "iniciar", labelPt: "Iniciar sessão", labelEn: "Start session", successPt: "Sessão iniciada.", successEn: "Session started.", tone: "primary" },
    { key: "physiotherapy.session.finalizar", action: "finalizar", labelPt: "Finalizar sessão", labelEn: "Finish session", successPt: "Sessão finalizada.", successEn: "Session finished.", tone: "primary" },
    { key: "physiotherapy.session.faltou", action: "faltou", labelPt: "Marcar falta", labelEn: "Mark no-show", successPt: "Falta registada.", successEn: "No-show registered." },
    { key: "physiotherapy.session.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Sessão cancelada.", successEn: "Session cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
}

// ── Farmácia Clínica ─────────────────────────────────────────────────────────
const CLINICAL_PHARMACY_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/clinical_pharmacy/preparation/": [
    { key: "clinical_pharmacy.preparation.validar", action: "validar", labelPt: "Validar preparação", labelEn: "Validate preparation", successPt: "Preparação validada.", successEn: "Preparation validated.", tone: "primary", fields: [{ name: "compatibility_ok", labelPt: "Compatibilidade OK", labelEn: "Compatibility OK", type: "checkbox", defaultValue: true }] },
    { key: "clinical_pharmacy.preparation.preparar", action: "preparar", labelPt: "Preparar", labelEn: "Prepare", successPt: "Preparação realizada.", successEn: "Preparation done.", tone: "primary", fields: [{ name: "sterility_ok", labelPt: "Esterilidade OK", labelEn: "Sterility OK", type: "checkbox", defaultValue: true }] },
    { key: "clinical_pharmacy.preparation.liberar", action: "liberar", labelPt: "Liberar", labelEn: "Release", successPt: "Preparação liberada.", successEn: "Preparation released.", tone: "primary" },
    { key: "clinical_pharmacy.preparation.administrar", action: "administrar", labelPt: "Administrar", labelEn: "Administer", successPt: "Preparação administrada.", successEn: "Preparation administered.", tone: "primary" },
    { key: "clinical_pharmacy.preparation.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Preparação cancelada.", successEn: "Preparation cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
    { key: "clinical_pharmacy.preparation.descartar", action: "descartar", labelPt: "Descartar", labelEn: "Discard", successPt: "Preparação descartada.", successEn: "Preparation discarded.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/clinical_pharmacy/interaction_check/": [
    { key: "clinical_pharmacy.interaction_check.resolver", action: "resolver", labelPt: "Resolver", labelEn: "Resolve", successPt: "Interação resolvida.", successEn: "Interaction resolved.", tone: "primary", fields: [{ name: "action_taken", labelPt: "Ação tomada (opcional)", labelEn: "Action taken (optional)", type: "textarea" }, { name: "clear", labelPt: "Marcar como sem risco", labelEn: "Mark as cleared", type: "checkbox", defaultValue: false }] },
    { key: "clinical_pharmacy.interaction_check.aceitar-com-justificativa", action: "aceitar-com-justificativa", labelPt: "Aceitar com justificativa", labelEn: "Accept with override", successPt: "Interação aceite com justificativa.", successEn: "Interaction accepted.", fields: [{ name: "override_reason", labelPt: "Justificativa", labelEn: "Override reason", type: "textarea" }] },
  ],
  "/clinical_pharmacy/controlled_movement/": [
    { key: "clinical_pharmacy.controlled_movement.estornar", action: "estornar", labelPt: "Estornar movimento", labelEn: "Reverse movement", successPt: "Movimento estornado.", successEn: "Movement reversed.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/clinical_pharmacy/antibiotic_review/": [
    { key: "clinical_pharmacy.antibiotic_review.emitir-recomendacao", action: "emitir-recomendacao", labelPt: "Emitir recomendação", labelEn: "Issue recommendation", successPt: "Recomendação emitida.", successEn: "Recommendation issued.", tone: "primary", fields: [{ name: "recommendation", labelPt: "Recomendação (opcional)", labelEn: "Recommendation (optional)", type: "textarea" }] },
    { key: "clinical_pharmacy.antibiotic_review.implementar", action: "implementar", labelPt: "Implementar", labelEn: "Implement", successPt: "Recomendação implementada.", successEn: "Recommendation implemented.", tone: "primary", fields: [{ name: "action_taken", labelPt: "Ação tomada (opcional)", labelEn: "Action taken (optional)", type: "textarea" }] },
  ],
}

// ── Medicina Dentária ────────────────────────────────────────────────────────
const DENTAL_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/dental/appointment/": [
    { key: "dental.appointment.confirmar", action: "confirmar", labelPt: "Confirmar", labelEn: "Confirm", successPt: "Consulta confirmada.", successEn: "Appointment confirmed.", tone: "primary" },
    { key: "dental.appointment.iniciar-atendimento", action: "iniciar-atendimento", labelPt: "Iniciar atendimento", labelEn: "Start visit", successPt: "Atendimento iniciado.", successEn: "Visit started.", tone: "primary", fields: [{ name: "chief_complaint", labelPt: "Queixa principal (opcional)", labelEn: "Chief complaint (optional)", type: "textarea" }] },
    { key: "dental.appointment.finalizar", action: "finalizar", labelPt: "Finalizar", labelEn: "Finalize", successPt: "Atendimento finalizado.", successEn: "Visit finalized.", tone: "primary" },
    { key: "dental.appointment.faltou", action: "faltou", labelPt: "Marcar falta", labelEn: "Mark no-show", successPt: "Falta registada.", successEn: "No-show registered." },
    { key: "dental.appointment.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Consulta cancelada.", successEn: "Appointment cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/dental/consultation/": [
    { key: "dental.consultation.finalizar", action: "finalizar", labelPt: "Finalizar consulta", labelEn: "Finalize consultation", successPt: "Consulta finalizada.", successEn: "Consultation finalized.", tone: "primary" },
  ],
  "/dental/procedure_execution/": [
    { key: "dental.procedure_execution.estornar", action: "estornar", labelPt: "Estornar execução", labelEn: "Reverse execution", successPt: "Execução estornada.", successEn: "Execution reversed.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/dental/quotation/": [
    { key: "dental.quotation.aprovar", action: "aprovar", labelPt: "Aprovar orçamento", labelEn: "Approve quotation", successPt: "Orçamento aprovado.", successEn: "Quotation approved.", tone: "primary", fields: [{ name: "approved_by_name", labelPt: "Aprovado por (opcional)", labelEn: "Approved by (optional)", type: "text" }] },
    { key: "dental.quotation.rejeitar", action: "rejeitar", labelPt: "Rejeitar orçamento", labelEn: "Reject quotation", successPt: "Orçamento rejeitado.", successEn: "Quotation rejected.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/dental/treatment_item/": [
    { key: "dental.treatment_item.executar", action: "executar", labelPt: "Executar procedimento", labelEn: "Execute procedure", successPt: "Procedimento executado.", successEn: "Procedure executed.", tone: "primary", fields: [{ name: "tooth_number", labelPt: "Dente (opcional)", labelEn: "Tooth (optional)", type: "text" }, { name: "surface", labelPt: "Face (opcional)", labelEn: "Surface (optional)", type: "text" }, { name: "clinical_notes", labelPt: "Notas clínicas (opcional)", labelEn: "Clinical notes (optional)", type: "textarea" }] },
  ],
  "/dental/treatment_plan/": [
    { key: "dental.treatment_plan.apresentar", action: "apresentar", labelPt: "Apresentar plano", labelEn: "Present plan", successPt: "Plano apresentado.", successEn: "Plan presented.", tone: "primary" },
    { key: "dental.treatment_plan.gerar-orcamento", action: "gerar-orcamento", labelPt: "Gerar orçamento", labelEn: "Generate quotation", successPt: "Orçamento gerado.", successEn: "Quotation generated.", tone: "primary", fields: [{ name: "valid_until", labelPt: "Válido até (opcional)", labelEn: "Valid until (optional)", type: "date" }, { name: "payment_terms", labelPt: "Condições de pagamento (opcional)", labelEn: "Payment terms (optional)", type: "text" }] },
    { key: "dental.treatment_plan.concluir", action: "concluir", labelPt: "Concluir plano", labelEn: "Complete plan", successPt: "Plano concluído.", successEn: "Plan completed.", tone: "primary" },
    { key: "dental.treatment_plan.cancelar", action: "cancelar", labelPt: "Cancelar plano", labelEn: "Cancel plan", successPt: "Plano cancelado.", successEn: "Plan cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
}

// ── Terapias (sem páginas bespoke; aflora via /resources após Fase 0) ─────────
const THERAPY_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/therapy/resource/": [
    { key: "therapy.resource.ativar", action: "ativar", labelPt: "Ativar recurso", labelEn: "Activate resource", successPt: "Recurso ativado.", successEn: "Resource activated.", tone: "primary" },
    { key: "therapy.resource.inativar", action: "inativar", labelPt: "Inativar recurso", labelEn: "Deactivate resource", successPt: "Recurso inativado.", successEn: "Resource deactivated.", confirm: true },
    { key: "therapy.resource.marcar-manutencao", action: "marcar-manutencao", labelPt: "Marcar em manutenção", labelEn: "Mark under maintenance", successPt: "Recurso em manutenção.", successEn: "Resource under maintenance.", fields: [notesField] },
  ],
  "/therapy/evaluation/": [
    { key: "therapy.evaluation.finalizar", action: "finalizar", labelPt: "Finalizar avaliação", labelEn: "Finalize evaluation", successPt: "Avaliação finalizada.", successEn: "Evaluation finalized.", tone: "primary" },
    { key: "therapy.evaluation.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Avaliação cancelada.", successEn: "Evaluation cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/therapy/treatment_plan/": [
    { key: "therapy.treatment_plan.aprovar", action: "aprovar", labelPt: "Aprovar plano", labelEn: "Approve plan", successPt: "Plano aprovado.", successEn: "Plan approved.", tone: "primary" },
    { key: "therapy.treatment_plan.agendar-sessao", action: "agendar-sessao", labelPt: "Agendar sessão", labelEn: "Schedule session", successPt: "Sessão agendada.", successEn: "Session scheduled.", fields: [{ name: "scheduled_at", labelPt: "Data/hora (opcional)", labelEn: "Date/time (optional)", type: "datetime-local" }] },
    { key: "therapy.treatment_plan.suspender", action: "suspender", labelPt: "Suspender", labelEn: "Suspend", successPt: "Plano suspenso.", successEn: "Plan suspended.", fields: [reasonField] },
    { key: "therapy.treatment_plan.retomar", action: "retomar", labelPt: "Retomar", labelEn: "Resume", successPt: "Plano retomado.", successEn: "Plan resumed.", tone: "primary" },
    { key: "therapy.treatment_plan.alta", action: "alta", labelPt: "Dar alta", labelEn: "Discharge", successPt: "Alta registada.", successEn: "Discharge registered.", tone: "primary", fields: [{ name: "summary", labelPt: "Resumo (opcional)", labelEn: "Summary (optional)", type: "textarea" }, { name: "recommendations", labelPt: "Recomendações (opcional)", labelEn: "Recommendations (optional)", type: "textarea" }] },
    { key: "therapy.treatment_plan.cancelar", action: "cancelar", labelPt: "Cancelar plano", labelEn: "Cancel plan", successPt: "Plano cancelado.", successEn: "Plan cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/therapy/goal/": [
    { key: "therapy.goal.atualizar-progresso", action: "atualizar-progresso", labelPt: "Atualizar progresso", labelEn: "Update progress", successPt: "Progresso atualizado.", successEn: "Progress updated.", fields: [{ name: "current_score", labelPt: "Pontuação atual", labelEn: "Current score", type: "number" }] },
    { key: "therapy.goal.marcar-alcancado", action: "marcar-alcancado", labelPt: "Marcar alcançado", labelEn: "Mark achieved", successPt: "Objetivo alcançado.", successEn: "Goal achieved.", tone: "primary", fields: [{ name: "current_score", labelPt: "Pontuação (opcional)", labelEn: "Score (optional)", type: "number" }] },
    { key: "therapy.goal.suspender", action: "suspender", labelPt: "Suspender", labelEn: "Suspend", successPt: "Objetivo suspenso.", successEn: "Goal suspended.", fields: [reasonField] },
  ],
  "/therapy/session/": [
    { key: "therapy.session.iniciar", action: "iniciar", labelPt: "Iniciar sessão", labelEn: "Start session", successPt: "Sessão iniciada.", successEn: "Session started.", tone: "primary" },
    { key: "therapy.session.finalizar", action: "finalizar", labelPt: "Finalizar sessão", labelEn: "Finish session", successPt: "Sessão finalizada.", successEn: "Session finished.", tone: "primary" },
    { key: "therapy.session.faltou", action: "faltou", labelPt: "Marcar falta", labelEn: "Mark no-show", successPt: "Falta registada.", successEn: "No-show registered." },
    { key: "therapy.session.cancelar", action: "cancelar", labelPt: "Cancelar sessão", labelEn: "Cancel session", successPt: "Sessão cancelada.", successEn: "Session cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/therapy/prescription_link/": [
    { key: "therapy.prescription_link.encerrar", action: "encerrar", labelPt: "Encerrar vínculo", labelEn: "Close link", successPt: "Vínculo encerrado.", successEn: "Link closed.", confirm: true, fields: [reasonField] },
  ],
}

// ── Saúde Pública ────────────────────────────────────────────────────────────
const PUBLIC_HEALTH_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/public_health/vaccine/": [
    { key: "public_health.vaccine.ativar", action: "ativar", labelPt: "Ativar vacina", labelEn: "Activate vaccine", successPt: "Vacina ativada.", successEn: "Vaccine activated.", tone: "primary" },
    { key: "public_health.vaccine.inativar", action: "inativar", labelPt: "Inativar vacina", labelEn: "Deactivate vaccine", successPt: "Vacina inativada.", successEn: "Vaccine deactivated.", confirm: true },
  ],
  "/public_health/lot/": [
    { key: "public_health.lot.ativar", action: "ativar", labelPt: "Ativar lote", labelEn: "Activate lot", successPt: "Lote ativado.", successEn: "Lot activated.", tone: "primary" },
    { key: "public_health.lot.liberar", action: "liberar", labelPt: "Liberar lote", labelEn: "Release lot", successPt: "Lote liberado.", successEn: "Lot released.", tone: "primary" },
    { key: "public_health.lot.bloquear", action: "bloquear", labelPt: "Bloquear lote", labelEn: "Block lot", successPt: "Lote bloqueado.", successEn: "Lot blocked.", confirm: true, fields: [reasonField] },
    { key: "public_health.lot.recolher", action: "recolher", labelPt: "Recolher lote", labelEn: "Recall lot", successPt: "Lote recolhido.", successEn: "Lot recalled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/public_health/campaign/": [
    { key: "public_health.campaign.ativar", action: "ativar", labelPt: "Ativar campanha", labelEn: "Activate campaign", successPt: "Campanha ativada.", successEn: "Campaign activated.", tone: "primary" },
    { key: "public_health.campaign.suspender", action: "suspender", labelPt: "Suspender", labelEn: "Suspend", successPt: "Campanha suspensa.", successEn: "Campaign suspended.", fields: [reasonField] },
    { key: "public_health.campaign.encerrar", action: "encerrar", labelPt: "Encerrar", labelEn: "Close", successPt: "Campanha encerrada.", successEn: "Campaign closed.", confirm: true },
    { key: "public_health.campaign.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Campanha cancelada.", successEn: "Campaign cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/public_health/immunization/": [
    { key: "public_health.immunization.cancelar", action: "cancelar", labelPt: "Cancelar imunização", labelEn: "Cancel immunization", successPt: "Imunização cancelada.", successEn: "Immunization cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/public_health/adverse_event/": [
    { key: "public_health.adverse_event.classificar", action: "classificar", labelPt: "Classificar", labelEn: "Classify", successPt: "Evento classificado.", successEn: "Event classified.", tone: "primary", fields: [{ name: "severity", labelPt: "Severidade (opcional)", labelEn: "Severity (optional)", type: "text" }] },
    { key: "public_health.adverse_event.gerar-notificacao", action: "gerar-notificacao", labelPt: "Gerar notificação", labelEn: "Generate notification", successPt: "Notificação gerada.", successEn: "Notification generated.", tone: "primary" },
    { key: "public_health.adverse_event.encerrar", action: "encerrar", labelPt: "Encerrar", labelEn: "Close", successPt: "Evento encerrado.", successEn: "Event closed.", confirm: true, fields: [{ name: "causality_assessment", labelPt: "Avaliação de causalidade (opcional)", labelEn: "Causality assessment (optional)", type: "textarea" }] },
    { key: "public_health.adverse_event.descartar", action: "descartar", labelPt: "Descartar", labelEn: "Discard", successPt: "Evento descartado.", successEn: "Event discarded.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/public_health/notification/": [
    { key: "public_health.notification.enviar", action: "enviar", labelPt: "Enviar notificação", labelEn: "Send notification", successPt: "Notificação enviada.", successEn: "Notification sent.", tone: "primary", fields: [{ name: "external_reference", labelPt: "Referência externa (opcional)", labelEn: "External reference (optional)", type: "text" }] },
    { key: "public_health.notification.responder", action: "responder", labelPt: "Registar resposta", labelEn: "Record response", successPt: "Resposta registada.", successEn: "Response recorded.", fields: [{ name: "accepted", labelPt: "Aceite", labelEn: "Accepted", type: "checkbox", defaultValue: true }, { name: "external_reference", labelPt: "Referência externa (opcional)", labelEn: "External reference (optional)", type: "text" }] },
    { key: "public_health.notification.reprocessar", action: "reprocessar", labelPt: "Reprocessar", labelEn: "Reprocess", successPt: "Notificação reprocessada.", successEn: "Notification reprocessed.", tone: "primary" },
  ],
}

// ── Faturação ────────────────────────────────────────────────────────────────
// (send-notification já é tratado de forma dedicada em GeneratedResourceDetailPage)
const BILLING_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/billing/invoice/": [
    { key: "billing.invoice.issue", action: "issue", labelPt: "Emitir fatura", labelEn: "Issue invoice", successPt: "Fatura emitida.", successEn: "Invoice issued.", tone: "primary", visibleWhen: (r) => r.status === "RASC" },
    { key: "billing.invoice.confirm-payment", action: "confirm-payment", labelPt: "Confirmar pagamento", labelEn: "Confirm payment", successPt: "Pagamento confirmado.", successEn: "Payment confirmed.", tone: "primary", visibleWhen: (r) => r.status === "EMIT" },
    { key: "billing.invoice.void", action: "void", labelPt: "Anular fatura", labelEn: "Void invoice", successPt: "Fatura anulada.", successEn: "Invoice voided.", tone: "danger", confirm: true, visibleWhen: (r) => r.status === "RASC" || r.status === "EMIT", fields: [reasonField] },
  ],
}

// ── Pagamentos ───────────────────────────────────────────────────────────────
// (aliases EN reconcile/verify omitidos a favor de reconciliar/verificar PT)
const PAYMENTS_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/payments/payment/": [
    { key: "payments.payment.confirm", action: "confirm", labelPt: "Confirmar", labelEn: "Confirm", successPt: "Pagamento confirmado.", successEn: "Payment confirmed.", tone: "primary" },
    { key: "payments.payment.refund", action: "refund", labelPt: "Reembolsar", labelEn: "Refund", successPt: "Pagamento reembolsado.", successEn: "Payment refunded.", tone: "danger", confirm: true, fields: [reasonField] },
    { key: "payments.payment.cancel", action: "cancel", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Pagamento cancelado.", successEn: "Payment cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
    { key: "payments.payment.fail", action: "fail", labelPt: "Marcar falha", labelEn: "Mark failed", successPt: "Pagamento marcado como falha.", successEn: "Payment marked failed.", tone: "danger", fields: [reasonField] },
  ],
  "/payments/reconciliation/": [
    { key: "payments.reconciliation.confirm", action: "confirm", labelPt: "Confirmar conciliação", labelEn: "Confirm reconciliation", successPt: "Conciliação confirmada.", successEn: "Reconciliation confirmed.", tone: "primary" },
    { key: "payments.reconciliation.reopen", action: "reopen", labelPt: "Reabrir", labelEn: "Reopen", successPt: "Conciliação reaberta.", successEn: "Reconciliation reopened." },
  ],
  "/payments/transaction/": [
    { key: "payments.transaction.verificar", action: "verificar", labelPt: "Verificar", labelEn: "Verify", successPt: "Transação verificada.", successEn: "Transaction verified.", tone: "primary" },
    { key: "payments.transaction.reconciliar", action: "reconciliar", labelPt: "Conciliar", labelEn: "Reconcile", successPt: "Transação conciliada.", successEn: "Transaction reconciled.", tone: "primary" },
    { key: "payments.transaction.unreconcile", action: "unreconcile", labelPt: "Desconciliar", labelEn: "Unreconcile", successPt: "Conciliação desfeita.", successEn: "Reconciliation undone.", confirm: true },
  ],
}

// ── Contabilidade ────────────────────────────────────────────────────────────
const ACCOUNTING_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/accounting/entry/": [
    { key: "accounting.entry.confirm", action: "confirm", labelPt: "Confirmar lançamento", labelEn: "Confirm entry", successPt: "Lançamento confirmado.", successEn: "Entry confirmed.", tone: "primary" },
    { key: "accounting.entry.reopen", action: "reopen", labelPt: "Reabrir", labelEn: "Reopen", successPt: "Lançamento reaberto.", successEn: "Entry reopened.", confirm: true },
  ],
}

// ── Seguradora ───────────────────────────────────────────────────────────────
const INSURER_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/insurer/procedure_authorization/": [
    { key: "insurer.procedure_authorization.aprovar", action: "aprovar", labelPt: "Aprovar autorização", labelEn: "Approve authorization", successPt: "Autorização aprovada.", successEn: "Authorization approved.", tone: "primary", fields: [{ name: "authorization_code", labelPt: "Código de autorização (opcional)", labelEn: "Authorization code (optional)", type: "text" }] },
    { key: "insurer.procedure_authorization.negar", action: "negar", labelPt: "Negar autorização", labelEn: "Deny authorization", successPt: "Autorização negada.", successEn: "Authorization denied.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
}

// ── Manutenção ───────────────────────────────────────────────────────────────
const MAINTENANCE_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/maintenance/maintenance/": [
    { key: "maintenance.maintenance.realizar", action: "realizar", labelPt: "Marcar como realizada", labelEn: "Mark performed", successPt: "Manutenção realizada.", successEn: "Maintenance performed.", tone: "primary", fields: [{ name: "performed_date", labelPt: "Data de execução (opcional)", labelEn: "Performed date (optional)", type: "date" }] },
  ],
}

// ── Equipamentos ─────────────────────────────────────────────────────────────
const EQUIPMENT_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/equipment/equipment/": [
    { key: "equipment.equipment.ativar", action: "ativar", labelPt: "Ativar equipamento", labelEn: "Activate equipment", successPt: "Equipamento ativado.", successEn: "Equipment activated.", tone: "primary" },
    { key: "equipment.equipment.inativar", action: "inativar", labelPt: "Inativar equipamento", labelEn: "Deactivate equipment", successPt: "Equipamento inativado.", successEn: "Equipment deactivated.", confirm: true },
  ],
  "/equipment/incident/": [
    { key: "equipment.incident.resolver", action: "resolver", labelPt: "Resolver ocorrência", labelEn: "Resolve incident", successPt: "Ocorrência resolvida.", successEn: "Incident resolved.", tone: "primary" },
    { key: "equipment.incident.reabrir", action: "reabrir", labelPt: "Reabrir ocorrência", labelEn: "Reopen incident", successPt: "Ocorrência reaberta.", successEn: "Incident reopened.", fields: [reasonField] },
    { key: "equipment.incident.perform-maintenance", action: "perform-maintenance", labelPt: "Registar manutenção", labelEn: "Perform maintenance", successPt: "Manutenção registada.", successEn: "Maintenance performed.", tone: "primary" },
  ],
}

// ── Integrações de equipamentos ──────────────────────────────────────────────
const EQUIPMENT_INTEGRATIONS_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/equipment_integrations/equipment/": [
    { key: "equipment_integrations.equipment.ativar", action: "ativar", labelPt: "Ativar", labelEn: "Activate", successPt: "Equipamento ativado.", successEn: "Equipment activated.", tone: "primary" },
    { key: "equipment_integrations.equipment.inativar", action: "inativar", labelPt: "Inativar", labelEn: "Deactivate", successPt: "Equipamento inativado.", successEn: "Equipment deactivated.", confirm: true },
  ],
  "/equipment_integrations/order/": [
    { key: "equipment_integrations.order.enviar", action: "enviar", labelPt: "Enviar ordem", labelEn: "Send order", successPt: "Ordem enviada.", successEn: "Order sent.", tone: "primary" },
    { key: "equipment_integrations.order.cancelar", action: "cancelar", labelPt: "Cancelar ordem", labelEn: "Cancel order", successPt: "Ordem cancelada.", successEn: "Order cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
}

// ── Créditos & Financiamento ─────────────────────────────────────────────────
const CREDIT_FINANCING_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/credit_financing/consortium/": [
    { key: "credit_financing.consortium.ativar", action: "ativar", labelPt: "Ativar consórcio", labelEn: "Activate consortium", successPt: "Consórcio ativado.", successEn: "Consortium activated.", tone: "primary" },
    { key: "credit_financing.consortium.contemplar", action: "contemplar", labelPt: "Contemplar", labelEn: "Award", successPt: "Consórcio contemplado.", successEn: "Consortium awarded.", tone: "primary", fields: [{ name: "awarded_at", labelPt: "Data de contemplação (opcional)", labelEn: "Awarded at (optional)", type: "date" }] },
    { key: "credit_financing.consortium.encerrar", action: "encerrar", labelPt: "Encerrar", labelEn: "Close", successPt: "Consórcio encerrado.", successEn: "Consortium closed.", confirm: true },
    { key: "credit_financing.consortium.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Consórcio cancelado.", successEn: "Consortium cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/credit_financing/procedure_financing/": [
    { key: "credit_financing.procedure_financing.analisar", action: "analisar", labelPt: "Analisar", labelEn: "Analyze", successPt: "Financiamento em análise.", successEn: "Financing under analysis.", tone: "primary", fields: [{ name: "risk_rating", labelPt: "Classificação de risco (opcional)", labelEn: "Risk rating (optional)", type: "text" }] },
    { key: "credit_financing.procedure_financing.aprovar", action: "aprovar", labelPt: "Aprovar", labelEn: "Approve", successPt: "Financiamento aprovado.", successEn: "Financing approved.", tone: "primary", fields: [{ name: "approval_reference", labelPt: "Referência de aprovação (opcional)", labelEn: "Approval reference (optional)", type: "text" }, { name: "first_due_date", labelPt: "Primeiro vencimento (opcional)", labelEn: "First due date (optional)", type: "date" }] },
    { key: "credit_financing.procedure_financing.rejeitar", action: "rejeitar", labelPt: "Rejeitar", labelEn: "Reject", successPt: "Financiamento rejeitado.", successEn: "Financing rejected.", tone: "danger", confirm: true, fields: [reasonField] },
    { key: "credit_financing.procedure_financing.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Financiamento cancelado.", successEn: "Financing cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/credit_financing/installment/": [
    { key: "credit_financing.installment.pagar", action: "pagar", labelPt: "Pagar prestação", labelEn: "Pay installment", successPt: "Prestação paga.", successEn: "Installment paid.", tone: "primary", fields: [{ name: "amount", labelPt: "Montante (opcional)", labelEn: "Amount (optional)", type: "number" }] },
    { key: "credit_financing.installment.aplicar-multa", action: "aplicar-multa", labelPt: "Aplicar multa", labelEn: "Apply penalty", successPt: "Multa aplicada.", successEn: "Penalty applied.", fields: [{ name: "fee_amount", labelPt: "Multa", labelEn: "Fee", type: "number" }, { name: "interest_amount", labelPt: "Juros", labelEn: "Interest", type: "number" }] },
    { key: "credit_financing.installment.perdoar", action: "perdoar", labelPt: "Perdoar", labelEn: "Waive", successPt: "Prestação perdoada.", successEn: "Installment waived.", confirm: true, fields: [reasonField] },
    { key: "credit_financing.installment.estornar", action: "estornar", labelPt: "Estornar", labelEn: "Reverse", successPt: "Pagamento estornado.", successEn: "Payment reversed.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/credit_financing/reimbursement_claim/": [
    { key: "credit_financing.reimbursement_claim.aprovar", action: "aprovar", labelPt: "Aprovar reembolso", labelEn: "Approve claim", successPt: "Reembolso aprovado.", successEn: "Claim approved.", tone: "primary", fields: [{ name: "approved_amount", labelPt: "Montante aprovado (opcional)", labelEn: "Approved amount (optional)", type: "number" }] },
    { key: "credit_financing.reimbursement_claim.rejeitar", action: "rejeitar", labelPt: "Rejeitar", labelEn: "Reject", successPt: "Reembolso rejeitado.", successEn: "Claim rejected.", tone: "danger", confirm: true, fields: [reasonField] },
    { key: "credit_financing.reimbursement_claim.registrar-reembolso", action: "registrar-reembolso", labelPt: "Registar reembolso", labelEn: "Register reimbursement", successPt: "Reembolso registado.", successEn: "Reimbursement registered.", tone: "primary", fields: [{ name: "amount", labelPt: "Montante (opcional)", labelEn: "Amount (optional)", type: "number" }] },
  ],
  "/credit_financing/student_funding/": [
    { key: "credit_financing.student_funding.aprovar", action: "aprovar", labelPt: "Aprovar financiamento", labelEn: "Approve funding", successPt: "Financiamento aprovado.", successEn: "Funding approved.", tone: "primary", fields: [{ name: "approval_reference", labelPt: "Referência (opcional)", labelEn: "Reference (optional)", type: "text" }] },
    { key: "credit_financing.student_funding.suspender", action: "suspender", labelPt: "Suspender", labelEn: "Suspend", successPt: "Financiamento suspenso.", successEn: "Funding suspended.", fields: [reasonField] },
    { key: "credit_financing.student_funding.revogar", action: "revogar", labelPt: "Revogar", labelEn: "Revoke", successPt: "Financiamento revogado.", successEn: "Funding revoked.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
}

// ── Transportes ──────────────────────────────────────────────────────────────
const TRANSPORTATION_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/transportation/vehicle/": [
    { key: "transportation.vehicle.marcar-disponivel", action: "marcar-disponivel", labelPt: "Marcar disponível", labelEn: "Mark available", successPt: "Veículo disponível.", successEn: "Vehicle available.", tone: "primary" },
    { key: "transportation.vehicle.marcar-avariado", action: "marcar-avariado", labelPt: "Marcar avariado", labelEn: "Mark broken down", successPt: "Veículo em manutenção.", successEn: "Vehicle under maintenance.", fields: [reasonField] },
    { key: "transportation.vehicle.inativar", action: "inativar", labelPt: "Inativar", labelEn: "Deactivate", successPt: "Veículo inativado.", successEn: "Vehicle deactivated.", confirm: true },
  ],
  "/transportation/driver/": [
    { key: "transportation.driver.ativar", action: "ativar", labelPt: "Ativar motorista", labelEn: "Activate driver", successPt: "Motorista ativado.", successEn: "Driver activated.", tone: "primary" },
    { key: "transportation.driver.suspender", action: "suspender", labelPt: "Suspender", labelEn: "Suspend", successPt: "Motorista suspenso.", successEn: "Driver suspended.", fields: [reasonField] },
  ],
  "/transportation/route/": [
    { key: "transportation.route.ativar", action: "ativar", labelPt: "Ativar rota", labelEn: "Activate route", successPt: "Rota ativada.", successEn: "Route activated.", tone: "primary" },
    { key: "transportation.route.optimize", action: "optimize", labelPt: "Otimizar rota", labelEn: "Optimize route", successPt: "Rota otimizada.", successEn: "Route optimized.", fields: [{ name: "average_speed_kmh", labelPt: "Velocidade média (km/h)", labelEn: "Average speed (km/h)", type: "number" }] },
    { key: "transportation.route.cancelar", action: "cancelar", labelPt: "Cancelar rota", labelEn: "Cancel route", successPt: "Rota cancelada.", successEn: "Route cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/transportation/trip/": [
    { key: "transportation.trip.aprovar", action: "aprovar", labelPt: "Aprovar viagem", labelEn: "Approve trip", successPt: "Viagem aprovada.", successEn: "Trip approved.", tone: "primary" },
    { key: "transportation.trip.iniciar", action: "iniciar", labelPt: "Iniciar viagem", labelEn: "Start trip", successPt: "Viagem iniciada.", successEn: "Trip started.", tone: "primary", fields: [{ name: "odometer_start_km", labelPt: "Odómetro inicial (km)", labelEn: "Start odometer (km)", type: "number" }] },
    { key: "transportation.trip.finalizar", action: "finalizar", labelPt: "Finalizar viagem", labelEn: "Finish trip", successPt: "Viagem finalizada.", successEn: "Trip finished.", tone: "primary", fields: [{ name: "odometer_end_km", labelPt: "Odómetro final (km)", labelEn: "End odometer (km)", type: "number" }] },
    { key: "transportation.trip.cancelar", action: "cancelar", labelPt: "Cancelar viagem", labelEn: "Cancel trip", successPt: "Viagem cancelada.", successEn: "Trip cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/transportation/maintenance_order/": [
    { key: "transportation.maintenance_order.iniciar", action: "iniciar", labelPt: "Iniciar manutenção", labelEn: "Start maintenance", successPt: "Manutenção iniciada.", successEn: "Maintenance started.", tone: "primary" },
    { key: "transportation.maintenance_order.concluir", action: "concluir", labelPt: "Concluir manutenção", labelEn: "Complete maintenance", successPt: "Manutenção concluída.", successEn: "Maintenance completed.", tone: "primary" },
    { key: "transportation.maintenance_order.cancelar", action: "cancelar", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Manutenção cancelada.", successEn: "Maintenance cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
}

// ── Farmácia (material_requisition; fulfill é payload de array → diferido) ─────
const PHARMACY_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/pharmacy/material_requisition/": [
    { key: "pharmacy.material_requisition.archive", action: "archive", labelPt: "Arquivar requisição", labelEn: "Archive requisition", successPt: "Requisição arquivada.", successEn: "Requisition archived.", confirm: true, fields: [reasonField] },
  ],
}

// ── Armazém / WMS (migrado do mecanismo antigo em /resources) ────────────────
const WAREHOUSE_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/warehouse/sales_order/": [
    { key: "warehouse.sales_order.confirm", action: "confirm", labelPt: "Confirmar", labelEn: "Confirm", successPt: "Pedido confirmado.", successEn: "Order confirmed.", tone: "primary" },
    { key: "warehouse.sales_order.allocate", action: "allocate", labelPt: "Reservar estoque", labelEn: "Allocate stock", successPt: "Estoque reservado.", successEn: "Stock allocated.", tone: "primary" },
    { key: "warehouse.sales_order.create-pick-list", action: "create-pick-list", labelPt: "Gerar separação", labelEn: "Create pick list", successPt: "Lista de separação criada.", successEn: "Pick list created." },
    { key: "warehouse.sales_order.ship", action: "ship", labelPt: "Expedir", labelEn: "Ship", successPt: "Expedição criada.", successEn: "Shipment created.", tone: "primary" },
    { key: "warehouse.sales_order.cancel", action: "cancel", labelPt: "Cancelar pedido", labelEn: "Cancel order", successPt: "Pedido cancelado.", successEn: "Order cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/warehouse/warehouse/": [
    { key: "warehouse.warehouse.activate", action: "activate", labelPt: "Ativar armazém", labelEn: "Activate warehouse", successPt: "Armazém ativado.", successEn: "Warehouse activated.", tone: "primary" },
    { key: "warehouse.warehouse.deactivate", action: "deactivate", labelPt: "Inativar armazém", labelEn: "Deactivate warehouse", successPt: "Armazém inativado.", successEn: "Warehouse deactivated.", confirm: true },
  ],
  "/warehouse/lot/": [
    { key: "warehouse.lot.release", action: "release", labelPt: "Liberar lote", labelEn: "Release lot", successPt: "Lote liberado.", successEn: "Lot released.", tone: "primary" },
    { key: "warehouse.lot.quarantine", action: "quarantine", labelPt: "Pôr em quarentena", labelEn: "Quarantine", successPt: "Lote em quarentena.", successEn: "Lot quarantined.", fields: [reasonField] },
    { key: "warehouse.lot.block", action: "block", labelPt: "Bloquear lote", labelEn: "Block lot", successPt: "Lote bloqueado.", successEn: "Lot blocked.", confirm: true, fields: [reasonField] },
    { key: "warehouse.lot.mark-expired", action: "mark-expired", labelPt: "Marcar expirado", labelEn: "Mark expired", successPt: "Lote marcado como expirado.", successEn: "Lot marked expired.", tone: "danger", confirm: true },
  ],
  "/warehouse/goods_receipt/": [
    { key: "warehouse.goods_receipt.post", action: "post", labelPt: "Lançar recebimento", labelEn: "Post receipt", successPt: "Recebimento lançado.", successEn: "Receipt posted.", tone: "primary" },
  ],
  "/warehouse/stock_reservation/": [
    { key: "warehouse.stock_reservation.release", action: "release", labelPt: "Liberar reserva", labelEn: "Release reservation", successPt: "Reserva liberada.", successEn: "Reservation released." },
  ],
  "/warehouse/pick_list/": [
    { key: "warehouse.pick_list.complete", action: "complete", labelPt: "Concluir separação", labelEn: "Complete picking", successPt: "Separação concluída.", successEn: "Picking completed.", tone: "primary" },
  ],
  "/warehouse/shipment/": [
    { key: "warehouse.shipment.ship", action: "ship", labelPt: "Expedir", labelEn: "Ship", successPt: "Expedição enviada.", successEn: "Shipment shipped.", tone: "primary" },
    { key: "warehouse.shipment.post", action: "post", labelPt: "Lançar expedição", labelEn: "Post shipment", successPt: "Expedição lançada.", successEn: "Shipment posted.", tone: "primary" },
  ],
  "/warehouse/replenishment_plan/": [
    { key: "warehouse.replenishment_plan.generate", action: "generate", labelPt: "Gerar sugestões", labelEn: "Generate suggestions", successPt: "Sugestões geradas.", successEn: "Suggestions generated." },
    { key: "warehouse.replenishment_plan.create-purchase-order", action: "create-purchase-order", labelPt: "Criar compra", labelEn: "Create purchase", successPt: "Pedido de compra criado.", successEn: "Purchase order created.", tone: "primary" },
  ],
  "/warehouse/purchase_order/": [
    { key: "warehouse.purchase_order.post", action: "post", labelPt: "Lançar compra", labelEn: "Post purchase", successPt: "Compra lançada.", successEn: "Purchase posted.", tone: "primary" },
    { key: "warehouse.purchase_order.cancel", action: "cancel", labelPt: "Cancelar compra", labelEn: "Cancel purchase", successPt: "Compra cancelada.", successEn: "Purchase cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
  "/warehouse/stock_transfer/": [
    { key: "warehouse.stock_transfer.post", action: "post", labelPt: "Lançar transferência", labelEn: "Post transfer", successPt: "Transferência lançada.", successEn: "Transfer posted.", tone: "primary" },
  ],
  "/warehouse/cycle_count/": [
    { key: "warehouse.cycle_count.post", action: "post", labelPt: "Lançar inventário", labelEn: "Post count", successPt: "Inventário lançado.", successEn: "Cycle count posted.", tone: "primary" },
  ],
}

// ── Recursos Humanos (aliases EN activate/deactivate omitidos a favor de PT) ──
const HUMAN_RESOURCES_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/human_resources/employee/": [
    { key: "human_resources.employee.ativar", action: "ativar", labelPt: "Ativar funcionário", labelEn: "Activate employee", successPt: "Funcionário ativado.", successEn: "Employee activated.", tone: "primary" },
    { key: "human_resources.employee.desativar", action: "desativar", labelPt: "Desativar funcionário", labelEn: "Deactivate employee", successPt: "Funcionário desativado.", successEn: "Employee deactivated.", confirm: true },
  ],
  "/human_resources/falta/": [
    { key: "human_resources.falta.justificar", action: "justificar", labelPt: "Justificar falta", labelEn: "Justify absence", successPt: "Justificação submetida.", successEn: "Justification submitted.", fields: [{ name: "reason", labelPt: "Motivo", labelEn: "Reason", type: "textarea" }] },
    { key: "human_resources.falta.aprovar-justificativa", action: "aprovar-justificativa", labelPt: "Aprovar justificação", labelEn: "Approve justification", successPt: "Justificação aprovada.", successEn: "Justification approved.", tone: "primary" },
    { key: "human_resources.falta.rejeitar-justificativa", action: "rejeitar-justificativa", labelPt: "Rejeitar justificação", labelEn: "Reject justification", successPt: "Justificação rejeitada.", successEn: "Justification rejected.", tone: "danger", confirm: true },
  ],
  "/human_resources/ferias/": [
    { key: "human_resources.ferias.approve", action: "approve", labelPt: "Aprovar férias", labelEn: "Approve leave", successPt: "Férias aprovadas.", successEn: "Leave approved.", tone: "primary" },
    { key: "human_resources.ferias.reject", action: "reject", labelPt: "Rejeitar férias", labelEn: "Reject leave", successPt: "Férias rejeitadas.", successEn: "Leave rejected.", tone: "danger", confirm: true },
  ],
  "/human_resources/horaextra/": [
    { key: "human_resources.horaextra.approve", action: "approve", labelPt: "Aprovar hora extra", labelEn: "Approve overtime", successPt: "Hora extra aprovada.", successEn: "Overtime approved.", tone: "primary" },
    { key: "human_resources.horaextra.reject", action: "reject", labelPt: "Rejeitar hora extra", labelEn: "Reject overtime", successPt: "Hora extra rejeitada.", successEn: "Overtime rejected.", tone: "danger", confirm: true },
  ],
  "/human_resources/licenca/": [
    { key: "human_resources.licenca.approve", action: "approve", labelPt: "Aprovar licença", labelEn: "Approve leave", successPt: "Licença aprovada.", successEn: "Leave approved.", tone: "primary" },
    { key: "human_resources.licenca.reject", action: "reject", labelPt: "Rejeitar licença", labelEn: "Reject leave", successPt: "Licença rejeitada.", successEn: "Leave rejected.", tone: "danger", confirm: true },
  ],
  "/human_resources/folha_run/": [
    { key: "human_resources.folha_run.calculate", action: "calculate", labelPt: "Calcular folha", labelEn: "Calculate payroll", successPt: "Folha calculada.", successEn: "Payroll calculated.", tone: "primary" },
    { key: "human_resources.folha_run.approve", action: "approve", labelPt: "Aprovar folha", labelEn: "Approve payroll", successPt: "Folha aprovada.", successEn: "Payroll approved.", tone: "primary" },
    { key: "human_resources.folha_run.mark-paid", action: "mark-paid", labelPt: "Marcar como paga", labelEn: "Mark paid", successPt: "Folha marcada como paga.", successEn: "Payroll marked paid.", tone: "primary" },
  ],
}

// ── Receção (link-*/register-payment dependem de FK/valor → diferidos) ─────────
const RECEPTION_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/reception/checkin/": [
    { key: "reception.checkin.start-care", action: "start-care", labelPt: "Iniciar atendimento", labelEn: "Start care", successPt: "Atendimento iniciado.", successEn: "Care started.", tone: "primary" },
    { key: "reception.checkin.create-request", action: "create-request", labelPt: "Criar requisição", labelEn: "Create request", successPt: "Requisição criada.", successEn: "Request created." },
    { key: "reception.checkin.create-invoice", action: "create-invoice", labelPt: "Criar fatura", labelEn: "Create invoice", successPt: "Fatura criada.", successEn: "Invoice created." },
    { key: "reception.checkin.complete", action: "complete", labelPt: "Concluir", labelEn: "Complete", successPt: "Check-in concluído.", successEn: "Check-in completed.", tone: "primary" },
    { key: "reception.checkin.cancel", action: "cancel", labelPt: "Cancelar", labelEn: "Cancel", successPt: "Check-in cancelado.", successEn: "Check-in cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
}

// ── Clínico (core) — send-results-notification já tratado em GeneratedResourceDetailPage ──
const CLINICAL_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/clinical/labrequest/": [
    {
      key: "clinical.labrequest.validar",
      action: "validar",
      labelPt: "Validar requisição",
      labelEn: "Validate request",
      successPt: "Requisição validada — disponível para colheita.",
      successEn: "Request validated — ready for collection.",
      tone: "primary",
      visibleWhen: (record) => record?.status === "pendente" && !record?.validated_at,
    },
    {
      key: "clinical.labrequest.registar-colheita",
      action: "registar-colheita",
      labelPt: "Registar colheita",
      labelEn: "Record collection",
      successPt: "Colheita registada — requisição enviada ao laboratório.",
      successEn: "Collection recorded — request sent to the laboratory.",
      tone: "primary",
      visibleWhen: (record) => !!record?.validated_at && !record?.collected_at,
    },
    {
      key: "clinical.labrequest.iniciar-processamento",
      action: "iniciar-processamento",
      labelPt: "Iniciar processamento",
      labelEn: "Start processing",
      successPt: "Processamento iniciado.",
      successEn: "Processing started.",
      tone: "primary",
      visibleWhen: (record) => !!record?.collected_at && record?.status === "pendente",
    },
    { key: "clinical.labrequest.validate-results", action: "validate-results", labelPt: "Validar resultados", labelEn: "Validate results", successPt: "Resultados validados.", successEn: "Results validated.", tone: "primary" },
    { key: "clinical.labrequest.disregard-empty-results", action: "disregard-empty-results", labelPt: "Desconsiderar vazios", labelEn: "Disregard empty results", successPt: "Resultados vazios desconsiderados.", successEn: "Empty results disregarded." },
  ],
  "/clinical/resultitem/": [
    { key: "clinical.resultitem.start-analysis", action: "start-analysis", labelPt: "Iniciar análise", labelEn: "Start analysis", successPt: "Análise iniciada.", successEn: "Analysis started.", tone: "primary" },
    { key: "clinical.resultitem.save-result", action: "save-result", labelPt: "Guardar resultado", labelEn: "Save result", successPt: "Resultado guardado.", successEn: "Result saved.", tone: "primary", fields: [{ name: "value", labelPt: "Valor", labelEn: "Value", type: "text" }] },
    { key: "clinical.resultitem.validate-result", action: "validate-result", labelPt: "Validar resultado", labelEn: "Validate result", successPt: "Resultado validado.", successEn: "Result validated.", tone: "primary" },
    { key: "clinical.resultitem.disregard-result", action: "disregard-result", labelPt: "Desconsiderar", labelEn: "Disregard result", successPt: "Resultado desconsiderado.", successEn: "Result disregarded.", confirm: true },
  ],
}

// ── Educação ─────────────────────────────────────────────────────────────────
const EDUCATION_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/education/course/": [
    { key: "education.course.activate", action: "activate", labelPt: "Ativar curso", labelEn: "Activate course", successPt: "Curso ativado.", successEn: "Course activated.", tone: "primary" },
    { key: "education.course.archive", action: "archive", labelPt: "Arquivar curso", labelEn: "Archive course", successPt: "Curso arquivado.", successEn: "Course archived.", confirm: true },
  ],
  "/education/enrollment/": [
    { key: "education.enrollment.activate", action: "activate", labelPt: "Ativar matrícula", labelEn: "Activate enrollment", successPt: "Matrícula ativada.", successEn: "Enrollment activated.", tone: "primary" },
    { key: "education.enrollment.complete", action: "complete", labelPt: "Concluir matrícula", labelEn: "Complete enrollment", successPt: "Matrícula concluída.", successEn: "Enrollment completed.", tone: "primary" },
    { key: "education.enrollment.cancel", action: "cancel", labelPt: "Cancelar matrícula", labelEn: "Cancel enrollment", successPt: "Matrícula cancelada.", successEn: "Enrollment cancelled.", tone: "danger", confirm: true, fields: [reasonField] },
  ],
}

// ── Identidade (aliases EN omitidos a favor de PT) ────────────────────────────
const IDENTITY_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/identity/user/": [
    { key: "identity.user.ativar", action: "ativar", labelPt: "Ativar utilizador", labelEn: "Activate user", successPt: "Utilizador ativado.", successEn: "User activated.", tone: "primary" },
    { key: "identity.user.desativar", action: "desativar", labelPt: "Desativar utilizador", labelEn: "Deactivate user", successPt: "Utilizador desativado.", successEn: "User deactivated.", confirm: true },
  ],
}

// ── Entidades externas ───────────────────────────────────────────────────────
const EXTERNAL_ENTITIES_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/external_entities/empresa/": [
    { key: "external_entities.empresa.ativar", action: "ativar", labelPt: "Ativar empresa", labelEn: "Activate company", successPt: "Empresa ativada.", successEn: "Company activated.", tone: "primary" },
    { key: "external_entities.empresa.inativar", action: "inativar", labelPt: "Inativar empresa", labelEn: "Deactivate company", successPt: "Empresa inativada.", successEn: "Company deactivated.", confirm: true },
  ],
}

// ── Notificações ─────────────────────────────────────────────────────────────
const NOTIFICATIONS_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  "/notifications/notification/": [
    { key: "notifications.notification.marcar-enviada", action: "marcar-enviada", labelPt: "Marcar como enviada", labelEn: "Mark sent", successPt: "Notificação marcada como enviada.", successEn: "Notification marked sent.", tone: "primary", fields: [{ name: "external_reference", labelPt: "Referência externa (opcional)", labelEn: "External reference (optional)", type: "text" }] },
    { key: "notifications.notification.marcar-falha", action: "marcar-falha", labelPt: "Marcar falha", labelEn: "Mark failed", successPt: "Notificação marcada como falha.", successEn: "Notification marked failed.", tone: "danger", fields: [{ name: "error", labelPt: "Erro (opcional)", labelEn: "Error (optional)", type: "text" }] },
  ],
}

// Registry global por endpoint-pai (normalizado). Cada módulo contribui o seu mapa.
export const RESOURCE_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
  ...WAREHOUSE_DETAIL_ACTIONS,
  ...HUMAN_RESOURCES_DETAIL_ACTIONS,
  ...RECEPTION_DETAIL_ACTIONS,
  ...CLINICAL_DETAIL_ACTIONS,
  ...EDUCATION_DETAIL_ACTIONS,
  ...IDENTITY_DETAIL_ACTIONS,
  ...EXTERNAL_ENTITIES_DETAIL_ACTIONS,
  ...NOTIFICATIONS_DETAIL_ACTIONS,
  ...CLINICAL_LABORATORY_DETAIL_ACTIONS,
  ...CONSULTATIONS_DETAIL_ACTIONS,
  ...MEDICAL_RECORDS_DETAIL_ACTIONS,
  ...MATERNITY_DETAIL_ACTIONS,
  ...RADIOLOGY_DETAIL_ACTIONS,
  ...SPECIALTY_DIAGNOSTICS_DETAIL_ACTIONS,
  ...PATHOLOGY_DETAIL_ACTIONS,
  ...NURSING_DETAIL_ACTIONS,
  ...SURGERY_DETAIL_ACTIONS,
  ...TELEMEDICINE_DETAIL_ACTIONS,
  ...VETERINARY_DETAIL_ACTIONS,
  ...PHYSIOTHERAPY_DETAIL_ACTIONS,
  ...CLINICAL_PHARMACY_DETAIL_ACTIONS,
  ...DENTAL_DETAIL_ACTIONS,
  ...THERAPY_DETAIL_ACTIONS,
  ...PUBLIC_HEALTH_DETAIL_ACTIONS,
  ...BILLING_DETAIL_ACTIONS,
  ...PAYMENTS_DETAIL_ACTIONS,
  ...ACCOUNTING_DETAIL_ACTIONS,
  ...INSURER_DETAIL_ACTIONS,
  ...MAINTENANCE_DETAIL_ACTIONS,
  ...EQUIPMENT_DETAIL_ACTIONS,
  ...EQUIPMENT_INTEGRATIONS_DETAIL_ACTIONS,
  ...CREDIT_FINANCING_DETAIL_ACTIONS,
  ...TRANSPORTATION_DETAIL_ACTIONS,
  ...PHARMACY_DETAIL_ACTIONS,
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

const ACTIVATE_ACTION_NAMES = new Set(["ativar", "activate", "reactivate", "reativar"])
const DEACTIVATE_ACTION_NAMES = new Set(["inativar", "desativar", "deactivate", "inactivate"])

/**
 * Lê o estado "ativo" de um registo a partir dos campos booleanos/estado mais
 * comuns no backend. Devolve `null` quando não há sinal claro — nesse caso as
 * ações não são escondidas.
 */
export function recordActiveState(record: Record<string, unknown> | null | undefined): boolean | null {
  if (!record) return null
  const booleanFields = ["active", "ativo", "ativa", "is_active", "enabled", "habilitado", "habilitada"]
  for (const field of booleanFields) {
    const value = record[field]
    if (typeof value === "boolean") return value
  }
  const status = String(record.status ?? record.estado ?? "").trim().toLowerCase()
  if (status) {
    if (["ativo", "ativa", "ativado", "ativada", "active", "enabled"].includes(status)) return true
    if (["inativo", "inativa", "inativado", "inativada", "inactive", "disabled", "desativado", "desativada"].includes(status)) {
      return false
    }
  }
  return null
}

/**
 * Decide se uma ação deve aparecer para o registo atual. Respeita `visibleWhen`
 * quando definido; caso contrário, alterna ativar/inativar pelo estado do
 * registo, para que só apareça a ação aplicável (um único botão que troca).
 */
export function isDetailActionVisibleForRecord(
  action: DetailActionDefinition,
  record: Record<string, unknown> | null | undefined
): boolean {
  if (action.visibleWhen) return action.visibleWhen(record || {})
  const active = recordActiveState(record)
  if (active === null) return true
  if (ACTIVATE_ACTION_NAMES.has(action.action)) return !active
  if (DEACTIVATE_ACTION_NAMES.has(action.action)) return active
  return true
}
