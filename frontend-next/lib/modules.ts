import schema from "@/schema.generated.json"

export type ModuleResource = {
  key: string
  label: string
  endpoint: string
  adminListHref?: string
}

export type ModuleGroup = {
  key: string
  label: string
  resources: ModuleResource[]
}

// Single source of truth for the Django apps currently exposed under /api/v1.
const MODULES_BASE: ModuleGroup[] = [
  {
    key: "clinical",
    label: "Clínico",
    resources: [
      { key: "paciente", label: "Pacientes", endpoint: "/clinical/patient/", adminListHref: "/admin/clinico/patient/" },
      { key: "exame", label: "Exames", endpoint: "/clinical/exam/", adminListHref: "/admin/clinico/labexam/" },
      { key: "examemedico", label: "Exames Médicos", endpoint: "/clinical/medicalexam/", adminListHref: "/admin/clinico/medicalexam/" },
      { key: "examecampo", label: "Campos de Exame", endpoint: "/clinical/examfield/", adminListHref: "/admin/clinico/labexamfield/" },
      { key: "examemedicocampo", label: "Campos de Exame Médico", endpoint: "/clinical/medicalexamfield/" },
      { key: "requisicaoanalise", label: "Requisições", endpoint: "/clinical/labrequest/", adminListHref: "/admin/clinico/labrequest/" },
      { key: "requisicaoitem", label: "Itens de Requisição", endpoint: "/clinical/labrequestitem/" },
      { key: "resultadoitem", label: "Resultados", endpoint: "/clinical/resultitem/" },
      { key: "medicalresultfile", label: "Ficheiros de Resultado Médico", endpoint: "/clinical/medicalresultfile/" },
      { key: "sample", label: "Amostras", endpoint: "/clinical/sample/" },
    ],
  },
  {
    key: "reception",
    label: "Recepção",
    resources: [
      { key: "workspace", label: "Workspace", endpoint: "/reception/workspace/", adminListHref: "/admin/reception/" },
      { key: "checkin", label: "Check-ins", endpoint: "/reception/checkin/", adminListHref: "/admin/reception/checkinrecepcao/" },
      { key: "atendimento", label: "Atendimentos", endpoint: "/reception/atendimento/", adminListHref: "/admin/reception/" },
    ],
  },
  {
    key: "equipment",
    label: "Equipamentos",
    resources: [
      { key: "equipment", label: "Equipamentos", endpoint: "/equipment/equipment/", adminListHref: "/admin/equipment/equipment/" },
      { key: "daily_inspection", label: "Inspeções Diárias", endpoint: "/equipment/daily_inspection/", adminListHref: "/admin/inspections/dailyinspection/" },
      { key: "maintenance", label: "Manutenções", endpoint: "/maintenance/maintenance/", adminListHref: "/admin/maintenance/maintenance/" },
      { key: "incident", label: "Ocorrências", endpoint: "/equipment/incident/", adminListHref: "/admin/incidents/incident/" },
    ],
  },
  {
    key: "entities",
    label: "Entidades",
    resources: [
      { key: "empresa", label: "Empresas", endpoint: "/external_entities/empresa/", adminListHref: "/admin/externall-entities/company/" },
    ],
  },
  {
    key: "billing",
    label: "Faturamento",
    resources: [
      { key: "fatura", label: "Faturas", endpoint: "/billing/invoice/", adminListHref: "/admin/faturamento/invoice/" },
      { key: "faturaitem", label: "Itens da Fatura", endpoint: "/billing/invoiceitem/" },
      { key: "historicofatura", label: "Histórico", endpoint: "/billing/invoicehistory/" },
    ],
  },
  {
    key: "payments",
    label: "Pagamentos",
    resources: [
      { key: "pagamento", label: "Pagamentos", endpoint: "/payments/payment/" },
      { key: "recibo", label: "Recibos", endpoint: "/payments/receipt/" },
      { key: "transacao", label: "Transações", endpoint: "/payments/transaction/" },
      { key: "reconciliacao", label: "Reconciliações", endpoint: "/payments/reconciliation/" },
    ],
  },
  {
    key: "pharmacy",
    label: "Farmácia",
    resources: [
      { key: "product", label: "Produtos", endpoint: "/pharmacy/product/", adminListHref: "/admin/pharmacy/product/" },
      { key: "lot", label: "Lotes", endpoint: "/pharmacy/lot/", adminListHref: "/admin/pharmacy/lot/" },
      { key: "inventory_movement", label: "Movimentos de Estoque", endpoint: "/pharmacy/inventory_movement/", adminListHref: "/admin/pharmacy/inventorymovement/" },
      { key: "sale", label: "Vendas", endpoint: "/pharmacy/sale/", adminListHref: "/admin/pharmacy/sale/" },
      { key: "sale_item", label: "Itens de Venda", endpoint: "/pharmacy/sale_item/", adminListHref: "/admin/pharmacy/saleitem/" },
      { key: "material_requisition", label: "Requisições de Material", endpoint: "/pharmacy/material_requisition/", adminListHref: "/admin/pharmacy/materialrequisition/" },
      { key: "material_requisition_item", label: "Itens de Requisição", endpoint: "/pharmacy/material_requisition_item/", adminListHref: "/admin/pharmacy/materialrequisitionitem/" },
    ],
  },
  {
    key: "warehouse",
    label: "ERP e WMS",
    resources: [
      { key: "warehouse", label: "Armazéns", endpoint: "/warehouse/warehouse/", adminListHref: "/admin/warehouse/warehouse/" },
      { key: "storage_location", label: "Localizações", endpoint: "/warehouse/storage_location/", adminListHref: "/admin/warehouse/storagelocation/" },
      { key: "item_category", label: "Categorias de Itens", endpoint: "/warehouse/item_category/", adminListHref: "/admin/warehouse/warehouseitemcategory/" },
      { key: "item", label: "Itens de Estoque", endpoint: "/warehouse/item/", adminListHref: "/admin/warehouse/warehouseitem/" },
      { key: "lot", label: "Lotes WMS", endpoint: "/warehouse/lot/", adminListHref: "/admin/warehouse/warehouselot/" },
      { key: "stock_level", label: "Saldos de Estoque", endpoint: "/warehouse/stock_level/", adminListHref: "/admin/warehouse/stocklevel/" },
      { key: "stock_movement", label: "Movimentos WMS", endpoint: "/warehouse/stock_movement/", adminListHref: "/admin/warehouse/stockmovement/" },
      { key: "replenishment_plan", label: "Planos de Reposição", endpoint: "/warehouse/replenishment_plan/", adminListHref: "/admin/warehouse/replenishmentplan/" },
      { key: "replenishment_suggestion", label: "Sugestões de Reposição", endpoint: "/warehouse/replenishment_suggestion/", adminListHref: "/admin/warehouse/replenishmentsuggestion/" },
      { key: "sales_order", label: "Pedidos de Venda", endpoint: "/warehouse/sales_order/", adminListHref: "/admin/warehouse/salesorder/" },
      { key: "sales_order_line", label: "Linhas de Venda", endpoint: "/warehouse/sales_order_line/", adminListHref: "/admin/warehouse/salesorderline/" },
      { key: "stock_reservation", label: "Reservas de Estoque", endpoint: "/warehouse/stock_reservation/", adminListHref: "/admin/warehouse/stockreservation/" },
      { key: "pick_list", label: "Listas de Separação", endpoint: "/warehouse/pick_list/", adminListHref: "/admin/warehouse/picklist/" },
      { key: "pick_list_line", label: "Linhas de Separação", endpoint: "/warehouse/pick_list_line/", adminListHref: "/admin/warehouse/picklistline/" },
      { key: "shipment", label: "Expedições", endpoint: "/warehouse/shipment/", adminListHref: "/admin/warehouse/shipment/" },
      { key: "shipment_line", label: "Linhas de Expedição", endpoint: "/warehouse/shipment_line/", adminListHref: "/admin/warehouse/shipmentline/" },
      { key: "purchase_order", label: "Pedidos de Compra", endpoint: "/warehouse/purchase_order/", adminListHref: "/admin/warehouse/purchaseorder/" },
      { key: "purchase_order_line", label: "Linhas de Compra", endpoint: "/warehouse/purchase_order_line/", adminListHref: "/admin/warehouse/purchaseorderline/" },
      { key: "goods_receipt", label: "Recebimentos", endpoint: "/warehouse/goods_receipt/", adminListHref: "/admin/warehouse/goodsreceipt/" },
      { key: "goods_receipt_line", label: "Linhas de Recebimento", endpoint: "/warehouse/goods_receipt_line/", adminListHref: "/admin/warehouse/goodsreceiptline/" },
      { key: "stock_transfer", label: "Transferências", endpoint: "/warehouse/stock_transfer/", adminListHref: "/admin/warehouse/stocktransfer/" },
      { key: "stock_transfer_line", label: "Linhas de Transferência", endpoint: "/warehouse/stock_transfer_line/", adminListHref: "/admin/warehouse/stocktransferline/" },
      { key: "cycle_count", label: "Inventários Cíclicos", endpoint: "/warehouse/cycle_count/", adminListHref: "/admin/warehouse/cyclecount/" },
      { key: "cycle_count_line", label: "Linhas de Inventário", endpoint: "/warehouse/cycle_count_line/", adminListHref: "/admin/warehouse/cyclecountline/" },
    ],
  },
  {
    key: "bloodbank",
    label: "Banco de Sangue",
    resources: [
      { key: "donation", label: "Doações", endpoint: "/bloodbank/donation/", adminListHref: "/admin/bloodbank/blooddonation/" },
      { key: "unit", label: "Unidades", endpoint: "/bloodbank/unit/", adminListHref: "/admin/bloodbank/bloodunit/" },
      { key: "transfusion", label: "Transfusões", endpoint: "/bloodbank/transfusion/", adminListHref: "/admin/bloodbank/bloodtransfusion/" },
      { key: "storage", label: "Armazenamentos", endpoint: "/bloodbank/storage/", adminListHref: "/admin/bloodbank/bloodstorage/" },
      { key: "stock_movement", label: "Movimentos", endpoint: "/bloodbank/stock_movement/", adminListHref: "/admin/bloodbank/bloodstockmovement/" },
      { key: "storage_maintenance", label: "Manutenções", endpoint: "/bloodbank/storage_maintenance/", adminListHref: "/admin/bloodbank/bloodstoragemaintenance/" },
    ],
  },
  {
    key: "nursing",
    label: "Enfermagem",
    resources: [
      { key: "nursing_evolution", label: "Evoluções", endpoint: "/nursing/nursing_evolution/" },
      { key: "procedure", label: "Procedimentos", endpoint: "/nursing/procedure/", adminListHref: "/admin/nursing/procedure/" },
      { key: "procedure_catalog", label: "Catálogo", endpoint: "/nursing/procedure_catalog/", adminListHref: "/admin/nursing/procedurecatalog/" },
      { key: "procedure_catalog_material", label: "Materiais do Catálogo", endpoint: "/nursing/procedure_catalog_material/", adminListHref: "/admin/nursing/procedurecatalogmaterial/" },
      { key: "procedure_item", label: "Itens do Procedimento", endpoint: "/nursing/procedure_item/", adminListHref: "/admin/nursing/procedureitem/" },
      { key: "procedure_item_value", label: "Valores do Item", endpoint: "/nursing/procedure_item_value/", adminListHref: "/admin/nursing/procedureitemvalue/" },
      { key: "procedure_material", label: "Materiais do Procedimento", endpoint: "/nursing/procedure_material/", adminListHref: "/admin/nursing/procedurematerial/" },
      { key: "procedure_material_value", label: "Valores do Material", endpoint: "/nursing/procedure_material_value/", adminListHref: "/admin/nursing/procedurematerialvalue/" },
      { key: "nursing_prescription", label: "Prescrições", endpoint: "/nursing/nursing_prescription/" },
      { key: "nursing_record", label: "Registros", endpoint: "/nursing/nursing_record/", adminListHref: "/admin/nursing/nursingrecord/" },
      { key: "nursing_vital_sign", label: "Sinais Vitais", endpoint: "/nursing/nursing_vital_sign/", adminListHref: "/admin/nursing/nursingvitalsign/" },
      { key: "ward", label: "Enfermarias", endpoint: "/nursing/ward/" },
      { key: "ward_bed", label: "Camas (Enfermaria)", endpoint: "/nursing/ward_bed/" },
      { key: "ward_admission", label: "Internamentos (Enfermaria)", endpoint: "/nursing/ward_admission/" },
    ],
  },
  {
    key: "insurer",
    label: "Seguradora",
    resources: [
      { key: "seguradora", label: "Seguradoras", endpoint: "/insurer/insurer/", adminListHref: "/admin/insurer/insurer/" },
      { key: "planocobertura", label: "Planos", endpoint: "/insurer/planocobertura/", adminListHref: "/admin/insurer/coverageplan/" },
      { key: "autorizacaoprocedimento", label: "Autorizações", endpoint: "/insurer/autorizacaoprocedimento/", adminListHref: "/admin/insurer/procedureauthorization/" },
    ],
  },
  {
    key: "accounting",
    label: "Contabilidade",
    resources: [
      { key: "conta", label: "Contas", endpoint: "/accounting/account/", adminListHref: "/admin/accounting/account/" },
      { key: "lancamento", label: "Lançamentos", endpoint: "/accounting/entry/", adminListHref: "/admin/accounting/legacyentry/" },
      { key: "movimento", label: "Movimentos", endpoint: "/accounting/movement/", adminListHref: "/admin/accounting/legacymovement/" },
      { key: "conciliacaofinanceira", label: "Conciliações", endpoint: "/accounting/financialreconciliation/", adminListHref: "/admin/accounting/financialreconciliation/" },
    ],
  },
  {
    key: "consultations",
    label: "Consultas",
    resources: [
      { key: "consulta", label: "Consultas", endpoint: "/consultations/consultation/", adminListHref: "/admin/consultations/medicalconsultation/" },
      { key: "medicos", label: "Médicos", endpoint: "/consultations/doctors/" },
      { key: "especialidade", label: "Especialidades", endpoint: "/consultations/specialty/", adminListHref: "/admin/consultations/consultationspecialty/" },
      { key: "feriado", label: "Feriados", endpoint: "/consultations/holiday/", adminListHref: "/admin/consultations/holiday/" },
    ],
  },
  {
    key: "education",
    label: "Educação",
    resources: [
      { key: "student", label: "Estudantes", endpoint: "/education/student/", adminListHref: "/admin/education/studentprofile/" },
      { key: "teacher", label: "Professores", endpoint: "/education/teacher/", adminListHref: "/admin/education/teacherprofile/" },
      { key: "course", label: "Cursos", endpoint: "/education/course/", adminListHref: "/admin/education/course/" },
      { key: "classroom", label: "Turmas", endpoint: "/education/classroom/", adminListHref: "/admin/education/classroom/" },
      { key: "enrollment", label: "Matrículas", endpoint: "/education/enrollment/", adminListHref: "/admin/education/enrollment/" },
      { key: "attendance", label: "Presenças", endpoint: "/education/attendance/", adminListHref: "/admin/education/attendancerecord/" },
      { key: "grade", label: "Notas", endpoint: "/education/grade/", adminListHref: "/admin/education/graderecord/" },
      { key: "examination", label: "Exames", endpoint: "/education/examination/", adminListHref: "/admin/education/examination/" },
      { key: "random_test", label: "Testes Aleatórios", endpoint: "/education/random_test/", adminListHref: "/admin/education/randomtest/" },
      { key: "assignment", label: "Trabalhos", endpoint: "/education/assignment/", adminListHref: "/admin/education/assignment/" },
      { key: "submission", label: "Submissões de Trabalho", endpoint: "/education/submission/", adminListHref: "/admin/education/assignmentsubmission/" },
      { key: "exam_attempt", label: "Tentativas de Exame", endpoint: "/education/exam_attempt/", adminListHref: "/admin/education/examinationattempt/" },
      { key: "content", label: "Conteúdos de Aprendizagem", endpoint: "/education/content/", adminListHref: "/admin/education/learningcontent/" },
      { key: "bibliography", label: "Referências Bibliográficas", endpoint: "/education/bibliography/", adminListHref: "/admin/education/learningcontent/" },
      { key: "thematic_map", label: "Mapa de Conteúdo Temático", endpoint: "/education/thematic_map/", adminListHref: "/admin/education/learningcontent/" },
      { key: "discipline_schedule", label: "Cronograma da Disciplina", endpoint: "/education/discipline_schedule/", adminListHref: "/admin/education/disciplinescheduleitem/" },
      { key: "schedule_progress", label: "Progresso do Cronograma", endpoint: "/education/schedule_progress/", adminListHref: "/admin/education/disciplineschedulestudentstatus/" },
      { key: "skill", label: "Competências", endpoint: "/education/skill/", adminListHref: "/admin/education/skill/" },
    ],
  },
  {
    key: "tenants",
    label: "Inquilinos",
    resources: [
      { key: "inquilino", label: "Inquilinos", endpoint: "/tenants/tenant/", adminListHref: "/admin/tenants/tenant/" },
      { key: "planoassinatura", label: "Planos", endpoint: "/tenants/planoassinatura/", adminListHref: "/admin/tenants/subscriptionplan/" },
      { key: "configuracaoinquilino", label: "Configurações", endpoint: "/tenants/configuracaoinquilino/", adminListHref: "/admin/tenants/tenantconfiguration/" },
      { key: "usotenant", label: "Uso do Tenant", endpoint: "/tenants/usotenant/", adminListHref: "/admin/tenants/tenantusage/" },
      { key: "featureflagtenant", label: "Feature Flags", endpoint: "/tenants/featureflagtenant/", adminListHref: "/admin/tenants/tenantfeatureflag/" },
    ],
  },
  {
    key: "notifications",
    label: "Notificações",
    resources: [
      { key: "notificacao", label: "Notificações", endpoint: "/notifications/notificacao/", adminListHref: "/admin/notifications/notificacao/" },
      { key: "logenvio", label: "Logs de Envio", endpoint: "/notifications/logenvio/", adminListHref: "/admin/notifications/logenvio/" },
    ],
  },
  {
    key: "identity",
    label: "Identidade",
    resources: [
      { key: "usuario", label: "Usuários", endpoint: "/identity/user/", adminListHref: "/admin/identity/user/" },
      { key: "perfilprofissional", label: "Perfis Profissionais", endpoint: "/identity/perfilprofissional/" },
      { key: "passwordresettoken", label: "Tokens de Reset", endpoint: "/identity/passwordresettoken/" },
    ],
  },
  {
    key: "medical_records",
    label: "Prontuário",
    resources: [
      { key: "registro", label: "Cardex", endpoint: "/medical_records/record/", adminListHref: "/admin/medical-records/medicalrecordentry/" },
      { key: "prescricaoitem", label: "Itens de Prescrição", endpoint: "/medical_records/prescricaoitem/", adminListHref: "/admin/medical-records/prescriptionitem/" },
    ],
  },
  {
    key: "maternity",
    label: "Maternidade",
    resources: [
      { key: "gestacao", label: "Gestações", endpoint: "/maternity/gestacao/", adminListHref: "/admin/maternity/gestacao/" },
    ],
  },
  {
    key: "surgery",
    label: "Cirurgia",
    resources: [
      { key: "pequenacirurgia", label: "Pequenas Cirurgias", endpoint: "/surgery/pequenacirurgia/", adminListHref: "/admin/surgery/smallsurgery/" },
      { key: "grandecirurgia", label: "Grandes Cirurgias", endpoint: "/surgery/grandecirurgia/", adminListHref: "/admin/surgery/largesurgery/" },
      { key: "cirurgia", label: "Todas as Cirurgias", endpoint: "/surgery/surgery/", adminListHref: "/admin/surgery/surgery/" },
      { key: "procedimentocirurgico", label: "Procedimentos Cirúrgicos", endpoint: "/surgery/procedimentocirurgico/", adminListHref: "/admin/surgery/procedimentocirurgico/" },
    ],
  },
  {
    key: "human_resources",
    label: "Recursos Humanos",
    resources: [
      { key: "cargo", label: "Cargos", endpoint: "/human_resources/role/", adminListHref: "/admin/human-resources/jobtitle/" },
      { key: "funcionario", label: "Funcionários", endpoint: "/human_resources/employee/", adminListHref: "/admin/human-resources/employee/" },
      { key: "agregadofamiliar", label: "Agregados Familiares", endpoint: "/human_resources/agregadofamiliar/", adminListHref: "/admin/human-resources/familydependent/" },
      { key: "horario", label: "Horários", endpoint: "/human_resources/horario/", adminListHref: "/admin/human-resources/workschedule/" },
      { key: "falta", label: "Faltas", endpoint: "/human_resources/falta/", adminListHref: "/admin/human-resources/absence/" },
      { key: "ferias", label: "Férias", endpoint: "/human_resources/ferias/", adminListHref: "/admin/human-resources/vacation/" },
      { key: "dispensa", label: "Dispensas", endpoint: "/human_resources/dispensa/", adminListHref: "/admin/human-resources/termination/" },
      { key: "horaextra", label: "Horas Extras", endpoint: "/human_resources/horaextra/", adminListHref: "/admin/human-resources/overtime/" },
      { key: "folhapagamento", label: "Folhas de Pagamento", endpoint: "/human_resources/folhapagamento/", adminListHref: "/admin/human-resources/payroll/" },
    ],
  },
  {
    key: "monitoring",
    label: "Monitoramento",
    resources: [
      { key: "error", label: "Erros do Sistema", endpoint: "/monitoring/error/", adminListHref: "/admin/monitoring/systemerror/" },
    ],
  },
  {
    key: "ai_assistant",
    label: "IA Operacional",
    resources: [
      { key: "ai_session", label: "Sessões da IA", endpoint: "/ai_assistant/ai-sessions/", adminListHref: "/admin/ai_assistant/aisession/" },
      { key: "ai_investigation", label: "Investigações da IA", endpoint: "/ai_assistant/ai-investigations/", adminListHref: "/admin/ai_assistant/aiinvestigation/" },
      { key: "ai_operational_task", label: "Tarefas Operacionais da IA", endpoint: "/ai_assistant/ai-operational-tasks/", adminListHref: "/admin/ai_assistant/aioperationaltask/" },
      { key: "ai_tools", label: "Ferramentas da IA", endpoint: "/ai/assistant/tools/" },
    ],
  },
]

const ADMIN_LIST_BY_ENDPOINT: Record<string, string> = {
  // Clinical
  "/clinical/patient/": "/admin/clinical/patient/",
  "/clinical/exam/": "/admin/clinical/labexam/",
  "/clinical/medicalexam/": "/admin/clinical/medicalexam/",
  "/clinical/examfield/": "/admin/clinical/labexamfield/",
  "/clinical/labrequest/": "/admin/clinical/labrequest/",
  "/clinical/resultitem/": "/admin/clinical/result/",
  "/clinical/result/": "/admin/clinical/result/",
  // Equipment
  "/equipment/equipment/": "/admin/equipment/equipment/",
  "/equipment/daily_inspection/": "/admin/inspections/dailyinspection/",
  "/maintenance/maintenance/": "/admin/maintenance/maintenance/",
  "/equipment/incident/": "/admin/incidents/incident/",
  // External entities
  "/entities/company/": "/admin/externall-entities/company/",
  "/external_entities/empresa/": "/admin/externall-entities/company/",
  "/externall_entities/empresa/": "/admin/externall-entities/company/",
  "/externall_entities/company/": "/admin/externall-entities/company/",
  // Billing
  "/billing/invoice/": "/admin/billing/invoice/",
  // Pharmacy
  "/pharmacy/product/": "/admin/pharmacy/product/",
  "/pharmacy/lot/": "/admin/pharmacy/lot/",
  "/pharmacy/inventory_movement/": "/admin/pharmacy/inventorymovement/",
  "/pharmacy/sale/": "/admin/pharmacy/sale/",
  "/pharmacy/sale_item/": "/admin/pharmacy/saleitem/",
  "/pharmacy/material_requisition/": "/admin/pharmacy/materialrequisition/",
  "/pharmacy/material_requisition_item/": "/admin/pharmacy/materialrequisitionitem/",
  // ERP/WMS
  "/warehouse/warehouse/": "/admin/warehouse/warehouse/",
  "/warehouse/storage_location/": "/admin/warehouse/storagelocation/",
  "/warehouse/item_category/": "/admin/warehouse/warehouseitemcategory/",
  "/warehouse/item/": "/admin/warehouse/warehouseitem/",
  "/warehouse/lot/": "/admin/warehouse/warehouselot/",
  "/warehouse/stock_level/": "/admin/warehouse/stocklevel/",
  "/warehouse/stock_movement/": "/admin/warehouse/stockmovement/",
  "/warehouse/replenishment_plan/": "/admin/warehouse/replenishmentplan/",
  "/warehouse/replenishment_suggestion/": "/admin/warehouse/replenishmentsuggestion/",
  "/warehouse/sales_order/": "/admin/warehouse/salesorder/",
  "/warehouse/sales_order_line/": "/admin/warehouse/salesorderline/",
  "/warehouse/stock_reservation/": "/admin/warehouse/stockreservation/",
  "/warehouse/pick_list/": "/admin/warehouse/picklist/",
  "/warehouse/pick_list_line/": "/admin/warehouse/picklistline/",
  "/warehouse/shipment/": "/admin/warehouse/shipment/",
  "/warehouse/shipment_line/": "/admin/warehouse/shipmentline/",
  "/warehouse/purchase_order/": "/admin/warehouse/purchaseorder/",
  "/warehouse/purchase_order_line/": "/admin/warehouse/purchaseorderline/",
  "/warehouse/goods_receipt/": "/admin/warehouse/goodsreceipt/",
  "/warehouse/goods_receipt_line/": "/admin/warehouse/goodsreceiptline/",
  "/warehouse/stock_transfer/": "/admin/warehouse/stocktransfer/",
  "/warehouse/stock_transfer_line/": "/admin/warehouse/stocktransferline/",
  "/warehouse/cycle_count/": "/admin/warehouse/cyclecount/",
  "/warehouse/cycle_count_line/": "/admin/warehouse/cyclecountline/",
  // Bloodbank
  "/bloodbank/donation/": "/admin/bloodbank/blooddonation/",
  "/bloodbank/unit/": "/admin/bloodbank/bloodunit/",
  "/bloodbank/transfusion/": "/admin/bloodbank/bloodtransfusion/",
  "/bloodbank/storage/": "/admin/bloodbank/bloodstorage/",
  "/bloodbank/stock_movement/": "/admin/bloodbank/bloodstockmovement/",
  "/bloodbank/storage_maintenance/": "/admin/bloodbank/bloodstoragemaintenance/",
  // Nursing
  "/nursing/procedure/": "/admin/nursing/procedure/",
  "/nursing/procedure_catalog/": "/admin/nursing/procedurecatalog/",
  "/nursing/procedure_catalog_material/": "/admin/nursing/procedurecatalogmaterial/",
  "/nursing/procedure_item/": "/admin/nursing/procedureitem/",
  "/nursing/procedure_item_value/": "/admin/nursing/procedureitemvalue/",
  "/nursing/procedure_material/": "/admin/nursing/procedurematerial/",
  "/nursing/procedure_material_value/": "/admin/nursing/procedurematerialvalue/",
  "/nursing/nursing_record/": "/admin/nursing/nursingrecord/",
  "/nursing/nursing_vital_sign/": "/admin/nursing/nursingvitalsign/",
  // Insurer
  "/seguradora/seguradora/": "/admin/insurer/insurer/",
  "/seguradora/planocobertura/": "/admin/insurer/coverageplan/",
  "/seguradora/autorizacaoprocedimento/": "/admin/insurer/procedureauthorization/",
  "/insurer/insurer/": "/admin/insurer/insurer/",
  "/insurer/planocobertura/": "/admin/insurer/coverageplan/",
  "/insurer/autorizacaoprocedimento/": "/admin/insurer/procedureauthorization/",
  // Accounting
  "/accounting/account/": "/admin/accounting/account/",
  "/accounting/entry/": "/admin/accounting/legacyentry/",
  "/accounting/movement/": "/admin/accounting/legacymovement/",
  "/accounting/financialreconciliation/": "/admin/accounting/financialreconciliation/",
  // Consultations
  "/consultations/consultation/": "/admin/consultations/medicalconsultation/",
  "/consultations/doctors/": "/admin/human-resources/employee/",
  "/consultations/specialty/": "/admin/consultations/consultationspecialty/",
  "/consultations/holiday/": "/admin/consultations/holiday/",
  // Education
  "/education/student/": "/admin/education/studentprofile/",
  "/education/teacher/": "/admin/education/teacherprofile/",
  "/education/course/": "/admin/education/course/",
  "/education/classroom/": "/admin/education/classroom/",
  "/education/enrollment/": "/admin/education/enrollment/",
  "/education/attendance/": "/admin/education/attendancerecord/",
  "/education/grade/": "/admin/education/graderecord/",
  "/education/examination/": "/admin/education/examination/",
  "/education/random_test/": "/admin/education/randomtest/",
  "/education/assignment/": "/admin/education/assignment/",
  "/education/submission/": "/admin/education/assignmentsubmission/",
  "/education/exam_attempt/": "/admin/education/examinationattempt/",
  "/education/examination_attempt/": "/admin/education/examinationattempt/",
  "/education/content/": "/admin/education/learningcontent/",
  "/education/bibliography/": "/admin/education/learningcontent/",
  "/education/thematic_map/": "/admin/education/learningcontent/",
  "/education/skill/": "/admin/education/skill/",
  // Tenants
  "/inquilinos/inquilino/": "/admin/tenants/tenant/",
  "/inquilinos/configuracaoinquilino/": "/admin/tenants/tenantconfiguration/",
  "/tenants/tenant/": "/admin/tenants/tenant/",
  "/tenants/planoassinatura/": "/admin/tenants/subscriptionplan/",
  "/tenants/usotenant/": "/admin/tenants/tenantusage/",
  "/tenants/featureflagtenant/": "/admin/tenants/tenantfeatureflag/",
  "/tenants/configuracaoinquilino/": "/admin/tenants/tenantconfiguration/",
  "/tenants/tenantconfiguration/": "/admin/tenants/tenantconfiguration/",
  // Notifications
  "/notifications/notificacao/": "/admin/notifications/notification/",
  "/notifications/logenvio/": "/admin/notifications/deliverylog/",
  "/notifications/notification/": "/admin/notifications/notification/",
  "/notifications/deliverylog/": "/admin/notifications/deliverylog/",
  // Identity
  "/identidade/usuario/": "/admin/identity/user/",
  "/identity/user/": "/admin/identity/user/",
  // Medical records
  "/medical-records/registro/": "/admin/medical-records/medicalrecordentry/",
  "/medical-records/prescricaoitem/": "/admin/medical-records/prescriptionitem/",
  "/medical_records/record/": "/admin/medical-records/medicalrecordentry/",
  "/medical_records/prescricaoitem/": "/admin/medical-records/prescriptionitem/",
  // Maternity
  "/maternity/gestacao/": "/admin/maternity/pregnancy/",
  // Surgery
  "/surgery/pequenacirurgia/": "/admin/surgery/smallsurgery/",
  "/surgery/grandecirurgia/": "/admin/surgery/largesurgery/",
  "/surgery/surgery/": "/admin/surgery/surgery/",
  "/surgery/procedimentocirurgico/": "/admin/surgery/surgicalprocedure/",
  // Human resources
  "/resources_humanos/cargo/": "/admin/human-resources/jobtitle/",
  "/resources_humanos/funcionario/": "/admin/human-resources/employee/",
  "/resources_humanos/agregadofamiliar/": "/admin/human-resources/familydependent/",
  "/resources_humanos/horario/": "/admin/human-resources/workschedule/",
  "/resources_humanos/falta/": "/admin/human-resources/absence/",
  "/resources_humanos/ferias/": "/admin/human-resources/vacation/",
  "/resources_humanos/dispensa/": "/admin/human-resources/termination/",
  "/resources_humanos/horaextra/": "/admin/human-resources/overtime/",
  "/resources_humanos/folhapagamento/": "/admin/human-resources/payroll/",
  "/human_resources/role/": "/admin/human-resources/jobtitle/",
  "/human_resources/employee/": "/admin/human-resources/employee/",
  "/human_resources/agregadofamiliar/": "/admin/human-resources/familydependent/",
  "/human_resources/horario/": "/admin/human-resources/workschedule/",
  "/human_resources/falta/": "/admin/human-resources/absence/",
  "/human_resources/ferias/": "/admin/human-resources/vacation/",
  "/human_resources/dispensa/": "/admin/human-resources/termination/",
  "/human_resources/horaextra/": "/admin/human-resources/overtime/",
  "/human_resources/folhapagamento/": "/admin/human-resources/payroll/",
  // Monitoring
  "/monitoring/erro/": "/admin/monitoring/systemerror/",
  "/monitoring/error/": "/admin/monitoring/systemerror/",
  // Operational AI
  "/ai_assistant/ai-sessions/": "/admin/ai_assistant/aisession/",
  "/ai_assistant/ai-investigations/": "/admin/ai_assistant/aiinvestigation/",
  "/ai_assistant/ai-operational-tasks/": "/admin/ai_assistant/aioperationaltask/",
  "/ai/assistant/sessions/": "/admin/ai_assistant/aisession/",
  "/ai/assistant/investigations/": "/admin/ai_assistant/aiinvestigation/",
  "/ai/assistant/tasks/": "/admin/ai_assistant/aioperationaltask/",
}

function inferAdminListHref(endpoint: string): string | undefined {
  return ADMIN_LIST_BY_ENDPOINT[normalizeEndpoint(endpoint)]
}

function applyAdminHrefOverrides(modules: ModuleGroup[]): ModuleGroup[] {
  return modules.map((group) => ({
    ...group,
    resources: group.resources.map((resource) => {
      const inferred = inferAdminListHref(resource.endpoint)
      if (!inferred) return { ...resource }
      return { ...resource, adminListHref: inferred }
    }),
  }))
}

export const MODULES: ModuleGroup[] = applyAdminHrefOverrides(MODULES_BASE)

const GROUP_KEY_ALIASES: Record<string, string> = {
  clinical: "clinical",
  clinico: "clinical",
  reception: "reception",
  recepcao: "reception",
  equipment: "equipment",
  equipamentos: "equipment",
  maintenance: "equipment",
  manutencoes: "equipment",
  manutenções: "equipment",
  incidents: "equipment",
  ocorrencias: "equipment",
  ocorrências: "equipment",
  external_entities: "entities",
  entities: "entities",
  entidades: "entities",
  billing: "billing",
  faturamento: "billing",
  payments: "payments",
  pagamentos: "payments",
  pharmacy: "pharmacy",
  farmacia: "pharmacy",
  warehouse: "warehouse",
  armazem: "warehouse",
  armazém: "warehouse",
  wms: "warehouse",
  erp: "warehouse",
  nursing: "nursing",
  enfermagem: "nursing",
  medical_records: "medical_records",
  prontuario: "medical_records",
  maternity: "maternity",
  maternidade: "maternity",
  surgery: "surgery",
  cirurgia: "surgery",
  human_resources: "human_resources",
  recursos_humanos: "human_resources",
  consultations: "consultations",
  consultas: "consultations",
  education: "education",
  educacao: "education",
  educação: "education",
  accounting: "accounting",
  contabilidade: "accounting",
  notifications: "notifications",
  notificacoes: "notifications",
  monitoring: "monitoring",
  monitoramento: "monitoring",
  ai: "ai_assistant",
  ia: "ai_assistant",
  ai_assistant: "ai_assistant",
  ia_operacional: "ai_assistant",
  operational_ai: "ai_assistant",
  insurer: "insurer",
  seguradora: "insurer",
  tenants: "tenants",
  inquilinos: "tenants",
  identity: "identity",
  identidade: "identity",
  bloodbank: "bloodbank",
}

function normalizeResourceKey(value: string): string {
  return (value || "").trim().toLocaleLowerCase().replace(/-/g, "_")
}

function normalizeEndpoint(endpoint: string): string {
  const trimmed = (endpoint || "").trim()
  if (!trimmed) return "/"
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`
}

function titleFromSlug(slug: string): string {
  return slug
    .split(/[_-]+/)
    .filter(Boolean)
    .map((piece) => piece.charAt(0).toLocaleUpperCase() + piece.slice(1))
    .join(" ")
}

function getResourceSegment(endpoint: string): string {
  const parts = normalizeEndpoint(endpoint).split("/").filter(Boolean)
  return parts[1] || ""
}

function parseApiRootPath(raw: string): string {
  const input = (raw || "").trim()
  if (!input) return ""

  let pathname = input
  if (/^https?:\/\//i.test(input)) {
    try {
      pathname = new URL(input).pathname
    } catch {
      pathname = input
    }
  }

  return pathname
    .replace(/^\/+/, "")
    .replace(/^api\/v1\/?/, "")
    .replace(/\/+$/, "")
}

function cloneModules(modules: ModuleGroup[]): ModuleGroup[] {
  return modules.map((group) => ({
    ...group,
    resources: group.resources.map((resource) => ({ ...resource })),
  }))
}

export function canonicalModuleGroupKey(groupKey: string): string {
  const normalized = (groupKey || "")
    .trim()
    .toLocaleLowerCase()
    .replace(/-/g, "_")
  return GROUP_KEY_ALIASES[normalized] || normalized
}

export function discoverModulesFromApiRoot(
  apiRoot: Record<string, unknown>
): ModuleGroup[] {
  if (!apiRoot || typeof apiRoot !== "object") return []

  const staticByEndpoint = new Map<
    string,
    { group: ModuleGroup; resource: ModuleResource }
  >()
  MODULES.forEach((group) => {
    group.resources.forEach((resource) => {
      staticByEndpoint.set(normalizeEndpoint(resource.endpoint), {
        group,
        resource,
      })
    })
  })

  const grouped = new Map<string, ModuleGroup>()

  for (const [entryKey, entryValue] of Object.entries(apiRoot)) {
    const routeFromValue =
      typeof entryValue === "string" ? parseApiRootPath(entryValue) : ""
    const route = routeFromValue || parseApiRootPath(entryKey)
    if (!route) continue

    const parts = route.split("/").filter(Boolean)
    if (parts.length !== 2) continue
    if (parts.some((part) => part.includes("{") || part.includes("}"))) continue

    const [backendGroup, resourceSegment] = parts
    const groupKey = canonicalModuleGroupKey(backendGroup)
    const endpoint = normalizeEndpoint(`/${backendGroup}/${resourceSegment}/`)
    const staticMatch = staticByEndpoint.get(endpoint)

    const resource: ModuleResource = staticMatch
      ? { ...staticMatch.resource, endpoint }
      : {
          key: normalizeResourceKey(resourceSegment),
          label: titleFromSlug(resourceSegment),
          endpoint,
          adminListHref: inferAdminListHref(endpoint),
        }

    let group = grouped.get(groupKey)
    if (!group) {
      const staticGroup = MODULES.find((item) => item.key === groupKey)
      group = {
        key: groupKey,
        label: staticGroup?.label || staticMatch?.group.label || titleFromSlug(groupKey),
        resources: [],
      }
      grouped.set(groupKey, group)
    }

    const exists = group.resources.some(
      (item) =>
        normalizeResourceKey(item.key) === normalizeResourceKey(resource.key) ||
        normalizeEndpoint(item.endpoint) === endpoint
    )
    if (!exists) {
      group.resources.push(resource)
    }
  }

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      resources: group.resources.sort((a, b) =>
        a.label.localeCompare(b.label, "pt")
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt"))
}

export function discoverModulesFromOpenApiSchema(
  openApiSchema: Record<string, any> | null | undefined = schema as Record<string, any>
): ModuleGroup[] {
  const paths = (openApiSchema as any)?.paths
  if (!paths || typeof paths !== "object") return []

  const staticByEndpoint = new Map<
    string,
    { group: ModuleGroup; resource: ModuleResource }
  >()
  MODULES.forEach((group) => {
    group.resources.forEach((resource) => {
      staticByEndpoint.set(normalizeEndpoint(resource.endpoint), {
        group,
        resource,
      })
    })
  })

  const grouped = new Map<string, ModuleGroup>()

  for (const [rawPath, methods] of Object.entries(paths)) {
    if (typeof rawPath !== "string" || !rawPath.startsWith("/api/v1/")) continue

    const route = rawPath.replace(/^\/api\/v1\//, "").replace(/\/+$/, "")
    const parts = route.split("/").filter(Boolean)
    if (parts.length !== 2) continue
    if (parts.some((part) => part.includes("{") || part.includes("}"))) continue

    const ops = methods && typeof methods === "object" ? (methods as Record<string, unknown>) : {}
    if (!ops.get && !ops.post && !ops.put && !ops.patch && !ops.delete) continue

    const [backendGroup, resourceSegment] = parts
    const groupKey = canonicalModuleGroupKey(backendGroup)
    const endpoint = normalizeEndpoint(`/${backendGroup}/${resourceSegment}/`)
    const staticMatch = staticByEndpoint.get(endpoint)

    const resource: ModuleResource = staticMatch
      ? { ...staticMatch.resource, endpoint }
      : {
          key: normalizeResourceKey(resourceSegment),
          label: titleFromSlug(resourceSegment),
          endpoint,
          adminListHref: inferAdminListHref(endpoint),
        }

    let group = grouped.get(groupKey)
    if (!group) {
      const staticGroup = MODULES.find((item) => item.key === groupKey)
      group = {
        key: groupKey,
        label:
          staticGroup?.label ||
          staticMatch?.group.label ||
          titleFromSlug(groupKey),
        resources: [],
      }
      grouped.set(groupKey, group)
    }

    const exists = group.resources.some(
      (item) =>
        normalizeResourceKey(item.key) === normalizeResourceKey(resource.key) ||
        normalizeEndpoint(item.endpoint) === endpoint
    )
    if (!exists) {
      group.resources.push(resource)
    }
  }

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      resources: group.resources.sort((a, b) =>
        a.label.localeCompare(b.label, "pt")
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt"))
}

export function mergeModules(
  baseModules: ModuleGroup[],
  discoveredModules: ModuleGroup[]
): ModuleGroup[] {
  const merged = cloneModules(baseModules)
  const byGroupKey = new Map<string, ModuleGroup>(
    merged.map((group) => [group.key, group])
  )

  discoveredModules.forEach((incomingGroup) => {
    const canonicalGroupKey = canonicalModuleGroupKey(incomingGroup.key)
    let target = byGroupKey.get(canonicalGroupKey)

    if (!target) {
      target = {
        key: canonicalGroupKey,
        label: incomingGroup.label || titleFromSlug(canonicalGroupKey),
        resources: [],
      }
      merged.push(target)
      byGroupKey.set(canonicalGroupKey, target)
    }

    incomingGroup.resources.forEach((incomingResource) => {
      const incomingEndpoint = normalizeEndpoint(incomingResource.endpoint)
      const incomingKey = normalizeResourceKey(incomingResource.key)

      const existing = target!.resources.find(
        (item) =>
          normalizeResourceKey(item.key) === incomingKey ||
          normalizeEndpoint(item.endpoint) === incomingEndpoint
      )

      if (existing) {
        existing.endpoint = incomingEndpoint
        if (!existing.label && incomingResource.label) {
          existing.label = incomingResource.label
        }
        if (!existing.adminListHref) {
          existing.adminListHref =
            incomingResource.adminListHref || inferAdminListHref(incomingEndpoint)
        }
        return
      }

      const inferredAdminHref =
        incomingResource.adminListHref || inferAdminListHref(incomingEndpoint)

      const existingByAdminHref =
        inferredAdminHref
          ? target!.resources.find(
              (item) =>
                !!item.adminListHref &&
                item.adminListHref.toLocaleLowerCase() ===
                  inferredAdminHref.toLocaleLowerCase()
            )
          : undefined

      if (existingByAdminHref) {
        existingByAdminHref.endpoint = incomingEndpoint
        if (!existingByAdminHref.label && incomingResource.label) {
          existingByAdminHref.label = incomingResource.label
        }
        if (!existingByAdminHref.adminListHref) {
          existingByAdminHref.adminListHref = inferredAdminHref
        }
        return
      }

      target!.resources.push({
        ...incomingResource,
        endpoint: incomingEndpoint,
        ...(inferredAdminHref ? { adminListHref: inferredAdminHref } : {}),
      })
    })
  })

  return merged.map((group) => ({
    ...group,
    resources: group.resources
      .slice()
      .sort((a, b) => a.label.localeCompare(b.label, "pt")),
  }))
}

export function findModuleGroup(
  key: string,
  modules: ModuleGroup[] = MODULES
): ModuleGroup | undefined {
  const canonicalKey = canonicalModuleGroupKey(key)
  return modules.find((module) => module.key === canonicalKey)
}

export function findModuleResource(
  groupKey: string,
  resourceKey: string,
  modules: ModuleGroup[] = MODULES
): { group: ModuleGroup; resource: ModuleResource } | null {
  const group = findModuleGroup(groupKey, modules)
  if (!group) return null

  const normalizedResourceKey = normalizeResourceKey(resourceKey)
  const resource =
    group.resources.find(
      (item) => normalizeResourceKey(item.key) === normalizedResourceKey
    ) ||
    group.resources.find(
      (item) =>
        normalizeResourceKey(getResourceSegment(item.endpoint)) ===
        normalizedResourceKey
    )

  if (!resource) return null
  return { group, resource }
}

