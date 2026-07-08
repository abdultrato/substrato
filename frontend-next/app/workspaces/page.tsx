"use client"

import { Suspense, useCallback, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Activity,
  ArrowLeft,
  BrainCircuit,
  Cat,
  CreditCard,
  Eye,
  GraduationCap,
  HeartPulse,
  Inbox,
  Microscope,
  PackageSearch,
  Pill,
  School,
  Smile,
  Stethoscope,
  Syringe,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react"

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

function workspaceTone(key: string) {
  switch (key) {
    case "health":
      return {
        panel:
          "border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-card to-card hover:border-violet-300 dark:border-violet-900/40 dark:from-violet-950/25 dark:via-card dark:to-card",
        accent: "bg-violet-500/10 text-violet-700 ring-violet-500/15 dark:bg-violet-500/15 dark:text-violet-300",
        bar: "bg-violet-500",
        glow: "from-violet-500/12 via-violet-500/0 to-transparent",
        title: "text-violet-950 dark:text-violet-50",
        description: "text-violet-900/70 dark:text-violet-200/70",
      }
    case "education":
      return {
        panel:
          "border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-card to-card hover:border-sky-300 dark:border-sky-900/40 dark:from-sky-950/25 dark:via-card dark:to-card",
        accent: "bg-sky-500/10 text-sky-700 ring-sky-500/15 dark:bg-sky-500/15 dark:text-sky-300",
        bar: "bg-sky-500",
        glow: "from-sky-500/12 via-sky-500/0 to-transparent",
        title: "text-sky-950 dark:text-sky-50",
        description: "text-sky-900/70 dark:text-sky-200/70",
      }
    case "transport-logistics":
      return {
        panel:
          "border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-card to-card hover:border-amber-300 dark:border-amber-900/40 dark:from-amber-950/25 dark:via-card dark:to-card",
        accent: "bg-amber-500/10 text-amber-700 ring-amber-500/15 dark:bg-amber-500/15 dark:text-amber-300",
        bar: "bg-amber-500",
        glow: "from-amber-500/12 via-amber-500/0 to-transparent",
        title: "text-amber-950 dark:text-amber-50",
        description: "text-amber-900/70 dark:text-amber-200/70",
      }
    default:
      return {
        panel:
          "border-border/80 bg-gradient-to-br from-muted/60 via-card to-card hover:border-primary/25 dark:from-muted/30 dark:via-card dark:to-card",
        accent: "bg-primary/10 text-primary ring-primary/15",
        bar: "bg-primary",
        glow: "from-primary/12 via-primary/0 to-transparent",
        title: "text-foreground",
        description: "text-muted-foreground",
      }
  }
}

function WorkspaceCard({
  title,
  description,
  icon: Icon,
  href,
  onClick,
  toneKey,
  selected = false,
}: {
  title: string
  description: string
  icon: LucideIcon
  href?: string
  onClick?: () => void
  toneKey: string
  selected?: boolean
}) {
  const tone = workspaceTone(toneKey)
  const content = (
    <>
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${tone.glow} opacity-100`}
      />
      <span aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${tone.bar}`} />
      <div className={`relative flex h-full flex-col justify-between gap-4 rounded-[inherit] p-4 sm:p-5 ${tone.panel}`}>
        <div className="flex items-start justify-between gap-3">
          <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tone.accent}`}>
            <Icon size={20} strokeWidth={2.1} />
          </div>
          {selected ? (
            <span className="inline-flex items-center rounded-full border border-border/70 bg-card/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-sm">
              ativo
            </span>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <h3 className={`font-display text-base font-semibold leading-tight sm:text-[1.05rem] ${tone.title}`}>
            {title}
          </h3>
          <p className={`text-xs leading-relaxed sm:text-sm ${tone.description}`}>{description}</p>
        </div>
      </div>
    </>
  )

  const className =
    "group relative flex w-64 shrink-0 min-h-[152px] overflow-hidden rounded-xl border shadow-sm shadow-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={`${className} text-left`}>
      {content}
    </button>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox size={22} strokeWidth={2} />
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

const LAYER_KEYS: WorkspaceLayerKey[] = ["health", "education", "transport-logistics"]

function isWorkspaceLayerKey(value: string | null): value is WorkspaceLayerKey {
  return value !== null && (LAYER_KEYS as string[]).includes(value)
}

export default function WorkspacesPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">…</div>
        </AppLayout>
      }
    >
      <WorkspacesContent />
    </Suspense>
  )
}

function WorkspacesContent() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const areaParam = searchParams.get("area")
  const selectedLayerKey = isWorkspaceLayerKey(areaParam) ? areaParam : null

  const setSelectedLayerKey = useCallback(
    (key: WorkspaceLayerKey | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (key) {
        params.set("area", key)
      } else {
        params.delete("area")
      }
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname)
    },
    [pathname, router, searchParams]
  )

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
        icon: Smile,
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
        icon: Cat,
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
      <div className="mx-auto w-full max-w-6xl space-y-6 px-3 sm:px-0">
        <PageHeader
          title={selectedLayer ? selectedLayer.title : t("Selecionar área de trabalho", "Select workspace")}
          subtitle={
            selectedLayer
              ? selectedLayer.description
              : t(
                  "Escolha uma área para ver os módulos disponíveis para o seu perfil.",
                  "Choose an area to see the modules available for your profile."
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

            {visibleDepartments.length > 0 ? (
              <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
                {visibleDepartments.map((department) => {
                  return (
                    <WorkspaceCard
                      key={department.key}
                      title={department.title}
                      description={department.description}
                      icon={department.icon}
                      href={department.href}
                      onClick={() => storeScope(department.scope)}
                      toneKey={selectedLayer.key}
                    />
                  )
                })}
              </div>
            ) : (
              <EmptyState
                message={t(
                  "Não há módulos disponíveis para o seu perfil nesta área.",
                  "There are no modules available for your profile in this area."
                )}
              />
            )}
          </div>
        ) : visibleLayers.length > 0 ? (
          <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
            {visibleLayers.map((layer) => {
              return (
                <WorkspaceCard
                  key={layer.key}
                  title={layer.title}
                  description={layer.description}
                  icon={layer.icon}
                  toneKey={layer.key}
                  onClick={() => {
                    if (layer.key === "health") writeStoredWorkspaceScope("healthcare")
                    if (layer.key === "education") writeStoredWorkspaceScope("education")
                    setSelectedLayerKey(layer.key)
                  }}
                />
              )
            })}
          </div>
        ) : (
          <EmptyState
            message={t(
              "O seu perfil ainda não tem acesso a nenhuma área de trabalho. Contacte um administrador.",
              "Your profile does not have access to any workspace yet. Contact an administrator."
            )}
          />
        )}
      </div>
    </AppLayout>
  )
}
