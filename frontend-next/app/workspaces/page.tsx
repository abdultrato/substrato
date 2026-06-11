"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowLeft,
  BrainCircuit,
  CreditCard,
  Eye,
  GraduationCap,
  HeartPulse,
  Microscope,
  PackageSearch,
  Pill,
  School,
  Stethoscope,
  Syringe,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react"

import { lucideToDataUrl } from "@/lib/icon-svg"
import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { writeStoredWorkspaceScope } from "@/lib/workspaceScope"

type WorkspaceLayerKey = "health" | "education" | "transport-logistics"
type DepartmentScope = "healthcare" | "education" | "neutral"

type DepartmentCard = {
  key: string
  title: string
  description: string
  href: string
  icon: LucideIcon
  visible: boolean
  scope: DepartmentScope
}

type WorkspaceLayer = {
  key: WorkspaceLayerKey
  title: string
  description: string
  icon: LucideIcon
  visible: boolean
  departments: DepartmentCard[]
}

function storeScope(scope: DepartmentScope) {
  if (scope === "healthcare" || scope === "education") {
    writeStoredWorkspaceScope(scope)
  }
}

export default function WorkspacesPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [selectedLayerKey, setSelectedLayerKey] = useState<WorkspaceLayerKey | null>(null)

  const canUseClinicalHealth = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.ENFERMAGEM,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
    GROUPS.LABORATORIO,
  ])
  const showTeacherArea = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.PROFESSOR])
  const showDirectoriaArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.DIRETOR_ESCOLA,
    GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
  ])
  const showStudentArea = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.STUDENT, GROUPS.ENCARREGADO_EDUCACAO])
  const showErpWmsArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.CONTABILIDADE,
    GROUPS.FARMACIA,
    GROUPS.RECURSOS_HUMANOS,
  ])
  const showDentalArea = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.ODONTOLOGIA])
  const showVeterinaryArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.MEDICINA,
    GROUPS.VETERINARIA,
  ])
  const showClinicalPharmacyArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
    GROUPS.FARMACIA,
    GROUPS.FARMACIA_CLINICA,
  ])
  const showTelemedicineArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
    GROUPS.ENFERMAGEM,
    GROUPS.TELEMEDICINA,
  ])
  const showPublicHealthArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
    GROUPS.ENFERMAGEM,
    GROUPS.LABORATORIO,
    GROUPS.SAUDE_PUBLICA,
  ])
  const showPhysiotherapyArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
    GROUPS.FISIOTERAPIA,
  ])
  const showOccupationalTherapyArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
    GROUPS.TERAPIA_OCUPACIONAL,
  ])
  const showPhysicalTherapyArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
    GROUPS.FISIOTERAPIA,
    GROUPS.FONOAUDIOLOGIA,
  ])
  const showRadiologyArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.LABORATORIO,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
    GROUPS.RADIOLOGIA,
  ])
  const showPathologyArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.LABORATORIO,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
  ])
  const showCardiologyArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
    GROUPS.CARDIOLOGIA,
  ])
  const showNeurologyArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
    GROUPS.NEUROLOGIA,
  ])
  const showOphthalmologyArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
    GROUPS.OFTALMOLOGIA,
  ])
  const showTransportationArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.LOGISTICA,
    GROUPS.MANUTENCAO,
    GROUPS.CONTABILIDADE,
    GROUPS.RECURSOS_HUMANOS,
  ])
  const showCreditFinancingArea = userHasAnyGroup(user, [
    GROUPS.ADMIN,
    GROUPS.RECEPCAO,
    GROUPS.CONTABILIDADE,
    GROUPS.MEDICINA,
    GROUPS.MEDICINA_OCUPACIONAL,
    GROUPS.DIRETOR_ESCOLA,
    GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
    GROUPS.CREDITO_FINANCIAMENTO,
  ])

  const layers = useMemo<WorkspaceLayer[]>(() => {
    const healthDepartments: DepartmentCard[] = [
      {
        key: "healthcare",
        title: "Serviços Clínicos",
        description: t(
          "Fluxos clínicos, laboratório, enfermagem, consultas e faturamento assistencial.",
          "Clinical workflows, laboratory, nursing, consultations, and care billing."
        ),
        href: "/healthcare",
        icon: Stethoscope,
        visible: canUseClinicalHealth,
        scope: "healthcare",
      },
      {
        key: "dental",
        title: "Odontologia",
        description: t(
          "Consultas dentárias, odontograma, planos de tratamento e laboratório de prótese.",
          "Dental appointments, odontogram, treatment plans and prosthesis laboratory."
        ),
        href: "/dental",
        icon: Stethoscope,
        visible: showDentalArea,
        scope: "healthcare",
      },
      {
        key: "veterinary",
        title: "Veterinária",
        description: t(
          "Animais, prontuários veterinários, vacinação, exames, internamentos e receitas.",
          "Animals, veterinary records, vaccination, exams, admissions and prescriptions."
        ),
        href: "/veterinary",
        icon: Stethoscope,
        visible: showVeterinaryArea,
        scope: "healthcare",
      },
      {
        key: "clinical-pharmacy",
        title: "Farmácia Clínica",
        description: t(
          "Preparações IV, quimioterapia, TPN, interações, controlados e stewardship antibiótico.",
          "IV preparations, chemotherapy, TPN, interactions, controlled drugs and antibiotic stewardship."
        ),
        href: "/clinical-pharmacy",
        icon: Pill,
        visible: showClinicalPharmacyArea,
        scope: "healthcare",
      },
      {
        key: "telemedicine",
        title: "Telemedicina",
        description: t(
          "Sala virtual, triagem preliminar, dispositivos remotos, alertas e programas crónicos.",
          "Virtual room, preliminary triage, remote devices, alerts and chronic programs."
        ),
        href: "/telemedicine",
        icon: HeartPulse,
        visible: showTelemedicineArea,
        scope: "healthcare",
      },
      {
        key: "public-health",
        title: "Saúde Pública",
        description: t(
          "Vacinas, lotes, campanhas, metas por região, AEFI e notificações oficiais.",
          "Vaccines, lots, campaigns, regional targets, AEFI and official notifications."
        ),
        href: "/public-health",
        icon: Syringe,
        visible: showPublicHealthArea,
        scope: "healthcare",
      },
      {
        key: "physiotherapy",
        title: "Fisioterapia",
        description: t(
          "Avaliações funcionais, planos de tratamento, evolução e aparelhos de reabilitação.",
          "Functional assessments, treatment plans, progress and rehabilitation devices."
        ),
        href: "/physiotherapy",
        icon: Activity,
        visible: showPhysiotherapyArea,
        scope: "healthcare",
      },
      {
        key: "occupational-therapy",
        title: "Terapia Ocupacional",
        description: t(
          "Avaliações de AVD, função, adaptação laboral e planos terapêuticos individualizados.",
          "ADL, function, workplace adaptation and individualized therapeutic plans."
        ),
        href: "/occupational-therapy",
        icon: HeartPulse,
        visible: showOccupationalTherapyArea,
        scope: "healthcare",
      },
      {
        key: "physical-therapy",
        title: "Fisioterapia Especializada",
        description: t(
          "Evolução motora, planos especializados e integração com prescrições de fisioterapia e fonoaudiologia.",
          "Motor progress, specialized plans and integration with physiotherapy and speech therapy prescriptions."
        ),
        href: "/physical-therapy",
        icon: Activity,
        visible: showPhysicalTherapyArea,
        scope: "healthcare",
      },
      {
        key: "radiology",
        title: "Radiologia",
        description: t(
          "Exames de imagem, séries DICOM, laudos e eventos PACS.",
          "Imaging exams, DICOM series, reports and PACS events."
        ),
        href: "/radiology",
        icon: Microscope,
        visible: showRadiologyArea,
        scope: "healthcare",
      },
      {
        key: "pathology",
        title: "Patologia",
        description: t(
          "Recepção de amostras, macroscopia, histologia, citologia, imunohistoquímica, laudos e arquivo.",
          "Sample reception, grossing, histology, cytology, immunohistochemistry, reports and archive."
        ),
        href: "/pathology",
        icon: Microscope,
        visible: showPathologyArea,
        scope: "healthcare",
      },
      {
        key: "cardiology",
        title: "Cardiologia",
        description: t(
          "Ecocardiograma, teste ergométrico, Holter, medições e laudos cardiológicos.",
          "Echocardiogram, stress test, Holter, measurements and cardiology reports."
        ),
        href: "/cardiology",
        icon: HeartPulse,
        visible: showCardiologyArea,
        scope: "healthcare",
      },
      {
        key: "neurology",
        title: "Neurologia",
        description: t(
          "EEG, potencial evocado, doppler transcraniano, medições e laudos neurológicos.",
          "EEG, evoked potential, transcranial Doppler, measurements and neurology reports."
        ),
        href: "/neurology",
        icon: BrainCircuit,
        visible: showNeurologyArea,
        scope: "healthcare",
      },
      {
        key: "ophthalmology",
        title: "Oftalmologia",
        description: t(
          "Campo visual, topografia corneal, OCT, medições e laudos oftalmológicos.",
          "Visual field, corneal topography, OCT, measurements and ophthalmology reports."
        ),
        href: "/ophthalmology",
        icon: Eye,
        visible: showOphthalmologyArea,
        scope: "healthcare",
      },
      {
        key: "credit-financing",
        title: "Créditos",
        description: t(
          "Consórcios de saúde, financiamento de procedimentos, convênios, reembolsos e bolsas.",
          "Health consortiums, procedure financing, contracts, reimbursements and scholarships."
        ),
        href: "/credit-financing",
        icon: CreditCard,
        visible: showCreditFinancingArea,
        scope: "neutral",
      },
    ]

    const educationDepartments: DepartmentCard[] = [
      {
        key: "education",
        title: "Educação",
        description: t(
          "Fluxos académicos para docentes, estudantes, cursos, turmas e matrículas.",
          "Academic workflows for teachers, students, courses, classes, and enrollments."
        ),
        href: "/education",
        icon: GraduationCap,
        visible: userHasAnyGroup(user, [
          GROUPS.ADMIN,
          GROUPS.PROFESSOR,
          GROUPS.DIRETOR_ESCOLA,
          GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO,
          GROUPS.STUDENT,
          GROUPS.ENCARREGADO_EDUCACAO,
        ]),
        scope: "education",
      },
      {
        key: "teacher",
        title: "Área do Professor",
        description: t(
          "Turmas lecionadas, estudantes e notas por disciplina.",
          "Classes taught, students, and grades by discipline."
        ),
        href: "/education/teacher",
        icon: Users,
        visible: showTeacherArea,
        scope: "education",
      },
      {
        key: "directoria",
        title: "Área da Directoria",
        description: t(
          "Visão global da escola com professores, estudantes e secções.",
          "School-wide view with teachers, students, and sections."
        ),
        href: "/education/directoria",
        icon: School,
        visible: showDirectoriaArea,
        scope: "education",
      },
      {
        key: "student",
        title: "Área do Estudante",
        description: t(
          "Aulas, presenças e notas do estudante autenticado.",
          "Classes, attendance, and grades for the authenticated student."
        ),
        href: "/education/student",
        icon: GraduationCap,
        visible: showStudentArea,
        scope: "education",
      },
    ]

    const transportDepartments: DepartmentCard[] = [
      {
        key: "transportation",
        title: "Transporte",
        description: t(
          "Frota, motoristas, rastreamento, combustível, manutenção preventiva e rotas.",
          "Fleet, drivers, tracking, fuel, preventive maintenance and routes."
        ),
        href: "/transportation",
        icon: Truck,
        visible: showTransportationArea,
        scope: "neutral",
      },
      {
        key: "warehouse",
        title: "ERP e WMS",
        description: t(
          "Compras, reservas, separação, expedição, saldos e inventários com lógica empresarial.",
          "Purchasing, reservations, picking, shipping, balances and inventories with business logic."
        ),
        href: "/warehouse",
        icon: PackageSearch,
        visible: showErpWmsArea,
        scope: "neutral",
      },
    ]

    return [
      {
        key: "health",
        title: "Saúde",
        description: t(
          "Clínica, diagnóstico, saúde pública, terapias, veterinária e serviços assistenciais.",
          "Clinical care, diagnostics, public health, therapies, veterinary care and healthcare services."
        ),
        icon: Stethoscope,
        visible: healthDepartments.some((department) => department.visible),
        departments: healthDepartments,
      },
      {
        key: "education",
        title: "Educação",
        description: t(
          "Fluxos académicos, direcção escolar, professores, estudantes e progresso estudantil.",
          "Academic workflows, school management, teachers, students and learning progress."
        ),
        icon: GraduationCap,
        visible: educationDepartments.some((department) => department.visible),
        departments: educationDepartments,
      },
      {
        key: "transport-logistics",
        title: "Transportes e Logística",
        description: t(
          "Frota, rotas, manutenção, compras, reservas, armazém, separação e expedição.",
          "Fleet, routes, maintenance, purchasing, reservations, warehouse, picking and shipping."
        ),
        icon: Truck,
        visible: transportDepartments.some((department) => department.visible),
        departments: transportDepartments,
      },
    ]
  }, [
    canUseClinicalHealth,
    showCardiologyArea,
    showClinicalPharmacyArea,
    showCreditFinancingArea,
    showDentalArea,
    showDirectoriaArea,
    showErpWmsArea,
    showNeurologyArea,
    showOccupationalTherapyArea,
    showOphthalmologyArea,
    showPhysicalTherapyArea,
    showPhysiotherapyArea,
    showPathologyArea,
    showPublicHealthArea,
    showRadiologyArea,
    showStudentArea,
    showTeacherArea,
    showTelemedicineArea,
    showTransportationArea,
    showVeterinaryArea,
    t,
    user,
  ])

  const visibleLayers = layers.filter((layer) => layer.visible)
  const selectedLayer = selectedLayerKey ? layers.find((layer) => layer.key === selectedLayerKey) || null : null
  const visibleDepartments = selectedLayer?.departments.filter((department) => department.visible) || []

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader
          title={selectedLayer ? selectedLayer.title : t("Selecionar área de trabalho", "Select workspace")}
          subtitle={
            selectedLayer
              ? t("Escolha o departamento para continuar.", "Choose the department to continue.")
              : t(
                  "Escolha primeiro a área principal; os departamentos aparecem no passo seguinte.",
                  "Choose the main area first; departments appear in the next step."
                )
          }
        />

        {selectedLayer ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setSelectedLayerKey(null)}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <ArrowLeft size={16} />
              {t("Voltar às áreas principais", "Back to main areas")}
            </button>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleDepartments.map((department) => {
                const iconUrl = lucideToDataUrl(department.icon)
                return (
                  <Link
                    key={department.key}
                    href={department.href}
                    onClick={() => storeScope(department.scope)}
                    className="group relative flex min-h-[100px] flex-col justify-end overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: "#1e293b",
                        opacity: 0.09,
                        WebkitMaskImage: `url("${iconUrl}")`,
                        WebkitMaskRepeat: "no-repeat",
                        WebkitMaskSize: "52%",
                        WebkitMaskPosition: "center 30%",
                        maskImage: `url("${iconUrl}")`,
                        maskRepeat: "no-repeat",
                        maskSize: "52%",
                        maskPosition: "center 30%",
                      }}
                    />
                    <p className="relative font-display text-lg font-semibold text-foreground">
                      {department.title}
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {visibleLayers.map((layer) => {
              const iconUrl = lucideToDataUrl(layer.icon)
              return (
                <button
                  key={layer.key}
                  type="button"
                  onClick={() => {
                    if (layer.key === "health") writeStoredWorkspaceScope("healthcare")
                    if (layer.key === "education") writeStoredWorkspaceScope("education")
                    setSelectedLayerKey(layer.key)
                  }}
                  className="group relative flex min-h-[100px] h-full flex-col justify-end overflow-hidden rounded-lg border border-border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: "#1e293b",
                      opacity: 0.09,
                      WebkitMaskImage: `url("${iconUrl}")`,
                      WebkitMaskRepeat: "no-repeat",
                      WebkitMaskSize: "52%",
                      WebkitMaskPosition: "center 30%",
                      maskImage: `url("${iconUrl}")`,
                      maskRepeat: "no-repeat",
                      maskSize: "52%",
                      maskPosition: "center 30%",
                    }}
                  />
                  <p className="relative font-display text-lg font-semibold text-foreground">{layer.title}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
