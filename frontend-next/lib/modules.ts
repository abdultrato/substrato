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
      { key: "equipamento", label: "Equipamentos", endpoint: "/equipamentos/equipamento/", adminListHref: "/admin/equipamentos/equipamento/" },
      { key: "inspecaodiaria", label: "Inspeções Diárias", endpoint: "/equipamentos/inspecaodiaria/", adminListHref: "/admin/inspecoes/inspecaodiaria/" },
      { key: "manutencao", label: "Manutenções", endpoint: "/equipamentos/manutencao/", adminListHref: "/admin/manutencoes/manutencao/" },
      { key: "ocorrencia", label: "Ocorrências", endpoint: "/equipamentos/ocorrencia/", adminListHref: "/admin/ocorrencias/ocorrencia/" },
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
      { key: "produto", label: "Produtos", endpoint: "/pharmacy/produto/", adminListHref: "/admin/pharmacy/produto/" },
      { key: "lote", label: "Lotes", endpoint: "/pharmacy/lote/", adminListHref: "/admin/pharmacy/lote/" },
      { key: "movimentoestoque", label: "Movimentos de Estoque", endpoint: "/pharmacy/movimentoestoque/", adminListHref: "/admin/pharmacy/movimentoestoque/" },
      { key: "venda", label: "Vendas", endpoint: "/pharmacy/venda/", adminListHref: "/admin/pharmacy/venda/" },
      { key: "itemvenda", label: "Itens de Venda", endpoint: "/pharmacy/itemvenda/", adminListHref: "/admin/pharmacy/itemvenda/" },
    ],
  },
  {
    key: "bloodbank",
    label: "Banco de Sangue",
    resources: [
      { key: "doacao", label: "Doações", endpoint: "/bloodbank/doacao/", adminListHref: "/admin/bloodbank/blooddonation/" },
      { key: "unidade", label: "Unidades", endpoint: "/bloodbank/unidade/", adminListHref: "/admin/bloodbank/bloodunit/" },
      { key: "transfusao", label: "Transfusões", endpoint: "/bloodbank/transfusao/", adminListHref: "/admin/bloodbank/bloodtransfusion/" },
      { key: "armazenamento", label: "Armazenamentos", endpoint: "/bloodbank/armazenamento/", adminListHref: "/admin/bloodbank/bloodstorage/" },
      { key: "movimentoestoque", label: "Movimentos", endpoint: "/bloodbank/movimentoestoque/", adminListHref: "/admin/bloodbank/bloodstockmovement/" },
      { key: "manutencaoarmazenamento", label: "Manutenções", endpoint: "/bloodbank/manutencaoarmazenamento/", adminListHref: "/admin/bloodbank/bloodstoragemaintenance/" },
    ],
  },
  {
    key: "nursing",
    label: "Enfermagem",
    resources: [
      { key: "evolucaoenfermagem", label: "Evoluções", endpoint: "/nursing/evolucaoenfermagem/" },
      { key: "procedimento", label: "Procedimentos", endpoint: "/nursing/procedimento/", adminListHref: "/admin/nursing/procedimento/" },
      { key: "procedimentocatalogo", label: "Catálogo", endpoint: "/nursing/procedimentocatalogo/", adminListHref: "/admin/nursing/procedimentocatalogo/" },
      { key: "procedimentocatalogomaterial", label: "Materiais do Catálogo", endpoint: "/nursing/procedimentocatalogomaterial/", adminListHref: "/admin/nursing/procedimentocatalogomaterial/" },
      { key: "procedimentoitem", label: "Itens do Procedimento", endpoint: "/nursing/procedimentoitem/", adminListHref: "/admin/nursing/procedimentoitem/" },
      { key: "procedimentoitemvalor", label: "Valores do Item", endpoint: "/nursing/procedimentoitemvalor/", adminListHref: "/admin/nursing/procedimentoitemvalor/" },
      { key: "procedimentomaterial", label: "Materiais do Procedimento", endpoint: "/nursing/procedimentomaterial/", adminListHref: "/admin/nursing/procedimentomaterial/" },
      { key: "procedimentomaterialvalor", label: "Valores do Material", endpoint: "/nursing/procedimentomaterialvalor/", adminListHref: "/admin/nursing/procedimentomaterialvalor/" },
      { key: "prescricaoenfermagem", label: "Prescrições", endpoint: "/nursing/prescricaoenfermagem/" },
      { key: "registroenfermagem", label: "Registros", endpoint: "/nursing/registroenfermagem/", adminListHref: "/admin/nursing/registroenfermagem/" },
      { key: "sinalvitalenfermagem", label: "Sinais Vitais", endpoint: "/nursing/sinalvitalenfermagem/", adminListHref: "/admin/nursing/sinalvitalenfermagem/" },
      { key: "enfermaria", label: "Enfermarias", endpoint: "/nursing/ward/" },
      { key: "camaenfermaria", label: "Camas (Enfermaria)", endpoint: "/nursing/camaenfermaria/" },
      { key: "internamentoenfermaria", label: "Internamentos (Enfermaria)", endpoint: "/nursing/internamentoenfermaria/" },
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
      { key: "assignment", label: "Trabalhos", endpoint: "/education/assignment/", adminListHref: "/admin/education/assignment/" },
      { key: "submission", label: "Submissões", endpoint: "/education/submission/", adminListHref: "/admin/education/assignmentsubmission/" },
      { key: "exam_attempt", label: "Tentativas de Exame", endpoint: "/education/exam_attempt/", adminListHref: "/admin/education/examinationattempt/" },
      { key: "content", label: "Conteúdos de Aprendizagem", endpoint: "/education/content/", adminListHref: "/admin/education/learningcontent/" },
      { key: "skill", label: "Skills", endpoint: "/education/skill/", adminListHref: "/admin/education/skill/" },
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
  "/equipamentos/equipamento/": "/admin/equipment/equipment/",
  "/equipment/equipment/": "/admin/equipment/equipment/",
  "/equipamentos/inspecaodiaria/": "/admin/inspections/dailyinspection/",
  "/equipment/daily_inspection/": "/admin/inspections/dailyinspection/",
  "/equipamentos/manutencao/": "/admin/maintenance/maintenance/",
  "/equipment/maintenance/": "/admin/maintenance/maintenance/",
  "/equipamentos/ocorrencia/": "/admin/incidents/incident/",
  "/equipment/incident/": "/admin/incidents/incident/",
  // External entities
  "/entities/company/": "/admin/externall-entities/company/",
  "/external_entities/empresa/": "/admin/externall-entities/company/",
  "/externall_entities/empresa/": "/admin/externall-entities/company/",
  "/externall_entities/company/": "/admin/externall-entities/company/",
  // Billing
  "/billing/invoice/": "/admin/billing/invoice/",
  // Pharmacy
  "/pharmacy/produto/": "/admin/pharmacy/product/",
  "/pharmacy/lote/": "/admin/pharmacy/lot/",
  "/pharmacy/movimentoestoque/": "/admin/pharmacy/inventorymovement/",
  "/pharmacy/venda/": "/admin/pharmacy/sale/",
  "/pharmacy/itemvenda/": "/admin/pharmacy/saleitem/",
  "/pharmacy/product/": "/admin/pharmacy/product/",
  "/pharmacy/lot/": "/admin/pharmacy/lot/",
  "/pharmacy/sale/": "/admin/pharmacy/sale/",
  // Bloodbank
  "/bloodbank/doacao/": "/admin/bloodbank/blooddonation/",
  "/bloodbank/unidade/": "/admin/bloodbank/bloodunit/",
  "/bloodbank/transfusao/": "/admin/bloodbank/bloodtransfusion/",
  "/bloodbank/armazenamento/": "/admin/bloodbank/bloodstorage/",
  "/bloodbank/movimentoestoque/": "/admin/bloodbank/bloodstockmovement/",
  "/bloodbank/manutencaoarmazenamento/": "/admin/bloodbank/bloodstoragemaintenance/",
  // Nursing
  "/nursing/procedimento/": "/admin/nursing/procedure/",
  "/nursing/procedimentocatalogo/": "/admin/nursing/procedurecatalog/",
  "/nursing/procedimentocatalogomaterial/": "/admin/nursing/procedurecatalogmaterial/",
  "/nursing/procedimentoitem/": "/admin/nursing/procedureitem/",
  "/nursing/procedimentoitemvalor/": "/admin/nursing/procedureitemvalue/",
  "/nursing/procedimentomaterial/": "/admin/nursing/procedurematerial/",
  "/nursing/procedimentomaterialvalor/": "/admin/nursing/procedurematerialvalue/",
  "/nursing/registroenfermagem/": "/admin/nursing/nursingrecord/",
  "/nursing/sinalvitalenfermagem/": "/admin/nursing/nursingvitalsign/",
  "/nursing/procedure/": "/admin/nursing/procedure/",
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
  "/education/assignment/": "/admin/education/assignment/",
  "/education/submission/": "/admin/education/assignmentsubmission/",
  "/education/exam_attempt/": "/admin/education/examinationattempt/",
  "/education/examination_attempt/": "/admin/education/examinationattempt/",
  "/education/content/": "/admin/education/learningcontent/",
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
  external_entities: "entities",
  entities: "entities",
  entidades: "entities",
  billing: "billing",
  faturamento: "billing",
  payments: "payments",
  pagamentos: "payments",
  pharmacy: "pharmacy",
  farmacia: "pharmacy",
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
  insurer: "insurer",
  seguradora: "insurer",
  tenants: "tenants",
  inquilinos: "tenants",
  identity: "identity",
  identidade: "identity",
  bloodbank: "bloodbank",
  banco_sangue: "bloodbank",
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

