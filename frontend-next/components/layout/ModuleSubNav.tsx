"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useLanguage } from "@/hooks/useLanguage"
import { useAuth } from "@/hooks/useAuth"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"

type NavTab = {
    href: string
    label: string
    labelEn?: string
    groups?: string[]
}

type ModuleNavConfig = {
    baseHref: string
    tabs: NavTab[]
}

const specialistDiagnosticsTabs = (
    baseHref: string,
    rootLabel: string,
): NavTab[] => [
    { href: baseHref, label: rootLabel, labelEn: "Overview" },
    { href: `${baseHref}/equipment`, label: "Equipamentos", labelEn: "Equipment" },
    { href: `${baseHref}/protocols`, label: "Protocolos", labelEn: "Protocols" },
    { href: `${baseHref}/exams`, label: "Exames", labelEn: "Exams" },
    { href: `${baseHref}/measurements`, label: "Medições", labelEn: "Measurements" },
    { href: `${baseHref}/reports`, label: "Laudos", labelEn: "Reports" },
    { href: `${baseHref}/integrations`, label: "Integrações", labelEn: "Integrations" },
]

const MODULE_NAVS: ModuleNavConfig[] = [
    {
        baseHref: "/healthcare",
        tabs: [
            { href: "/healthcare", label: "Painel", labelEn: "Overview" },
            { href: "/reception", label: "Recepção", labelEn: "Reception", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE] },
            { href: "/patients", label: "Pacientes", labelEn: "Patients" },
            { href: "/consultations", label: "Consultas", labelEn: "Consultations" },
            { href: "/requests", label: "Requisições", labelEn: "Requests" },
            { href: "/medical-records", label: "Prontuário", labelEn: "Medical records" },
            { href: "/medicine", label: "Medicina", labelEn: "Medicine" },
            { href: "/nursing", label: "Enfermagem", labelEn: "Nursing" },
            {
                href: "/clinical-laboratory",
                label: "Laboratório",
                labelEn: "Laboratory",
                groups: [GROUPS.ADMIN, GROUPS.LABORATORIO],
            },
            { href: "/bloodbank", label: "Banco de Sangue", labelEn: "Blood bank" },
            { href: "/pharmacy", label: "Farmácia", labelEn: "Pharmacy" },
            { href: "/telemedicine", label: "Telemedicina", labelEn: "Telemedicine" },
            { href: "/public-health", label: "Saúde Pública", labelEn: "Public health" },
            { href: "/radiology", label: "Radiologia", labelEn: "Radiology", groups: [GROUPS.ADMIN, GROUPS.RADIOLOGIA] },
            { href: "/pathology", label: "Patologia", labelEn: "Pathology" },
        ],
    },
    {
        baseHref: "/education",
        tabs: [
            { href: "/education", label: "Painel", labelEn: "Overview" },
            { href: "/education/teacher", label: "Professor", labelEn: "Teacher" },
            { href: "/education/directoria", label: "Directoria", labelEn: "School board" },
            { href: "/education/student", label: "Estudante", labelEn: "Student" },
            { href: "/education/courses", label: "Cursos", labelEn: "Courses" },
            { href: "/education/classrooms", label: "Turmas", labelEn: "Classrooms" },
            { href: "/education/enrollments", label: "Matrículas", labelEn: "Enrollments" },
            { href: "/education/attendance-records", label: "Presenças", labelEn: "Attendance" },
            { href: "/education/grade-records", label: "Notas", labelEn: "Grades" },
            { href: "/education/assignments", label: "Trabalhos", labelEn: "Assignments" },
            { href: "/education/examinations", label: "Exames", labelEn: "Examinations" },
            { href: "/education/learning-contents", label: "Conteúdos", labelEn: "Content" },
            { href: "/education/skills", label: "Competências", labelEn: "Skills" },
            { href: "/education/resources", label: "Recursos", labelEn: "Resources" },
        ],
    },
    {
        baseHref: "/reception",
        tabs: [
            { href: "/reception", label: "Painel", labelEn: "Overview" },
            { href: "/reception/care", label: "Atendimento", labelEn: "Care" },
            { href: "/reception/reception-checkins", label: "Check-ins", labelEn: "Check-ins" },
            { href: "/reception/workspace", label: "Área de trabalho", labelEn: "Workspace" },
        ],
    },
    {
        baseHref: "/patients",
        tabs: [{ href: "/patients", label: "Pacientes", labelEn: "Patients" }],
    },
    {
        baseHref: "/consultations",
        tabs: [
            { href: "/consultations", label: "Painel", labelEn: "Overview" },
            { href: "/consultations/medical-consultations", label: "Consultas médicas", labelEn: "Medical consultations" },
            { href: "/consultations/doctors", label: "Médicos", labelEn: "Doctors" },
            { href: "/consultations/consultation-specialties", label: "Especialidades", labelEn: "Specialties" },
            { href: "/consultations/holidays", label: "Feriados", labelEn: "Holidays" },
        ],
    },
    {
        baseHref: "/medical-records",
        tabs: [
            { href: "/medical-records", label: "Painel", labelEn: "Overview" },
            { href: "/medical-records/records", label: "Registos", labelEn: "Records" },
            { href: "/medical-records/prescriptions", label: "Prescrições", labelEn: "Prescriptions" },
            { href: "/medical-records/prescription-items", label: "Itens de prescrição", labelEn: "Prescription items" },
            { href: "/medical-records/cardex", label: "Cardex", labelEn: "Cardex" },
        ],
    },
    {
        baseHref: "/medicine",
        tabs: [
            { href: "/medicine", label: "Painel", labelEn: "Overview" },
            { href: "/medicine/medical-exams", label: "Exames médicos", labelEn: "Medical exams" },
            { href: "/medicine/medical-results", label: "Resultados médicos", labelEn: "Medical results" },
        ],
    },
    {
        baseHref: "/clinical-pharmacy",
        tabs: [
            { href: "/clinical-pharmacy", label: "Painel", labelEn: "Overview" },
            { href: "/clinical-pharmacy/iv-preparations", label: "Preparações IV", labelEn: "IV preparations" },
            { href: "/clinical-pharmacy/ingredients", label: "Ingredientes", labelEn: "Ingredients" },
            { href: "/clinical-pharmacy/interactions", label: "Interações", labelEn: "Interactions" },
            { href: "/clinical-pharmacy/interaction-rules", label: "Regras", labelEn: "Rules" },
            { href: "/clinical-pharmacy/controlled-substances", label: "Controlados", labelEn: "Controlled substances" },
            { href: "/clinical-pharmacy/antibiotic-stewardship", label: "Stewardship", labelEn: "Stewardship" },
        ],
    },
    {
        baseHref: "/telemedicine",
        tabs: [
            { href: "/telemedicine", label: "Painel", labelEn: "Overview" },
            { href: "/telemedicine/waiting-room", label: "Sala de espera", labelEn: "Waiting room" },
            { href: "/telemedicine/vitals", label: "Sinais vitais", labelEn: "Vitals" },
            { href: "/telemedicine/devices", label: "Dispositivos", labelEn: "Devices" },
            { href: "/telemedicine/async-cases", label: "Casos assíncronos", labelEn: "Async cases" },
            { href: "/telemedicine/chronic-programs", label: "Programas crónicos", labelEn: "Chronic programs" },
            { href: "/telemedicine/alerts", label: "Alertas", labelEn: "Alerts" },
        ],
    },
    {
        baseHref: "/public-health",
        tabs: [
            { href: "/public-health", label: "Painel", labelEn: "Overview" },
            { href: "/public-health/dashboard", label: "Dashboard", labelEn: "Dashboard" },
            { href: "/public-health/vaccines", label: "Vacinas", labelEn: "Vaccines" },
            { href: "/public-health/lots", label: "Lotes", labelEn: "Lots" },
            { href: "/public-health/campaigns", label: "Campanhas", labelEn: "Campaigns" },
            { href: "/public-health/targets", label: "Metas", labelEn: "Targets" },
            { href: "/public-health/immunizations", label: "Imunizações", labelEn: "Immunizations" },
            { href: "/public-health/adverse-events", label: "Eventos adversos", labelEn: "Adverse events" },
            { href: "/public-health/notifications", label: "Notificações", labelEn: "Notifications" },
        ],
    },
    {
        baseHref: "/credit-financing",
        tabs: [
            { href: "/credit-financing", label: "Painel", labelEn: "Overview" },
            { href: "/credit-financing/consortiums", label: "Consórcios", labelEn: "Consortiums" },
            { href: "/credit-financing/procedure-financing", label: "Financiamento", labelEn: "Procedure financing" },
            { href: "/credit-financing/installments", label: "Parcelas", labelEn: "Installments" },
            { href: "/credit-financing/reimbursements", label: "Reembolsos", labelEn: "Reimbursements" },
            { href: "/credit-financing/student-funding", label: "Bolsas", labelEn: "Student funding" },
        ],
    },
    {
        baseHref: "/dental",
        tabs: [
            { href: "/dental", label: "Painel", labelEn: "Overview" },
            { href: "/dental/appointments", label: "Consultas", labelEn: "Appointments" },
            { href: "/dental/procedures", label: "Procedimentos", labelEn: "Procedures" },
            { href: "/dental/records", label: "Registos", labelEn: "Records" },
            { href: "/dental/odontograms", label: "Odontogramas", labelEn: "Odontograms" },
            { href: "/dental/treatment-plans", label: "Planos", labelEn: "Treatment plans" },
            { href: "/dental/patient-treatment-plans", label: "Planos por paciente", labelEn: "Patient plans" },
            { href: "/dental/prosthesis-lab-orders", label: "Próteses", labelEn: "Prosthesis lab orders" },
        ],
    },
    {
        baseHref: "/veterinary",
        tabs: [
            { href: "/veterinary", label: "Painel", labelEn: "Overview" },
            { href: "/veterinary/animals", label: "Animais", labelEn: "Animals" },
            { href: "/veterinary/appointments", label: "Consultas", labelEn: "Appointments" },
            { href: "/veterinary/records", label: "Registos", labelEn: "Records" },
            { href: "/veterinary/lab-requests", label: "Pedidos lab", labelEn: "Lab requests" },
            { href: "/veterinary/lab-exams", label: "Exames lab", labelEn: "Lab exams" },
            { href: "/veterinary/admissions", label: "Internamentos", labelEn: "Admissions" },
            { href: "/veterinary/prescriptions", label: "Prescrições", labelEn: "Prescriptions" },
            { href: "/veterinary/vaccines", label: "Vacinas", labelEn: "Vaccines" },
            { href: "/veterinary/vaccinations", label: "Vacinações", labelEn: "Vaccinations" },
        ],
    },
    {
        baseHref: "/physiotherapy",
        tabs: [
            { href: "/physiotherapy", label: "Painel", labelEn: "Overview" },
            { href: "/physiotherapy/assessments", label: "Avaliações", labelEn: "Assessments" },
            { href: "/physiotherapy/treatment-plans", label: "Planos", labelEn: "Treatment plans" },
            { href: "/physiotherapy/sessions", label: "Sessões", labelEn: "Sessions" },
            { href: "/physiotherapy/progress-notes", label: "Evoluções", labelEn: "Progress notes" },
            { href: "/physiotherapy/devices", label: "Dispositivos", labelEn: "Devices" },
            { href: "/physiotherapy/device-usages", label: "Uso de dispositivos", labelEn: "Device usage" },
            { href: "/physiotherapy/interventions", label: "Intervenções", labelEn: "Interventions" },
        ],
    },
    {
        baseHref: "/occupational-therapy",
        tabs: [
            { href: "/occupational-therapy", label: "Painel", labelEn: "Overview" },
            { href: "/occupational-therapy/evaluations", label: "Avaliações", labelEn: "Evaluations" },
            { href: "/occupational-therapy/treatment-plans", label: "Planos", labelEn: "Treatment plans" },
            { href: "/occupational-therapy/goals", label: "Objetivos", labelEn: "Goals" },
            { href: "/occupational-therapy/sessions", label: "Sessões", labelEn: "Sessions" },
            { href: "/occupational-therapy/progress-notes", label: "Evoluções", labelEn: "Progress notes" },
            { href: "/occupational-therapy/prescription-links", label: "Vínculos", labelEn: "Prescription links" },
            { href: "/occupational-therapy/resources", label: "Recursos", labelEn: "Resources" },
        ],
    },
    {
        baseHref: "/physical-therapy",
        tabs: [
            { href: "/physical-therapy", label: "Painel", labelEn: "Overview" },
            { href: "/physical-therapy/evaluations", label: "Avaliações", labelEn: "Evaluations" },
            { href: "/physical-therapy/treatment-plans", label: "Planos", labelEn: "Treatment plans" },
            { href: "/physical-therapy/goals", label: "Objetivos", labelEn: "Goals" },
            { href: "/physical-therapy/sessions", label: "Sessões", labelEn: "Sessions" },
            { href: "/physical-therapy/progress-notes", label: "Evoluções", labelEn: "Progress notes" },
            { href: "/physical-therapy/prescription-links", label: "Vínculos", labelEn: "Prescription links" },
            { href: "/physical-therapy/resources", label: "Recursos", labelEn: "Resources" },
        ],
    },
    {
        baseHref: "/radiology",
        tabs: [
            { href: "/radiology", label: "Painel", labelEn: "Overview" },
            { href: "/radiology/equipment", label: "Equipamentos", labelEn: "Equipment" },
            { href: "/radiology/protocols", label: "Protocolos", labelEn: "Protocols" },
            { href: "/radiology/series", label: "Séries", labelEn: "Series" },
            { href: "/radiology/files", label: "Ficheiros", labelEn: "Files" },
            { href: "/radiology/reports", label: "Laudos", labelEn: "Reports" },
            { href: "/radiology/pacs-events", label: "Eventos PACS", labelEn: "PACS events" },
        ],
    },
    {
        baseHref: "/pathology",
        tabs: [
            { href: "/pathology", label: "Painel", labelEn: "Overview" },
            { href: "/pathology/requests", label: "Pedidos", labelEn: "Requests" },
            { href: "/pathology/sample-receptions", label: "Recepção", labelEn: "Sample receptions" },
            { href: "/pathology/accessioning", label: "Acessionamento", labelEn: "Accessioning" },
            { href: "/pathology/grossing", label: "Macroscopia", labelEn: "Grossing" },
            { href: "/pathology/processing", label: "Processamento", labelEn: "Processing" },
            { href: "/pathology/embedding", label: "Inclusão", labelEn: "Embedding" },
            { href: "/pathology/microtomy", label: "Microtomia", labelEn: "Microtomy" },
            { href: "/pathology/histology", label: "Histologia", labelEn: "Histology" },
            { href: "/pathology/staining", label: "Coloração", labelEn: "Staining" },
            { href: "/pathology/cytology", label: "Citologia", labelEn: "Cytology" },
            { href: "/pathology/immunohistochemistry", label: "Imuno-histoquímica", labelEn: "Immunohistochemistry" },
            { href: "/pathology/molecular", label: "Molecular", labelEn: "Molecular" },
            { href: "/pathology/diagnosis", label: "Diagnóstico", labelEn: "Diagnosis" },
            { href: "/pathology/reports", label: "Laudos", labelEn: "Reports" },
            { href: "/pathology/billing", label: "Faturação", labelEn: "Billing" },
            { href: "/pathology/inventory", label: "Inventário", labelEn: "Inventory" },
            { href: "/pathology/quality-control", label: "Qualidade", labelEn: "Quality control" },
            { href: "/pathology/archives", label: "Arquivo", labelEn: "Archives" },
        ],
    },
    { baseHref: "/cardiology", tabs: specialistDiagnosticsTabs("/cardiology", "Painel") },
    { baseHref: "/neurology", tabs: specialistDiagnosticsTabs("/neurology", "Painel") },
    { baseHref: "/ophthalmology", tabs: specialistDiagnosticsTabs("/ophthalmology", "Painel") },
    {
        baseHref: "/transportation",
        tabs: [
            { href: "/transportation", label: "Painel", labelEn: "Overview" },
            { href: "/transportation/vehicles", label: "Veículos", labelEn: "Vehicles" },
            { href: "/transportation/drivers", label: "Motoristas", labelEn: "Drivers" },
            { href: "/transportation/routes", label: "Rotas", labelEn: "Routes" },
            { href: "/transportation/route-stops", label: "Paragens", labelEn: "Stops" },
            { href: "/transportation/trips", label: "Viagens", labelEn: "Trips" },
            { href: "/transportation/tracking-points", label: "Rastreamento", labelEn: "Tracking" },
            { href: "/transportation/maintenance-plans", label: "Planos de manutenção", labelEn: "Maintenance plans" },
            { href: "/transportation/maintenance-orders", label: "Ordens de manutenção", labelEn: "Maintenance orders" },
            { href: "/transportation/fuel-logs", label: "Combustível", labelEn: "Fuel logs" },
        ],
    },
    {
        baseHref: "/nursing",
        tabs: [
            { href: "/nursing", label: "Painel", labelEn: "Overview" },
            { href: "/nursing/ward", label: "Enfermaria", labelEn: "Ward" },
            { href: "/nursing/ward-dashboard", label: "Painel da enfermaria", labelEn: "Ward dashboard" },
            { href: "/nursing/requests", label: "Requisições", labelEn: "Requests" },
            { href: "/nursing/colheitas", label: "Coletas", labelEn: "Collections" },
            { href: "/nursing/procedures", label: "Procedimentos", labelEn: "Procedures" },
            { href: "/nursing/procedure-catalogs", label: "Catálogos", labelEn: "Catalogs" },
            { href: "/nursing/procedure-items", label: "Itens de procedimento", labelEn: "Procedure items" },
            { href: "/nursing/procedure-materials", label: "Materiais", labelEn: "Materials" },
            { href: "/nursing/nursing-records", label: "Registos", labelEn: "Records" },
            { href: "/nursing/nursing-evolutions", label: "Evoluções", labelEn: "Evolutions" },
            { href: "/nursing/nursing-prescriptions", label: "Prescrições", labelEn: "Prescriptions" },
            { href: "/nursing/nursing-vital-signs", label: "Sinais vitais", labelEn: "Vital signs" },
        ],
    },
    {
        baseHref: "/clinical-laboratory",
        tabs: [
            { href: "/clinical-laboratory", label: "Painel", labelEn: "Overview" },
            { href: "/clinical-laboratory/orders", label: "Pedidos", labelEn: "Orders" },
            { href: "/clinical-laboratory/collections", label: "Coletas", labelEn: "Collections" },
            { href: "/clinical-laboratory/samples", label: "Amostras", labelEn: "Samples" },
            { href: "/clinical-laboratory/reception", label: "Recepção", labelEn: "Reception" },
            { href: "/clinical-laboratory/rejections", label: "Rejeições", labelEn: "Rejections" },
            { href: "/clinical-laboratory/worklists", label: "Listas de trabalho", labelEn: "Worklists" },
            { href: "/clinical-laboratory/validations", label: "Validações", labelEn: "Validations" },
            { href: "/clinical-laboratory/reports", label: "Laudos", labelEn: "Reports" },
            { href: "/clinical-laboratory/critical-results", label: "Críticos", labelEn: "Critical results" },
            { href: "/clinical-laboratory/cultures", label: "Culturas", labelEn: "Cultures" },
            { href: "/clinical-laboratory/isolates", label: "Isolados", labelEn: "Isolates" },
            { href: "/clinical-laboratory/antibiograms", label: "Antibiogramas", labelEn: "Antibiograms" },
            { href: "/clinical-laboratory/molecular/genexpert", label: "GeneXpert", labelEn: "GeneXpert" },
            { href: "/clinical-laboratory/molecular/hiv-viral-load", label: "Carga Viral HIV", labelEn: "HIV viral load" },
            { href: "/clinical-laboratory/afb-smears", label: "Baciloscopia", labelEn: "AFB smears" },
            { href: "/clinical-laboratory/tests", label: "Exames", labelEn: "Tests" },
            { href: "/clinical-laboratory/panels", label: "Painéis", labelEn: "Panels" },
            { href: "/clinical-laboratory/sectors", label: "Sectores", labelEn: "Sectors" },
            { href: "/clinical-laboratory/quality-management", label: "Qualidade", labelEn: "Quality" },
            { href: "/clinical-laboratory/biosafety", label: "Biossegurança", labelEn: "Biosafety" },
        ],
    },
    {
        baseHref: "/bloodbank",
        tabs: [
            { href: "/bloodbank", label: "Painel", labelEn: "Overview" },
            { href: "/bloodbank/blood-units", label: "Unidades", labelEn: "Blood units" },
            { href: "/bloodbank/blood-donations", label: "Doações", labelEn: "Donations" },
            { href: "/bloodbank/blood-transfusions", label: "Transfusões", labelEn: "Transfusions" },
            { href: "/bloodbank/blood-storages", label: "Armazenamento", labelEn: "Storages" },
            { href: "/bloodbank/blood-stock-movements", label: "Movimentos", labelEn: "Stock movements" },
            { href: "/bloodbank/blood-storage-maintenances", label: "Manutenções", labelEn: "Storage maintenance" },
        ],
    },
    {
        baseHref: "/maternity",
        tabs: [
            { href: "/maternity", label: "Painel", labelEn: "Overview" },
            { href: "/maternity/pregnancies", label: "Gestações", labelEn: "Pregnancies" },
        ],
    },
    {
        baseHref: "/surgery",
        tabs: [
            { href: "/surgery", label: "Painel", labelEn: "Overview" },
            { href: "/surgery/schedules", label: "Agendamentos", labelEn: "Schedules" },
            { href: "/surgery/surgical-procedures", label: "Procedimentos cirúrgicos", labelEn: "Surgical procedures" },
            { href: "/surgery/surgeries", label: "Cirurgias", labelEn: "Surgeries" },
            { href: "/surgery/operating-rooms", label: "Blocos", labelEn: "Operating rooms" },
            { href: "/surgery/teams", label: "Equipas", labelEn: "Teams" },
            { href: "/surgery/materials", label: "Materiais", labelEn: "Materials" },
            { href: "/surgery/consumptions", label: "Consumos", labelEn: "Consumptions" },
            { href: "/surgery/recovery", label: "Recobro", labelEn: "Recovery" },
            { href: "/surgery/authorizations", label: "Autorizações", labelEn: "Authorizations" },
            { href: "/surgery/operative-reports", label: "Relatórios operatórios", labelEn: "Operative reports" },
            { href: "/surgery/safety-checklists", label: "Checklists", labelEn: "Safety checklists" },
            { href: "/surgery/documents", label: "Documentos", labelEn: "Documents" },
            { href: "/surgery/billing", label: "Faturação", labelEn: "Billing" },
        ],
    },
    {
        baseHref: "/occupational-medicine",
        tabs: [{ href: "/occupational-medicine", label: "Painel", labelEn: "Overview" }],
    },
    {
        baseHref: "/requests",
        tabs: [
            { href: "/requests", label: "Painel", labelEn: "Overview" },
            { href: "/requests/pendentes", label: "Pendentes", labelEn: "Pending" },
        ],
    },
    {
        baseHref: "/pharmacy",
        tabs: [
            { href: "/pharmacy", label: "Painel", labelEn: "Overview" },
            { href: "/pharmacy/products", label: "Produtos", labelEn: "Products" },
            { href: "/pharmacy/product-categories", label: "Categorias", labelEn: "Categories" },
            { href: "/pharmacy/parent-categories", label: "Categorias-pai", labelEn: "Parent categories" },
            { href: "/pharmacy/lots", label: "Lotes", labelEn: "Lots" },
            { href: "/pharmacy/movements", label: "Movimentos", labelEn: "Movements" },
            { href: "/pharmacy/inventory-movements", label: "Movimentos de inventário", labelEn: "Inventory movements" },
            { href: "/pharmacy/sales", label: "Vendas", labelEn: "Sales" },
            { href: "/pharmacy/sale-items", label: "Itens de venda", labelEn: "Sale items" },
            { href: "/pharmacy/material-requests", label: "Pedidos de material", labelEn: "Material requests" },
            { href: "/pharmacy/material-requisitions", label: "Requisições", labelEn: "Requisitions" },
            { href: "/pharmacy/material-requisition-items", label: "Itens de requisição", labelEn: "Requisition items" },
        ],
    },
    {
        baseHref: "/warehouse",
        tabs: [
            { href: "/warehouse", label: "Painel", labelEn: "Overview" },
            { href: "/warehouse/items", label: "Itens", labelEn: "Items" },
            { href: "/warehouse/item-categories", label: "Categorias", labelEn: "Categories" },
            { href: "/warehouse/lots", label: "Lotes", labelEn: "Lots" },
            { href: "/warehouse/storage-locations", label: "Localizações", labelEn: "Locations" },
            { href: "/warehouse/warehouses", label: "Armazéns", labelEn: "Warehouses" },
            { href: "/warehouse/stock-levels", label: "Níveis de stock", labelEn: "Stock levels" },
            { href: "/warehouse/stock-movements", label: "Movimentos", labelEn: "Stock movements" },
            { href: "/warehouse/stock-reservations", label: "Reservas", labelEn: "Reservations" },
            { href: "/warehouse/stock-transfers", label: "Transferências", labelEn: "Transfers" },
            { href: "/warehouse/goods-receipts", label: "Recepções", labelEn: "Receipts" },
            { href: "/warehouse/purchase-orders", label: "Compras", labelEn: "Purchase orders" },
            { href: "/warehouse/sales-orders", label: "Vendas", labelEn: "Sales orders" },
            { href: "/warehouse/pick-lists", label: "Separação", labelEn: "Pick lists" },
            { href: "/warehouse/shipments", label: "Expedições", labelEn: "Shipments" },
            { href: "/warehouse/cycle-counts", label: "Inventários cíclicos", labelEn: "Cycle counts" },
            { href: "/warehouse/replenishment-plans", label: "Reposição", labelEn: "Replenishment plans" },
            { href: "/warehouse/replenishment-suggestions", label: "Sugestões", labelEn: "Suggestions" },
        ],
    },
    {
        baseHref: "/payments",
        tabs: [
            { href: "/payments", label: "Painel", labelEn: "Overview" },
            { href: "/payments/payments", label: "Pagamentos", labelEn: "Payments" },
            { href: "/payments/transactions", label: "Transações", labelEn: "Transactions" },
            { href: "/payments/receipts", label: "Recibos", labelEn: "Receipts" },
            { href: "/payments/reconciliations", label: "Reconciliações", labelEn: "Reconciliations" },
            { href: "/payments/payment-histories", label: "Histórico", labelEn: "History" },
        ],
    },
    {
        baseHref: "/accounting",
        tabs: [
            { href: "/accounting", label: "Painel", labelEn: "Overview" },
            { href: "/accounting/accounts", label: "Contas", labelEn: "Accounts" },
            { href: "/accounting/bank-accounts", label: "Contas bancárias", labelEn: "Bank accounts" },
            { href: "/accounting/entries", label: "Lançamentos", labelEn: "Entries" },
            { href: "/accounting/movements", label: "Movimentos", labelEn: "Movements" },
            { href: "/accounting/reconciliations", label: "Reconciliações", labelEn: "Reconciliations" },
            { href: "/accounting/credit-notes", label: "Notas de crédito", labelEn: "Credit notes" },
            { href: "/accounting/reception", label: "Recepção", labelEn: "Reception" },
        ],
    },
    {
        baseHref: "/human_resources",
        tabs: [
            { href: "/human_resources", label: "Painel", labelEn: "Overview" },
            { href: "/human_resources/employees", label: "Funcionários", labelEn: "Employees" },
            { href: "/human_resources/contracts", label: "Contratos", labelEn: "Contracts" },
            { href: "/human_resources/attendance", label: "Assiduidade", labelEn: "Attendance" },
            { href: "/human_resources/absences", label: "Faltas", labelEn: "Absences" },
            { href: "/human_resources/work-schedules", label: "Horários", labelEn: "Schedules" },
            { href: "/human_resources/job-titles", label: "Cargos", labelEn: "Job titles" },
            { href: "/human_resources/professions", label: "Profissões", labelEn: "Professions" },
            { href: "/human_resources/payrolls", label: "Folhas", labelEn: "Payrolls" },
            { href: "/human_resources/payroll-runs", label: "Processamentos", labelEn: "Payroll runs" },
            { href: "/human_resources/payroll-items", label: "Itens salariais", labelEn: "Payroll items" },
            { href: "/human_resources/vacations", label: "Férias", labelEn: "Vacations" },
            { href: "/human_resources/vacation-balances", label: "Saldos de férias", labelEn: "Vacation balances" },
            { href: "/human_resources/salary-history", label: "Histórico salarial", labelEn: "Salary history" },
            { href: "/human_resources/overtimes", label: "Horas extra", labelEn: "Overtimes" },
            { href: "/human_resources/leave-permissions", label: "Dispensas", labelEn: "Leave permissions" },
            { href: "/human_resources/terminations", label: "Cessações", labelEn: "Terminations" },
            { href: "/human_resources/disciplinary-processes", label: "Disciplinares", labelEn: "Disciplinary processes" },
            { href: "/human_resources/employee-documents", label: "Documentos", labelEn: "Documents" },
            { href: "/human_resources/family-dependents", label: "Dependentes", labelEn: "Dependents" },
        ],
    },
    {
        baseHref: "/monitoring",
        tabs: [
            { href: "/monitoring", label: "Painel", labelEn: "Overview" },
            { href: "/monitoring/command-center", label: "Centro de comando", labelEn: "Command center" },
            { href: "/monitoring/errors", label: "Erros", labelEn: "Errors" },
            { href: "/monitoring/system-errors", label: "Erros de sistema", labelEn: "System errors" },
            { href: "/monitoring/telemetry", label: "Telemetria", labelEn: "Telemetry" },
            { href: "/monitoring/export-jobs", label: "Exportações", labelEn: "Export jobs" },
            { href: "/monitoring/transactional-outbox-events", label: "Outbox", labelEn: "Transactional outbox" },
            { href: "/monitoring/cloud-control", label: "Cloud control", labelEn: "Cloud control" },
        ],
    },
    {
        baseHref: "/ai",
        tabs: [
            { href: "/ai", label: "Painel", labelEn: "Overview" },
            { href: "/ai/investigations", label: "Investigações", labelEn: "Investigations" },
            { href: "/ai/tasks", label: "Tarefas", labelEn: "Tasks" },
        ],
    },
    {
        baseHref: "/audit",
        tabs: [
            { href: "/audit", label: "Painel", labelEn: "Overview" },
            { href: "/audit/users", label: "Utilizadores", labelEn: "Users" },
        ],
    },
    {
        baseHref: "/entities",
        tabs: [{ href: "/entities", label: "Entidades", labelEn: "Entities" }],
    },
    {
        baseHref: "/invoices",
        tabs: [{ href: "/invoices", label: "Faturas", labelEn: "Invoices" }],
    },
    {
        baseHref: "/receipts",
        tabs: [{ href: "/receipts", label: "Recibos", labelEn: "Receipts" }],
    },
    {
        baseHref: "/statistics",
        tabs: [{ href: "/statistics", label: "Estatísticas", labelEn: "Statistics" }],
    },
    {
        baseHref: "/notifications",
        tabs: [{ href: "/notifications", label: "Notificações", labelEn: "Notifications" }],
    },
    {
        baseHref: "/reports",
        tabs: [{ href: "/reports", label: "Relatórios", labelEn: "Reports" }],
    },
    {
        baseHref: "/equipment/equipments",
        tabs: [{ href: "/equipment/equipments", label: "Equipamentos", labelEn: "Equipment" }],
    },
    {
        baseHref: "/workspaces",
        tabs: [{ href: "/workspaces", label: "Áreas de trabalho", labelEn: "Workspaces" }],
    },
]

function normalize(pathname: string | null | undefined): string {
    const value = (pathname || "").trim()
    if (!value) return "/"
    if (value === "/") return value
    return value.endsWith("/") ? value.slice(0, -1) : value
}

function isActive(pathname: string, href: string): boolean {
    const current = normalize(pathname)
    const target = normalize(href)
    if (current === target) return true
    if (target === "/") return current === "/"
    return current.startsWith(`${target}/`)
}

function resolveModule(pathname: string): ModuleNavConfig | null {
    const current = normalize(pathname)
    return (
        MODULE_NAVS
            .slice()
            .sort((a, b) => b.baseHref.length - a.baseHref.length)
            .find((entry) => isActive(current, entry.baseHref)) || null
    )
}

export default function ModuleSubNav() {
    const pathname = usePathname() || "/"
    const router = useRouter()
    const { t } = useLanguage()
    const { user } = useAuth()
    const moduleNav = resolveModule(pathname)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(false)
    const navScrollerRef = useRef<HTMLDivElement>(null)
    const visibleTabs = moduleNav?.tabs.filter((tab) => {
        if (!tab.groups?.length) return true
        return userHasAnyGroup(user, tab.groups)
    }) || []

    const updateNavScrollState = useCallback(() => {
        const scroller = navScrollerRef.current
        if (!scroller) return
        const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth
        setCanScrollLeft(scroller.scrollLeft > 4)
        setCanScrollRight(scroller.scrollLeft < maxScrollLeft - 4)
    }, [])

    const scrollModuleNav = useCallback((direction: "left" | "right") => {
        const scroller = navScrollerRef.current
        if (!scroller) return
        const distance = Math.max(220, Math.floor(scroller.clientWidth * 0.72))
        scroller.scrollBy({
            left: direction === "right" ? distance : -distance,
            behavior: "smooth",
        })
        window.setTimeout(updateNavScrollState, 260)
    }, [updateNavScrollState])

    useEffect(() => {
        const scroller = navScrollerRef.current
        if (!scroller) return

        updateNavScrollState()
        scroller.addEventListener("scroll", updateNavScrollState, { passive: true })
        window.addEventListener("resize", updateNavScrollState)
        return () => {
            scroller.removeEventListener("scroll", updateNavScrollState)
            window.removeEventListener("resize", updateNavScrollState)
        }
    }, [moduleNav, updateNavScrollState])

    if (!moduleNav || !visibleTabs.length) return null

    return (
        <nav className="shrink-0 border-b border-border/50 bg-primary/[0.06] backdrop-blur supports-[backdrop-filter]:bg-primary/[0.07] dark:bg-primary/[0.09]">
            <div className="flex items-center gap-1 px-px py-px">
                <button
                    type="button"
                    onClick={() => {
                        if (typeof window !== "undefined" && window.history.length > 1) {
                            router.back()
                            return
                        }
                        router.push(moduleNav.baseHref)
                    }}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-border/80 bg-background/80 px-2 text-xs font-semibold text-foreground-2 shadow-sm transition-colors hover:border-primary/35 hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                >
                    <ChevronLeft size={14} />
                    {t("Voltar", "Back")}
                </button>

                <button
                    type="button"
                    onClick={() => scrollModuleNav("left")}
                    disabled={!canScrollLeft}
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background/80 text-foreground-2 shadow-sm transition hover:border-primary/35 hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-0 ${
                        canScrollLeft ? "" : "invisible"
                    }`}
                    aria-label={t("Mostrar atalhos anteriores", "Show previous shortcuts")}
                    title={t("Mostrar atalhos anteriores", "Show previous shortcuts")}
                >
                    <ChevronLeft size={15} />
                </button>

                <div
                    ref={navScrollerRef}
                    className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {visibleTabs.map((tab) => {
                        const active = isActive(pathname, tab.href)
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`inline-flex h-7 shrink-0 items-center rounded-full border text-xs font-medium transition-all duration-200 ease-out ${
                                    active
                                        ? "border-primary/35 bg-gradient-to-b from-primary/15 to-primary/8 px-3 text-primary shadow-sm"
                                        : "border-transparent px-1.5 text-foreground-2 hover:border-primary/20 hover:bg-primary/[0.06] hover:text-foreground"
                                }`}
                            >
                                {t(tab.label, tab.labelEn || tab.label)}
                            </Link>
                        )
                    })}
                </div>

                <button
                    type="button"
                    onClick={() => scrollModuleNav("right")}
                    disabled={!canScrollRight}
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background/80 text-foreground-2 shadow-sm transition hover:border-primary/35 hover:bg-primary/8 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-0 ${
                        canScrollRight ? "" : "invisible"
                    }`}
                    aria-label={t("Mostrar próximos atalhos", "Show next shortcuts")}
                    title={t("Mostrar próximos atalhos", "Show next shortcuts")}
                >
                    <ChevronRight size={15} />
                </button>
            </div>
        </nav>
    )
}
