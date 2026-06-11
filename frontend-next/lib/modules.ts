import schema from "@/schema.generated.json"
import { translateRuntimeText } from "@/lib/i18nRuntime"

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

const GROUP_LABEL_PT_BY_KEY: Record<string, string> = {
  accounting: "Contabilidade",
  ai_assistant: "IA Operacional",
  audit: "Auditoria",
  billing: "Faturação",
  bloodbank: "Banco de Sangue",
  clinical: "Área Clínica",
  clinical_pharmacy: "Farmácia Clínica e Terapia IV",
  consultations: "Consultas",
  credit_financing: "Créditos e Financiamento",
  dashboard: "Painel",
  dental: "Odontologia",
  education: "Educação",
  entities: "Entidades",
  equipment: "Equipamentos",
  equipment_integrations: "Integrações de Equipamentos",
  physiotherapy: "Fisioterapia e Reabilitação",
  pathology: "Patologia",
  radiology: "Radiologia e Imagiologia",
  specialty_diagnostics: "Diagnósticos Especializados",
  therapy: "Terapias Ocupacionais e Especializadas",
  human_resources: "Recursos Humanos",
  identity: "Identidade",
  insurer: "Seguradora",
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
  telemedicine: "Telemedicina e Monitoramento Remoto",
  public_health: "Imunização e Saúde Pública",
  transportation: "Transporte e Logística",
  veterinary: "Medicina Veterinária",
  warehouse: "ERP e WMS",
}

const RESOURCE_LABEL_PT_BY_KEY: Record<string, string> = {
  audit: "Auditoria",
  user_audit: "Auditoria de Utilizador",
  user_activity: "Actividades de Utilizador",
  workspace: "Área de trabalho",
}

// Single source of truth for the Django apps currently exposed under /api/v1.
const MODULES_BASE: ModuleGroup[] = [
  {
    key: "audit",
    label: "Auditoria",
    resources: [
      { key: "atividade", label: "Actividades", endpoint: "/audit/atividade/", adminListHref: "/admin/auditoria_atividades/useractivity/" },
      { key: "usuarios", label: "Utilizadores Auditados", endpoint: "/audit/usuarios/", adminListHref: "/admin/identity/user/" },
    ],
  },
  {
    key: "clinical",
    label: "Área Clínica",
    resources: [
      { key: "paciente", label: "Paciente", endpoint: "/clinical/patient/", adminListHref: "/admin/clinico/patient/" },
      { key: "exame", label: "Exame", endpoint: "/clinical/exam/", adminListHref: "/admin/clinico/labexam/" },
      { key: "examemedico", label: "Exame Médico", endpoint: "/clinical/medicalexam/", adminListHref: "/admin/clinico/medicalexam/" },
      { key: "examecampo", label: "Campo de Exame", endpoint: "/clinical/examfield/", adminListHref: "/admin/clinico/labexamfield/" },
      { key: "examemedicocampo", label: "Campo de Exame Médico", endpoint: "/clinical/medicalexamfield/" },
      { key: "requisicaoanalise", label: "Requisição", endpoint: "/clinical/labrequest/", adminListHref: "/admin/clinico/labrequest/" },
      { key: "requisicaoitem", label: "Item de Requisição", endpoint: "/clinical/labrequestitem/" },
      { key: "resultadoitem", label: "Resultado", endpoint: "/clinical/resultitem/" },
      { key: "medicalresultfile", label: "Ficheiro de Resultado Médico", endpoint: "/clinical/medicalresultfile/" },
      { key: "sample", label: "Amostra", endpoint: "/clinical/sample/" },
    ],
  },
  {
    key: "clinical_pharmacy",
    label: "Farmácia Clínica e Terapia IV",
    resources: [
      { key: "preparation", label: "Preparações IV", endpoint: "/clinical_pharmacy/preparation/", adminListHref: "/admin/farmacia_clinica/clinicalpharmacyivpreparation/" },
      { key: "ingredient", label: "Ingredientes IV", endpoint: "/clinical_pharmacy/ingredient/", adminListHref: "/admin/farmacia_clinica/clinicalpharmacyingredient/" },
      { key: "interaction_rule", label: "Regras de Interação", endpoint: "/clinical_pharmacy/interaction_rule/", adminListHref: "/admin/farmacia_clinica/druginteractionrule/" },
      { key: "interaction_check", label: "Verificações de Interação", endpoint: "/clinical_pharmacy/interaction_check/", adminListHref: "/admin/farmacia_clinica/medicationinteractioncheck/" },
      { key: "controlled_movement", label: "Substâncias Controladas", endpoint: "/clinical_pharmacy/controlled_movement/", adminListHref: "/admin/farmacia_clinica/controlledsubstancemovement/" },
      { key: "antibiotic_review", label: "Stewardship Antibiótico", endpoint: "/clinical_pharmacy/antibiotic_review/", adminListHref: "/admin/farmacia_clinica/antibioticstewardshipreview/" },
    ],
  },
  {
    key: "credit_financing",
    label: "Créditos e Financiamento",
    resources: [
      { key: "consortium", label: "Consórcios de Saúde", endpoint: "/credit_financing/consortium/", adminListHref: "/admin/creditos_financiamento/healthconsortium/" },
      { key: "procedure_financing", label: "Financiamentos de Procedimentos", endpoint: "/credit_financing/procedure_financing/", adminListHref: "/admin/creditos_financiamento/electiveprocedurefinancing/" },
      { key: "installment", label: "Parcelas de Crédito", endpoint: "/credit_financing/installment/", adminListHref: "/admin/creditos_financiamento/creditinstallment/" },
      { key: "reimbursement_claim", label: "Convênios e Reembolsos", endpoint: "/credit_financing/reimbursement_claim/", adminListHref: "/admin/creditos_financiamento/reimbursementclaim/" },
      { key: "student_funding", label: "Bolsas e Financiamento Estudantil", endpoint: "/credit_financing/student_funding/", adminListHref: "/admin/creditos_financiamento/studentfunding/" },
    ],
  },
  {
    key: "telemedicine",
    label: "Telemedicina e Monitoramento Remoto",
    resources: [
      { key: "waiting_room", label: "Sala de Espera Virtual", endpoint: "/telemedicine/waiting_room/", adminListHref: "/admin/telemedicina/telemedicinewaitingroomentry/" },
      { key: "device", label: "Dispositivos Remotos", endpoint: "/telemedicine/device/", adminListHref: "/admin/telemedicina/remotemonitoringdevice/" },
      { key: "vital_reading", label: "Leituras Remotas", endpoint: "/telemedicine/vital_reading/", adminListHref: "/admin/telemedicina/remotevitalreading/" },
      { key: "async_case", label: "Consultas Assíncronas", endpoint: "/telemedicine/async_case/", adminListHref: "/admin/telemedicina/storeandforwardcase/" },
      { key: "program", label: "Programas Crónicos", endpoint: "/telemedicine/program/", adminListHref: "/admin/telemedicina/chronicmonitoringprogram/" },
      { key: "alert", label: "Alertas Clínicos", endpoint: "/telemedicine/alert/", adminListHref: "/admin/telemedicina/remoteclinicalalert/" },
    ],
  },
  {
    key: "public_health",
    label: "Imunização e Saúde Pública",
    resources: [
      { key: "vaccine", label: "Vacinas", endpoint: "/public_health/vaccine/", adminListHref: "/admin/saude_publica/vaccineproduct/" },
      { key: "lot", label: "Lotes de Vacina", endpoint: "/public_health/lot/", adminListHref: "/admin/saude_publica/vaccinelot/" },
      { key: "campaign", label: "Campanhas de Vacinação", endpoint: "/public_health/campaign/", adminListHref: "/admin/saude_publica/vaccinationcampaign/" },
      { key: "target", label: "Metas por Região", endpoint: "/public_health/target/", adminListHref: "/admin/saude_publica/vaccinationcampaigntarget/" },
      { key: "immunization", label: "Registos de Imunização", endpoint: "/public_health/immunization/", adminListHref: "/admin/saude_publica/immunizationrecord/" },
      { key: "adverse_event", label: "Eventos Adversos AEFI", endpoint: "/public_health/adverse_event/", adminListHref: "/admin/saude_publica/adverseeventfollowingimmunization/" },
      { key: "notification", label: "Notificações Oficiais", endpoint: "/public_health/notification/", adminListHref: "/admin/saude_publica/publichealthnotification/" },
    ],
  },
  {
    key: "dental",
    label: "Odontologia",
    resources: [
      { key: "procedure", label: "Procedimentos Dentários", endpoint: "/dental/procedure/", adminListHref: "/admin/odontologia/dentalprocedure/" },
      { key: "appointment", label: "Consultas Dentárias", endpoint: "/dental/appointment/", adminListHref: "/admin/odontologia/dentalappointment/" },
      { key: "consultation", label: "Atendimentos Dentários", endpoint: "/dental/consultation/", adminListHref: "/admin/odontologia/dentalconsultation/" },
      { key: "record", label: "Prontuários Dentários", endpoint: "/dental/record/", adminListHref: "/admin/odontologia/dentalrecord/" },
      { key: "odontogram_chart", label: "Mapas Odontológicos", endpoint: "/dental/odontogram_chart/", adminListHref: "/admin/odontologia/dentalodontogram/" },
      { key: "odontogram", label: "Odontogramas", endpoint: "/dental/odontogram/", adminListHref: "/admin/odontologia/dentalodontogramentry/" },
      { key: "diagnosis", label: "Diagnósticos Dentários", endpoint: "/dental/diagnosis/", adminListHref: "/admin/odontologia/dentaldiagnosis/" },
      { key: "treatment_plan", label: "Planos de Tratamento", endpoint: "/dental/treatment_plan/", adminListHref: "/admin/odontologia/dentaltreatmentplan/" },
      { key: "treatment_phase", label: "Fases do Plano", endpoint: "/dental/treatment_phase/", adminListHref: "/admin/odontologia/dentaltreatmentphase/" },
      { key: "treatment_item", label: "Itens do Plano", endpoint: "/dental/treatment_item/", adminListHref: "/admin/odontologia/dentaltreatmentplanitem/" },
      { key: "quotation", label: "Orçamentos Dentários", endpoint: "/dental/quotation/", adminListHref: "/admin/odontologia/dentalquotation/" },
      { key: "approval", label: "Aprovações Dentárias", endpoint: "/dental/approval/", adminListHref: "/admin/odontologia/dentalapproval/" },
      { key: "payment", label: "Pagamentos Dentários", endpoint: "/dental/payment/", adminListHref: "/admin/odontologia/dentalpayment/" },
      { key: "procedure_execution", label: "Procedimentos Executados", endpoint: "/dental/procedure_execution/", adminListHref: "/admin/odontologia/dentalprocedureexecution/" },
      { key: "patient_treatment_plan", label: "Pacientes com Plano Dentário", endpoint: "/dental/patient_treatment_plan/", adminListHref: "/admin/odontologia/dentalpatienttreatmentplan/" },
      { key: "prosthesis_lab_order", label: "Ordens de Prótese", endpoint: "/dental/prosthesis_lab_order/", adminListHref: "/admin/odontologia/dentalprosthesislaborder/" },
      { key: "imaging_order", label: "Pedidos de Imagem Dentária", endpoint: "/dental/imaging_order/", adminListHref: "/admin/odontologia/dentalimagingorder/" },
      { key: "prescription", label: "Prescrições Dentárias", endpoint: "/dental/prescription/", adminListHref: "/admin/odontologia/dentalprescription/" },
      { key: "followup", label: "Follow-ups Dentários", endpoint: "/dental/followup/", adminListHref: "/admin/odontologia/dentalfollowup/" },
      { key: "material_consumption", label: "Consumo de Materiais", endpoint: "/dental/material_consumption/", adminListHref: "/admin/odontologia/dentalmaterialconsumption/" },
      { key: "clinical_evolution", label: "Evoluções Clínicas", endpoint: "/dental/clinical_evolution/", adminListHref: "/admin/odontologia/dentalclinicalevolution/" },
      { key: "billing_item", label: "Itens Faturáveis Dentários", endpoint: "/dental/billing_item/", adminListHref: "/admin/odontologia/dentalbillingitem/" },
      { key: "document", label: "Documentos Dentários", endpoint: "/dental/document/", adminListHref: "/admin/odontologia/dentaldocument/" },
      { key: "audit_event", label: "Auditoria Dentária", endpoint: "/dental/audit_event/", adminListHref: "/admin/odontologia/dentalauditevent/" },
      { key: "patient_plan_summary", label: "Resumo dos Planos por Paciente", endpoint: "/dental/patient_plan_summary/", adminListHref: "/admin/odontologia/patientdentalplansummary/" },
    ],
  },
  {
    key: "veterinary",
    label: "Medicina Veterinária",
    resources: [
      { key: "animal", label: "Animais", endpoint: "/veterinary/animal/", adminListHref: "/admin/veterinaria/veterinaryanimal/" },
      { key: "appointment", label: "Consultas Veterinárias", endpoint: "/veterinary/appointment/", adminListHref: "/admin/veterinaria/veterinaryappointment/" },
      { key: "record", label: "Prontuários Veterinários", endpoint: "/veterinary/record/", adminListHref: "/admin/veterinaria/veterinarymedicalrecord/" },
      { key: "vaccine", label: "Vacinas", endpoint: "/veterinary/vaccine/", adminListHref: "/admin/veterinaria/veterinaryvaccine/" },
      { key: "vaccination", label: "Vacinações", endpoint: "/veterinary/vaccination/", adminListHref: "/admin/veterinaria/veterinaryvaccination/" },
      { key: "lab_exam", label: "Exames Laboratoriais", endpoint: "/veterinary/lab_exam/", adminListHref: "/admin/veterinaria/veterinarylabexam/" },
      { key: "lab_request", label: "Requisições Laboratoriais", endpoint: "/veterinary/lab_request/", adminListHref: "/admin/veterinaria/veterinarylabrequest/" },
      { key: "lab_request_item", label: "Itens de Requisição", endpoint: "/veterinary/lab_request_item/", adminListHref: "/admin/veterinaria/veterinarylabrequestitem/" },
      { key: "admission", label: "Internamentos", endpoint: "/veterinary/admission/", adminListHref: "/admin/veterinaria/veterinaryadmission/" },
      { key: "prescription", label: "Receitas", endpoint: "/veterinary/prescription/", adminListHref: "/admin/veterinaria/veterinaryprescription/" },
      { key: "prescription_item", label: "Itens de Receita", endpoint: "/veterinary/prescription_item/", adminListHref: "/admin/veterinaria/veterinaryprescriptionitem/" },
    ],
  },
  {
    key: "physiotherapy",
    label: "Fisioterapia e Reabilitação",
    resources: [
      { key: "device", label: "Aparelhos", endpoint: "/physiotherapy/device/", adminListHref: "/admin/fisioterapia/physiotherapydevice/" },
      { key: "assessment", label: "Avaliações Funcionais", endpoint: "/physiotherapy/assessment/", adminListHref: "/admin/fisioterapia/functionalassessment/" },
      { key: "treatment_plan", label: "Planos de Tratamento", endpoint: "/physiotherapy/treatment_plan/", adminListHref: "/admin/fisioterapia/rehabilitationtreatmentplan/" },
      { key: "intervention", label: "Intervenções", endpoint: "/physiotherapy/intervention/", adminListHref: "/admin/fisioterapia/treatmentplanintervention/" },
      { key: "session", label: "Sessões de Reabilitação", endpoint: "/physiotherapy/session/", adminListHref: "/admin/fisioterapia/rehabilitationsession/" },
      { key: "progress_note", label: "Evoluções", endpoint: "/physiotherapy/progress_note/", adminListHref: "/admin/fisioterapia/rehabilitationprogressnote/" },
      { key: "device_usage", label: "Uso de Aparelhos", endpoint: "/physiotherapy/device_usage/", adminListHref: "/admin/fisioterapia/rehabilitationdeviceusage/" },
    ],
  },
  {
    key: "pathology",
    label: "Patologia",
    resources: [
      { key: "pedidos", label: "Pedidos", endpoint: "/pathology/pedidos/", adminListHref: "/admin/patologia/pathologyrequest/" },
      { key: "recepcao_amostras", label: "Recepção de Amostras", endpoint: "/pathology/recepcao_amostras/", adminListHref: "/admin/patologia/pathologysamplereception/" },
      { key: "acessionamento", label: "Acessionamento", endpoint: "/pathology/acessionamento/", adminListHref: "/admin/patologia/pathologyaccession/" },
      { key: "macroscopia", label: "Macroscopia", endpoint: "/pathology/macroscopia/", adminListHref: "/admin/patologia/pathologygrossexamination/" },
      { key: "processamento", label: "Processamento", endpoint: "/pathology/processamento/", adminListHref: "/admin/patologia/pathologyprocessing/" },
      { key: "inclusao", label: "Inclusão em Parafina", endpoint: "/pathology/inclusao/", adminListHref: "/admin/patologia/pathologyembedding/" },
      { key: "microtomia", label: "Microtomia", endpoint: "/pathology/microtomia/", adminListHref: "/admin/patologia/pathologymicrotomy/" },
      { key: "histologia", label: "Histologia", endpoint: "/pathology/histologia/", adminListHref: "/admin/patologia/pathologyhistologyslide/" },
      { key: "coloracoes", label: "Colorações", endpoint: "/pathology/coloracoes/", adminListHref: "/admin/patologia/pathologystaining/" },
      { key: "citologia", label: "Citologia", endpoint: "/pathology/citologia/", adminListHref: "/admin/patologia/pathologycytologycase/" },
      { key: "imunohistoquimica", label: "Imunohistoquímica", endpoint: "/pathology/imunohistoquimica/", adminListHref: "/admin/patologia/pathologyimmunohistochemistry/" },
      { key: "molecular", label: "Patologia Molecular", endpoint: "/pathology/molecular/", adminListHref: "/admin/patologia/pathologymoleculartest/" },
      { key: "diagnosticos", label: "Diagnósticos", endpoint: "/pathology/diagnosticos/", adminListHref: "/admin/patologia/pathologydiagnosisreview/" },
      { key: "laudos", label: "Laudos", endpoint: "/pathology/laudos/", adminListHref: "/admin/patologia/pathologyreport/" },
      { key: "faturacao", label: "Faturação", endpoint: "/pathology/faturacao/", adminListHref: "/admin/patologia/pathologybillingevent/" },
      { key: "inventario", label: "Inventário", endpoint: "/pathology/inventario/", adminListHref: "/admin/patologia/pathologyinventoryusage/" },
      { key: "controlo_qualidade", label: "Controlo de Qualidade", endpoint: "/pathology/controlo_qualidade/", adminListHref: "/admin/patologia/pathologyqualitycontrol/" },
      { key: "arquivamento", label: "Arquivamento", endpoint: "/pathology/arquivamento/", adminListHref: "/admin/patologia/pathologyarchive/" },
    ],
  },
  {
    key: "therapy",
    label: "Terapias Ocupacionais e Especializadas",
    resources: [
      { key: "resource", label: "Recursos Terapêuticos", endpoint: "/therapy/resource/", adminListHref: "/admin/terapias/therapeuticresource/" },
      { key: "evaluation", label: "Avaliações Terapêuticas", endpoint: "/therapy/evaluation/", adminListHref: "/admin/terapias/therapyevaluation/" },
      { key: "treatment_plan", label: "Planos Terapêuticos", endpoint: "/therapy/treatment_plan/", adminListHref: "/admin/terapias/therapytreatmentplan/" },
      { key: "goal", label: "Objetivos Terapêuticos", endpoint: "/therapy/goal/", adminListHref: "/admin/terapias/therapyplangoal/" },
      { key: "session", label: "Sessões Terapêuticas", endpoint: "/therapy/session/", adminListHref: "/admin/terapias/therapysession/" },
      { key: "progress_note", label: "Evoluções Terapêuticas", endpoint: "/therapy/progress_note/", adminListHref: "/admin/terapias/therapyprogressnote/" },
      { key: "prescription_link", label: "Prescrições Terapêuticas", endpoint: "/therapy/prescription_link/", adminListHref: "/admin/terapias/therapyprescriptionlink/" },
    ],
  },
  {
    key: "radiology",
    label: "Radiologia e Imagiologia",
    resources: [
      { key: "equipment", label: "Equipamentos de Imagem", endpoint: "/radiology/equipment/", adminListHref: "/admin/radiologia/imagingequipment/" },
      { key: "protocol", label: "Protocolos de Imagem", endpoint: "/radiology/protocol/", adminListHref: "/admin/radiologia/imagingprotocol/" },
      { key: "study", label: "Estudos de Imagem", endpoint: "/radiology/study/", adminListHref: "/admin/radiologia/imagingstudy/" },
      { key: "series", label: "Séries de Imagem", endpoint: "/radiology/series/", adminListHref: "/admin/radiologia/imagingseries/" },
      { key: "file", label: "Ficheiros de Imagem", endpoint: "/radiology/file/", adminListHref: "/admin/radiologia/imagingfile/" },
      { key: "report", label: "Laudos", endpoint: "/radiology/report/", adminListHref: "/admin/radiologia/imagingreport/" },
      { key: "pacs_event", label: "Eventos PACS", endpoint: "/radiology/pacs_event/", adminListHref: "/admin/radiologia/pacsintegrationevent/" },
    ],
  },
  {
    key: "specialty_diagnostics",
    label: "Diagnósticos Especializados",
    resources: [
      { key: "equipment", label: "Equipamentos Especializados", endpoint: "/specialty_diagnostics/equipment/", adminListHref: "/admin/diagnosticos/specialtydiagnosticequipment/" },
      { key: "protocol", label: "Protocolos Especializados", endpoint: "/specialty_diagnostics/protocol/", adminListHref: "/admin/diagnosticos/specialtydiagnosticprotocol/" },
      { key: "order", label: "Exames Especializados", endpoint: "/specialty_diagnostics/order/", adminListHref: "/admin/diagnosticos/specialtydiagnosticorder/" },
      { key: "measurement", label: "Medições Diagnósticas", endpoint: "/specialty_diagnostics/measurement/", adminListHref: "/admin/diagnosticos/specialtydiagnosticmeasurement/" },
      { key: "report", label: "Laudos Especializados", endpoint: "/specialty_diagnostics/report/", adminListHref: "/admin/diagnosticos/specialtydiagnosticreport/" },
      { key: "integration_event", label: "Eventos de Integração", endpoint: "/specialty_diagnostics/integration_event/", adminListHref: "/admin/diagnosticos/specialtydiagnosticintegrationevent/" },
    ],
  },
  {
    key: "transportation",
    label: "Transporte e Logística",
    resources: [
      { key: "vehicle", label: "Veículos", endpoint: "/transportation/vehicle/", adminListHref: "/admin/transportation/vehicle/" },
      { key: "driver", label: "Motoristas", endpoint: "/transportation/driver/", adminListHref: "/admin/transportation/driver/" },
      { key: "route", label: "Rotas", endpoint: "/transportation/route/", adminListHref: "/admin/transportation/transportationroute/" },
      { key: "route_stop", label: "Paragens de Rota", endpoint: "/transportation/route_stop/", adminListHref: "/admin/transportation/routestop/" },
      { key: "trip", label: "Viagens", endpoint: "/transportation/trip/", adminListHref: "/admin/transportation/trip/" },
      { key: "tracking_point", label: "Rastreamento", endpoint: "/transportation/tracking_point/", adminListHref: "/admin/transportation/vehicletrackingpoint/" },
      { key: "maintenance_plan", label: "Planos de Manutenção", endpoint: "/transportation/maintenance_plan/", adminListHref: "/admin/transportation/maintenanceplan/" },
      { key: "maintenance_order", label: "Ordens de Manutenção", endpoint: "/transportation/maintenance_order/", adminListHref: "/admin/transportation/maintenanceorder/" },
      { key: "fuel_log", label: "Abastecimentos", endpoint: "/transportation/fuel_log/", adminListHref: "/admin/transportation/fuellog/" },
    ],
  },
  {
    key: "reception",
    label: "Recepção",
    resources: [
      { key: "workspace", label: "Área de trabalho", endpoint: "/reception/workspace/", adminListHref: "/admin/reception/" },
      { key: "checkin", label: "Check-ins", endpoint: "/reception/checkin/", adminListHref: "/admin/reception/checkinrecepcao/" },
      { key: "care", label: "Atendimentos", endpoint: "/reception/care/", adminListHref: "/admin/reception/" },
    ],
  },
  {
    key: "dashboard",
    label: "Painel",
    resources: [
      { key: "stats", label: "Indicadores Gerais", endpoint: "/dashboard/stats/" },
      { key: "analytics", label: "Análises Operacionais", endpoint: "/dashboard/analytics/" },
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
    key: "equipment_integrations",
    label: "Integrações de Equipamentos",
    resources: [
      { key: "equipment", label: "Equipamentos Integrados", endpoint: "/equipment_integrations/equipment/", adminListHref: "/admin/integracoes_equipamentos/integrationequipment/" },
      { key: "credential", label: "Credenciais", endpoint: "/equipment_integrations/credential/", adminListHref: "/admin/integracoes_equipamentos/integrationcredential/" },
      { key: "routing", label: "Regras de Encaminhamento", endpoint: "/equipment_integrations/routing/", adminListHref: "/admin/integracoes_equipamentos/integrationrouting/" },
      { key: "order", label: "Ordens de Integração", endpoint: "/equipment_integrations/order/", adminListHref: "/admin/integracoes_equipamentos/integrationorder/" },
      { key: "order_item", label: "Itens de Ordem", endpoint: "/equipment_integrations/order_item/", adminListHref: "/admin/integracoes_equipamentos/integrationorderitem/" },
      { key: "message", label: "Mensagens", endpoint: "/equipment_integrations/message/", adminListHref: "/admin/integracoes_equipamentos/integrationmessage/" },
      { key: "document", label: "Documentos", endpoint: "/equipment_integrations/document/", adminListHref: "/admin/integracoes_equipamentos/integrationdocument/" },
      { key: "analyte_mapping", label: "Mapeamento de Analitos", endpoint: "/equipment_integrations/analyte_mapping/", adminListHref: "/admin/integracoes_equipamentos/integrationanalytemapping/" },
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
      { key: "ward_dashboard", label: "Painel de Enfermaria", endpoint: "/nursing/ward_dashboard/" },
    ],
  },
  {
    key: "insurer",
    label: "Seguradora",
    resources: [
      { key: "insurer", label: "Seguradoras", endpoint: "/insurer/insurer/", adminListHref: "/admin/insurer/insurer/" },
      { key: "coverage_plan", label: "Planos", endpoint: "/insurer/coverage_plan/", adminListHref: "/admin/insurer/coverageplan/" },
      { key: "tenant_coverage_plan", label: "Planos por Cliente", endpoint: "/insurer/tenant_coverage_plan/" },
      { key: "procedure_authorization", label: "Autorizações", endpoint: "/insurer/procedure_authorization/", adminListHref: "/admin/insurer/procedureauthorization/" },
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
      { key: "assessment", label: "Avaliações", endpoint: "/education/assessment/", adminListHref: "/admin/education/graderecord/" },
      { key: "examination", label: "Exames", endpoint: "/education/examination/", adminListHref: "/admin/education/examination/" },
      { key: "random_test", label: "Testes Aleatórios", endpoint: "/education/random_test/", adminListHref: "/admin/education/randomtest/" },
      { key: "assignment", label: "Trabalhos", endpoint: "/education/assignment/", adminListHref: "/admin/education/assignment/" },
      { key: "submission", label: "Submissões de Trabalho", endpoint: "/education/submission/", adminListHref: "/admin/education/assignmentsubmission/" },
      { key: "exam_attempt", label: "Tentativas de Exame", endpoint: "/education/exam_attempt/", adminListHref: "/admin/education/examinationattempt/" },
      { key: "examination_attempt", label: "Tentativas de Exame", endpoint: "/education/examination_attempt/", adminListHref: "/admin/education/examinationattempt/" },
      { key: "content", label: "Conteúdos de Aprendizagem", endpoint: "/education/content/", adminListHref: "/admin/education/learningcontent/" },
      { key: "lesson", label: "Aulas", endpoint: "/education/lesson/", adminListHref: "/admin/education/learningcontent/" },
      { key: "bibliography", label: "Referências Bibliográficas", endpoint: "/education/bibliography/", adminListHref: "/admin/education/learningcontent/" },
      { key: "thematic_map", label: "Mapa de Conteúdo Temático", endpoint: "/education/thematic_map/", adminListHref: "/admin/education/learningcontent/" },
      { key: "discipline_schedule", label: "Cronograma da Disciplina", endpoint: "/education/discipline_schedule/", adminListHref: "/admin/education/disciplinescheduleitem/" },
      { key: "schedule_progress", label: "Progresso do Cronograma", endpoint: "/education/schedule_progress/", adminListHref: "/admin/education/disciplineschedulestudentstatus/" },
      { key: "skill", label: "Competências", endpoint: "/education/skill/", adminListHref: "/admin/education/skill/" },
    ],
  },
  {
    key: "tenants",
    label: "Clientes",
    resources: [
      { key: "inquilino", label: "Clientes", endpoint: "/tenants/tenant/", adminListHref: "/admin/tenants/tenant/" },
      { key: "planoassinatura", label: "Planos", endpoint: "/tenants/planoassinatura/", adminListHref: "/admin/tenants/subscriptionplan/" },
      { key: "configuracaoinquilino", label: "Configurações", endpoint: "/tenants/configuracaoinquilino/", adminListHref: "/admin/tenants/tenantconfiguration/" },
      { key: "usotenant", label: "Uso do Cliente", endpoint: "/tenants/usotenant/", adminListHref: "/admin/tenants/tenantusage/" },
      { key: "featureflagtenant", label: "Funcionalidades do Cliente", endpoint: "/tenants/featureflagtenant/", adminListHref: "/admin/tenants/tenantfeatureflag/" },
    ],
  },
  {
    key: "notifications",
    label: "Notificações",
    resources: [
      { key: "notification", label: "Notificações", endpoint: "/notifications/notification/", adminListHref: "/admin/notifications/notification/" },
      { key: "template", label: "Modelos de Notificação", endpoint: "/notifications/template/", adminListHref: "/admin/notifications/notificationtemplate/" },
      { key: "logenvio", label: "Logs de Envio", endpoint: "/notifications/logenvio/", adminListHref: "/admin/notifications/logenvio/" },
    ],
  },
  {
    key: "identity",
    label: "Identidade",
    resources: [
      { key: "usuario", label: "Usuários", endpoint: "/identity/user/", adminListHref: "/admin/identity/user/" },
      { key: "perfilprofissional", label: "Perfis Profissionais", endpoint: "/identity/perfilprofissional/" },
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
      { key: "pedido_cirurgico", label: "Pedidos Cirúrgicos", endpoint: "/surgery/pedido_cirurgico/", adminListHref: "/admin/surgery/surgicalrequest/" },
      { key: "avaliacao_pre_operatoria", label: "Avaliações Pré-operatórias", endpoint: "/surgery/avaliacao_pre_operatoria/", adminListHref: "/admin/surgery/preoperativeassessment/" },
      { key: "small_surgery", label: "Pequenas Cirurgias", endpoint: "/surgery/small_surgery/", adminListHref: "/admin/surgery/smallsurgery/" },
      { key: "large_surgery", label: "Grandes Cirurgias", endpoint: "/surgery/large_surgery/", adminListHref: "/admin/surgery/largesurgery/" },
      { key: "surgery", label: "Todas as Cirurgias", endpoint: "/surgery/surgery/", adminListHref: "/admin/surgery/surgery/" },
      { key: "surgical_procedure", label: "Procedimentos Cirúrgicos", endpoint: "/surgery/surgical_procedure/", adminListHref: "/admin/surgery/surgicalprocedure/" },
      { key: "procedimentos_realizados", label: "Procedimentos Realizados", endpoint: "/surgery/procedimentos_realizados/", adminListHref: "/admin/surgery/surgeryprocedureitem/" },
      { key: "agenda_cirurgica", label: "Agenda Cirúrgica", endpoint: "/surgery/agenda_cirurgica/", adminListHref: "/admin/surgery/surgicalschedule/" },
      { key: "centro_cirurgico", label: "Centro Cirúrgico", endpoint: "/surgery/centro_cirurgico/", adminListHref: "/admin/surgery/operatingroom/" },
      { key: "equipa_cirurgica", label: "Equipa Cirúrgica", endpoint: "/surgery/equipa_cirurgica/", adminListHref: "/admin/surgery/surgicalteammember/" },
      { key: "anestesia", label: "Anestesia", endpoint: "/surgery/anestesia/", adminListHref: "/admin/surgery/anesthesiarecord/" },
      { key: "checklist_seguranca", label: "Checklist de Segurança", endpoint: "/surgery/checklist_seguranca/", adminListHref: "/admin/surgery/surgicalsafetychecklist/" },
      { key: "materiais", label: "Materiais Cirúrgicos", endpoint: "/surgery/materiais/", adminListHref: "/admin/surgery/surgicalmaterial/" },
      { key: "consumos", label: "Consumos Cirúrgicos", endpoint: "/surgery/consumos/", adminListHref: "/admin/surgery/surgicalconsumption/" },
      { key: "recuperacao", label: "Recuperação", endpoint: "/surgery/recuperacao/", adminListHref: "/admin/surgery/recoveryrecord/" },
      { key: "relatorio_operatorio", label: "Relatório Operatório", endpoint: "/surgery/relatorio_operatorio/", adminListHref: "/admin/surgery/operativereport/" },
      { key: "autorizacoes", label: "Autorizações Cirúrgicas", endpoint: "/surgery/autorizacoes/", adminListHref: "/admin/surgery/surgicalauthorization/" },
      { key: "faturacao", label: "Faturação Cirúrgica", endpoint: "/surgery/faturacao/", adminListHref: "/admin/surgery/surgicalbillingitem/" },
      { key: "documentos", label: "Documentos Cirúrgicos", endpoint: "/surgery/documentos/", adminListHref: "/admin/surgery/surgicaldocument/" },
      { key: "auditoria", label: "Auditoria Cirúrgica", endpoint: "/surgery/auditoria/", adminListHref: "/admin/surgery/surgicalauditevent/" },
      { key: "amostras", label: "Amostras Cirúrgicas", endpoint: "/surgery/amostras/", adminListHref: "/admin/surgery/surgicalspecimen/" },
    ],
  },
  {
    key: "human_resources",
    label: "Recursos Humanos",
    resources: [
      { key: "cargo", label: "Cargos", endpoint: "/human_resources/role/", adminListHref: "/admin/human-resources/jobtitle/" },
      { key: "profissao", label: "Profissões", endpoint: "/human_resources/profissao/", adminListHref: "/admin/human-resources/profession/" },
      { key: "funcionario", label: "Funcionários", endpoint: "/human_resources/employee/", adminListHref: "/admin/human-resources/employee/" },
      { key: "processodisciplinar", label: "Processos Disciplinares", endpoint: "/human_resources/processodisciplinar/", adminListHref: "/admin/human-resources/disciplinaryprocess/" },
      { key: "agregadofamiliar", label: "Agregados Familiares", endpoint: "/human_resources/agregadofamiliar/", adminListHref: "/admin/human-resources/familydependent/" },
      { key: "horario", label: "Horários", endpoint: "/human_resources/horario/", adminListHref: "/admin/human-resources/workschedule/" },
      { key: "falta", label: "Faltas", endpoint: "/human_resources/falta/", adminListHref: "/admin/human-resources/absence/" },
      { key: "ferias", label: "Férias", endpoint: "/human_resources/ferias/", adminListHref: "/admin/human-resources/vacation/" },
      { key: "dispensa", label: "Desligamentos", endpoint: "/human_resources/dispensa/", adminListHref: "/admin/human-resources/termination/" },
      { key: "horaextra", label: "Horas Extras", endpoint: "/human_resources/horaextra/", adminListHref: "/admin/human-resources/overtime/" },
      { key: "folhapagamento", label: "Folhas de Pagamento", endpoint: "/human_resources/folhapagamento/", adminListHref: "/admin/human-resources/payroll/" },
      { key: "assiduidade", label: "Assiduidade", endpoint: "/human_resources/assiduidade/", adminListHref: "/admin/human-resources/presencerecord/" },
      { key: "licenca", label: "Dispensas / Licenças", endpoint: "/human_resources/licenca/", adminListHref: "/admin/human-resources/leavepermission/" },
      { key: "saldo_ferias", label: "Saldo de Férias", endpoint: "/human_resources/saldo_ferias/", adminListHref: "/admin/human-resources/vacationbalance/" },
      { key: "contrato", label: "Contratos", endpoint: "/human_resources/contrato/", adminListHref: "/admin/human-resources/contract/" },
      { key: "documento_funcionario", label: "Documentos", endpoint: "/human_resources/documento_funcionario/", adminListHref: "/admin/human-resources/employeedocument/" },
      { key: "historico_salarial", label: "Histórico Salarial", endpoint: "/human_resources/historico_salarial/", adminListHref: "/admin/human-resources/salaryhistory/" },
      { key: "folha_run", label: "Folhas de Período", endpoint: "/human_resources/folha_run/", adminListHref: "/admin/human-resources/payrollrun/" },
      { key: "folha_item", label: "Itens de Folha", endpoint: "/human_resources/folha_item/", adminListHref: "/admin/human-resources/payrollitem/" },
    ],
  },
  {
    key: "monitoring",
    label: "Monitoramento",
    resources: [
      { key: "error", label: "Erros do Sistema", endpoint: "/monitoring/error/", adminListHref: "/admin/monitoring/systemerror/" },
      { key: "telemetry", label: "Telemetria", endpoint: "/monitoring/telemetry/" },
      { key: "export_job", label: "Exportações", endpoint: "/monitoring/export_job/" },
      { key: "cloud_control", label: "Controlo Cloud", endpoint: "/monitoring/cloud_control/" },
    ],
  },
  {
    key: "ai_assistant",
    label: "IA Operacional",
    resources: [
      { key: "ai_session", label: "Sessões da IA", endpoint: "/ai/assistant/sessions/", adminListHref: "/admin/ai_assistant/aisession/" },
      { key: "ai_investigation", label: "Investigações da IA", endpoint: "/ai/assistant/investigations/", adminListHref: "/admin/ai_assistant/aiinvestigation/" },
      { key: "ai_operational_task", label: "Tarefas Operacionais da IA", endpoint: "/ai/assistant/tasks/", adminListHref: "/admin/ai_assistant/aioperationaltask/" },
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
  // Dental
  "/dental/procedure/": "/admin/odontologia/dentalprocedure/",
  "/dental/appointment/": "/admin/odontologia/dentalappointment/",
  "/dental/consultation/": "/admin/odontologia/dentalconsultation/",
  "/dental/record/": "/admin/odontologia/dentalrecord/",
  "/dental/odontogram_chart/": "/admin/odontologia/dentalodontogram/",
  "/dental/odontogram/": "/admin/odontologia/dentalodontogramentry/",
  "/dental/diagnosis/": "/admin/odontologia/dentaldiagnosis/",
  "/dental/treatment_plan/": "/admin/odontologia/dentaltreatmentplan/",
  "/dental/treatment_phase/": "/admin/odontologia/dentaltreatmentphase/",
  "/dental/treatment_item/": "/admin/odontologia/dentaltreatmentplanitem/",
  "/dental/quotation/": "/admin/odontologia/dentalquotation/",
  "/dental/approval/": "/admin/odontologia/dentalapproval/",
  "/dental/payment/": "/admin/odontologia/dentalpayment/",
  "/dental/procedure_execution/": "/admin/odontologia/dentalprocedureexecution/",
  "/dental/patient_treatment_plan/": "/admin/odontologia/dentalpatienttreatmentplan/",
  "/dental/prosthesis_lab_order/": "/admin/odontologia/dentalprosthesislaborder/",
  "/dental/imaging_order/": "/admin/odontologia/dentalimagingorder/",
  "/dental/prescription/": "/admin/odontologia/dentalprescription/",
  "/dental/followup/": "/admin/odontologia/dentalfollowup/",
  "/dental/material_consumption/": "/admin/odontologia/dentalmaterialconsumption/",
  "/dental/clinical_evolution/": "/admin/odontologia/dentalclinicalevolution/",
  "/dental/billing_item/": "/admin/odontologia/dentalbillingitem/",
  "/dental/document/": "/admin/odontologia/dentaldocument/",
  "/dental/audit_event/": "/admin/odontologia/dentalauditevent/",
  "/dental/patient_plan_summary/": "/admin/odontologia/patientdentalplansummary/",
  // Veterinary
  "/veterinary/animal/": "/admin/veterinaria/veterinaryanimal/",
  "/veterinary/appointment/": "/admin/veterinaria/veterinaryappointment/",
  "/veterinary/record/": "/admin/veterinaria/veterinarymedicalrecord/",
  "/veterinary/vaccine/": "/admin/veterinaria/veterinaryvaccine/",
  "/veterinary/vaccination/": "/admin/veterinaria/veterinaryvaccination/",
  "/veterinary/lab_exam/": "/admin/veterinaria/veterinarylabexam/",
  "/veterinary/lab_request/": "/admin/veterinaria/veterinarylabrequest/",
  "/veterinary/lab_request_item/": "/admin/veterinaria/veterinarylabrequestitem/",
  "/veterinary/admission/": "/admin/veterinaria/veterinaryadmission/",
  "/veterinary/prescription/": "/admin/veterinaria/veterinaryprescription/",
  "/veterinary/prescription_item/": "/admin/veterinaria/veterinaryprescriptionitem/",
  // Equipment
  "/equipment/equipment/": "/admin/equipment/equipment/",
  "/equipment/daily_inspection/": "/admin/inspections/dailyinspection/",
  "/maintenance/maintenance/": "/admin/maintenance/maintenance/",
  "/equipment/incident/": "/admin/incidents/incident/",
  // Equipment integrations
  "/equipment_integrations/equipment/": "/admin/integracoes_equipamentos/integrationequipment/",
  "/equipment_integrations/credential/": "/admin/integracoes_equipamentos/integrationcredential/",
  "/equipment_integrations/routing/": "/admin/integracoes_equipamentos/integrationrouting/",
  "/equipment_integrations/order/": "/admin/integracoes_equipamentos/integrationorder/",
  "/equipment_integrations/order_item/": "/admin/integracoes_equipamentos/integrationorderitem/",
  "/equipment_integrations/message/": "/admin/integracoes_equipamentos/integrationmessage/",
  "/equipment_integrations/document/": "/admin/integracoes_equipamentos/integrationdocument/",
  "/equipment_integrations/analyte_mapping/": "/admin/integracoes_equipamentos/integrationanalytemapping/",
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
  "/insurer/insurer/": "/admin/insurer/insurer/",
  "/insurer/coverage_plan/": "/admin/insurer/coverageplan/",
  "/insurer/procedure_authorization/": "/admin/insurer/procedureauthorization/",
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
  // Telemedicine
  "/telemedicine/waiting_room/": "/admin/telemedicina/telemedicinewaitingroomentry/",
  "/telemedicine/device/": "/admin/telemedicina/remotemonitoringdevice/",
  "/telemedicine/vital_reading/": "/admin/telemedicina/remotevitalreading/",
  "/telemedicine/async_case/": "/admin/telemedicina/storeandforwardcase/",
  "/telemedicine/program/": "/admin/telemedicina/chronicmonitoringprogram/",
  "/telemedicine/alert/": "/admin/telemedicina/remoteclinicalalert/",
  // Public health
  "/public_health/vaccine/": "/admin/saude_publica/vaccineproduct/",
  "/public_health/lot/": "/admin/saude_publica/vaccinelot/",
  "/public_health/campaign/": "/admin/saude_publica/vaccinationcampaign/",
  "/public_health/target/": "/admin/saude_publica/vaccinationcampaigntarget/",
  "/public_health/immunization/": "/admin/saude_publica/immunizationrecord/",
  "/public_health/adverse_event/": "/admin/saude_publica/adverseeventfollowingimmunization/",
  "/public_health/notification/": "/admin/saude_publica/publichealthnotification/",
  // Education
  "/education/student/": "/admin/education/studentprofile/",
  "/education/teacher/": "/admin/education/teacherprofile/",
  "/education/course/": "/admin/education/course/",
  "/education/classroom/": "/admin/education/classroom/",
  "/education/enrollment/": "/admin/education/enrollment/",
  "/education/attendance/": "/admin/education/attendancerecord/",
  "/education/grade/": "/admin/education/graderecord/",
  "/education/assessment/": "/admin/education/graderecord/",
  "/education/examination/": "/admin/education/examination/",
  "/education/random_test/": "/admin/education/randomtest/",
  "/education/assignment/": "/admin/education/assignment/",
  "/education/submission/": "/admin/education/assignmentsubmission/",
  "/education/exam_attempt/": "/admin/education/examinationattempt/",
  "/education/examination_attempt/": "/admin/education/examinationattempt/",
  "/education/content/": "/admin/education/learningcontent/",
  "/education/lesson/": "/admin/education/learningcontent/",
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
  "/notifications/logenvio/": "/admin/notifications/deliverylog/",
  "/notifications/notification/": "/admin/notifications/notification/",
  "/notifications/template/": "/admin/notifications/notificationtemplate/",
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
  "/surgery/pedido_cirurgico/": "/admin/surgery/surgicalrequest/",
  "/surgery/avaliacao_pre_operatoria/": "/admin/surgery/preoperativeassessment/",
  "/surgery/surgery/": "/admin/surgery/surgery/",
  "/surgery/small_surgery/": "/admin/surgery/smallsurgery/",
  "/surgery/large_surgery/": "/admin/surgery/largesurgery/",
  "/surgery/surgical_procedure/": "/admin/surgery/surgicalprocedure/",
  "/surgery/procedimentos_realizados/": "/admin/surgery/surgeryprocedureitem/",
  "/surgery/agenda_cirurgica/": "/admin/surgery/surgicalschedule/",
  "/surgery/centro_cirurgico/": "/admin/surgery/operatingroom/",
  "/surgery/equipa_cirurgica/": "/admin/surgery/surgicalteammember/",
  "/surgery/anestesia/": "/admin/surgery/anesthesiarecord/",
  "/surgery/checklist_seguranca/": "/admin/surgery/surgicalsafetychecklist/",
  "/surgery/materiais/": "/admin/surgery/surgicalmaterial/",
  "/surgery/consumos/": "/admin/surgery/surgicalconsumption/",
  "/surgery/recuperacao/": "/admin/surgery/recoveryrecord/",
  "/surgery/relatorio_operatorio/": "/admin/surgery/operativereport/",
  "/surgery/autorizacoes/": "/admin/surgery/surgicalauthorization/",
  "/surgery/faturacao/": "/admin/surgery/surgicalbillingitem/",
  "/surgery/documentos/": "/admin/surgery/surgicaldocument/",
  "/surgery/auditoria/": "/admin/surgery/surgicalauditevent/",
  "/surgery/amostras/": "/admin/surgery/surgicalspecimen/",
  // Pathology
  "/pathology/pedidos/": "/admin/patologia/pathologyrequest/",
  "/pathology/recepcao_amostras/": "/admin/patologia/pathologysamplereception/",
  "/pathology/acessionamento/": "/admin/patologia/pathologyaccession/",
  "/pathology/macroscopia/": "/admin/patologia/pathologygrossexamination/",
  "/pathology/processamento/": "/admin/patologia/pathologyprocessing/",
  "/pathology/inclusao/": "/admin/patologia/pathologyembedding/",
  "/pathology/microtomia/": "/admin/patologia/pathologymicrotomy/",
  "/pathology/histologia/": "/admin/patologia/pathologyhistologyslide/",
  "/pathology/coloracoes/": "/admin/patologia/pathologystaining/",
  "/pathology/citologia/": "/admin/patologia/pathologycytologycase/",
  "/pathology/imunohistoquimica/": "/admin/patologia/pathologyimmunohistochemistry/",
  "/pathology/molecular/": "/admin/patologia/pathologymoleculartest/",
  "/pathology/diagnosticos/": "/admin/patologia/pathologydiagnosisreview/",
  "/pathology/laudos/": "/admin/patologia/pathologyreport/",
  "/pathology/faturacao/": "/admin/patologia/pathologybillingevent/",
  "/pathology/inventario/": "/admin/patologia/pathologyinventoryusage/",
  "/pathology/controlo_qualidade/": "/admin/patologia/pathologyqualitycontrol/",
  "/pathology/arquivamento/": "/admin/patologia/pathologyarchive/",
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
  "/human_resources/profissao/": "/admin/human-resources/profession/",
  "/human_resources/employee/": "/admin/human-resources/employee/",
  "/human_resources/processodisciplinar/": "/admin/human-resources/disciplinaryprocess/",
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
  "/monitoring/telemetry/": "/admin/monitoring/systemerror/",
  // Operational AI
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
  clinical_pharmacy: "clinical_pharmacy",
  farmacia_clinica: "clinical_pharmacy",
  farmácia_clínica: "clinical_pharmacy",
  terapia_iv: "clinical_pharmacy",
  terapia_intravenosa: "clinical_pharmacy",
  iv_therapy: "clinical_pharmacy",
  quimioterapia: "clinical_pharmacy",
  tpn: "clinical_pharmacy",
  antibiotic_stewardship: "clinical_pharmacy",
  stewardship_antibiotico: "clinical_pharmacy",
  stewardship_antibiótico: "clinical_pharmacy",
  credit_financing: "credit_financing",
  creditos_financiamento: "credit_financing",
  créditos_financiamento: "credit_financing",
  creditos: "credit_financing",
  créditos: "credit_financing",
  financiamento: "credit_financing",
  financiamentos: "credit_financing",
  consorcio: "credit_financing",
  consórcio: "credit_financing",
  reembolso: "credit_financing",
  reembolsos: "credit_financing",
  glosa: "credit_financing",
  glosas: "credit_financing",
  bolsa: "credit_financing",
  bolsas: "credit_financing",
  telemedicine: "telemedicine",
  telemedicina: "telemedicine",
  monitoramento_remoto: "telemedicine",
  monitorizacao_remota: "telemedicine",
  monitorização_remota: "telemedicine",
  remote_monitoring: "telemedicine",
  iot_clinico: "telemedicine",
  iot_clínico: "telemedicine",
  wearable: "telemedicine",
  wearables: "telemedicine",
  public_health: "public_health",
  saude_publica: "public_health",
  saúde_pública: "public_health",
  imunizacao: "public_health",
  imunização: "public_health",
  immunization: "public_health",
  vacinacao: "public_health",
  vacinação: "public_health",
  vacina: "public_health",
  vacinas: "public_health",
  campanha_saude: "public_health",
  campanha_vacinacao: "public_health",
  aefi: "public_health",
  dental: "dental",
  odontologia: "dental",
  odonto: "dental",
  veterinary: "veterinary",
  veterinaria: "veterinary",
  veterinária: "veterinary",
  vet: "veterinary",
  physiotherapy: "physiotherapy",
  fisioterapia: "physiotherapy",
  reabilitacao: "physiotherapy",
  reabilitação: "physiotherapy",
  rehab: "physiotherapy",
  physio: "physiotherapy",
  pathology: "pathology",
  patologia: "pathology",
  anatomia_patologica: "pathology",
  anatomia_patológica: "pathology",
  histopatologia: "pathology",
  therapy: "therapy",
  terapias: "therapy",
  terapia: "therapy",
  terapia_ocupacional: "therapy",
  occupational_therapy: "therapy",
  physical_therapy: "therapy",
  fisioterapia_especializada: "therapy",
  fonoaudiologia: "therapy",
  speech_therapy: "therapy",
  radiology: "radiology",
  radiologia: "radiology",
  imagiologia: "radiology",
  imagem: "radiology",
  imagens: "radiology",
  pacs: "radiology",
  specialty_diagnostics: "specialty_diagnostics",
  diagnosticos: "specialty_diagnostics",
  diagnósticos: "specialty_diagnostics",
  diagnosticos_especializados: "specialty_diagnostics",
  diagnósticos_especializados: "specialty_diagnostics",
  cardiology: "specialty_diagnostics",
  cardiologia: "specialty_diagnostics",
  neurology: "specialty_diagnostics",
  neurologia: "specialty_diagnostics",
  ophthalmology: "specialty_diagnostics",
  oftalmologia: "specialty_diagnostics",
  reception: "reception",
  recepcao: "reception",
  equipment: "equipment",
  equipamentos: "equipment",
  equipment_integrations: "equipment_integrations",
  integracoes_equipamentos: "equipment_integrations",
  integrações_equipamentos: "equipment_integrations",
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
  dashboard: "dashboard",
  painel: "dashboard",
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
  transportation: "transportation",
  transportes: "transportation",
  transporte: "transportation",
  logistica: "transportation",
  logística: "transportation",
  fleet: "transportation",
  frota: "transportation",
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

function groupLabelFromKey(groupKey: string): string {
  const canonical = canonicalModuleGroupKey(groupKey)
  return GROUP_LABEL_PT_BY_KEY[canonical] || translateRuntimeText(titleFromSlug(canonical), "pt")
}

function resourceLabelFromKey(resourceKey: string): string {
  const normalized = normalizeResourceKey(resourceKey)
  return RESOURCE_LABEL_PT_BY_KEY[normalized] || translateRuntimeText(titleFromSlug(normalized), "pt")
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
          label: resourceLabelFromKey(resourceSegment),
          endpoint,
          adminListHref: inferAdminListHref(endpoint),
        }

    let group = grouped.get(groupKey)
    if (!group) {
      const staticGroup = MODULES.find((item) => item.key === groupKey)
      group = {
        key: groupKey,
        label: staticGroup?.label || staticMatch?.group.label || groupLabelFromKey(groupKey),
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
          label: resourceLabelFromKey(resourceSegment),
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
          groupLabelFromKey(groupKey),
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
        label: incomingGroup.label || groupLabelFromKey(canonicalGroupKey),
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
