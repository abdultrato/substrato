"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo } from "react"
import { SessionUser } from "@/lib/session"
import { getDefaultWorkspaceHref, GROUPS, userHasAnyGroup } from "@/lib/rbac"
import { useLanguage } from "@/hooks/useLanguage"
import { useWorkspaceScope } from "@/hooks/useWorkspaceScope"
import {
    Briefcase as BriefcaseIcon,

    Users,
    FileText,
    FlaskConical,
    ClipboardList,
    Receipt,
    Microscope,
    Droplet,
    HeartPulse,
    Stethoscope,
    ScrollText,
    Baby,
    Scissors,
    Pill,
    PackageSearch,
    Calculator,
    Shield,
    Syringe,
    Layers,
    Activity,
    BarChart3,
    CalendarClock,
    CreditCard,
    Bell,
    Bug,
    Settings,
    GraduationCap,
    Bot,
    BrainCircuit,
    Eye,
    Truck,
    Moon,
    Sun,
    X,
} from "lucide-react"
import useTheme from "@/hooks/useTheme"

interface Props {
    user: SessionUser | null
    open?: boolean
    onClose?: () => void
    className?: string
}

interface NavItem {
    href: string
    label: string
    labelEn?: string
    icon: any
    groups?: string[]
    desc?: string
    descEn?: string
}

interface NavSection {
    label: string
    labelEn: string
    hrefs: string[]
}

const ALL_GROUPS = Object.values(GROUPS)
const SESSION_PREFETCHED_ROUTES = new Set<string>()
const PRIORITY_PREFETCH_DELAY_MS = 120
const PRIORITY_PREFETCH_LIMIT = 5

/**
 * Definição dos menus com RBAC
 */
const NAV_ITEMS: NavItem[] = [
    { href: "/workspaces", label: "Áreas de trabalho", labelEn: "Workspaces", icon: Layers, desc: "Escolha entre Saúde, Educação e Transportes e Logística", descEn: "Choose between Healthcare, Education, and Transport & Logistics", groups: [GROUPS.ADMIN] },
    { href: "/", label: "Painel", labelEn: "Dashboard", icon: ClipboardList, desc: "Visão geral e indicadores", descEn: "Overview and indicators", groups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE] },
    { href: "/healthcare", label: "Saúde", labelEn: "Healthcare", icon: Stethoscope, desc: "Hub clínico unificado", descEn: "Unified clinical hub", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.LABORATORIO, GROUPS.ENFERMAGEM, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.FARMACIA, GROUPS.FARMACIA_CLINICA, GROUPS.TELEMEDICINA, GROUPS.SAUDE_PUBLICA, GROUPS.FISIOTERAPIA, GROUPS.RADIOLOGIA, GROUPS.CARDIOLOGIA, GROUPS.NEUROLOGIA, GROUPS.OFTALMOLOGIA, GROUPS.TERAPIA_OCUPACIONAL, GROUPS.FONOAUDIOLOGIA] },
    { href: "/reception", label: "Recepção", labelEn: "Reception", icon: BriefcaseIcon, desc: "Triagem e atendimento", descEn: "Triage and attendance", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO] },
    { href: "/patients", label: "Pacientes", labelEn: "Patients", icon: Users, desc: "Cadastro e histórico", descEn: "Registration and history", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.ENFERMAGEM, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL] },
    { href: "/consultations", label: "Consultas", labelEn: "Consultations", icon: CalendarClock, desc: "Agenda clínica", descEn: "Clinical schedule", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.CONTABILIDADE] },
    { href: "/education", label: "Educação", labelEn: "Education", icon: GraduationCap, desc: "Fluxos académicos de docência", descEn: "Academic teaching flows", groups: [GROUPS.ADMIN, GROUPS.PROFESSOR, GROUPS.DIRETOR_ESCOLA, GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO] },
    { href: "/education/teacher", label: "Área do Professor", labelEn: "Teacher Area", icon: GraduationCap, desc: "Turmas e estudantes por docência", descEn: "Classes and students by teaching scope", groups: [GROUPS.ADMIN, GROUPS.PROFESSOR, GROUPS.DIRETOR_ESCOLA, GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO] },
    { href: "/education/directoria", label: "Directoria", labelEn: "School Board", icon: GraduationCap, desc: "Visão global de professores e estudantes", descEn: "School-wide staff and students view", groups: [GROUPS.ADMIN, GROUPS.DIRETOR_ESCOLA, GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO] },
    { href: "/education/student", label: "Área do Estudante", labelEn: "Student Area", icon: GraduationCap, desc: "Aulas, notas e presença", descEn: "Classes, grades and attendance", groups: [GROUPS.ADMIN, GROUPS.STUDENT, GROUPS.ENCARREGADO_EDUCACAO] },
    { href: "/requests", label: "Requisições", labelEn: "Requests", icon: FileText, desc: "Pedidos clínicos", descEn: "Clinical requests", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL] },
    { href: "/medical-records", label: "Prontuário", labelEn: "Medical records", icon: ScrollText, desc: "Histórico médico", descEn: "Medical history", groups: [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL] },
    { href: "/medicine", label: "Medicina", labelEn: "Medicine", icon: Stethoscope, desc: "Atendimento médico", descEn: "Medical care", groups: [GROUPS.ADMIN, GROUPS.MEDICINA] },
    { href: "/clinical-pharmacy", label: "Farm. Clínica", labelEn: "Clinical pharmacy", icon: Pill, desc: "IV, controlados e stewardship", descEn: "IV, controlled drugs and stewardship", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.FARMACIA, GROUPS.FARMACIA_CLINICA] },
    { href: "/telemedicine", label: "Telemed.", labelEn: "Telemedicine", icon: HeartPulse, desc: "Sala virtual e monitoramento remoto", descEn: "Virtual room and remote monitoring", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.ENFERMAGEM, GROUPS.TELEMEDICINA] },
    { href: "/public-health", label: "Saúde Pública", labelEn: "Public health", icon: Syringe, desc: "Vacinas, campanhas, AEFI e notificações oficiais", descEn: "Vaccines, campaigns, AEFI and official notifications", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.ENFERMAGEM, GROUPS.LABORATORIO, GROUPS.SAUDE_PUBLICA] },
    { href: "/credit-financing", label: "Créditos", labelEn: "Credit financing", icon: CreditCard, desc: "Consórcios, reembolsos e bolsas", descEn: "Consortiums, reimbursements and scholarships", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.DIRETOR_ESCOLA, GROUPS.DIRETOR_ADJUNTO_PEDAGOGICO, GROUPS.CREDITO_FINANCIAMENTO] },
    { href: "/dental", label: "Odontologia", labelEn: "Dental", icon: Stethoscope, desc: "Agenda, odontograma e tratamentos", descEn: "Schedule, odontogram and treatments", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.ODONTOLOGIA] },
    { href: "/veterinary", label: "Veterinária", labelEn: "Veterinary", icon: HeartPulse, desc: "Animais, vacinação e internamentos", descEn: "Animals, vaccination and admissions", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.VETERINARIA] },
    { href: "/physiotherapy", label: "Fisioterapia", labelEn: "Physiotherapy", icon: Activity, desc: "Avaliação funcional e reabilitação", descEn: "Functional assessment and rehabilitation", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.FISIOTERAPIA] },
    { href: "/occupational-therapy", label: "Terapia Ocup.", labelEn: "Occupational therapy", icon: HeartPulse, desc: "AVD, função e adaptação", descEn: "ADL, function and adaptation", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.TERAPIA_OCUPACIONAL] },
    { href: "/physical-therapy", label: "Fisio Especial.", labelEn: "Specialized physio", icon: Activity, desc: "Planos motores especializados", descEn: "Specialized motor plans", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.FISIOTERAPIA, GROUPS.FONOAUDIOLOGIA] },
    { href: "/radiology", label: "Radiologia", labelEn: "Radiology", icon: Microscope, desc: "Imagem, laudos e PACS", descEn: "Imaging, reports and PACS", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.LABORATORIO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.RADIOLOGIA] },
    { href: "/cardiology", label: "Cardiologia", labelEn: "Cardiology", icon: HeartPulse, desc: "Eco, Holter e esforço", descEn: "Echo, Holter and stress tests", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.CARDIOLOGIA] },
    { href: "/neurology", label: "Neurologia", labelEn: "Neurology", icon: BrainCircuit, desc: "EEG e neurofisiologia", descEn: "EEG and neurophysiology", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.NEUROLOGIA] },
    { href: "/ophthalmology", label: "Oftalmologia", labelEn: "Ophthalmology", icon: Eye, desc: "Campo visual, OCT e córnea", descEn: "Visual field, OCT and cornea", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL, GROUPS.OFTALMOLOGIA] },
    { href: "/transportation", label: "Transporte", labelEn: "Transportation", icon: Truck, desc: "Frota, rotas e logística", descEn: "Fleet, routes and logistics", groups: [GROUPS.ADMIN, GROUPS.LOGISTICA, GROUPS.MANUTENCAO, GROUPS.CONTABILIDADE, GROUPS.RECURSOS_HUMANOS] },
    { href: "/nursing", label: "Enfermagem", labelEn: "Nursing", icon: HeartPulse, desc: "Cuidados de enfermagem", descEn: "Nursing care", groups: [GROUPS.ADMIN, GROUPS.ENFERMAGEM] },
    { href: "/laboratory", label: "Laboratório", labelEn: "Laboratory", icon: Microscope, desc: "Análises clínicas", descEn: "Clinical analyses", groups: [GROUPS.ADMIN, GROUPS.LABORATORIO] },
    { href: "/exams", label: "Exames", labelEn: "Exams", icon: FlaskConical, desc: "Catálogo de exames", descEn: "Exams catalog", groups: [GROUPS.ADMIN] },
    { href: "/bloodbank", label: "Banco de Sangue", labelEn: "Blood bank", icon: Droplet, desc: "Estoque e transfusões", descEn: "Stock and transfusions", groups: [GROUPS.ADMIN, GROUPS.LABORATORIO] },
    { href: "/maternity", label: "Maternidade", labelEn: "Maternity", icon: Baby, desc: "Gestação e parto", descEn: "Pregnancy and childbirth", groups: [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL] },
    { href: "/surgery", label: "Cirurgia", labelEn: "Surgery", icon: Scissors, desc: "Procedimentos cirúrgicos", descEn: "Surgical procedures", groups: [GROUPS.ADMIN, GROUPS.MEDICINA, GROUPS.MEDICINA_OCUPACIONAL] },
    { href: "/occupational-medicine", label: "Med. Ocupacional", labelEn: "Occupational med.", icon: BriefcaseIcon, desc: "Saúde no trabalho", descEn: "Workplace health", groups: [GROUPS.ADMIN, GROUPS.MEDICINA_OCUPACIONAL] },
    { href: "/pharmacy", label: "Farmácia", labelEn: "Pharmacy", icon: Pill, desc: "Dispensação e estoque", descEn: "Dispensing and stock", groups: [GROUPS.ADMIN, GROUPS.FARMACIA] },
    { href: "/warehouse", label: "ERP e WMS", labelEn: "ERP & WMS", icon: PackageSearch, desc: "Compras, reservas, separação e expedição", descEn: "Purchasing, reservations, picking and shipping", groups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE, GROUPS.FARMACIA, GROUPS.RECURSOS_HUMANOS] },
    { href: "/pharmacy/material-requests", label: "Req. Materiais", labelEn: "Material req.", icon: PackageSearch, desc: "Solicitar e acompanhar avio de materiais", descEn: "Request and track material dispatch", groups: ALL_GROUPS },
    { href: "/payments", label: "Pagamentos", labelEn: "Payments", icon: CreditCard, desc: "Recebimentos", descEn: "Collections", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE] },
    { href: "/invoices", label: "Faturas", labelEn: "Invoices", icon: Receipt, desc: "Emissão e revisão", descEn: "Issuance and review", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE] },
    { href: "/receipts", label: "Recibos", labelEn: "Receipts", icon: Receipt, desc: "Comprovativos", descEn: "Proof of payment", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.CONTABILIDADE] },
    { href: "/accounting", label: "Contabilidade", labelEn: "Accounting", icon: Calculator, desc: "Lançamentos e relatórios", descEn: "Entries and reports", groups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE] },
    { href: "/entities", label: "Empresas", labelEn: "Companies", icon: BriefcaseIcon, desc: "Convênios e clientes", descEn: "Contracts and clients", groups: [GROUPS.ADMIN, GROUPS.RECEPCAO, GROUPS.MEDICINA_OCUPACIONAL] },
    { href: "/human_resources/employees", label: "Recursos Humanos", labelEn: "Human resources", icon: BriefcaseIcon, desc: "Equipa e funcionários", descEn: "Team and staff", groups: [GROUPS.ADMIN, GROUPS.RECURSOS_HUMANOS] },
    { href: "/statistics", label: "Estatísticas", labelEn: "Statistics", icon: BarChart3, desc: "Indicadores e relatórios", descEn: "Indicators and reports", groups: [GROUPS.ADMIN, GROUPS.CONTABILIDADE] },
    { href: "/equipment/equipments", label: "Equipamentos", labelEn: "Equipment", icon: Settings, desc: "Ativos e manutenção", descEn: "Assets and maintenance", groups: [GROUPS.ADMIN, GROUPS.MANUTENCAO] },
    { href: "/workspaces", label: "Módulos", labelEn: "Modules", icon: Layers, desc: "Configuração de módulos", descEn: "Modules configuration", groups: [GROUPS.ADMIN] },
    { href: "/notifications", label: "Notificações", labelEn: "Notifications", icon: Bell, desc: "Centro de avisos", descEn: "Alerts center", groups: [GROUPS.ADMIN] },
    { href: "/audit", label: "Auditoria", labelEn: "Audit", icon: Activity, desc: "Trilha de eventos", descEn: "Events trail", groups: [GROUPS.ADMIN] },
    { href: "/monitoring", label: "Monitoramento", labelEn: "Monitoring", icon: Bug, desc: "Saúde do sistema", descEn: "System health", groups: [GROUPS.ADMIN] },
    { href: "/ai", label: "IA Operacional", labelEn: "Operational AI", icon: Bot, desc: "Copiloto seguro por perfil", descEn: "Profile-safe copilot", groups: ALL_GROUPS },
    { href: "/admin", label: "Administração", labelEn: "Administration", icon: Shield, desc: "Painel administrativo", descEn: "Administrative panel", groups: [GROUPS.ADMIN] },
]

const NAV_SECTIONS: NavSection[] = [
    {
        label: "Início",
        labelEn: "Home",
        hrefs: ["/workspaces", "/"],
    },
    {
        label: "Saúde",
        labelEn: "Healthcare",
        hrefs: [
            "/healthcare",
            "/reception",
            "/patients",
            "/consultations",
            "/requests",
            "/medical-records",
            "/medicine",
            "/clinical-pharmacy",
            "/telemedicine",
            "/public-health",
            "/dental",
            "/veterinary",
            "/physiotherapy",
            "/occupational-therapy",
            "/physical-therapy",
            "/radiology",
            "/cardiology",
            "/neurology",
            "/ophthalmology",
            "/nursing",
            "/laboratory",
            "/exams",
            "/bloodbank",
            "/maternity",
            "/surgery",
            "/occupational-medicine",
        ],
    },
    {
        label: "Educação",
        labelEn: "Education",
        hrefs: ["/education", "/education/teacher", "/education/directoria", "/education/student"],
    },
    {
        label: "Operações",
        labelEn: "Operations",
        hrefs: ["/pharmacy", "/warehouse", "/transportation", "/pharmacy/material-requests", "/equipment/equipments", "/workspaces", "/ai"],
    },
    {
        label: "Financeiro",
        labelEn: "Finance",
        hrefs: ["/payments", "/invoices", "/receipts", "/credit-financing", "/accounting", "/entities", "/human_resources/employees", "/statistics"],
    },
    {
        label: "Administração",
        labelEn: "Administration",
        hrefs: ["/notifications", "/audit", "/monitoring", "/admin"],
    },
]

export default function Sidebar({ user, open = false, onClose, className }: Props) {
    const pathname = usePathname()
    const router = useRouter()
    const { isDark, toggle: toggleTheme } = useTheme()
    const { t } = useLanguage()
    const activeScope = useWorkspaceScope()
    const homeHref = useMemo(() => getDefaultWorkspaceHref(user), [user])

    const hasAccess = useCallback((item: NavItem) => {
        if (!item.groups) return true
        return userHasAnyGroup(user, item.groups)
    }, [user])

    const itemMatchesWorkspaceScope = useCallback((item: NavItem) => {
        if (activeScope === "neutral") return true
        if (item.href === "/workspaces") return true
        const isEducationItem =
            item.href === "/education" || item.href.startsWith("/education/")
        return activeScope === "education" ? isEducationItem : !isEducationItem
    }, [activeScope])

    const visibleItems = useMemo(
        () => NAV_ITEMS.filter((item) => hasAccess(item) && itemMatchesWorkspaceScope(item)),
        [hasAccess, itemMatchesWorkspaceScope]
    )

    const sectionedItems = useMemo(() => {
        const remaining = new Set(visibleItems.map((item) => item.href))
        const sections = NAV_SECTIONS.map((section) => {
            const items = section.hrefs
                .map((href) => visibleItems.find((item) => item.href === href))
                .filter((item): item is NavItem => Boolean(item))
            items.forEach((item) => remaining.delete(item.href))
            return { ...section, items }
        }).filter((section) => section.items.length > 0)

        const otherItems = visibleItems.filter((item) => remaining.has(item.href))
        if (otherItems.length) {
            sections.push({
                label: "Outros",
                labelEn: "Other",
                hrefs: otherItems.map((item) => item.href),
                items: otherItems,
            })
        }

        return sections
    }, [visibleItems])

    const platformSubtitle =
        activeScope === "education"
            ? t("Plataforma académica", "Academic platform")
            : activeScope === "healthcare"
                ? t("Plataforma clínica", "Clinical platform")
                : t("Plataforma operacional", "Operational platform")

    const prefetchRoute = useCallback((href: string) => {
        if (!href || SESSION_PREFETCHED_ROUTES.has(href)) return
        SESSION_PREFETCHED_ROUTES.add(href)
        router.prefetch(href)
    }, [router])

    useEffect(() => {
        if (typeof window === "undefined") return

        const allowed = new Set(visibleItems.map((item) => item.href))
        const priority = [
            "/workspaces",
            "/",
            "/patients",
            "/healthcare",
            "/reception",
            "/consultations",
            "/education",
            "/requests",
            "/laboratory",
            "/invoices",
            "/credit-financing",
            "/telemedicine",
            "/public-health",
            "/pharmacy",
            "/warehouse",
            "/transportation",
        ]
            .filter((href) => allowed.has(href))
            .slice(0, PRIORITY_PREFETCH_LIMIT)

        if (!priority.length) return

        let cancelled = false
        let timeoutId: ReturnType<typeof setTimeout> | null = null

        const scheduleQueue = () => {
            const queue = [...priority]
            const run = () => {
                if (cancelled) return
                const next = queue.shift()
                if (!next) return
                prefetchRoute(next)
                if (queue.length) timeoutId = setTimeout(run, PRIORITY_PREFETCH_DELAY_MS)
            }
            run()
        }

        if ("requestIdleCallback" in window && "cancelIdleCallback" in window) {
            const idleId = window.requestIdleCallback(scheduleQueue, { timeout: 1200 })
            return () => {
                cancelled = true
                if (timeoutId) clearTimeout(timeoutId)
                window.cancelIdleCallback(idleId)
            }
        }

        timeoutId = setTimeout(scheduleQueue, 220)
        return () => {
            cancelled = true
            if (timeoutId) clearTimeout(timeoutId)
        }
    }, [prefetchRoute, visibleItems])

    const menu = (
        <div className="flex h-full w-64 flex-col border-r border-slate-800 bg-slate-950 pb-12 text-white">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-3 py-3">
                <Link
                    href={homeHref}
                    onClick={onClose}
                    className="group flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                    title={t("Ir para o dashboard", "Go to dashboard")}
                >
                    <Image
                        src="/static/img/logo.png"
                        alt="Substrato"
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-md object-contain p-1 shadow-sm transition-transform group-hover:scale-105"
                        style={{ backgroundColor: "#fff" }}
                    />
                    <div className="min-w-0">
                        <div className="truncate font-display text-sm font-bold tracking-tight text-white">
                            Substrato
                        </div>
                        <div className="truncate text-[10px] uppercase tracking-[0.16em] text-slate-400">
                            {platformSubtitle}
                        </div>
                    </div>
                </Link>
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white md:hidden"
                    aria-label={t("Fechar menu", "Close menu")}
                >
                    <X size={18} />
                </button>
            </div>

            <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 pb-6 pt-3">
                {sectionedItems.map((section) => (
                    <div key={section.label} className="space-y-1">
                        <div className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {t(section.label, section.labelEn)}
                        </div>

                        <div className="space-y-0.5">
                            {section.items.map((item) => {
                                const Icon = item.icon
                                const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href + "/"))

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        prefetch={false}
                                        onClick={onClose}
                                        onMouseEnter={() => prefetchRoute(item.href)}
                                        onFocus={() => prefetchRoute(item.href)}
                                        onTouchStart={() => prefetchRoute(item.href)}
                                        title={t(item.desc || "", item.descEn || item.desc || "")}
                                        aria-current={active ? "page" : undefined}
                                        className={`group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                                            active
                                                ? "bg-slate-800 text-white shadow-sm before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-x-2 before:-translate-y-1/2 before:rounded-r-full before:bg-sky-300"
                                                : "text-slate-300 hover:bg-slate-900 hover:text-white"
                                        }`}
                                    >
                                        <Icon size={16} className={active ? "text-sky-200" : "text-slate-400 group-hover:text-slate-200"} />
                                        <span className="truncate">{t(item.label, item.labelEn || item.label)}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="border-t border-slate-800 p-2">
                <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex w-full items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-2.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                    title={isDark ? t("Modo claro", "Light mode") : t("Modo escuro", "Dark mode")}
                >
                    <span className="flex items-center gap-2">
                        {isDark ? <Sun size={15} /> : <Moon size={15} />}
                        {t("Tema", "Theme")}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">
                        {isDark ? t("Claro", "Light") : t("Escuro", "Dark")}
                    </span>
                </button>
            </div>
        </div>
    )

    return (
        <>
            <aside className={`hidden md:flex ${className || ""}`}>{menu}</aside>

            <div className={`fixed inset-0 z-50 pointer-events-none md:hidden ${open ? "" : ""}`}>
                <div
                    className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                    onClick={onClose}
                />
                <div
                    className={`pointer-events-auto absolute inset-y-0 left-0 w-72 max-w-[92vw] shadow-2xl transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
                >
                    {menu}
                </div>
            </div>
        </>
    )
}
