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

// Registry global por endpoint-pai (normalizado). Cada módulo contribui o seu mapa.
export const RESOURCE_DETAIL_ACTIONS: Record<string, DetailActionDefinition[]> = {
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
