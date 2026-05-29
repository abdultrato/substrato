"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Activity, BrainCircuit, CreditCard, Eye, GraduationCap, HeartPulse, Microscope, PackageSearch, Pill, School, Stethoscope, Syringe, Truck, Users } from "lucide-react"

import AppLayout from "@/components/layout/AppLayout"
import PageHeader from "@/components/ui/PageHeader"
import { useAuth } from "@/hooks/useAuth"
import { useLanguage } from "@/hooks/useLanguage"
import { GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { writeStoredWorkspaceScope } from "@/lib/workspaceScope"

export default function WorkspacesPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const router = useRouter()
  const showTeacherArea = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.PROFESSOR])
  const showDirectoriaArea = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.DIRETOR_ESCOLA, GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO])
  const showStudentArea = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.STUDENT, GROUPS.ENCARREGADO_EDUCACAO])
  const showErpWmsArea = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.CONTABILIDADE, GROUPS.FARMACIA, GROUPS.RECURSOS_HUMANOS])
  const showDentalArea = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.ODONTOLOGIA])
  const showVeterinaryArea = userHasAnyGroup(user, [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.VETERINARIA])
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

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader
          title={t("Selecionar workspace", "Select workspace")}
          subtitle={t(
            "Escolha o domínio principal para iniciar a sessão.",
            "Choose the main domain to start your session."
          )}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/healthcare"
            onClick={(event) => {
              event.preventDefault()
              writeStoredWorkspaceScope("healthcare")
              router.push("/healthcare")
            }}
            className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                <Stethoscope size={20} />
              </div>
              <div className="space-y-1">
                <div className="font-display text-lg font-semibold text-foreground">
                  Saúde
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Fluxos clínicos, laboratório, enfermagem, consultas e faturamento assistencial.",
                    "Clinical workflows, laboratory, nursing, consultations, and care billing."
                  )}
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/education"
            onClick={(event) => {
              event.preventDefault()
              writeStoredWorkspaceScope("education")
              router.push("/education")
            }}
            className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                <GraduationCap size={20} />
              </div>
              <div className="space-y-1">
                <div className="font-display text-lg font-semibold text-foreground">
                  Educação
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Fluxos académicos para docentes, estudantes, cursos, turmas e matrículas.",
                    "Academic workflows for teachers, students, courses, classes, and enrollments."
                  )}
                </p>
              </div>
            </div>
          </Link>

          {showErpWmsArea ? (
            <Link
              href="/warehouse"
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <PackageSearch size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    ERP e WMS
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Compras, reservas, separação, expedição, saldos e inventários com lógica empresarial.",
                      "Compras, reservas, separação, expedição, saldos e inventários com lógica empresarial."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showTransportationArea ? (
            <Link
              href="/transportation"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("neutral")
                router.push("/transportation")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <Truck size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Transporte
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Frota, motoristas, rastreamento, combustível, manutenção preventiva e rotas.",
                      "Fleet, drivers, tracking, fuel, preventive maintenance and routes."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showCreditFinancingArea ? (
            <Link
              href="/credit-financing"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("neutral")
                router.push("/credit-financing")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <CreditCard size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Créditos
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Consórcios de saúde, financiamento de procedimentos, convênios, reembolsos e bolsas.",
                      "Health consortiums, procedure financing, contracts, reimbursements and scholarships."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showDentalArea ? (
            <Link
              href="/dental"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("healthcare")
                router.push("/dental")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <Stethoscope size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Odontologia
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Consultas dentárias, odontograma, planos de tratamento e laboratório de prótese.",
                      "Dental appointments, odontogram, treatment plans and prosthesis laboratory."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showVeterinaryArea ? (
            <Link
              href="/veterinary"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("healthcare")
                router.push("/veterinary")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <Stethoscope size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Veterinária
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Animais, prontuários veterinários, vacinação, exames, internamentos e receitas.",
                      "Animals, veterinary records, vaccination, exams, admissions and prescriptions."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showClinicalPharmacyArea ? (
            <Link
              href="/clinical-pharmacy"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("healthcare")
                router.push("/clinical-pharmacy")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <Pill size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Farmácia Clínica
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Preparações IV, quimioterapia, TPN, interações, controlados e stewardship antibiótico.",
                      "IV preparations, chemotherapy, TPN, interactions, controlled drugs and antibiotic stewardship."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showTelemedicineArea ? (
            <Link
              href="/telemedicine"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("healthcare")
                router.push("/telemedicine")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <HeartPulse size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Telemedicina
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Sala virtual, triagem preliminar, dispositivos remotos, alertas e programas crónicos.",
                      "Virtual room, preliminary triage, remote devices, alerts and chronic programs."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showPublicHealthArea ? (
            <Link
              href="/public-health"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("healthcare")
                router.push("/public-health")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <Syringe size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Saúde Pública
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Vacinas, lotes, campanhas, metas por região, AEFI e notificações oficiais.",
                      "Vaccines, lots, campaigns, regional targets, AEFI and official notifications."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showPhysiotherapyArea ? (
            <Link
              href="/physiotherapy"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("healthcare")
                router.push("/physiotherapy")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <Stethoscope size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Fisioterapia
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Avaliações funcionais, planos de tratamento, evolução e aparelhos de reabilitação.",
                      "Functional assessments, treatment plans, progress and rehabilitation devices."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showOccupationalTherapyArea ? (
            <Link
              href="/occupational-therapy"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("healthcare")
                router.push("/occupational-therapy")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <HeartPulse size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Terapia Ocupacional
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Avaliações de AVD, função, adaptação laboral e planos terapêuticos individualizados.",
                      "ADL, function, workplace adaptation and individualized therapeutic plans."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showPhysicalTherapyArea ? (
            <Link
              href="/physical-therapy"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("healthcare")
                router.push("/physical-therapy")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <Activity size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Fisioterapia Especializada
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Evolução motora, planos especializados e integração com prescrições de fisioterapia e fonoaudiologia.",
                      "Motor progress, specialized plans and integration with physiotherapy and speech therapy prescriptions."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showRadiologyArea ? (
            <Link
              href="/radiology"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("healthcare")
                router.push("/radiology")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <Microscope size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Radiologia
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Exames de imagem, séries DICOM, laudos e eventos PACS.",
                      "Imaging exams, DICOM series, reports and PACS events."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showCardiologyArea ? (
            <Link
              href="/cardiology"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("healthcare")
                router.push("/cardiology")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <HeartPulse size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Cardiologia
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Ecocardiograma, teste ergométrico, Holter, medições e laudos cardiológicos.",
                      "Echocardiogram, stress test, Holter, measurements and cardiology reports."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showNeurologyArea ? (
            <Link
              href="/neurology"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("healthcare")
                router.push("/neurology")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <BrainCircuit size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Neurologia
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "EEG, potencial evocado, doppler transcraniano, medições e laudos neurológicos.",
                      "EEG, evoked potential, transcranial Doppler, measurements and neurology reports."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showOphthalmologyArea ? (
            <Link
              href="/ophthalmology"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("healthcare")
                router.push("/ophthalmology")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <Eye size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Oftalmologia
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Campo visual, topografia corneal, OCT, medições e laudos oftalmológicos.",
                      "Visual field, corneal topography, OCT, measurements and ophthalmology reports."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showTeacherArea ? (
            <Link
              href="/education/teacher"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("education")
                router.push("/education/teacher")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <Users size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Área do Professor
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Turmas lecionadas, estudantes e notas por disciplina.",
                      "Classes taught, students, and grades by discipline."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showDirectoriaArea ? (
            <Link
              href="/education/directoria"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("education")
                router.push("/education/directoria")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <School size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Área da Directoria
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Visão global da escola com professores, estudantes e secções.",
                      "School-wide view with teachers, students, and sections."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          {showStudentArea ? (
            <Link
              href="/education/student"
              onClick={(event) => {
                event.preventDefault()
                writeStoredWorkspaceScope("education")
                router.push("/education/student")
              }}
              className="group block rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/35 hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-border bg-primary-soft p-2.5 text-primary">
                  <GraduationCap size={20} />
                </div>
                <div className="space-y-1">
                  <div className="font-display text-lg font-semibold text-foreground">
                    Área do Estudante
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Aulas, presenças e notas do estudante autenticado.",
                      "Classes, attendance, and grades for the authenticated student."
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ) : null}
        </div>
      </div>
    </AppLayout>
  )
}
