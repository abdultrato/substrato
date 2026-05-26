from __future__ import annotations

from contextlib import contextmanager, suppress
from datetime import date, timedelta
from decimal import Decimal
import random

from django.apps import apps
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from faker import Faker

from apps.accounting.models.account import Account
from apps.accounting.models.account_balance import AccountBalance
from apps.accounting.models.financial_reconciliation import FinancialReconciliation
from apps.accounting.models.ledger_entry import LedgerEntry
from apps.accounting.models.ledger_line import LedgerLine
from apps.accounting.models.legacy_entry import LegacyEntry
from apps.accounting.models.legacy_movement import LegacyMovement
from apps.audit_activities.models.user_activity import UserActivity
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_history import InvoiceHistory
from apps.bloodbank.models.blood_bank import (
    BloodDonation,
    BloodStockMovement,
    BloodStorage,
    BloodStorageMaintenance,
    BloodTransfusion,
    BloodType,
    BloodUnit,
)
from apps.clinical.models.clinical_event import ClinicalEvent
from apps.clinical.models.clinical_history import ClinicalHistory
from apps.clinical.models.clinical_reference import ClinicalReference
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.medical_exam import MedicalExam, MedicalExamField
from apps.clinical.models.medical_result_file import MedicalResultFile
from apps.clinical.models.patient import Patient
from apps.clinical.models.result import Result
from apps.clinical.models.result_item import ResultItem
from apps.clinical.models.sample import Sample
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.holiday import Holiday
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.equipment.models.equipment import Equipment
from apps.equipment_integrations.models.credential import IntegrationCredential
from apps.equipment_integrations.models.equipment import IntegrationEquipment
from apps.equipment_integrations.models.mapping import IntegrationAnalyteMapping
from apps.equipment_integrations.models.message import IntegrationDocument, IntegrationMessage
from apps.equipment_integrations.models.order import IntegrationOrder, IntegrationOrderItem
from apps.equipment_integrations.models.routing import IntegrationRouting
from apps.external_entities.models.company import Company
from apps.human_resources.models.employee import Employee
from apps.human_resources.models.job_title import JobTitle
from apps.human_resources.models.profession import Profession
from apps.identity.models.password_reset_token import PasswordResetToken
from apps.identity.models.professional_profile import ProfessionalProfile
from apps.identity.models.user import User
from apps.incidents.models.incident import Incident
from apps.inspections.models.daily_inspection import DailyInspection
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from apps.insurer.models.tenant_coverage_plan import TenantCoveragePlan
from apps.maintenance.models.maintenance import Maintenance
from apps.maternity.models.pregnancy import Pregnancy
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.medical_records.models.prescription_item import PrescriptionItem
from apps.monitoring.models.system_error import SystemError
from apps.notifications.models.delivery_log import DeliveryLog
from apps.notifications.models.notification import Notification
from apps.notifications.models.notification_template import NotificationTemplate
from apps.nursing.models import (
    NursingEvolution,
    NursingPrescription,
    NursingRecord,
    NursingVitalSign,
    Procedure,
    ProcedureCatalog,
    ProcedureCatalogMaterial,
    ProcedureItem,
    Ward,
    WardAdmission,
    WardBed,
)
from apps.payments.models.payment import Payment
from apps.payments.models.payment_history import PaymentHistory
from apps.payments.models.receipt import Receipt
from apps.payments.models.reconciliation import Reconciliation
from apps.payments.models.transaction import Transaction
from apps.pharmacy.models.inventory_movement import InventoryMovement, MovementOrigin, MovementType
from apps.pharmacy.models.lot import Lot
from apps.pharmacy.models.material_requisition import MaterialRequisition, RequestingSector
from apps.pharmacy.models.material_requisition_item import MaterialRequisitionItem
from apps.pharmacy.models.product import Product
from apps.pharmacy.models.product_category import ParentCategory, ProductCategory
from apps.pharmacy.models.sale import Sale
from apps.pharmacy.models.sale_item import SaleItem
from apps.reception.models.reception_checkin import ReceptionCheckin
from apps.surgery.models.surgery import Surgery
from apps.surgery.models.surgical_procedure import SurgicalProcedure
from apps.tenants.models.configuration import TenantConfiguration
from apps.tenants.models.feature_flags import TenantFeatureFlag
from apps.tenants.models.subscription import TenantSubscription
from apps.tenants.models.subscription_plan import SubscriptionPlan
from apps.tenants.models.tenant import Tenant
from apps.tenants.models.tenant_usage import TenantUsage
from core.constants.clinical_event_type import ClinicalEventType
from core.constants.gender import Gender
from core.constants.laboratory.method import Method
from core.constants.laboratory.sector import Sector
from core.constants.medical_exam.medical_exam_method import MedicalExamMethod
from core.constants.medical_exam.medical_exam_result_type import MedicalExamResultType
from core.constants.medical_exam.medical_exam_sector import MedicalExamSector
from infrastructure.context.tenant import reset_tenant, set_tenant


@contextmanager
def tenant_ctx(tenant: Tenant):
    token = set_tenant(tenant)
    try:
        yield
    finally:
        reset_tenant(token)


def _today() -> date:
    return timezone.localdate()


def _safe_choice(choices, fallback=None):
    values = list(choices)
    if not values:
        return fallback
    return values[0][0]


def _phone(i: int) -> str:
    return f"84{i:07d}"


def _rand_decimal(min_value: float, max_value: float, digits: int = 2) -> Decimal:
    value = random.uniform(min_value, max_value)
    fmt = f"{{:.{digits}f}}"
    return Decimal(fmt.format(value))


def _blood_type_weighted() -> str:
    # Distribuição aproximada usada em cenários clínicos reais da região
    pool = (
        ["O+"] * 38
        + ["A+"] * 31
        + ["B+"] * 15
        + ["AB+"] * 4
        + ["O-"] * 6
        + ["A-"] * 3
        + ["B-"] * 2
        + ["AB-"] * 1
    )
    return random.choice(pool)


def _adult_birth_date() -> date:
    years = random.randint(18, 82)
    days = random.randint(0, 364)
    return _today() - timedelta(days=(years * 365) + days)


def _random_birth_date() -> date:
    years = random.randint(0, 90)
    days = random.randint(0, 364)
    return _today() - timedelta(days=(years * 365) + days)


def _next_available(items: list, idx: int):
    if not items:
        return None
    return items[(idx - 1) % len(items)]


LAB_EXAM_BASE_NAMES = [
    "Hemograma completo",
    "Glicemia em jejum",
    "Hemoglobina glicada (HbA1c)",
    "Ureia",
    "Creatinina",
    "Sódio",
    "Potássio",
    "Cálcio total",
    "Magnésio",
    "Fósforo",
    "Colesterol total",
    "HDL colesterol",
    "LDL colesterol",
    "Triglicerídeos",
    "TGO (AST)",
    "TGP (ALT)",
    "Gama GT",
    "Fosfatase alcalina",
    "Bilirrubina total e frações",
    "Proteínas totais e frações",
    "PCR ultrassensível",
    "VHS",
    "Ferritina",
    "Ferro sérico",
    "Transferrina",
    "Vitamina B12",
    "Ácido fólico",
    "TSH",
    "T4 livre",
    "T3 livre",
    "Prolactina",
    "FSH",
    "LH",
    "Beta-hCG",
    "PSA total",
    "PSA livre",
    "Cortisol",
    "Insulina",
    "Amilase",
    "Lipase",
    "Troponina I",
    "CK-MB",
    "D-dímero",
    "Gasometria arterial",
    "EAS (Urina tipo I)",
    "Urocultura",
    "Parasitológico de fezes",
    "Coprocultura",
    "Pesquisa de sangue oculto nas fezes",
    "Teste rápido de malária",
    "HIV 1 e 2",
    "HBsAg",
    "Anti-HCV",
    "VDRL",
    "ASLO",
    "Fator reumatoide",
    "ANA (FAN)",
    "Eletroforese de proteínas",
    "Coagulograma",
    "TAP/INR",
    "TTPa",
    "Fibrinogênio",
    "Reticulócitos",
    "Contagem de plaquetas",
    "Pesquisa de BK",
    "Gram de secreção",
    "Cultura de escarro",
    "Cultura de sangue (hemocultura)",
    "Pesquisa de dengue NS1",
    "IgM para dengue",
    "IgG para dengue",
    "PCR para tuberculose",
    "PCR para influenza",
    "PCR para SARS-CoV-2",
    "Teste de gravidez urinário",
    "Microalbuminúria",
    "Clearance de creatinina",
    "Albumina",
    "Ácido úrico",
    "Lactato",
    "Procalcitonina",
    "Velocidade de filtração glomerular",
    "Tipagem sanguínea ABO",
    "Fator Rh",
    "Prova cruzada",
    "Teste de Coombs direto",
    "Teste de Coombs indireto",
    "Contagem de eosinófilos",
    "Contagem de neutrófilos",
    "Contagem de linfócitos",
    "Contagem de monócitos",
    "CK total",
    "LDH",
    "Saturação de transferrina",
    "NT-proBNP",
    "BNP",
    "Peptídeo C",
    "Testosterona total",
    "Testosterona livre",
    "Progesterona",
    "Estradiol",
    "Vitamina D",
    "Osmolalidade plasmática",
    "Osmolalidade urinária",
    "Sedimento urinário",
    "Cultura de ferida",
    "Exame micológico direto",
    "Cultura para fungos",
]

MEDICAL_EXAM_BASE_NAMES = [
    "Ecografia abdominal total",
    "Ecografia pélvica",
    "Ecografia obstétrica",
    "Raio-X de tórax",
    "Raio-X de coluna lombar",
    "Raio-X de joelho",
    "Tomografia de crânio",
    "Tomografia de tórax",
    "Tomografia de abdómen",
    "Ressonância de coluna",
    "Ressonância de joelho",
    "Mamografia bilateral",
    "Densitometria óssea",
    "Ecocardiograma transtorácico",
    "Eletrocardiograma de repouso",
    "Holter 24h",
    "MAPA 24h",
    "Eletroencefalograma",
    "Endoscopia digestiva alta",
    "Colonoscopia",
    "Angiografia periférica",
    "Cintilografia miocárdica",
]

SURGICAL_PROCEDURE_NAMES = [
    "Apendicectomia",
    "Hernioplastia inguinal",
    "Colecistectomia laparoscópica",
    "Cesárea segmentar",
    "Histerectomia total",
    "Artroscopia de joelho",
    "Osteossíntese de fratura",
    "Tiroidectomia parcial",
    "Hemorroidectomia",
    "Amigdalectomia",
    "Desbridamento cirúrgico",
    "Sutura de ferida complexa",
    "Laparotomia exploradora",
    "Ressecção de lipoma",
    "Correção de hérnia umbilical",
    "Vasectomia",
]

PHARMACY_PARENT_CATEGORIES = [
    "Medicamentos",
    "Materiais Clínicos",
    "Consumíveis Laboratoriais",
    "Antissépticos",
    "Soluções e Soros",
]

PRODUCT_CATEGORY_NAMES = [
    "Analgésicos",
    "Antibióticos",
    "Anti-hipertensivos",
    "Antidiabéticos",
    "Anti-inflamatórios",
    "Cardiologia",
    "Gastroenterologia",
    "Pediatria",
    "Ginecologia",
    "EPI e Segurança",
    "Coleta e Amostras",
    "Curativos",
    "Suturas",
    "Material de Enfermagem",
]

PRODUCT_BASE_NAMES = [
    "Paracetamol 500mg",
    "Ibuprofeno 400mg",
    "Dipirona 1g",
    "Amoxicilina 500mg",
    "Ceftriaxona 1g",
    "Azitromicina 500mg",
    "Metformina 850mg",
    "Glibenclamida 5mg",
    "Losartan 50mg",
    "Amlodipina 5mg",
    "Omeprazol 20mg",
    "Pantoprazol 40mg",
    "Hidrocortisona creme",
    "Soro fisiológico 0,9% 500ml",
    "Soro glicosado 5% 500ml",
    "Soro Ringer Lactato 500ml",
    "Seringa 5ml",
    "Seringa 10ml",
    "Agulha 25x7",
    "Agulha 30x8",
    "Luva de procedimento",
    "Máscara cirúrgica",
    "Touca descartável",
    "Álcool 70%",
    "Iodopovidona",
    "Gaze estéril",
    "Compressa não estéril",
    "Fita microporosa",
    "Cateter venoso periférico 20G",
    "Cateter venoso periférico 22G",
    "Equipo macrogotas",
    "Frasco coletor de urina",
    "Tubos EDTA",
    "Tubos sem anticoagulante",
    "Lanceta estéril",
    "Tira reagente glicemia",
    "Teste rápido HIV",
    "Teste rápido malária",
    "Teste rápido gravidez",
    "Avental descartável",
    "Oxímetro de dedo",
    "Sonda uretral n14",
    "Sonda nasogástrica n12",
    "Bisturi descartável nº 15",
    "Fio de sutura nylon 3-0",
    "Fio de sutura vicryl 2-0",
    "Clorexidina alcoólica",
]

CONSULTATION_SPECIALTIES = [
    "Clínica Geral",
    "Pediatria",
    "Ginecologia",
    "Obstetrícia",
    "Cardiologia",
    "Ortopedia",
    "Neurologia",
    "Dermatologia",
    "Medicina Interna",
    "Cirurgia Geral",
]

JOB_TITLES = [
    ("Médico Clínico", True),
    ("Médico Obstetra", True),
    ("Médico Pediatra", True),
    ("Enfermeiro", False),
    ("Técnico de Laboratório", False),
    ("Farmacêutico", False),
    ("Recepcionista", False),
    ("Técnico de Raio-X", False),
    ("Gestor Administrativo", False),
    ("Auxiliar de Enfermagem", False),
]

FLAG_KEYS = [
    "LAB_PDF",
    "PAGAMENTOS",
    "FATURAMENTO",
    "ENFERMAGEM",
    "FARMACIA",
    "NOTIFICACOES",
    "SEGURADORA",
    "CONTABILIDADE",
    "MATERNIDADE",
    "CIRURGIA",
]


class Command(BaseCommand):
    help = "Gera massa de dados realistas no tenant default com coerência entre modelos."

    def add_arguments(self, parser):
        parser.add_argument("--tenant", default="default", help="Identifier do tenant alvo.")
        parser.add_argument("--seed", type=int, default=260313, help="Semente randômica.")
        parser.add_argument("--patients", type=int, default=500, help="Qtd alvo de pacientes.")
        parser.add_argument("--lab-exams", type=int, default=100, help="Qtd alvo de exames laboratoriais.")
        parser.add_argument("--lab-requests", type=int, default=1000, help="Qtd alvo de requisições laboratoriais.")
        parser.add_argument("--consultations", type=int, default=250, help="Qtd alvo de consultas.")
        parser.add_argument("--surgeries", type=int, default=80, help="Qtd alvo de cirurgias.")
        parser.add_argument("--password", default="Seed@123456", help="Senha para utilizadores criados.")

    def handle(self, *args, **options):
        random.seed(int(options["seed"]))

        try:
            faker = Faker("pt_PT")
        except Exception:
            faker = Faker()

        tenant_identifier = str(options["tenant"]).strip()
        target_patients = int(options["patients"])
        target_lab_exams = int(options["lab_exams"])
        target_requests = int(options["lab_requests"])
        target_consultations = int(options["consultations"])
        target_surgeries = int(options["surgeries"])
        password = str(options["password"])

        tenant = Tenant.objects.filter(identifier=tenant_identifier).first()
        if not tenant:
            raise CommandError(f"Tenant '{tenant_identifier}' não encontrado.")

        with tenant_ctx(tenant):
            self.stdout.write(self.style.NOTICE(f"[seed] tenant={tenant.identifier} (id={tenant.id})"))

            plans = self.ensure_subscription_plans()
            self.ensure_tenant_core_data(tenant, plans)

            companies = self.ensure_companies(tenant, faker, target=40)
            users = self.ensure_users(tenant, faker, password, target=130)
            titles = self.ensure_job_titles(tenant)
            employees = self.ensure_employees(tenant, faker, titles, target=90)
            self.ensure_professional_profiles(users, employees, faker)
            self.ensure_password_tokens(users, target=30)

            _parents, categories = self.ensure_pharmacy_categories(tenant, faker)
            products = self.ensure_products(tenant, faker, categories, target=220)
            lots = self.ensure_lots(tenant, products, target=420)

            patients = self.ensure_patients(tenant, faker, companies, target=target_patients)

            lab_exams = self.ensure_lab_exams(tenant, target=target_lab_exams)
            exam_fields = self.ensure_lab_exam_fields(tenant, lab_exams)
            medical_exams = self.ensure_medical_exams(tenant, target=40)
            self.ensure_medical_exam_fields(tenant, medical_exams)

            specialties = self.ensure_specialties(tenant)
            self.ensure_holidays(tenant)
            consultations = self.ensure_consultations(
                tenant,
                patients,
                employees,
                specialties,
                target=target_consultations,
            )

            surgical_catalog = self.ensure_surgical_procedures(tenant, target=60)
            surgeries = self.ensure_surgeries(
                tenant,
                patients,
                users,
                surgical_catalog,
                target=target_surgeries,
            )

            requests = self.ensure_lab_requests(
                tenant,
                patients,
                users,
                lab_exams,
                medical_exams,
                target=target_requests,
            )
            self.ensure_result_values(tenant, users)
            self.ensure_clinical_references(tenant, exam_fields, faker, target=240)
            self.ensure_clinical_events(tenant, requests)
            self.ensure_clinical_history(patients, faker, target=200)
            self.ensure_medical_result_files(tenant)

            nursing_records = self.ensure_nursing_records(tenant, patients, faker, target=260)
            self.ensure_nursing_vitals(tenant, nursing_records, target=260)
            procedures = self.ensure_nursing_procedures(tenant, patients, users, target=220)
            procedure_catalogs = self.ensure_procedure_catalog(tenant, target=70)
            self.ensure_procedure_catalog_materials(tenant, procedure_catalogs, products, target=180)
            self.ensure_procedure_items(tenant, procedures, procedure_catalogs, target=300)
            self.ensure_nursing_evolution(tenant, patients, faker, target=220)
            self.ensure_nursing_prescriptions(tenant, patients, faker, target=220)
            self.ensure_ward_data(tenant, patients)

            self.ensure_maternity(tenant, patients, employees, target=70)

            sales = self.ensure_sales(tenant, patients, target=180)
            self.ensure_sale_items(tenant, sales, products, target=450)
            requisitions = self.ensure_material_requisitions(tenant, users, target=320)
            self.ensure_material_requisition_items(tenant, requisitions, lots, target=760)

            invoices = self.ensure_invoices(tenant, requests, sales, procedures, consultations, surgeries, target=700)
            self.ensure_invoice_history(tenant, invoices, target=700)
            payments = self.ensure_payments(tenant, invoices, target=560)
            self.ensure_payment_history(tenant, payments, target=560)
            self.ensure_receipts(payments, target=280)
            transactions = self.ensure_transactions(target=500)
            self.ensure_reconciliation(transactions, target=500)

            self.ensure_accounting(tenant, invoices, target=260)
            _insurers, coverage_plans = self.ensure_insurer_data(tenant, target_insurers=12, target_plans=36)
            self.ensure_authorizations(tenant, requests, coverage_plans, target=360)

            equipment = self.ensure_equipment(tenant, faker, target=70)
            self.ensure_inspections(tenant, equipment, target=260)
            self.ensure_maintenances(tenant, equipment, target=180)
            self.ensure_incidents(tenant, equipment, target=180)

            self.ensure_integrations(tenant, equipment, requests, exam_fields, users)
            self.ensure_bloodbank(tenant, patients, users)

            self.ensure_medical_records(tenant, patients, employees, consultations, products, target_records=220)

            self.ensure_checkins(tenant, patients, users, requests, invoices, target=540)
            self.ensure_monitoring_logs(tenant, users, target=220)
            self.ensure_activity_logs(tenant, users, target=360)
            self.ensure_notifications(patients, target=220)

            self.report_summary(tenant)

    # -----------------------------------------------------
    # Tenant core
    # -----------------------------------------------------

    def ensure_subscription_plans(self) -> list[SubscriptionPlan]:
        plans = list(SubscriptionPlan.objects.order_by("id"))
        if len(plans) >= 3:
            return plans

        defaults = [
            ("Plano Free", SubscriptionPlan.PlanType.FREE, Decimal("0.00"), 10, 500),
            ("Plano Basic", SubscriptionPlan.PlanType.BASIC, Decimal("4500.00"), 50, 5000),
            ("Plano Pro", SubscriptionPlan.PlanType.PRO, Decimal("12000.00"), 200, 25000),
        ]

        for idx, (name, plan_type, monthly_price, user_limit, request_limit) in enumerate(defaults, start=1):
            plan, _ = SubscriptionPlan.objects.get_or_create(
                name=name,
                defaults={
                    "type": plan_type,
                    "description": f"{name} para seed massivo",
                    "order": idx,
                    "user_limit": user_limit,
                    "monthly_request_limit": request_limit,
                    "monthly_price": monthly_price,
                    "request_overage_price": Decimal("5.00"),
                    "priority_support": plan_type == SubscriptionPlan.PlanType.PRO,
                    "allows_multi_unit": plan_type != SubscriptionPlan.PlanType.FREE,
                    "active": True,
                },
            )
            plans.append(plan)

        return list(SubscriptionPlan.objects.order_by("id"))

    def ensure_tenant_core_data(self, tenant: Tenant, plans: list[SubscriptionPlan]) -> None:
        TenantConfiguration.objects.get_or_create(
            tenant=tenant,
            defaults={
                "time_zone": "Africa/Maputo",
                "currency": "MZN",
                "language": "pt",
                "allows_multi_unit": True,
                "user_limit": 800,
                "holiday_consultation_percentage_surcharge": Decimal("20.00"),
            },
        )

        TenantUsage.objects.get_or_create(
            tenant=tenant,
            defaults={
                "active_users": 120,
                "current_month_requests": 1000,
            },
        )

        for key in FLAG_KEYS:
            TenantFeatureFlag.objects.get_or_create(
                tenant=tenant,
                key=key,
                defaults={"active": True},
            )

        plan = plans[-1] if plans else None
        if plan is not None:
            TenantSubscription.objects.get_or_create(
                tenant=tenant,
                defaults={
                    "plan": plan,
                    "status": TenantSubscription.Status.ACTIVE,
                    "cycle": TenantSubscription.BillingCycle.MONTHLY,
                    "start_date": _today() - timedelta(days=30),
                },
            )

    # -----------------------------------------------------
    # Identities / RH
    # -----------------------------------------------------

    def ensure_users(self, tenant: Tenant, faker: Faker, password: str, target: int) -> list[User]:
        users = list(User.objects.filter(tenant=tenant).order_by("id"))

        while len(users) < target:
            idx = len(users) + 1
            username = f"default_user_{idx:04d}"
            email = f"{username}@tenant-default.local"

            if User.objects.filter(username=username).exists() or User.objects.filter(email=email).exists():
                username = f"{username}_{timezone.now().strftime('%H%M%S%f')}"
                email = f"{username}@tenant-default.local"

            first = faker.first_name()
            last = faker.last_name()

            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                tenant=tenant,
                name=f"{first} {last}",
                first_name=first,
                last_name=last,
                phone=_phone(100000 + idx),
                is_active=True,
            )
            users.append(user)

        return users

    def ensure_job_titles(self, tenant: Tenant) -> list[JobTitle]:
        titles: list[JobTitle] = []
        for idx, (name, is_doctor) in enumerate(JOB_TITLES, start=1):
            title, _ = JobTitle.objects.get_or_create(
                tenant=tenant,
                name=name,
                defaults={
                    "description": f"Cargo base seed {idx}",
                    "is_doctor": is_doctor,
                },
            )
            titles.append(title)
        return titles

    def ensure_employees(
        self,
        tenant: Tenant,
        faker: Faker,
        titles: list[JobTitle],
        target: int,
    ) -> list[Employee]:
        employees = list(Employee.objects.filter(tenant=tenant).order_by("id"))

        while len(employees) < target:
            idx = len(employees) + 1
            title = _next_available(titles, idx)
            first = faker.first_name()
            last = faker.last_name()
            profession_name = title.name if title else "Profissional de Saúde"
            profession, _ = Profession.objects.get_or_create(
                tenant=tenant,
                name=profession_name,
                defaults={
                    "base_salary": Decimal("18000.00"),
                    "ordinary_hour_value": Decimal("102.2727"),
                    "extraordinary_hour_value": Decimal("153.4091"),
                },
            )
            employee = Employee.objects.create(
                tenant=tenant,
                name=f"{first} {last}",
                role=title,
                profession=profession,
                nuit=f"8410{idx:06d}",
                nib=f"MZ90{idx:020d}"[:24],
                document_number=f"EMP-{tenant.id}-{idx:06d}",
                email=f"employee{tenant.id}_{idx:04d}@hospital.local",
                phone=_phone(200000 + idx),
                admission_date=_today() - timedelta(days=random.randint(200, 5000)),
                status=Employee.Status.ACTIVE,
                nominal_salary=Decimal("18000.00") + Decimal(idx * 15),
                salary_increase=Decimal("0.00") if idx % 5 else Decimal("800.00"),
                base_month_hours=176,
            )
            employees.append(employee)

        return employees

    def ensure_professional_profiles(self, users: list[User], employees: list[Employee], faker: Faker) -> None:
        profiles_by_user = {
            profile.user_id: profile
            for profile in ProfessionalProfile.objects.select_related("employee").all()
        }
        occupied_employee_ids = {
            profile.employee_id
            for profile in profiles_by_user.values()
            if profile.employee_id is not None
        }
        free_employees = [emp for emp in employees if emp.id not in occupied_employee_ids]

        departments = [
            "Laboratório",
            "Farmácia",
            "Recepção",
            "Maternidade",
            "Enfermagem",
            "Medicina",
            "Cirurgia",
        ]

        for idx, user in enumerate(users, start=1):
            profile = profiles_by_user.get(user.id)

            employee = profile.employee if profile and profile.employee_id else None
            if employee is None and free_employees:
                employee = free_employees.pop(0)
                occupied_employee_ids.add(employee.id)

            role = employee.role.name if employee and employee.role else "Profissional"
            department = departments[(idx - 1) % len(departments)]

            if profile is None:
                ProfessionalProfile.objects.create(
                    user=user,
                    employee=employee,
                    role=role,
                    professional_registration=f"REG-{idx:06d}",
                    department=department,
                    active=True,
                )
                continue

            updates: list[str] = []
            if profile.employee_id is None and employee is not None:
                profile.employee = employee
                updates.append("employee")
            if not profile.role:
                profile.role = role
                updates.append("role")
            if not profile.professional_registration:
                profile.professional_registration = f"REG-{idx:06d}"
                updates.append("professional_registration")
            if not profile.department:
                profile.department = department
                updates.append("department")
            if not profile.active:
                profile.active = True
                updates.append("active")
            if updates:
                profile.save(update_fields=updates)

    def ensure_password_tokens(self, users: list[User], target: int) -> None:
        existing = PasswordResetToken.objects.count()
        idx = 0
        while PasswordResetToken.objects.count() < target and users:
            user = users[idx % len(users)]
            PasswordResetToken.objects.create(user=user)
            idx += 1
            if idx > existing + (target * 4):
                break

    # -----------------------------------------------------
    # External entities
    # -----------------------------------------------------

    def ensure_companies(self, tenant: Tenant, faker: Faker, target: int) -> list[Company]:
        companies = list(Company.objects.filter(tenant=tenant).order_by("id"))

        while len(companies) < target:
            idx = len(companies) + 1
            c = Company.objects.create(
                tenant=tenant,
                name=f"{faker.company()} {idx}",
                nuit=f"400{tenant.id:02d}{idx:06d}",
                headquarters_address=faker.address(),
                contacts=f"{faker.name()} - RH",
                email=f"company{tenant.id}_{idx:03d}@empresas.mz",
                phone1=_phone(300000 + idx),
                phone2=_phone(500000 + idx),
                nib=f"MZ00{idx:020d}"[:24],
                active=True,
                notes="Empresa parceira para medicina ocupacional e faturamento corporativo.",
            )
            companies.append(c)

        return companies

    # -----------------------------------------------------
    # Pharmacy
    # -----------------------------------------------------

    def ensure_pharmacy_categories(self, tenant: Tenant, faker: Faker) -> tuple[list[ParentCategory], list[ProductCategory]]:
        parents: list[ParentCategory] = []
        for name in PHARMACY_PARENT_CATEGORIES:
            parent, _ = ParentCategory.objects.get_or_create(
                tenant=tenant,
                name=name,
                defaults={"description": f"Categoria pai {name}"},
            )
            parents.append(parent)

        categories: list[ProductCategory] = list(ProductCategory.objects.filter(tenant=tenant).order_by("id"))

        for idx, name in enumerate(PRODUCT_CATEGORY_NAMES, start=1):
            parent = parents[(idx - 1) % len(parents)]
            cat, _ = ProductCategory.objects.get_or_create(
                tenant=tenant,
                name=name,
                defaults={
                    "description": f"Categoria {name}",
                    "parent_category": parent,
                },
            )
            if cat.parent_category_id is None:
                cat.parent_category = parent
                cat.save(update_fields=["parent_category"])
            if cat not in categories:
                categories.append(cat)

        return parents, categories

    def ensure_products(
        self,
        tenant: Tenant,
        faker: Faker,
        categories: list[ProductCategory],
        target: int,
    ) -> list[Product]:
        products = list(Product.objects.filter(tenant=tenant).order_by("id"))

        type_cycle = [
            Product.ProductType.MEDICAMENTO,
            Product.ProductType.MATERIAL,
            Product.ProductType.MATERIAL,
            Product.ProductType.OUTRO,
        ]

        while len(products) < target:
            idx = len(products) + 1
            base_name = PRODUCT_BASE_NAMES[(idx - 1) % len(PRODUCT_BASE_NAMES)]
            name = f"{base_name} #{idx:03d}"
            category = categories[(idx - 1) % len(categories)] if categories else None

            product = Product.objects.create(
                tenant=tenant,
                name=name,
                category=category,
                type=type_cycle[(idx - 1) % len(type_cycle)],
                sale_price=Decimal("15.00") + Decimal((idx % 70) * 2),
                vat_percentage=Decimal("16.00"),
                applies_vat_by_default=True,
            )
            products.append(product)

        return products

    def ensure_lots(self, tenant: Tenant, products: list[Product], target: int) -> list[Lot]:
        lots = list(Lot.objects.filter(tenant=tenant).order_by("id"))

        while len(lots) < target and products:
            idx = len(lots) + 1
            product = products[(idx - 1) % len(products)]
            lot_number = f"LOT-{tenant.id}-{product.id}-{idx:05d}"

            if Lot.objects.filter(product=product, lot_number=lot_number).exists():
                continue

            lot = Lot.objects.create(
                tenant=tenant,
                name=f"Lote {lot_number}",
                product=product,
                lot_number=lot_number,
                expiration_date=_today() + timedelta(days=420 + (idx % 700)),
                initial_quantity=400 + (idx % 150),
                sale_price=product.sale_price,
            )
            lots.append(lot)

        return lots

    def ensure_sales(self, tenant: Tenant, patients: list[Patient], target: int) -> list[Sale]:
        sales = list(Sale.objects.filter(tenant=tenant).order_by("id"))

        while len(sales) < target:
            idx = len(sales) + 1
            patient = patients[(idx - 1) % len(patients)] if patients else None
            number = f"VD-{tenant.id}-{idx:06d}"
            if Sale.objects.filter(tenant=tenant, number=number).exists():
                continue
            sale = Sale.objects.create(
                tenant=tenant,
                number=number,
                patient=patient,
            )
            sales.append(sale)

        return sales

    def ensure_sale_items(self, tenant: Tenant, sales: list[Sale], products: list[Product], target: int) -> None:
        guard = 0
        while SaleItem.objects.filter(tenant=tenant).count() < target and sales and products:
            guard += 1
            if guard > target * 12:
                break

            idx = SaleItem.objects.filter(tenant=tenant).count() + 1
            sale = sales[(idx - 1) % len(sales)]
            candidate_products = [p for p in products if p.tenant_id == sale.tenant_id]
            if not candidate_products:
                break
            product = candidate_products[(idx - 1) % len(candidate_products)]

            if SaleItem.objects.filter(sale=sale, product=product, deleted=False).exists():
                continue

            with suppress(Exception):
                SaleItem.objects.create(
                    tenant=tenant,
                    name=f"Item {product.name}",
                    sale=sale,
                    product=product,
                    quantity=1 + (idx % 2),
                )

    def ensure_material_requisitions(self, tenant: Tenant, users: list[User], target: int) -> list[MaterialRequisition]:
        reqs = list(MaterialRequisition.objects.filter(tenant=tenant).order_by("id"))
        sectors = [c[0] for c in RequestingSector.choices]

        while len(reqs) < target:
            idx = len(reqs) + 1
            by_user = users[(idx - 1) % len(users)] if users else None
            department = ""
            if by_user is not None:
                profile = getattr(by_user, "perfil_professional", None)
                department = getattr(profile, "department", "") if profile else ""

            req = MaterialRequisition.objects.create(
                tenant=tenant,
                sector=sectors[(idx - 1) % len(sectors)],
                requested_by_department=department or random.choice(
                    ["Laboratório", "Enfermagem", "Recepção", "Medicina", "Maternidade"]
                ),
                status=MaterialRequisition.Status.PENDING,
            )
            reqs.append(req)

        return reqs

    def ensure_material_requisition_items(
        self,
        tenant: Tenant,
        requisitions: list[MaterialRequisition],
        lots: list[Lot],
        target: int,
    ) -> None:
        guard = 0
        while MaterialRequisitionItem.objects.filter(tenant=tenant).count() < target and requisitions and lots:
            guard += 1
            if guard > target * 20:
                break

            idx = MaterialRequisitionItem.objects.filter(tenant=tenant).count() + 1
            req = requisitions[(idx - 1) % len(requisitions)]
            lot = lots[(idx - 1) % len(lots)]

            item = MaterialRequisitionItem.objects.create(
                tenant=tenant,
                requisition=req,
                lot=lot,
                requested_quantity=1 + (idx % 6),
                supplied_quantity=0,
                notes="Uso em rotina assistencial",
            )

            # Para parte dos itens, gera baixa de requisição para exercitar estoque real.
            if idx % 4 == 0:
                qty = min(2, item.requested_quantity)
                with suppress(Exception):
                    InventoryMovement.objects.create(
                        tenant=tenant,
                        lot=lot,
                        type=MovementType.SAIDA,
                        origin=MovementOrigin.REQUISICAO,
                        quantity=qty,
                        material_request_item=item,
                    )
                    item.supplied_quantity = qty
                    item.save(update_fields=["supplied_quantity"])

    # -----------------------------------------------------
    # Patients and clinical catalog
    # -----------------------------------------------------

    def ensure_patients(
        self,
        tenant: Tenant,
        faker: Faker,
        companies: list[Company],
        target: int,
    ) -> list[Patient]:
        patients = list(Patient.objects.filter(tenant=tenant).order_by("id"))
        genders = [c[0] for c in Gender.choices]

        while len(patients) < target:
            idx = len(patients) + 1
            birth_date = _random_birth_date()
            gender = genders[(idx - 1) % len(genders)] if genders else Gender.FEMALE
            pregnant = gender == Gender.FEMALE and random.random() < 0.18 and (18 <= (_today().year - birth_date.year) <= 44)
            company = companies[(idx - 1) % len(companies)] if companies else None

            patient = Patient.objects.create(
                tenant=tenant,
                name=faker.name(),
                pregnant=pregnant,
                gestational_age_weeks=random.randint(8, 38) if pregnant else None,
                birth_date=birth_date,
                gender=gender,
                blood_type=_blood_type_weighted(),
                race_origin=_safe_choice(Patient._meta.get_field("race_origin").choices, "NEGRA"),
                document_type=_safe_choice(Patient._meta.get_field("document_type").choices, "BI"),
                document_number=f"BI-{tenant.id}-{idx:08d}",
                address_street=faker.street_name(),
                address_number=str(random.randint(1, 5000)),
                address_neighborhood=faker.city_suffix(),
                address_city=faker.city(),
                address_province=random.choice(
                    [
                        "Maputo",
                        "Gaza",
                        "Inhambane",
                        "Sofala",
                        "Manica",
                        "Tete",
                        "Zambézia",
                        "Nampula",
                        "Cabo Delgado",
                        "Niassa",
                    ]
                ),
                address_postal_code=f"{random.randint(1000, 9999)}",
                address_country="MZ",
                contact=_phone(700000 + idx),
                email=f"patient{tenant.id}_{idx:05d}@mail.local",
                provenance=_safe_choice(Patient._meta.get_field("provenance").choices, "CLINICA_EXTERNA"),
                origin_company=company,
            )
            patients.append(patient)

        return patients

    def ensure_lab_exams(self, tenant: Tenant, target: int) -> list[LabExam]:
        exams = list(LabExam.objects.filter(tenant=tenant).order_by("id"))
        methods = [c[0] for c in Method.choices]
        sectors = [c[0] for c in Sector.choices]
        sample = Sample.objects.filter(
            tenant=tenant,
            name="Sangue total",
            deleted=False,
        ).order_by("id").first()
        if sample is None:
            sample = Sample.objects.create(
                tenant=tenant,
                name="Sangue total",
                bottle_type=Sample.BottleType.EDTA_TUBE,
            )

        while len(exams) < target:
            idx = len(exams) + 1
            base = LAB_EXAM_BASE_NAMES[(idx - 1) % len(LAB_EXAM_BASE_NAMES)]
            name = f"{base} [{idx:03d}]"
            exam = LabExam.objects.create(
                tenant=tenant,
                name=name,
                turnaround_hours=12 + (idx % 72),
                price=Decimal("120.00") + Decimal(idx * 2),
                vat_percentage=Decimal("16.00"),
                applies_vat_by_default=True,
                method=methods[(idx - 1) % len(methods)] if methods else "ELISA",
                sector=sectors[(idx - 1) % len(sectors)] if sectors else None,
                sample_type=sample,
            )
            exams.append(exam)

        return exams

    def ensure_lab_exam_fields(self, tenant: Tenant, exams: list[LabExam]) -> list[LabExamField]:
        fields = list(LabExamField.objects.filter(tenant=tenant).order_by("id"))
        units = [c[0] for c in LabExamField._meta.get_field("unit").choices]
        types = [c[0] for c in LabExamField._meta.get_field("type").choices]

        for exam in exams:
            existing = LabExamField.objects.filter(tenant=tenant, exam=exam, deleted=False).count()
            need = max(1, 2 - existing)
            for i in range(need):
                idx = LabExamField.objects.filter(tenant=tenant).count() + 1
                field = LabExamField.objects.create(
                    tenant=tenant,
                    exam=exam,
                    name=f"Parâmetro {exam.id}-{i + 1}",
                    type=types[0] if types else "NUMERICO",
                    unit=units[(idx - 1) % len(units)] if units else "mg/dl",
                    reference_min=Decimal("3.50"),
                    reference_max=Decimal("11.50"),
                    critical_min=Decimal("2.00"),
                    critical_max=Decimal("20.00"),
                    max_delta=Decimal("10.00"),
                )
                fields.append(field)

        return fields

    def ensure_medical_exams(self, tenant: Tenant, target: int) -> list[MedicalExam]:
        exams = list(MedicalExam.objects.filter(tenant=tenant).order_by("id"))
        methods = [c[0] for c in MedicalExamMethod.choices]
        sectors = [c[0] for c in MedicalExamSector.choices]

        while len(exams) < target:
            idx = len(exams) + 1
            base = MEDICAL_EXAM_BASE_NAMES[(idx - 1) % len(MEDICAL_EXAM_BASE_NAMES)]
            name = f"{base} [{idx:03d}]"
            method = methods[(idx - 1) % len(methods)] if methods else MedicalExamMethod.OUTRO
            exam = MedicalExam.objects.create(
                tenant=tenant,
                name=name,
                turnaround_hours=8 + (idx % 48),
                price=Decimal("450.00") + Decimal(idx * 3),
                method=method,
                sector=sectors[(idx - 1) % len(sectors)] if sectors else None,
            )
            exams.append(exam)

        return exams

    def ensure_medical_exam_fields(self, tenant: Tenant, exams: list[MedicalExam]) -> list[MedicalExamField]:
        fields = list(MedicalExamField.objects.filter(tenant=tenant).order_by("id"))

        for exam in exams:
            if MedicalExamField.objects.filter(tenant=tenant, exam=exam, deleted=False).exists():
                continue

            allowed = list(exam.tipos_result_permitidos)
            type_value = allowed[0] if allowed else MedicalExamResultType.RELATORIO_PDF
            field = MedicalExamField.objects.create(
                tenant=tenant,
                exam=exam,
                name=f"Resultado {exam.id}",
                type=type_value,
            )
            fields.append(field)

        return fields

    # -----------------------------------------------------
    # Consultations and surgery
    # -----------------------------------------------------

    def ensure_specialties(self, tenant: Tenant) -> list[ConsultationSpecialty]:
        specs = list(ConsultationSpecialty.objects.filter(tenant=tenant).order_by("id"))

        for idx, name in enumerate(CONSULTATION_SPECIALTIES, start=1):
            spec, _ = ConsultationSpecialty.objects.get_or_create(
                tenant=tenant,
                name=name,
                defaults={
                    "description": f"Especialidade {name}",
                    "base_price": Decimal("600.00") + Decimal(idx * 15),
                    "vat_percentage": Decimal("16.00"),
                    "active": True,
                },
            )
            if spec not in specs:
                specs.append(spec)

        return specs

    def ensure_holidays(self, tenant: Tenant) -> None:
        base_dates = [
            date(_today().year, 1, 1),
            date(_today().year, 2, 3),
            date(_today().year, 4, 7),
            date(_today().year, 6, 25),
            date(_today().year, 9, 7),
            date(_today().year, 12, 25),
        ]
        for day in base_dates:
            Holiday.objects.get_or_create(
                tenant=tenant,
                date=day,
                defaults={
                    "description": "Feriado nacional",
                    "active": True,
                },
            )

    def ensure_consultations(
        self,
        tenant: Tenant,
        patients: list[Patient],
        employees: list[Employee],
        specialties: list[ConsultationSpecialty],
        target: int,
    ) -> list[MedicalConsultation]:
        consultations = list(MedicalConsultation.objects.filter(tenant=tenant).order_by("id"))
        doctors = [e for e in employees if e.role and e.role.is_doctor]

        while len(consultations) < target and patients:
            idx = len(consultations) + 1
            patient = patients[(idx - 1) % len(patients)]
            doctor = doctors[(idx - 1) % len(doctors)] if doctors else None
            specialty = specialties[(idx - 1) % len(specialties)] if specialties else None

            dt = timezone.now() - timedelta(days=random.randint(0, 420), hours=random.randint(0, 23))
            cons = MedicalConsultation.objects.create(
                tenant=tenant,
                patient=patient,
                doctor=doctor,
                specialty=specialty,
                type=specialty.name if specialty else "Consulta Geral",
                description="Atendimento médico agendado.",
                scheduled_for=dt,
                status=MedicalConsultation.Status.COMPLETED if idx % 3 else MedicalConsultation.Status.SCHEDULED,
                manual_holiday=False,
            )
            consultations.append(cons)

        return consultations

    def ensure_surgical_procedures(self, tenant: Tenant, target: int) -> list[SurgicalProcedure]:
        procedures = list(SurgicalProcedure.objects.filter(tenant=tenant).order_by("id"))

        while len(procedures) < target:
            idx = len(procedures) + 1
            name = f"{SURGICAL_PROCEDURE_NAMES[(idx - 1) % len(SURGICAL_PROCEDURE_NAMES)]} #{idx:03d}"
            proc = SurgicalProcedure.objects.create(
                tenant=tenant,
                name=name,
                description="Procedimento cirúrgico do catálogo institucional.",
                base_price=Decimal("3000.00") + Decimal(idx * 25),
                vat_percentage=Decimal("16.00"),
                applies_vat_by_default=True,
                active=True,
            )
            procedures.append(proc)

        return procedures

    def ensure_surgeries(
        self,
        tenant: Tenant,
        patients: list[Patient],
        users: list[User],
        catalog: list[SurgicalProcedure],
        target: int,
    ) -> list[Surgery]:
        surgeries = list(Surgery.objects.filter(tenant=tenant).order_by("id"))
        surgeons = [u for u in users if "med" in (u.username or "")]
        if not surgeons:
            surgeons = users

        while len(surgeries) < target and patients:
            idx = len(surgeries) + 1
            patient = patients[(idx - 1) % len(patients)]
            surgeon = surgeons[(idx - 1) % len(surgeons)] if surgeons else None
            proc_text = SURGICAL_PROCEDURE_NAMES[(idx - 1) % len(SURGICAL_PROCEDURE_NAMES)]

            surgery = Surgery.objects.create(
                tenant=tenant,
                patient=patient,
                surgeon=surgeon,
                procedure=proc_text,
                description="Intervenção cirúrgica programada.",
                estimated_price=Decimal("4500.00") + Decimal(idx * 35),
                vat_percentage=Decimal("16.00"),
                applies_vat_by_default=True,
                scheduled_for=timezone.now() - timedelta(days=random.randint(1, 540)),
                status=Surgery.Status.COMPLETED if idx % 4 else Surgery.Status.SCHEDULED,
                surgery_size=Surgery.Size.SMALL if idx % 2 else Surgery.Size.LARGE,
            )

            with suppress(Exception):
                surgery.procedures.add(catalog[(idx - 1) % len(catalog)])

            surgeries.append(surgery)

        return surgeries

    # -----------------------------------------------------
    # Lab requests
    # -----------------------------------------------------

    def ensure_lab_requests(
        self,
        tenant: Tenant,
        patients: list[Patient],
        users: list[User],
        lab_exams: list[LabExam],
        medical_exams: list[MedicalExam],
        target: int,
    ) -> list[LabRequest]:
        requests = list(LabRequest.objects.filter(tenant=tenant).order_by("id"))
        analysts = users or [None]

        while len(requests) < target and patients:
            idx = len(requests) + 1
            patient = patients[(idx - 1) % len(patients)]
            analyst = analysts[(idx - 1) % len(analysts)]
            type_value = LabRequest.Type.MEDICAL_EXAM if idx % 7 == 0 else LabRequest.Type.LABORATORY

            request = LabRequest.objects.create(
                tenant=tenant,
                patient=patient,
                analyst=analyst,
                type=type_value,
                clinical_status=_safe_choice(LabRequest._meta.get_field("clinical_status").choices, "NAO_URGENTE"),
            )

            if type_value == LabRequest.Type.LABORATORY and lab_exams:
                items_to_add = 1 + (idx % 3)
                random.shuffle(lab_exams)
                for exam in lab_exams[:items_to_add]:
                    with suppress(Exception):
                        request.add_exam(exam)
            elif medical_exams:
                items_to_add = 1 + (idx % 2)
                random.shuffle(medical_exams)
                for exam in medical_exams[:items_to_add]:
                    with suppress(Exception):
                        request.add_medical_exam(exam)

            if not request.items.exists() and lab_exams:
                with suppress(Exception):
                    request.add_exam(lab_exams[(idx - 1) % len(lab_exams)])

            requests.append(request)

        return requests

    def ensure_result_values(self, tenant: Tenant, users: list[User]) -> None:
        pending_items = ResultItem.objects.filter(tenant=tenant, result_value__isnull=True).order_by("id")[:1800]
        for idx, item in enumerate(pending_items, start=1):
            item.user = users[(idx - 1) % len(users)] if users else None
            item.result_value = Decimal("4.00") + Decimal(idx % 12)
            with suppress(Exception):
                item.save()

    def ensure_clinical_references(
        self,
        tenant: Tenant,
        exam_fields: list[LabExamField],
        faker: Faker,
        target: int,
    ) -> None:
        while ClinicalReference.objects.filter(tenant=tenant).count() < target and exam_fields:
            idx = ClinicalReference.objects.filter(tenant=tenant).count() + 1
            field = exam_fields[(idx - 1) % len(exam_fields)]
            ClinicalReference.objects.create(
                tenant=tenant,
                name=f"Ref {field.name} {idx}",
                exam_field=field,
                sex=None,
                minimum_age_days=0,
                maximum_age_days=36500,
                minimum_value=Decimal("3.50"),
                maximum_value=Decimal("11.50"),
                critical_low=Decimal("2.00"),
                critical_high=Decimal("20.00"),
            )

    def ensure_clinical_events(self, tenant: Tenant, requests: list[LabRequest]) -> None:
        while ClinicalEvent.objects.filter(tenant=tenant).count() < max(200, len(requests)) and requests:
            idx = ClinicalEvent.objects.filter(tenant=tenant).count() + 1
            request = requests[(idx - 1) % len(requests)]
            ClinicalEvent.objects.create(
                tenant=tenant,
                name=f"Evento clínico {idx}",
                patient=request.patient,
                request=request,
                event_type=ClinicalEventType.REQUISICAO_CRIADA,
                description="Requisição recebida e triada pelo laboratório.",
            )

    def ensure_clinical_history(self, patients: list[Patient], faker: Faker, target: int) -> None:
        while ClinicalHistory.objects.count() < target and patients:
            idx = ClinicalHistory.objects.count() + 1
            patient = patients[(idx - 1) % len(patients)]
            ClinicalHistory.objects.create(
                patient=patient,
                description=f"Histórico clínico: {faker.sentence(nb_words=10)}",
                event_date=timezone.now() - timedelta(days=random.randint(0, 600)),
            )

    def ensure_medical_result_files(self, tenant: Tenant) -> None:
        # Gera laudos PDF mínimos válidos para exames médicos.
        for result in Result.objects.filter(tenant=tenant).select_related("request"):
            if MedicalResultFile.objects.filter(tenant=tenant, result=result).exists():
                continue

            req_item = (
                LabRequestItem.objects.filter(request=result.request, medical_exam__isnull=False, deleted=False)
                .select_related("medical_exam")
                .first()
            )
            if not req_item:
                continue

            medical_exam = req_item.medical_exam
            if not medical_exam:
                continue

            pdf_payload = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"
            file_obj = ContentFile(pdf_payload, name=f"laudo_{result.id}.pdf")

            with suppress(Exception):
                MedicalResultFile.objects.create(
                    tenant=tenant,
                    result=result,
                    request_item=req_item,
                    medical_exam=medical_exam,
                    type=MedicalExamResultType.RELATORIO_PDF,
                    description="Laudo médico em PDF",
                    file=file_obj,
                )

    # -----------------------------------------------------
    # Nursing
    # -----------------------------------------------------

    def ensure_nursing_records(self, tenant: Tenant, patients: list[Patient], faker: Faker, target: int) -> list[NursingRecord]:
        records = list(NursingRecord.objects.filter(tenant=tenant).order_by("id"))
        priorities = [c[0] for c in NursingRecord._meta.get_field("priority").choices]

        while len(records) < target and patients:
            idx = len(records) + 1
            patient = patients[(idx - 1) % len(patients)]
            rec = NursingRecord.objects.create(
                tenant=tenant,
                name=f"Registro enfermagem {idx}",
                patient=patient,
                priority=priorities[(idx - 1) % len(priorities)] if priorities else None,
                observation=faker.sentence(nb_words=12),
            )
            records.append(rec)

        return records

    def ensure_nursing_vitals(self, tenant: Tenant, records: list[NursingRecord], target: int) -> None:
        while NursingVitalSign.objects.filter(tenant=tenant).count() < target and records:
            idx = NursingVitalSign.objects.filter(tenant=tenant).count() + 1
            record = records[(idx - 1) % len(records)]
            NursingVitalSign.objects.create(
                tenant=tenant,
                name=f"Sinais vitais {idx}",
                patient=record.patient,
                record=record,
                temperature_c=Decimal("36.5") + Decimal((idx % 5) / 10),
                blood_pressure="120/80",
                heart_rate=68 + (idx % 20),
                respiratory_rate=16 + (idx % 5),
                oxygen_saturation=96 + (idx % 3),
            )

    def ensure_nursing_procedures(
        self,
        tenant: Tenant,
        patients: list[Patient],
        users: list[User],
        target: int,
    ) -> list[Procedure]:
        procedures = list(Procedure.objects.filter(tenant=tenant).order_by("id"))

        while len(procedures) < target and patients:
            idx = len(procedures) + 1
            patient = patients[(idx - 1) % len(patients)]
            proc = Procedure.objects.create(
                tenant=tenant,
                patient=patient,
                notes="Procedimento assistencial de rotina.",
                performed_date=timezone.now() - timedelta(days=random.randint(0, 420)),
            )
            with suppress(Exception):
                if users:
                    proc.professional.add(users[(idx - 1) % len(users)])
            procedures.append(proc)

        return procedures

    def ensure_procedure_catalog(self, tenant: Tenant, target: int) -> list[ProcedureCatalog]:
        catalogs = list(ProcedureCatalog.objects.filter(tenant=tenant).order_by("id"))

        while len(catalogs) < target:
            idx = len(catalogs) + 1
            catalog = ProcedureCatalog.objects.create(
                tenant=tenant,
                name=f"Procedimento de Enfermagem {idx:03d}",
                procedure_code=f"PE-{idx:04d}",
                description="Procedimento padronizado institucional.",
                default_price=Decimal("350.00") + Decimal(idx * 6),
                vat_percentage=Decimal("16.00"),
                applies_vat_by_default=True,
                estimated_duration_minutes=20 + (idx % 80),
                active=True,
            )
            catalogs.append(catalog)

        return catalogs

    def ensure_procedure_catalog_materials(
        self,
        tenant: Tenant,
        catalogs: list[ProcedureCatalog],
        products: list[Product],
        target: int,
    ) -> None:
        while ProcedureCatalogMaterial.objects.filter(tenant=tenant).count() < target and catalogs and products:
            idx = ProcedureCatalogMaterial.objects.filter(tenant=tenant).count() + 1
            catalog = catalogs[(idx - 1) % len(catalogs)]
            product = products[(idx - 1) % len(products)]

            with suppress(Exception):
                ProcedureCatalogMaterial.objects.get_or_create(
                    tenant=tenant,
                    catalog=catalog,
                    product=product,
                    defaults={
                        "default_quantity": Decimal("1.00"),
                        "default_unit_cost": product.sale_price,
                        "observation": "Material padrão do procedimento.",
                    },
                )

    def ensure_procedure_items(
        self,
        tenant: Tenant,
        procedures: list[Procedure],
        catalogs: list[ProcedureCatalog],
        target: int,
    ) -> None:
        guard = 0
        while ProcedureItem.objects.filter(tenant=tenant).count() < target and procedures:
            guard += 1
            if guard > target * 12:
                break

            idx = ProcedureItem.objects.filter(tenant=tenant).count() + 1
            procedure = procedures[(idx - 1) % len(procedures)]
            catalog = catalogs[(idx - 1) % len(catalogs)] if catalogs else None

            with suppress(Exception):
                ProcedureItem.objects.create(
                    tenant=tenant,
                    procedure=procedure,
                    catalog=catalog,
                    description=(catalog.name if catalog else f"Serviço {idx}"),
                    quantity=1,
                    unit_price=(catalog.default_price if catalog else Decimal("180.00")),
                    performed=True,
                    execution_status=ProcedureItem.ExecutionStatus.COMPLETED if idx % 5 else ProcedureItem.ExecutionStatus.EXECUTED,
                    billed=idx % 6 == 0,
                    observation="Item de procedimento criado para seed.",
                )

    def ensure_nursing_evolution(self, tenant: Tenant, patients: list[Patient], faker: Faker, target: int) -> None:
        while NursingEvolution.objects.filter(tenant=tenant).count() < target and patients:
            idx = NursingEvolution.objects.filter(tenant=tenant).count() + 1
            patient = patients[(idx - 1) % len(patients)]
            NursingEvolution.objects.create(
                tenant=tenant,
                patient=patient,
                name=f"Evolução de enfermagem {idx}",
                observation=faker.paragraph(nb_sentences=2),
            )

    def ensure_nursing_prescriptions(self, tenant: Tenant, patients: list[Patient], faker: Faker, target: int) -> None:
        while NursingPrescription.objects.filter(tenant=tenant).count() < target and patients:
            idx = NursingPrescription.objects.filter(tenant=tenant).count() + 1
            patient = patients[(idx - 1) % len(patients)]
            NursingPrescription.objects.create(
                tenant=tenant,
                patient=patient,
                name=f"Prescrição de enfermagem {idx}",
                description=faker.sentence(nb_words=10),
                active=idx % 7 != 0,
            )

    def ensure_ward_data(self, tenant: Tenant, patients: list[Patient]) -> None:
        wards = list(Ward.objects.filter(tenant=tenant).order_by("id"))
        if not wards:
            for idx, name in enumerate(["Enfermaria Geral", "Enfermaria Pediátrica", "Maternidade"], start=1):
                wards.append(
                    Ward.objects.create(
                        tenant=tenant,
                        name=name,
                        description=f"{name} - ala {idx}",
                        active=True,
                    )
                )

        beds = list(WardBed.objects.filter(tenant=tenant).order_by("id"))
        if len(beds) < 24:
            for ward in wards:
                for n in range(1, 9):
                    number = f"{ward.id:02d}-{n:02d}"
                    with suppress(Exception):
                        bed = WardBed.objects.create(
                            tenant=tenant,
                            ward=ward,
                            number=number,
                            active=True,
                        )
                        beds.append(bed)

        for idx, bed in enumerate(beds[:16], start=1):
            if WardAdmission.objects.filter(tenant=tenant, bed=bed, active=True, deleted=False).exists():
                continue
            patient = patients[(idx - 1) % len(patients)]
            with suppress(Exception):
                WardAdmission.objects.create(
                    tenant=tenant,
                    bed=bed,
                    patient=patient,
                    estimated_observation_hours=24 + (idx % 72),
                    admission_date=timezone.now() - timedelta(days=idx % 9),
                    expected_discharge_date=timezone.now() + timedelta(days=2 + (idx % 4)),
                    next_medication_at=timezone.now() + timedelta(hours=2 + (idx % 6)),
                    next_medication_description="Analgésico EV",
                    active=True,
                    notes="Internamento para observação clínica.",
                )

    # -----------------------------------------------------
    # Maternity
    # -----------------------------------------------------

    def ensure_maternity(
        self,
        tenant: Tenant,
        patients: list[Patient],
        employees: list[Employee],
        target: int,
    ) -> None:
        doctors = [e for e in employees if e.role and e.role.is_doctor]
        female_candidates = [p for p in patients if p.gender == Gender.FEMALE]

        while Pregnancy.objects.filter(tenant=tenant).count() < target and female_candidates:
            idx = Pregnancy.objects.filter(tenant=tenant).count() + 1
            patient = female_candidates[(idx - 1) % len(female_candidates)]
            doctor = doctors[(idx - 1) % len(doctors)] if doctors else None
            total_deliveries = random.randint(0, 4)
            normal = random.randint(0, total_deliveries)
            cesar = random.randint(0, total_deliveries - normal) if total_deliveries > normal else 0

            with suppress(Exception):
                Pregnancy.objects.create(
                    tenant=tenant,
                    patient=patient,
                    responsible_doctor=doctor,
                    last_menstrual_period_date=_today() - timedelta(days=120 + (idx % 130)),
                    expected_delivery_date=_today() + timedelta(days=40 + (idx % 120)),
                    nursery=f"Berçário {1 + (idx % 4)}",
                    maternity_bed=f"M-{1 + (idx % 20)}",
                    total_deliveries=total_deliveries,
                    normal_deliveries=normal,
                    cesareans=cesar,
                    status=Pregnancy.Status.FOLLOW_UP,
                    notes="Seguimento pré-natal programado.",
                )

    # -----------------------------------------------------
    # Billing / payments / accounting
    # -----------------------------------------------------

    def ensure_invoices(
        self,
        tenant: Tenant,
        requests: list[LabRequest],
        sales: list[Sale],
        procedures: list[Procedure],
        consultations: list[MedicalConsultation],
        surgeries: list[Surgery],
        target: int,
    ) -> list[Invoice]:
        invoices = list(Invoice.objects.filter(tenant=tenant).order_by("id"))

        # Origem clínica prioritária (lab requests)
        for req in requests:
            if Invoice.objects.filter(request=req, deleted=False).exists():
                continue
            inv = Invoice.objects.create(
                tenant=tenant,
                origin=Invoice.Origin.CLINICAL,
                request=req,
                patient=req.patient,
            )
            with suppress(Exception):
                inv.sync_items_from_origin()
            invoices.append(inv)
            if len(invoices) >= target:
                break

        # Farmácia
        for sale in sales:
            if len(invoices) >= target:
                break
            if Invoice.objects.filter(sale=sale, deleted=False).exists():
                continue
            inv = Invoice.objects.create(
                tenant=tenant,
                origin=Invoice.Origin.PHARMACY,
                sale=sale,
                patient=sale.patient,
            )
            with suppress(Exception):
                inv.sync_items_from_origin()
            invoices.append(inv)

        # Enfermagem (legado + múltiplos)
        for proc in procedures:
            if len(invoices) >= target:
                break
            if Invoice.objects.filter(procedure=proc, deleted=False).exists():
                continue
            inv = Invoice.objects.create(
                tenant=tenant,
                origin=Invoice.Origin.NURSING,
                procedure=proc,
                patient=proc.patient,
            )
            with suppress(Exception):
                inv.sync_items_from_origin()
            invoices.append(inv)

        # Consulta
        for consultation in consultations:
            if len(invoices) >= target:
                break
            if Invoice.objects.filter(consultation=consultation, deleted=False).exists():
                continue
            inv = Invoice.objects.create(
                tenant=tenant,
                origin=Invoice.Origin.CONSULTATION,
                consultation=consultation,
                patient=consultation.patient,
            )
            with suppress(Exception):
                inv.sync_items_from_origin()
            invoices.append(inv)

        # Cirurgia
        for surgery in surgeries:
            if len(invoices) >= target:
                break
            if Invoice.objects.filter(surgery=surgery, deleted=False).exists():
                continue
            inv = Invoice.objects.create(
                tenant=tenant,
                origin=Invoice.Origin.SURGERY,
                surgery=surgery,
                patient=surgery.patient,
            )
            with suppress(Exception):
                inv.sync_items_from_origin()
            invoices.append(inv)

        return list(Invoice.objects.filter(tenant=tenant).order_by("id"))

    def ensure_invoice_history(self, tenant: Tenant, invoices: list[Invoice], target: int) -> None:
        while InvoiceHistory.objects.filter(tenant=tenant).count() < target and invoices:
            idx = InvoiceHistory.objects.filter(tenant=tenant).count() + 1
            inv = invoices[(idx - 1) % len(invoices)]
            InvoiceHistory.objects.create(
                tenant=tenant,
                name=f"Histórico da fatura {idx}",
                invoice=inv,
                event_type="SEED",
                description="Evento gerado automaticamente para trilha de auditoria.",
            )

    def ensure_payments(self, tenant: Tenant, invoices: list[Invoice], target: int) -> list[Payment]:
        payments = list(Payment.objects.filter(tenant=tenant).order_by("id"))
        methods = [c[0] for c in Payment.Method.choices]

        while len(payments) < target and invoices:
            idx = len(payments) + 1
            invoice = invoices[(idx - 1) % len(invoices)]
            value = invoice.total if invoice.total and invoice.total > 0 else Decimal("150.00")
            method = methods[(idx - 1) % len(methods)] if methods else Payment.Method.CASH
            status = Payment.Status.CONFIRMED if idx % 3 == 0 else Payment.Status.PENDING

            payment = Payment.objects.create(
                tenant=tenant,
                name=f"Pagamento {idx}",
                invoice=invoice,
                value=value,
                change_amount=Decimal("0.00"),
                method=method,
                status=status,
                external_reference=f"PAY-{tenant.id}-{idx:06d}",
                paid_at=timezone.now() if status == Payment.Status.CONFIRMED else None,
            )
            payments.append(payment)

        return payments

    def ensure_payment_history(self, tenant: Tenant, payments: list[Payment], target: int) -> None:
        while PaymentHistory.objects.filter(tenant=tenant).count() < target and payments:
            idx = PaymentHistory.objects.filter(tenant=tenant).count() + 1
            payment = payments[(idx - 1) % len(payments)]
            PaymentHistory.objects.create(
                tenant=tenant,
                name=f"Histórico do pagamento {idx}",
                payment=payment,
                event_type=PaymentHistory.EventType.CRIADO,
                value=payment.value,
                description="Evento de criação do pagamento.",
                external_reference=payment.external_reference,
            )

    def ensure_receipts(self, payments: list[Payment], target: int) -> None:
        while Receipt.objects.count() < target and payments:
            idx = Receipt.objects.count() + 1
            payment = payments[(idx - 1) % len(payments)]
            if Receipt.objects.filter(payment=payment).exists():
                if idx > target * 5:
                    break
                continue
            with suppress(Exception):
                Receipt.objects.create(
                    invoice=payment.invoice,
                    payment=payment,
                    number=f"RCB-{payment.invoice_id}-{idx:06d}",
                    value=payment.value,
                )

    def ensure_transactions(self, target: int) -> list[Transaction]:
        transactions = list(Transaction.objects.order_by("id"))
        while len(transactions) < target:
            idx = len(transactions) + 1
            tx = Transaction.objects.create(
                external_reference=f"TX-{idx:08d}",
                gateway="GATEWAY_SEED",
                status="confirmada" if idx % 2 == 0 else "pendente",
                gateway_response=f"{{\"seed\": {idx}}}",
            )
            transactions.append(tx)
        return transactions

    def ensure_reconciliation(self, transactions: list[Transaction], target: int) -> None:
        while Reconciliation.objects.count() < target and transactions:
            idx = Reconciliation.objects.count() + 1
            tx = transactions[(idx - 1) % len(transactions)]
            Reconciliation.objects.get_or_create(
                transaction=tx,
                defaults={
                    "confirmed": idx % 2 == 0,
                    "confirmation_date": timezone.now() if idx % 2 == 0 else None,
                },
            )

    def ensure_accounting(self, tenant: Tenant, invoices: list[Invoice], target: int) -> None:
        account_types = [c[0] for c in Account._meta.get_field("type").choices]

        accounts = list(Account.objects.filter(tenant=tenant).order_by("id"))
        while len(accounts) < 10:
            idx = len(accounts) + 1
            acc = Account.objects.create(
                tenant=tenant,
                name=f"Conta contábil {idx}",
                type=account_types[(idx - 1) % len(account_types)] if account_types else "DES",
            )
            accounts.append(acc)

        while LegacyEntry.objects.filter(tenant=tenant).count() < target:
            idx = LegacyEntry.objects.filter(tenant=tenant).count() + 1
            entry = LegacyEntry.objects.create(
                tenant=tenant,
                name=f"Lançamento legado {idx}",
                description="Lançamento contábil gerado por seed.",
                date=_today() - timedelta(days=idx % 365),
                external_reference=f"LEG-{tenant.id}-{idx:06d}",
                confirmed=idx % 2 == 0,
            )
            debit = accounts[(idx - 1) % len(accounts)]
            credit = accounts[idx % len(accounts)]
            LegacyMovement.objects.create(
                tenant=tenant,
                name=f"Mov D {idx}",
                entry=entry,
                account=debit,
                debit=Decimal("100.00"),
                credit=Decimal("0.00"),
            )
            LegacyMovement.objects.create(
                tenant=tenant,
                name=f"Mov C {idx}",
                entry=entry,
                account=credit,
                debit=Decimal("0.00"),
                credit=Decimal("100.00"),
            )

        while LedgerEntry.objects.filter(tenant=tenant).count() < target:
            idx = LedgerEntry.objects.filter(tenant=tenant).count() + 1
            entry = LedgerEntry.objects.create(
                tenant=tenant,
                name=f"Ledger {idx}",
                external_reference=f"LED-{tenant.id}-{idx:07d}",
                idempotency_key=f"IDEMP-{tenant.id}-{idx:07d}",
                accounting_date=_today() - timedelta(days=idx % 365),
                description="Lançamento imutável de seed",
            )
            debit = accounts[(idx - 1) % len(accounts)]
            credit = accounts[idx % len(accounts)]
            LedgerLine.objects.create(
                tenant=tenant,
                name=f"Linha D {idx}",
                entry=entry,
                account=debit,
                value=Decimal("50.00"),
                nature="D",
            )
            LedgerLine.objects.create(
                tenant=tenant,
                name=f"Linha C {idx}",
                entry=entry,
                account=credit,
                value=Decimal("50.00"),
                nature="C",
            )

        for account in accounts:
            AccountBalance.objects.get_or_create(account=account, defaults={"current_balance": Decimal("0.00")})

        while FinancialReconciliation.objects.filter(tenant=tenant).count() < max(120, min(target, len(invoices))) and invoices:
            idx = FinancialReconciliation.objects.filter(tenant=tenant).count() + 1
            invoice = invoices[(idx - 1) % len(invoices)]
            FinancialReconciliation.objects.create(
                tenant=tenant,
                name=f"Conciliação {idx}",
                invoice=invoice,
                external_reference=f"CON-{tenant.id}-{idx:06d}",
                accounting_value=invoice.total or Decimal("100.00"),
                received_amount=invoice.total or Decimal("100.00"),
            )

    # -----------------------------------------------------
    # Insurer
    # -----------------------------------------------------

    def ensure_insurer_data(self, tenant: Tenant, target_insurers: int, target_plans: int) -> tuple[list[Insurer], list[CoveragePlan]]:
        insurers = list(Insurer.objects.filter(tenant=tenant).order_by("id"))

        while len(insurers) < target_insurers:
            idx = len(insurers) + 1
            ins = Insurer.objects.create(
                tenant=tenant,
                name=f"Seguradora {idx:02d}",
                description="Seguradora parceira",
                order=idx,
                external_code=f"SEG-{tenant.id}-{idx:04d}",
                email=f"seg{idx:02d}@insurance.local",
                phone=_phone(850000 + idx),
                active=True,
            )
            insurers.append(ins)

        plans = list(CoveragePlan.objects.filter(tenant=tenant).order_by("id"))
        while len(plans) < target_plans and insurers:
            idx = len(plans) + 1
            insurer = insurers[(idx - 1) % len(insurers)]
            plan = CoveragePlan.objects.create(
                tenant=tenant,
                name=f"Plano cobertura {idx:03d}",
                description="Plano de cobertura assistencial",
                order=idx,
                insurer=insurer,
                coverage_percentage=Decimal("70.00") + Decimal(idx % 25),
                requires_authorization=idx % 2 == 0,
                active=True,
            )
            plans.append(plan)

        for idx, plan in enumerate(plans, start=1):
            TenantCoveragePlan.objects.get_or_create(
                tenant=tenant,
                global_plan=plan,
                defaults={
                    "name": f"Override {plan.name}",
                    "description": "Override por tenant",
                    "order": idx,
                    "override_percentage": Decimal("75.00") if idx % 3 == 0 else None,
                    "active": True,
                },
            )

        return insurers, plans

    def ensure_authorizations(
        self,
        tenant: Tenant,
        requests: list[LabRequest],
        plans: list[CoveragePlan],
        target: int,
    ) -> None:
        while ProcedureAuthorization.objects.filter(tenant=tenant).count() < target and requests and plans:
            idx = ProcedureAuthorization.objects.filter(tenant=tenant).count() + 1
            request = requests[(idx - 1) % len(requests)]
            plan = plans[(idx - 1) % len(plans)]
            ProcedureAuthorization.objects.create(
                tenant=tenant,
                name=f"Autorização {idx:05d}",
                description="Autorização de procedimento/exame",
                order=idx,
                request_id=request.custom_id or str(request.id),
                plan=plan,
                status=ProcedureAuthorization.Status.PENDENTE,
                authorization_code=f"AUT-{tenant.id}-{idx:06d}",
                active=True,
            )

    # -----------------------------------------------------
    # Equipment, inspection, incidents, maintenance
    # -----------------------------------------------------

    def ensure_equipment(self, tenant: Tenant, faker: Faker, target: int) -> list[Equipment]:
        equipment = list(Equipment.objects.filter(tenant=tenant).order_by("id"))

        while len(equipment) < target:
            idx = len(equipment) + 1
            eq = Equipment.objects.create(
                tenant=tenant,
                name=f"Equipamento Clínico {idx:03d}",
                serial_number=f"SER-{tenant.id}-{idx:06d}",
                acquisition_date=_today() - timedelta(days=300 + idx),
                acquisition_status=Equipment.AcquisitionStatus.NEW if idx % 3 else Equipment.AcquisitionStatus.USED,
                initial_operational_status=Equipment.OperationalStatus.WORKING,
                initial_failure_type="",
                manufacturer=random.choice(["Mindray", "Siemens", "Philips", "GE"]),
                model=f"Model-{idx % 15}",
                location=random.choice(["Laboratório", "Radiologia", "Farmácia", "Urgência"]),
                responsible=faker.name(),
                active=True,
            )
            equipment.append(eq)

        return equipment

    def ensure_inspections(self, tenant: Tenant, equipment: list[Equipment], target: int) -> None:
        while DailyInspection.objects.filter(tenant=tenant).count() < target and equipment:
            idx = DailyInspection.objects.filter(tenant=tenant).count() + 1
            eq = equipment[(idx - 1) % len(equipment)]
            day = _today() - timedelta(days=idx % 60)
            with suppress(Exception):
                DailyInspection.objects.create(
                    tenant=tenant,
                    equipment=eq,
                    date=day,
                    operation_status=DailyInspection.Funcionamento.FUNCIONANDO if idx % 8 else DailyInspection.Funcionamento.AVARIADO,
                    cleaning_performed=idx % 2 == 0,
                    assessment="Inspeção diária conforme checklist.",
                    notes="Sem anomalias relevantes." if idx % 8 else "Requer intervenção técnica.",
                )

    def ensure_maintenances(self, tenant: Tenant, equipment: list[Equipment], target: int) -> None:
        types = [c[0] for c in Maintenance.Type.choices]
        while Maintenance.objects.filter(tenant=tenant).count() < target and equipment:
            idx = Maintenance.objects.filter(tenant=tenant).count() + 1
            eq = equipment[(idx - 1) % len(equipment)]
            Maintenance.objects.create(
                tenant=tenant,
                equipment=eq,
                type=types[(idx - 1) % len(types)] if types else Maintenance.Type.MONTHLY,
                maintenance_type=Maintenance.MaintenanceType.PREVENTIVE,
                scheduled_date=_today() + timedelta(days=idx % 50),
                performed_date=_today() - timedelta(days=idx % 30) if idx % 3 == 0 else None,
                description="Plano de manutenção preventiva.",
                technician="Equipe biomédica",
            )

    def ensure_incidents(self, tenant: Tenant, equipment: list[Equipment], target: int) -> None:
        types = [c[0] for c in Incident.Type.choices]
        while Incident.objects.filter(tenant=tenant).count() < target and equipment:
            idx = Incident.objects.filter(tenant=tenant).count() + 1
            eq = equipment[(idx - 1) % len(equipment)]
            Incident.objects.create(
                tenant=tenant,
                equipment=eq,
                date=timezone.now() - timedelta(days=idx % 120, hours=idx % 20),
                type=types[(idx - 1) % len(types)] if types else Incident.Type.OTHER,
                description="Oscilação operacional detectada durante uso assistencial.",
                support_contact="Suporte biomédico interno",
                resolved=idx % 3 == 0,
            )

    # -----------------------------------------------------
    # Integrations
    # -----------------------------------------------------

    def ensure_integrations(
        self,
        tenant: Tenant,
        equipment: list[Equipment],
        requests: list[LabRequest],
        exam_fields: list[LabExamField],
        users: list[User],
    ) -> None:
        integrations = list(IntegrationEquipment.objects.filter(tenant=tenant).order_by("id"))

        while len(integrations) < 12:
            idx = len(integrations) + 1
            integ = IntegrationEquipment.objects.create(
                tenant=tenant,
                name=f"Integração Equipamento {idx:02d}",
                modality=_safe_choice(IntegrationEquipment.Modalidade.choices, IntegrationEquipment.Modalidade.OUTRO),
                protocol=_safe_choice(IntegrationEquipment.Protocolo.choices, IntegrationEquipment.Protocolo.HTTP_JSON),
                manufacturer=random.choice(["Mindray", "Sysmex", "Roche", "Philips"]),
                model=f"INT-{idx:02d}",
                serial_number=f"INTSER-{tenant.id}-{idx:05d}",
                active=True,
                config={"host": "127.0.0.1", "port": 8000 + idx},
            )
            integrations.append(integ)

        # Rotas
        sectors = [c[0] for c in Sector.choices]
        for idx, integ in enumerate(integrations, start=1):
            with suppress(Exception):
                IntegrationRouting.objects.get_or_create(
                    tenant=tenant,
                    equipment=integ,
                    exam_type=IntegrationRouting.ExamType.LABORATORIO,
                    sector=sectors[(idx - 1) % len(sectors)] if sectors else Sector.OUTRO,
                    defaults={"active": True},
                )

        # Mapeamento de analitos
        for idx, integ in enumerate(integrations, start=1):
            field = exam_fields[(idx - 1) % len(exam_fields)] if exam_fields else None
            if not field:
                continue
            with suppress(Exception):
                IntegrationAnalyteMapping.objects.get_or_create(
                    tenant=tenant,
                    equipment=integ,
                    code=f"ANL-{idx:04d}",
                    defaults={
                        "name": f"Mapeamento {idx}",
                        "exam_field": field,
                        "unit_override": field.unit,
                        "active": True,
                    },
                )

        # Credenciais
        for integ in integrations:
            if IntegrationCredential.objects.filter(tenant=tenant, equipment=integ, deleted=False).exists():
                continue
            with suppress(Exception):
                IntegrationCredential.generate(equipment=integ, label=f"Credencial {integ.id}")

        # Ordens
        for idx, req in enumerate(requests[:220], start=1):
            integ = integrations[(idx - 1) % len(integrations)]
            order, _ = IntegrationOrder.objects.get_or_create(
                tenant=tenant,
                equipment=integ,
                request=req,
                defaults={
                    "status": IntegrationOrder.Status.PENDING,
                    "observation": "Ordem de integração para analisador.",
                },
            )

            item = req.items.filter(deleted=False).first()
            if item:
                with suppress(Exception):
                    IntegrationOrderItem.objects.get_or_create(
                        tenant=tenant,
                        order=order,
                        request_item=item,
                        defaults={"status": IntegrationOrderItem.Status.PENDING},
                    )

            msg = IntegrationMessage.objects.create(
                tenant=tenant,
                equipment=integ,
                order=order,
                direction=IntegrationMessage.Direction.OUTBOUND,
                protocol=integ.protocol,
                message_id=f"MSG-{order.id}",
                content_type="application/json",
                sha256="",
                payload_json={"order": order.custom_id, "request": req.custom_id},
                payload_raw='{"seed": true}',
                status=IntegrationMessage.Status.RECEIVED,
            )

            doc_payload = ContentFile(b"resultado_integracao_seed", name=f"result_{msg.id}.txt")
            with suppress(Exception):
                IntegrationDocument.objects.create(
                    tenant=tenant,
                    message=msg,
                    order_item=order.items.first(),
                    file=doc_payload,
                    filename=f"result_{msg.id}.txt",
                    content_type="text/plain",
                )

    # -----------------------------------------------------
    # Blood bank
    # -----------------------------------------------------

    def ensure_bloodbank(self, tenant: Tenant, patients: list[Patient], users: list[User]) -> None:
        storages = list(BloodStorage.objects.filter(tenant=tenant).order_by("id"))
        while len(storages) < 3:
            idx = len(storages) + 1
            st = BloodStorage.objects.create(
                tenant=tenant,
                name=f"Hemoteca {idx}",
                location=random.choice(["Bloco A", "Bloco B", "Laboratório Central"]),
                capacity_units=250,
                temperature_min_c=Decimal("2.0"),
                temperature_max_c=Decimal("6.0"),
                is_active=True,
            )
            storages.append(st)

        adult_donors = [p for p in patients if p.birth_date and p.birth_date <= (_today() - timedelta(days=18 * 365))]
        if not adult_donors:
            return

        donations = list(BloodDonation.objects.filter(tenant=tenant).order_by("id"))
        while len(donations) < 40:
            idx = len(donations) + 1
            donor = adult_donors[(idx - 1) % len(adult_donors)]
            collected_by = users[(idx - 1) % len(users)] if users else None
            donation = BloodDonation.objects.create(
                tenant=tenant,
                donor=donor,
                donor_role=BloodDonation.DonorRole.VOLUNTARY,
                collected_by=collected_by,
                bag_identifier=f"BAG-{tenant.id}-{idx:06d}",
                blood_type=donor.blood_type or _blood_type_weighted(),
                donation_type=BloodDonation.DonationType.WHOLE_BLOOD,
                status=BloodDonation.DonationStatus.COMPLETED,
                screening_status=BloodDonation.ScreeningStatus.PENDING,
                collected_at=timezone.now() - timedelta(days=idx * 3),
                processed_at=timezone.now() - timedelta(days=idx * 3 - 1),
                volume_ml=450,
                donor_weight_kg=Decimal("68.0"),
                hemoglobin_g_dl=Decimal("13.4"),
                hiv_test=BloodDonation.TestResult.PENDING,
                syphilis_rpr_test=BloodDonation.TestResult.PENDING,
                hepatitis_b_hbsag_test=BloodDonation.TestResult.PENDING,
                hepatitis_c_anti_hcv_test=BloodDonation.TestResult.PENDING,
                malaria_test=BloodDonation.TestResult.PENDING,
            )
            donations.append(donation)

        units = list(BloodUnit.objects.filter(tenant=tenant).order_by("id"))
        while len(units) < 60 and donations:
            idx = len(units) + 1
            donation = donations[(idx - 1) % len(donations)]
            storage = storages[(idx - 1) % len(storages)] if storages else None
            unit = BloodUnit.objects.create(
                tenant=tenant,
                donation=donation,
                storage=storage,
                unit_number=f"UNT-{tenant.id}-{idx:06d}",
                component_type=BloodUnit._meta.get_field("component_type").choices[0][0],
                blood_type=donation.blood_type,
                volume_ml=450,
                collected_at=donation.collected_at,
                expires_at=donation.collected_at + timedelta(days=35),
                status=BloodUnit.UnitStatus.AVAILABLE,
            )
            units.append(unit)

        while BloodStockMovement.objects.filter(tenant=tenant).count() < 80 and units:
            idx = BloodStockMovement.objects.filter(tenant=tenant).count() + 1
            unit = units[(idx - 1) % len(units)]
            storage = unit.storage or storages[(idx - 1) % len(storages)]
            BloodStockMovement.objects.create(
                tenant=tenant,
                unit=unit,
                source_storage=storage,
                destination_storage=None,
                movement_type=BloodStockMovement.MovementType.ADJUSTMENT,
                moved_at=timezone.now() - timedelta(days=idx % 90),
                performed_by=users[(idx - 1) % len(users)] if users else None,
                reason="Ajuste de inventário hemoterápico",
            )

        recipients_by_type: dict[str, list[Patient]] = {}
        for p in patients:
            recipients_by_type.setdefault(p.blood_type or BloodType.UNKNOWN, []).append(p)

        while BloodTransfusion.objects.filter(tenant=tenant).count() < 30 and units:
            idx = BloodTransfusion.objects.filter(tenant=tenant).count() + 1
            unit = units[(idx - 1) % len(units)]
            candidates = recipients_by_type.get(unit.blood_type) or patients
            recipient = candidates[(idx - 1) % len(candidates)]

            BloodTransfusion.objects.create(
                tenant=tenant,
                recipient=recipient,
                blood_unit=unit,
                requested_by=users[(idx - 1) % len(users)] if users else None,
                performed_by=users[idx % len(users)] if users else None,
                status=BloodTransfusion.TransfusionStatus.COMPLETED,
                requested_at=timezone.now() - timedelta(days=idx % 40),
                started_at=timezone.now() - timedelta(days=idx % 40, hours=-1),
                finished_at=timezone.now() - timedelta(days=idx % 40, hours=-2),
                indication="Anemia aguda com indicação transfusional.",
            )

        while BloodStorageMaintenance.objects.filter(tenant=tenant).count() < 25 and storages:
            idx = BloodStorageMaintenance.objects.filter(tenant=tenant).count() + 1
            storage = storages[(idx - 1) % len(storages)]
            BloodStorageMaintenance.objects.create(
                tenant=tenant,
                storage=storage,
                maintenance_type=BloodStorageMaintenance.MaintenanceType.PREVENTIVE,
                status=BloodStorageMaintenance.MaintenanceStatus.COMPLETED,
                scheduled_at=timezone.now() - timedelta(days=idx * 6),
                performed_at=timezone.now() - timedelta(days=idx * 6 - 1),
                technician_name="Técnico de refrigeração",
                findings="Temperatura dentro da faixa operacional.",
                actions_taken="Limpeza de condensador e calibração.",
            )

    # -----------------------------------------------------
    # Medical records
    # -----------------------------------------------------

    def ensure_medical_records(
        self,
        tenant: Tenant,
        patients: list[Patient],
        employees: list[Employee],
        consultations: list[MedicalConsultation],
        products: list[Product],
        target_records: int,
    ) -> None:
        doctors = [e for e in employees if e.role and e.role.is_doctor]

        records = list(MedicalRecordEntry.objects.filter(tenant=tenant).order_by("id"))
        while len(records) < target_records and patients:
            idx = len(records) + 1
            patient = patients[(idx - 1) % len(patients)]
            doctor = doctors[(idx - 1) % len(doctors)] if doctors else None
            rec = MedicalRecordEntry.objects.create(
                tenant=tenant,
                patient=patient,
                doctor=doctor,
                care_start_at=timezone.now() - timedelta(days=idx % 220),
                care_end_at=timezone.now() - timedelta(days=idx % 220, hours=-1),
                status=MedicalRecordEntry.Status.FINALIZED if idx % 3 else MedicalRecordEntry.Status.DRAFT,
                symptoms="Queixas de dor, febre e mal-estar geral.",
                diagnosis="Síndrome gripal / infecção de vias respiratórias superiores.",
                prescription="Hidratação oral, antitérmico e observação clínica.",
                medical_report="Evolução favorável após terapêutica inicial.",
            )
            if consultations:
                with suppress(Exception):
                    rec.consultations.add(consultations[(idx - 1) % len(consultations)])
            records.append(rec)

        medications = [p for p in products if p.type == Product.ProductType.MEDICAMENTO]
        if not medications:
            return

        while PrescriptionItem.objects.filter(tenant=tenant).count() < (target_records * 2):
            idx = PrescriptionItem.objects.filter(tenant=tenant).count() + 1
            record = records[(idx - 1) % len(records)]
            medication = medications[(idx - 1) % len(medications)]
            dose_count = 1 if idx % 4 == 0 else 3
            interval = None if dose_count == 1 else 8

            with suppress(Exception):
                PrescriptionItem.objects.create(
                    tenant=tenant,
                    record=record,
                    medication=medication,
                    dosage_value=Decimal("500.00") if dose_count > 1 else Decimal("1.00"),
                    dosage_unit=PrescriptionItem.DosageUnit.MG if dose_count > 1 else PrescriptionItem.DosageUnit.ML,
                    interval_hours=interval,
                    dose_count=dose_count,
                    notes="Administrar após refeição quando aplicável.",
                )

    # -----------------------------------------------------
    # Reception
    # -----------------------------------------------------

    def ensure_checkins(
        self,
        tenant: Tenant,
        patients: list[Patient],
        users: list[User],
        requests: list[LabRequest],
        invoices: list[Invoice],
        target: int,
    ) -> None:
        while ReceptionCheckin.objects.filter(tenant=tenant).count() < target and patients:
            idx = ReceptionCheckin.objects.filter(tenant=tenant).count() + 1
            patient = patients[(idx - 1) % len(patients)]
            attendant = users[(idx - 1) % len(users)] if users else None
            req = requests[(idx - 1) % len(requests)] if requests and idx % 2 == 0 else None
            inv = None
            if req:
                inv = next((f for f in invoices if f.request_id == req.id), None)

            ReceptionCheckin.objects.create(
                tenant=tenant,
                patient=patient,
                request=req,
                invoice=inv if idx % 3 == 0 else None,
                attendant=attendant,
                priority=random.choice([c[0] for c in ReceptionCheckin.Priority.choices]),
                status=random.choice([c[0] for c in ReceptionCheckin.Status.choices]),
                reason="Atendimento ambulatorial",
                notes="Paciente orientado sobre fluxo de atendimento.",
                arrived_at=timezone.now() - timedelta(hours=idx % 72),
            )

    # -----------------------------------------------------
    # Monitoring, audit, notifications
    # -----------------------------------------------------

    def ensure_monitoring_logs(self, tenant: Tenant, users: list[User], target: int) -> None:
        methods = ["GET", "POST", "PUT", "PATCH", "DELETE"]
        paths = [
            "/api/v1/clinical/requests/",
            "/api/v1/pharmacy/products/",
            "/api/v1/billing/invoices/",
            "/api/v1/consultations/",
            "/api/v1/reception/checkins/",
        ]

        while SystemError.objects.filter(tenant=tenant).count() < target:
            idx = SystemError.objects.filter(tenant=tenant).count() + 1
            user = users[(idx - 1) % len(users)] if users else None
            method = methods[(idx - 1) % len(methods)]
            path = paths[(idx - 1) % len(paths)]
            SystemError.objects.create(
                tenant=tenant,
                user=user,
                method=method,
                path=path,
                full_path=f"{path}?seed={idx}",
                status_code=500 if idx % 2 else 504,
                duration_ms=120 + (idx % 900),
                ip="10.0.0.1",
                user_agent="seed-agent",
                view_basename="seed-view",
                view_action="list",
                object_id=str(idx),
                exception_class="SeedRuntimeError",
                message="Erro sintético de monitoramento para análise de observabilidade.",
                traceback="Traceback (most recent call last): ...",
                metadata={"seed": idx},
            )

    def ensure_activity_logs(self, tenant: Tenant, users: list[User], target: int) -> None:
        methods = ["GET", "POST", "PATCH"]
        routes = [
            "/api/v1/clinical/requests/",
            "/api/v1/pharmacy/requisitions/",
            "/api/v1/billing/invoices/",
            "/api/v1/consultations/",
            "/api/v1/nursing/procedures/",
        ]

        while UserActivity.objects.filter(tenant=tenant).count() < target:
            idx = UserActivity.objects.filter(tenant=tenant).count() + 1
            user = users[(idx - 1) % len(users)] if users else None
            method = methods[(idx - 1) % len(methods)]
            path = routes[(idx - 1) % len(routes)]
            UserActivity.objects.create(
                tenant=tenant,
                user=user,
                method=method,
                path=path,
                full_path=f"{path}?page={idx % 20}",
                status_code=200,
                duration_ms=20 + (idx % 220),
                ip="10.0.0.10",
                user_agent="seed-script",
                view_basename="seed",
                view_action="list",
                object_id=str(idx),
                message="Ação registrada no log de auditoria.",
                metadata={"seed": idx, "tenant": tenant.identifier},
            )

    def ensure_notifications(self, patients: list[Patient], target: int) -> None:
        templates = list(NotificationTemplate.objects.order_by("id"))
        while len(templates) < 8:
            idx = len(templates) + 1
            tpl = NotificationTemplate.objects.create(
                name=f"Template Seed {idx}",
                content="Mensagem automática de notificação de saúde.",
            )
            templates.append(tpl)

        notifications = list(Notification.objects.order_by("id"))
        while len(notifications) < target and patients:
            idx = len(notifications) + 1
            patient = patients[(idx - 1) % len(patients)]
            tpl = templates[(idx - 1) % len(templates)]
            sent = idx % 2 == 0
            notif = Notification.objects.create(
                patient=patient,
                recipient=f"destinatario{idx:05d}@mail.local",
                channel=Notification.Channel.EMAIL,
                subject=f"{tpl.name} - Atualização clínica",
                event_type=Notification.EventType.RESULTADO_DISPONIVEL,
                external_reference=f"NTF-{idx:07d}",
                message=f"[{tpl.name}] Resultado clínico disponível para consulta.",
                sent=sent,
                sent_at=timezone.now() if sent else None,
            )
            notifications.append(notif)

        while DeliveryLog.objects.count() < target and notifications:
            idx = DeliveryLog.objects.count() + 1
            notif = notifications[(idx - 1) % len(notifications)]
            DeliveryLog.objects.create(
                notification=notif,
                status="enviado" if notif.sent else "pendente",
                response="Resposta do gateway de mensageria.",
            )

    # -----------------------------------------------------
    # Summary
    # -----------------------------------------------------

    def report_summary(self, tenant: Tenant) -> None:
        self.stdout.write(self.style.SUCCESS("\nResumo do tenant default:"))

        def tcount(model) -> int:
            return model.objects.filter(tenant=tenant).count()

        summary = [
            ("Pacientes", tcount(Patient)),
            ("Exames laboratoriais", tcount(LabExam)),
            ("Requisições laboratoriais", tcount(LabRequest)),
            ("Consultas médicas", tcount(MedicalConsultation)),
            ("Cirurgias", tcount(Surgery)),
            ("Procedimentos de enfermagem", tcount(Procedure)),
            ("Produtos", tcount(Product)),
            ("Lotes", tcount(Lot)),
            ("Movimentos de estoque", tcount(InventoryMovement)),
            ("Faturas", tcount(Invoice)),
            ("Pagamentos", tcount(Payment)),
            ("Registros de prontuário", tcount(MedicalRecordEntry)),
            ("Banco de sangue - doações", tcount(BloodDonation)),
            ("Integrações de equipamentos", tcount(IntegrationEquipment)),
        ]

        for label, value in summary:
            self.stdout.write(f"- {label}: {value}")

        # Varredura de modelos com tenant para apontar lacunas
        missing: list[str] = []
        for model in apps.get_models():
            if model._meta.abstract or model._meta.proxy:
                continue
            if not any(f.name == "tenant" for f in model._meta.fields):
                continue
            count = model.objects.filter(tenant=tenant).count()
            if count == 0:
                missing.append(model._meta.label)

        if missing:
            self.stdout.write(self.style.WARNING("\nModelos com tenant ainda sem registros: "))
            for label in sorted(missing):
                self.stdout.write(f"  - {label}")
        else:
            self.stdout.write(self.style.SUCCESS("\nTodos os modelos com tenant possuem ao menos 1 registro no tenant default."))
