"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bot,
  ClipboardCheck,
  Package,
  Search,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";

type CrudMenuItem = {
  nome: string;
  href: string;
  icon?: LucideIcon;
};

const MODULES: Record<string, CrudMenuItem[]> = {
  "accounting": [
    { nome: "Conta", href: "/accounting/accounts" },
    { nome: "Saldo da Conta", href: "/accounting/accounts" },
    { nome: "Conciliação Financeira", href: "/accounting/financial-reconciliations" },
    { nome: "Lançamento Contábil", href: "/accounting/ledger-entries" },
    { nome: "Linha Contábil", href: "/accounting/ledger-entries" },
    { nome: "Lançamento Legado", href: "/accounting/legacy-entries" },
    { nome: "Movimento Legado", href: "/accounting/legacy-movements" },
  ],
  "ai_assistant": [
    { nome: "Sessões da IA", href: "/ai_assistant/ai-sessions", icon: Bot },
    { nome: "Tarefas Operacionais", href: "/ai_assistant/ai-operational-tasks", icon: ClipboardCheck },
    { nome: "Investigações da IA", href: "/ai_assistant/ai-investigations", icon: Search },
    { nome: "Ferramentas da IA", href: "/ai", icon: TerminalSquare },
  ],
  "audit_activities": [
    { nome: "Actividade do Utilizador", href: "/audit_activities/user-activities" },
  ],
  "billing": [
    { nome: "Fatura", href: "/billing/invoices" },
    { nome: "Histórico de Fatura", href: "/billing/invoice-histories" },
    { nome: "Item de Fatura", href: "/billing/invoice-items" },
  ],
  "bloodbank": [
    { nome: "Doação de Sangue", href: "/bloodbank/blood-donations" },
    { nome: "Armazenamento de Sangue", href: "/bloodbank/blood-storages" },
    { nome: "Unidade de Sangue", href: "/bloodbank/blood-units" },
    { nome: "Transfusão de Sangue", href: "/bloodbank/blood-transfusions" },
    { nome: "Movimento de Stock de Sangue", href: "/bloodbank/blood-stock-movements" },
    { nome: "Manutenção do Armazenamento de Sangue", href: "/bloodbank/blood-storage-maintenances" },
  ],
  "clinical": [
    { nome: "Exame Laboratorial", href: "/clinical/lab-exams" },
    { nome: "Paciente", href: "/clinical/patients" },
    { nome: "Amostra", href: "/clinical/samples" },
    { nome: "Requisição Laboratorial", href: "/clinical/lab-requests" },
    { nome: "Campo de Exame Laboratorial", href: "/clinical/lab-exam-fields" },
    { nome: "Resultado", href: "/clinical/results" },
    { nome: "Item de Resultado", href: "/clinical/result-items" },
    { nome: "Evento Clínico", href: "/healthcare" },
    { nome: "Histórico Clínico", href: "/clinical/patients" },
    { nome: "Exame Médico", href: "/clinical/medical-exams" },
    { nome: "Campo de Exame Médico", href: "/clinical/medical-exam-fields" },
    { nome: "Item da Requisição Laboratorial", href: "/clinical/lab-request-items" },
    { nome: "Ficheiro de Resultado Médico", href: "/clinical/medical-result-files" },
    { nome: "Referência Clínica", href: "/healthcare" },
  ],
  "consultations": [
    { nome: "Especialidade de Consulta", href: "/consultations/consultation-specialties" },
    { nome: "Feriado", href: "/consultations/holidays" },
    { nome: "Consulta Médica", href: "/consultations/medical-consultations" },
  ],
  "education": [
    { nome: "Trabalho", href: "/education/assignments" },
    { nome: "Submissão de Trabalho", href: "/education/assignment-submissions" },
    { nome: "Presença", href: "/education/attendance-records" },
    { nome: "Turma", href: "/education/classrooms" },
    { nome: "Conteúdo de Aprendizagem", href: "/education/learning-contents" },
    { nome: "Curso", href: "/education/courses" },
    { nome: "Matrícula", href: "/education/enrollments" },
    { nome: "Exame", href: "/education/examinations" },
    { nome: "Tentativa de Exame", href: "/education/examination-attempts" },
    { nome: "Nota", href: "/education/grade-records" },
    { nome: "Teste Aleatório", href: "/education/random-tests" },
    { nome: "Item do Cronograma da Disciplina", href: "/education/discipline-schedule-items" },
    { nome: "Estado do Estudante no Cronograma", href: "/education/discipline-schedule-student-statuses" },
    { nome: "Competência", href: "/education/skills" },
    { nome: "Estudante", href: "/education/student-profiles" },
    { nome: "Professor", href: "/education/teacher-profiles" },
  ],
  "equipment": [
    { nome: "Equipamento", href: "/equipment/equipments" },
  ],
  "equipment_integrations": [
    { nome: "Mensagem de Integração", href: "/equipment_integrations/integration-messages" },
    { nome: "Documento de Integração", href: "/equipment_integrations/integration-documents" },
    { nome: "Credencial de Integração", href: "/equipment_integrations/integration-credentials" },
    { nome: "Equipamento de Integração", href: "/equipment_integrations/integration-equipments" },
    { nome: "Mapeamento de Analito", href: "/equipment_integrations/integration-analyte-mappings" },
    { nome: "Ordem de Integração", href: "/equipment_integrations/integration-orders" },
    { nome: "Item de Ordem de Integração", href: "/equipment_integrations/integration-order-items" },
    { nome: "Roteamento de Integração", href: "/equipment_integrations/integration-routings" },
  ],
  "external_entities": [
    { nome: "Empresa", href: "/external_entities/companies" },
  ],
  "human_resources": [
    { nome: "Falta", href: "/human_resources/absences" },
    { nome: "Processo Disciplinar", href: "/human_resources/disciplinary-processes" },
    { nome: "Funcionário", href: "/human_resources/employees" },
    { nome: "Agregado Familiar", href: "/human_resources/family-dependents" },
    { nome: "Cargo", href: "/human_resources/job-titles" },
    { nome: "Hora Extra", href: "/human_resources/overtimes" },
    { nome: "Folha de Pagamento", href: "/human_resources/payrolls" },
    { nome: "Profissão", href: "/human_resources/professions" },
    { nome: "Dispensa", href: "/human_resources/terminations" },
    { nome: "Férias", href: "/human_resources/vacations" },
    { nome: "Horário de Trabalho", href: "/human_resources/work-schedules" },
  ],
  "identity": [
    { nome: "Perfil Profissional", href: "/identity/professional-profiles" },
    { nome: "Utilizador", href: "/identity/users" },
  ],
  "incidents": [
    { nome: "Ocorrência", href: "/incidents/incidents" },
  ],
  "inspections": [
    { nome: "Inspeção Diária", href: "/inspections/daily-inspections" },
  ],
  "insurer": [
    { nome: "Plano de Cobertura", href: "/insurer/coverage-plans" },
    { nome: "Seguradora", href: "/insurer/insurers" },
    { nome: "Autorização de Procedimento", href: "/insurer/procedure-authorizations" },
    { nome: "Plano por Cliente", href: "/insurer/tenant-coverage-plans" },
  ],
  "maintenance": [
    { nome: "Manutenção", href: "/maintenance/maintenances" },
  ],
  "maternity": [
    { nome: "Gestação", href: "/maternity/pregnancies" },
  ],
  "medical_records": [
    { nome: "Entrada do Prontuário", href: "/medical_records/medical-record-entries" },
    { nome: "Item de Prescrição", href: "/medical_records/prescription-items" },
  ],
  "monitoring": [
    { nome: "Evento Transacional", href: "/monitoring/errors" },
    { nome: "Erro do Sistema", href: "/monitoring/system-errors" },
  ],
  "notifications": [
    { nome: "Log de Envio", href: "/notifications/delivery-logs" },
    { nome: "Notificação", href: "/notifications/notifications" },
    { nome: "Modelo de Notificação", href: "/notifications/notification-templates" },
  ],
  "nursing": [
    { nome: "Evolução de Enfermagem", href: "/nursing/nursing-evolutions" },
    { nome: "Prescrição de Enfermagem", href: "/nursing/nursing-prescriptions" },
    { nome: "Registo de Enfermagem", href: "/nursing/nursing-records" },
    { nome: "Procedimento", href: "/nursing/procedures" },
    { nome: "Catálogo de Procedimentos", href: "/nursing/procedure-catalogs" },
    { nome: "Material do Catálogo", href: "/nursing/procedure-catalog-materials" },
    { nome: "Item de Procedimento", href: "/nursing/procedure-items" },
    { nome: "Valor do Item de Procedimento", href: "/nursing/procedure-item-values" },
    { nome: "Material de Procedimento", href: "/nursing/procedure-materials" },
    { nome: "Valor do Material de Procedimento", href: "/nursing/procedure-material-values" },
    { nome: "Sinal Vital de Enfermagem", href: "/nursing/nursing-vital-signs" },
    { nome: "Enfermaria", href: "/nursing/wards" },
    { nome: "Cama", href: "/nursing/ward-beds" },
    { nome: "Internamento", href: "/nursing/ward-admissions" },
  ],
  "payments": [
    { nome: "Pagamento", href: "/payments/payments" },
    { nome: "Histórico de Pagamento", href: "/payments/payments" },
    { nome: "Recibo", href: "/payments/receipts" },
    { nome: "Reconciliação", href: "/payments/reconciliations" },
    { nome: "Transação", href: "/payments/transactions" },
  ],
  "pharmacy": [
    { nome: "Movimento de Inventário", href: "/pharmacy/inventory-movements" },
    { nome: "Lote", href: "/pharmacy/lots" },
    { nome: "Requisição de Material", href: "/pharmacy/material-requisitions" },
    { nome: "Item de Requisição de Material", href: "/pharmacy/material-requisition-items" },
    { nome: "Produto", href: "/pharmacy/products" },
    { nome: "Categoria Principal", href: "/pharmacy/products" },
    { nome: "Categoria de Produto", href: "/pharmacy/products" },
    { nome: "Venda", href: "/pharmacy/sales" },
    { nome: "Item de Venda", href: "/pharmacy/sale-items" },
  ],
  "warehouse": [
    { nome: "Armazém", href: "/warehouse/warehouses" },
    { nome: "Localização de Armazém", href: "/warehouse/storage-locations" },
    { nome: "Categoria de Item", href: "/warehouse/item-categories" },
    { nome: "Item de Estoque", href: "/warehouse/items" },
    { nome: "Lote WMS", href: "/warehouse/lots" },
    { nome: "Saldo de Estoque", href: "/warehouse/stock-levels" },
    { nome: "Movimento WMS", href: "/warehouse/stock-movements" },
    { nome: "Pedido de Compra", href: "/warehouse/purchase-orders" },
    { nome: "Linha de Compra", href: "/warehouse/purchase-order-lines" },
    { nome: "Recebimento", href: "/warehouse/goods-receipts" },
    { nome: "Linha de Recebimento", href: "/warehouse/goods-receipt-lines" },
    { nome: "Transferência", href: "/warehouse/stock-transfers" },
    { nome: "Linha de Transferência", href: "/warehouse/stock-transfer-lines" },
    { nome: "Inventário Cíclico", href: "/warehouse/cycle-counts" },
    { nome: "Linha de Inventário", href: "/warehouse/cycle-count-lines" },
  ],
  "reception": [
    { nome: "Atendimento de Recepção", href: "/reception/reception-checkins" },
  ],
  "surgery": [
    { nome: "Cirurgia", href: "/surgery/surgeries" },
    { nome: "Pequena Cirurgia", href: "/surgery/small-surgeries" },
    { nome: "Grande Cirurgia", href: "/surgery/large-surgeries" },
    { nome: "Procedimento Cirúrgico", href: "/surgery/surgical-procedures" },
  ],
  "tenants": [
    { nome: "Configuração do Cliente", href: "/tenants/tenant-configurations" },
    { nome: "Funcionalidade do Cliente", href: "/tenants/tenant-feature-flags" },
    { nome: "Assinatura do Cliente", href: "/tenants/tenants" },
    { nome: "Plano de Assinatura", href: "/tenants/subscription-plans" },
    { nome: "Cliente", href: "/tenants/tenants" },
    { nome: "Uso do Cliente", href: "/tenants/tenant-usages" },
  ],
};

const MODULE_ICONS: Record<string, LucideIcon> = {
  ai_assistant: Bot,
};

const MODULE_LABELS: Record<string, string> = {
  accounting: "Contabilidade",
  ai_assistant: "IA Operacional",
  audit_activities: "Auditoria de Actividades",
  billing: "Faturação",
  bloodbank: "Banco de Sangue",
  clinical: "Clínica",
  consultations: "Consultas",
  education: "Educação",
  equipment: "Equipamentos",
  equipment_integrations: "Integrações de Equipamentos",
  external_entities: "Entidades Externas",
  human_resources: "Recursos Humanos",
  identity: "Identidade",
  incidents: "Ocorrências",
  inspections: "Inspeções",
  insurer: "Seguradoras",
  maintenance: "Manutenção",
  maternity: "Maternidade",
  medical_records: "Prontuário",
  monitoring: "Monitorização",
  notifications: "Notificações",
  nursing: "Enfermagem",
  payments: "Pagamentos",
  pharmacy: "Farmácia",
  reception: "Recepção",
  surgery: "Cirurgia",
  tenants: "Clientes",
  warehouse: "Armazém",
};

export default function CrudSidebar() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="w-64 bg-gray-900 text-white p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4">Modelos</h2>
      {Object.entries(MODULES).map(([module, items]) => {
        const ModuleIcon = MODULE_ICONS[module] || Package;
        return (
          <div key={module} className="mb-4">
            <button
              onClick={() => setExpanded(p => ({ ...p, [module]: !p[module] }))}
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm font-semibold hover:bg-gray-800"
            >
              <ModuleIcon size={16} />
              <span>{MODULE_LABELS[module] || module}</span>
            </button>
            {expanded[module] && (
              <div className="ml-4 space-y-1">
                {items.map((item) => {
                  const ItemIcon = item.icon || Package;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 py-1 text-sm text-gray-300 hover:text-blue-400"
                    >
                      <ItemIcon size={14} />
                      <span>{item.nome}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
