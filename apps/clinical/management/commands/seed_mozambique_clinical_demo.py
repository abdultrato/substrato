"""Seed clinico completo com pacientes, consultas, exames e faturacao."""

from __future__ import annotations

import random
import unicodedata
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.billing.models import Invoice, InvoiceHistory, InvoiceItem
from apps.clinical.models import (
    LabExam,
    LabExamField,
    LabRequest,
    LabRequestItem,
    MedicalExam,
    MedicalExamField,
    Patient,
    Result,
    ResultItem,
    Sample,
)
from apps.clinical.models.patient import BloodType
from apps.consultations.models import ConsultationSpecialty, MedicalConsultation
from apps.consultations.models.consultation_specialty import infer_consultation_sector
from apps.human_resources.models.employee import Employee
from apps.human_resources.models.job_title import JobTitle
from apps.human_resources.models.profession import Profession
from apps.tenants.models import Tenant
from core.constants.document_types import DocumentType
from core.constants.gender import Gender
from core.constants.laboratory.method import Method
from core.constants.laboratory.result_type import ResultType
from core.constants.laboratory.sector import Sector
from core.constants.laboratory.units import DefaultUnit
from core.constants.medical_exam.medical_exam_method import MedicalExamMethod
from core.constants.medical_exam.medical_exam_result_type import MedicalExamResultType
from core.constants.medical_exam.medical_exam_sector import MedicalExamSector
from core.constants.provenance import Provenance
from core.constants.race_origin import RaceOrigin

PATIENT_DOC_PREFIX = "SEED-MZ"
EMPLOYEE_DOC_PREFIX = "SEEDDOC-MZ"


LOCATIONS = [
    ("Maputo Cidade", ["KaMpfumo", "Nlhamankulu", "KaMaxaquene", "KaMavota", "KaTembe"], "1100"),
    ("Maputo Provincia", ["Matola", "Boane", "Marracuene", "Namaacha", "Moamba", "Manhica"], "1200"),
    ("Gaza", ["Xai-Xai", "Chokwe", "Chibuto", "Manjacaze", "Bilene", "Massingir"], "1300"),
    ("Inhambane", ["Inhambane", "Maxixe", "Vilankulo", "Massinga", "Homoine", "Zavala"], "1400"),
    ("Sofala", ["Beira", "Dondo", "Nhamatanda", "Buzi", "Gorongosa", "Marromeu"], "2100"),
    ("Manica", ["Chimoio", "Gondola", "Sussundenga", "Manica", "Mossurize", "Barue"], "2200"),
    ("Tete", ["Tete", "Moatize", "Angonia", "Cahora Bassa", "Changara", "Macanga"], "2300"),
    ("Zambezia", ["Quelimane", "Mocuba", "Gurue", "Milange", "Alto Molocue", "Morrumbala"], "3100"),
    ("Nampula", ["Nampula", "Nacala", "Angoche", "Ilha de Mocambique", "Murrupula", "Monapo"], "4100"),
    ("Cabo Delgado", ["Pemba", "Montepuez", "Chiure", "Ancuabe", "Mocimboa da Praia", "Mueda"], "5100"),
    ("Niassa", ["Lichinga", "Cuamba", "Marrupa", "Mandimba", "Metangula", "Lago"], "5200"),
]

NEIGHBORHOODS = [
    "Central",
    "Mavalane",
    "Malhangalene",
    "Munhava",
    "Macuti",
    "Chota",
    "Fomento",
    "Machava",
    "Coalane",
    "Napipine",
    "Natite",
    "Paquitequete",
    "Muhala",
    "Samora Machel",
    "Liberdade",
    "Natikiri",
]

STREETS = [
    "Av. 25 de Setembro",
    "Av. Eduardo Mondlane",
    "Av. Julius Nyerere",
    "Rua da Unidade",
    "Rua do Mercado",
    "Rua da Escola",
    "Av. Marginal",
    "Rua dos Trabalhadores",
    "Av. da Independencia",
    "Rua do Centro de Saude",
]

FIRST_NAMES_M = [
    "Carlos",
    "Tomas",
    "Paulo",
    "Adriano",
    "Daniel",
    "Fernando",
    "Nasser",
    "Zacarias",
    "Samuel",
    "Manuel",
    "Bento",
    "Rui",
    "Osvaldo",
    "Ricardo",
    "Wilson",
    "Abdul",
]

FIRST_NAMES_F = [
    "Claudia",
    "Nadia",
    "Helena",
    "Rosa",
    "Vania",
    "Silvia",
    "Jacinta",
    "Isabel",
    "Julia",
    "Ana",
    "Angela",
    "Catarina",
    "Matilde",
    "Celeste",
    "Fatima",
    "Lucia",
]

MIDDLE_NAMES = [
    "Joaquim",
    "Esperanca",
    "Nuro",
    "Muthemba",
    "Matsinhe",
    "Machel",
    "Mavie",
    "Langa",
    "Trato",
    "Mendes",
    "Cossa",
    "Magaia",
]

SURNAMES = [
    "Macamo",
    "Chivambo",
    "Matsinhe",
    "Anli",
    "Massango",
    "Mussa",
    "Tembe",
    "Mabunda",
    "Muendane",
    "Macuacua",
    "Mondlane",
    "Nhantumbo",
    "Goncalves",
    "Sitoe",
    "Mucavel",
    "Malate",
    "Issufo",
    "Nhampossa",
    "Chale",
    "Cossa",
    "Machava",
    "Matavele",
    "Nuro",
    "Chissano",
    "Saide",
    "Langa",
]

CLINICAL_ORIGINS = [
    Provenance.AMBULATORIO,
    Provenance.CLINICA_EXTERNA,
    Provenance.CONSULTA_EXTERNA,
    Provenance.MATERNIDADE,
    Provenance.GINECOLOGIA,
    Provenance.PEDIATRIA,
    Provenance.BANCO_SOCORROS,
    Provenance.MEDICINA_OCUPACIONAL,
    Provenance.CIRURGIA,
    Provenance.OFTALMOLOGIA,
]

RACES = [
    RaceOrigin.BLACK,
    RaceOrigin.BROWN,
    RaceOrigin.WHITE,
    RaceOrigin.YELLOW,
    RaceOrigin.INDIGENOUS,
    RaceOrigin.OTHER,
]

BLOOD_TYPES = [
    BloodType.O_NEGATIVE,
    BloodType.O_POSITIVE,
    BloodType.A_NEGATIVE,
    BloodType.A_POSITIVE,
    BloodType.B_NEGATIVE,
    BloodType.B_POSITIVE,
    BloodType.AB_NEGATIVE,
    BloodType.AB_POSITIVE,
    BloodType.UNKNOWN,
]

CONSULTATION_TYPES = [
    MedicalConsultation.ConsultationType.IN_PERSON,
    MedicalConsultation.ConsultationType.IN_PERSON,
    MedicalConsultation.ConsultationType.IN_PERSON,
    MedicalConsultation.ConsultationType.TELEMEDICINE,
    MedicalConsultation.ConsultationType.ASYNC,
    MedicalConsultation.ConsultationType.REMOTE_MONITORING,
]

CONSULTATION_SPECIALTIES = [
    ("Clinica Geral", "1500.00", "Consulta de primeira linha e seguimento geral."),
    ("Medicina Interna", "2200.00", "Doencas cronicas e avaliacao interna."),
    ("Pediatria", "1800.00", "Atendimento infantil e adolescente."),
    ("Ginecologia-Obstetricia", "2600.00", "Saude sexual, reprodutiva e pre-natal."),
    ("Cardiologia", "3500.00", "Avaliacao cardiovascular."),
    ("Ortopedia", "3000.00", "Trauma, coluna e articulacoes."),
    ("Dermatologia", "2400.00", "Pele, cabelo e unhas."),
    ("Oftalmologia", "2700.00", "Saude ocular."),
    ("Neurologia", "3600.00", "Sistema nervoso e cefaleias."),
    ("Pneumologia", "2800.00", "Doencas respiratorias."),
]

COMPLAINTS = [
    "Febre e mal-estar geral",
    "Cefaleias recorrentes",
    "Dor abdominal",
    "Tosse persistente",
    "Check-up de rotina",
    "Seguimento de hipertensao",
    "Cansaço persistente",
    "Avaliação ocupacional",
    "Dor lombar",
    "Revisao de exames",
]

SAMPLE_SPECS = [
    ("AMO-MZ-001", "Sangue total EDTA", Sample.BottleType.EDTA_TUBE, "roxa", "2.00", False, 0, "2-8 C", "EDTA"),
    ("AMO-MZ-002", "Soro", Sample.BottleType.DRY_TUBE, "vermelha", "2.00", True, 8, "2-8 C", ""),
    ("AMO-MZ-003", "Plasma citratado", Sample.BottleType.CITRATE_TUBE, "azul", "1.80", False, 0, "2-8 C", "Citrato"),
    ("AMO-MZ-004", "Urina jato medio", Sample.BottleType.URINE_CONTAINER, "transparente", "10.00", False, 0, "ambiente", ""),
    ("AMO-MZ-005", "Fezes", Sample.BottleType.STOOL_CONTAINER, "transparente", "5.00", False, 0, "ambiente", ""),
    ("AMO-MZ-006", "Swab nasofaringeo", Sample.BottleType.STERILE_CONTAINER, "esteril", "1.00", False, 0, "2-8 C", ""),
    ("AMO-MZ-007", "Escarro", Sample.BottleType.STERILE_CONTAINER, "esteril", "2.00", False, 0, "2-8 C", ""),
    ("AMO-MZ-008", "Gota espessa", Sample.BottleType.OTHER, "lamina", "0.10", False, 0, "ambiente", ""),
]

LAB_EXAM_SPECS = [
    (
        "EXA-MZ-001",
        "Hemograma completo",
        "650.00",
        Method.HEMATOLOGIA_AUTOMATIZADA,
        Sector.HEMATOLOGIA,
        "AMO-MZ-001",
        [
            ("Hemoglobina", DefaultUnit.G_DL, "12.00", "17.50"),
            ("Hematocrito", DefaultUnit.PERCENT, "36.00", "52.00"),
            ("Leucocitos", DefaultUnit.X10_3_UL, "4.00", "11.00"),
            ("Plaquetas", DefaultUnit.X10_3_UL, "150.00", "450.00"),
        ],
    ),
    (
        "EXA-MZ-002",
        "Glicemia em jejum",
        "300.00",
        Method.ENZIMATICO_COLORIMETRICO,
        Sector.BIOQUIMICA,
        "AMO-MZ-002",
        [("Glicose", DefaultUnit.MG_DL, "70.00", "99.00")],
    ),
    (
        "EXA-MZ-003",
        "Creatinina",
        "350.00",
        Method.JAFFE,
        Sector.BIOQUIMICA,
        "AMO-MZ-002",
        [("Creatinina serica", DefaultUnit.MG_DL, "0.60", "1.30")],
    ),
    (
        "EXA-MZ-004",
        "Ureia",
        "350.00",
        Method.ENZIMATICO,
        Sector.BIOQUIMICA,
        "AMO-MZ-002",
        [("Ureia", DefaultUnit.MG_DL, "15.00", "45.00")],
    ),
    (
        "EXA-MZ-005",
        "Perfil lipidico",
        "950.00",
        Method.ENZIMATICO_COLORIMETRICO,
        Sector.BIOQUIMICA,
        "AMO-MZ-002",
        [
            ("Colesterol total", DefaultUnit.MG_DL, "0.00", "200.00"),
            ("HDL colesterol", DefaultUnit.MG_DL, "40.00", None),
            ("LDL colesterol", DefaultUnit.MG_DL, "0.00", "130.00"),
            ("Trigliceridos", DefaultUnit.MG_DL, "0.00", "150.00"),
        ],
    ),
    (
        "EXA-MZ-006",
        "ALT TGP",
        "450.00",
        Method.CINETICO_UV,
        Sector.BIOQUIMICA,
        "AMO-MZ-002",
        [("ALT", DefaultUnit.U_L, "0.00", "41.00")],
    ),
    (
        "EXA-MZ-007",
        "AST TGO",
        "450.00",
        Method.CINETICO_UV,
        Sector.BIOQUIMICA,
        "AMO-MZ-002",
        [("AST", DefaultUnit.U_L, "0.00", "40.00")],
    ),
    (
        "EXA-MZ-008",
        "Malaria gota espessa",
        "500.00",
        Method.GOTA_ESPESSA,
        Sector.PARASITOLOGIA,
        "AMO-MZ-008",
        [("Densidade parasitaria", DefaultUnit.PARASITAS_UL, "0.00", "0.00")],
    ),
    (
        "EXA-MZ-009",
        "Urina II",
        "450.00",
        Method.FISICO_QUIMICO_MICROSCOPIA,
        Sector.URINALISE,
        "AMO-MZ-004",
        [
            ("pH urinario", DefaultUnit.PH, "5.00", "8.00"),
            ("Densidade urinaria", DefaultUnit.DENSIDADE, "1.00", "1.03"),
            ("Leucocitos urinarios", DefaultUnit.CELULAS_CAMPO, "0.00", "5.00"),
        ],
    ),
    (
        "EXA-MZ-010",
        "Proteina C reativa",
        "700.00",
        Method.IMUNOTURBIDIMETRIA,
        Sector.IMUNOLOGIA,
        "AMO-MZ-002",
        [("PCR", DefaultUnit.MG_L, "0.00", "5.00")],
    ),
    (
        "EXA-MZ-011",
        "TSH",
        "1100.00",
        Method.QUIMIOLUMINESCENCIA,
        Sector.HORMONIOS,
        "AMO-MZ-002",
        [("TSH", DefaultUnit.MICRO_UI_ML, "0.40", "4.00")],
    ),
    (
        "EXA-MZ-012",
        "COVID-19 PCR",
        "1800.00",
        Method.RT_QPCR,
        Sector.BIOLOGIA_MOLECULAR,
        "AMO-MZ-006",
        [("Ct alvo viral", DefaultUnit.CT, "0.00", "40.00")],
    ),
]

MEDICAL_EXAM_SPECS = [
    ("EXM-MZ-001", "Ecografia abdominal", "2500.00", MedicalExamMethod.ULTRASSONOGRAFIA, MedicalExamSector.RADIOLOGIA),
    ("EXM-MZ-002", "Raio-X torax PA", "1200.00", MedicalExamMethod.RAIOX_CONVENCIONAL, MedicalExamSector.RADIOLOGIA),
    ("EXM-MZ-003", "Eletrocardiograma", "900.00", MedicalExamMethod.ELETROCARDIOGRAMA, MedicalExamSector.CARDIOLOGIA),
    ("EXM-MZ-004", "Ecocardiograma transtoracico", "4500.00", MedicalExamMethod.ECOCARDIOGRAMA, MedicalExamSector.CARDIOLOGIA),
    ("EXM-MZ-005", "TC cranio", "8500.00", MedicalExamMethod.TOMOGRAFIA, MedicalExamSector.DIAGNOSTICO_POR_IMAGEM),
    ("EXM-MZ-006", "RM coluna lombar", "14000.00", MedicalExamMethod.RESSONANCIA, MedicalExamSector.DIAGNOSTICO_POR_IMAGEM),
    ("EXM-MZ-007", "Mamografia bilateral", "3800.00", MedicalExamMethod.MAMOGRAFIA, MedicalExamSector.GINECO_OBSTETRICIA),
    ("EXM-MZ-008", "Endoscopia digestiva alta", "6500.00", MedicalExamMethod.ENDOSCOPIA, MedicalExamSector.ENDOSCOPIA),
    ("EXM-MZ-009", "Holter 24h", "5000.00", MedicalExamMethod.HOLTER, MedicalExamSector.CARDIOLOGIA),
    ("EXM-MZ-010", "MAPA 24h", "4200.00", MedicalExamMethod.MAPA, MedicalExamSector.CARDIOLOGIA),
]


def _slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(c for c in normalized if not unicodedata.combining(c)).lower().replace(" ", ".")


def _weekday_datetime(days_offset: int, hour: int) -> datetime:
    base = timezone.localdate() + timedelta(days=days_offset)
    while base.weekday() >= 5:
        base += timedelta(days=1)
    return timezone.make_aware(datetime.combine(base, time(hour=hour, minute=0)))


def _first_by_custom_id(model, custom_id: str, tenant=None):
    qs = model.all_objects.filter(custom_id=custom_id)
    if tenant is not None:
        qs = qs.filter(tenant=tenant)
    return qs.first()


class Command(BaseCommand):
    help = "Cria 1000 pacientes MZ e dados clinicos/faturaveis associados."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=1000, help="Numero de pacientes (default: 1000).")
        parser.add_argument("--tenant", type=int, default=None, help="ID do tenant (default: primeiro ativo).")
        parser.add_argument("--seed", type=int, default=258, help="Semente reprodutivel.")
        parser.add_argument("--clear", action="store_true", help="Remove dados deste seed antes de recriar.")

    def handle(self, *args, **options):
        count = int(options["count"])
        if count <= 0:
            raise CommandError("--count deve ser maior que zero.")

        tenant = self._resolve_tenant(options.get("tenant"))
        if options["clear"]:
            self._clear_seed(tenant)

        rng = random.Random(options["seed"])

        samples = self._ensure_samples(tenant)
        lab_exams = self._ensure_lab_catalog(tenant, samples)
        medical_exams = self._ensure_medical_catalog(tenant)
        specialties = self._ensure_specialties(tenant)
        doctors = self._ensure_doctors(tenant, specialties, rng)
        patients = self._ensure_patients(tenant, count, rng)

        stats = {
            "consultations": 0,
            "lab_requests": 0,
            "medical_requests": 0,
            "invoices": 0,
        }

        for index, patient in enumerate(patients[:count], start=1):
            with transaction.atomic():
                consultation = self._ensure_consultation(
                    tenant,
                    patient,
                    index,
                    specialties,
                    doctors,
                    rng,
                )
                if consultation:
                    stats["consultations"] += 1
                    stats["invoices"] += self._ensure_consultation_invoice(tenant, consultation, index)

                lab_request = self._ensure_lab_request(tenant, patient, index, lab_exams, rng)
                if lab_request:
                    stats["lab_requests"] += 1
                    stats["invoices"] += self._ensure_request_invoice(tenant, patient, lab_request, "LAB", index)

                medical_request = self._ensure_medical_request(tenant, patient, index, medical_exams, rng)
                if medical_request:
                    stats["medical_requests"] += 1
                    stats["invoices"] += self._ensure_request_invoice(tenant, patient, medical_request, "MED", index)

            if index % 100 == 0:
                self.stdout.write(f"Processados {index}/{count} pacientes...")

        self.stdout.write(
            self.style.SUCCESS(
                "Seed MZ concluido: "
                f"{Patient.objects.filter(tenant=tenant, document_number__startswith=PATIENT_DOC_PREFIX).count()} pacientes, "
                f"{ConsultationSpecialty.objects.filter(tenant=tenant, custom_id__startswith='ESP-MZ-').count()} especialidades, "
                f"{LabExam.objects.filter(tenant=tenant, custom_id__startswith='EXA-MZ-').count()} exames laboratoriais, "
                f"{MedicalExam.objects.filter(tenant=tenant, custom_id__startswith='EXM-MZ-').count()} exames medicos, "
                f"{stats['consultations']} consultas novas, "
                f"{stats['lab_requests']} requisicoes laboratoriais novas, "
                f"{stats['medical_requests']} requisicoes medicas novas, "
                f"{stats['invoices']} faturas novas."
            )
        )

    def _resolve_tenant(self, tenant_id):
        tenant = Tenant.objects.filter(pk=tenant_id).first() if tenant_id else Tenant.objects.order_by("pk").first()
        if not tenant:
            raise CommandError("Nenhum tenant encontrado. Crie um tenant antes de correr o seed.")
        return tenant

    def _clear_seed(self, tenant):
        request_ids = list(
            LabRequest.all_objects.filter(tenant=tenant, custom_id__startswith="REQ-MZ-").values_list("id", flat=True)
        )
        invoice_ids = list(
            Invoice.all_objects.filter(tenant=tenant, custom_id__startswith="FAT-MZ-").values_list("id", flat=True)
        )

        if invoice_ids:
            InvoiceHistory.all_objects.filter(invoice_id__in=invoice_ids).hard_delete()
            InvoiceItem.all_objects.filter(invoice_id__in=invoice_ids).hard_delete()
            Invoice.all_objects.filter(id__in=invoice_ids).hard_delete()

        if request_ids:
            ResultItem.all_objects.filter(result__request_id__in=request_ids).hard_delete()
            Result.all_objects.filter(request_id__in=request_ids).hard_delete()
            LabRequestItem.all_objects.filter(request_id__in=request_ids).hard_delete()
            LabRequest.all_objects.filter(id__in=request_ids).hard_delete()

        MedicalConsultation.all_objects.filter(tenant=tenant, custom_id__startswith="CONS-MZ-").hard_delete()
        Employee.all_objects.filter(tenant=tenant, document_number__startswith=EMPLOYEE_DOC_PREFIX).hard_delete()
        LabExamField.all_objects.filter(tenant=tenant, custom_id__startswith="CMP-MZ-").hard_delete()
        MedicalExamField.all_objects.filter(tenant=tenant, custom_id__startswith="EMC-MZ-").hard_delete()
        LabExam.all_objects.filter(tenant=tenant, custom_id__startswith="EXA-MZ-").hard_delete()
        MedicalExam.all_objects.filter(tenant=tenant, custom_id__startswith="EXM-MZ-").hard_delete()
        Sample.all_objects.filter(tenant=tenant, custom_id__startswith="AMO-MZ-").hard_delete()
        ConsultationSpecialty.all_objects.filter(tenant=tenant, custom_id__startswith="ESP-MZ-").hard_delete()
        Patient.all_objects.filter(tenant=tenant, document_number__startswith=PATIENT_DOC_PREFIX).hard_delete()

        self.stdout.write(self.style.WARNING("Dados anteriores do seed MZ removidos."))

    def _ensure_samples(self, tenant):
        samples = {}
        for base_id, name, bottle_type, cap_color, volume, fasting, fasting_hours, storage, anticoagulant in SAMPLE_SPECS:
            custom_id = f"{base_id}-T{tenant.pk}"
            sample = _first_by_custom_id(Sample, custom_id, tenant)
            if not sample:
                sample = Sample(
                    tenant=tenant,
                    custom_id=custom_id,
                    name=name,
                    bottle_type=bottle_type,
                    cap_color=cap_color,
                    minimum_volume_ml=Decimal(volume),
                    fasting_required=fasting,
                    fasting_hours=fasting_hours,
                    storage_temperature=storage,
                    stability_hours=24,
                    anticoagulant=anticoagulant,
                    collection_instructions=f"Coleta padrao para {name}.",
                )
                sample.save()
            samples[custom_id] = sample
        return samples

    def _ensure_lab_catalog(self, tenant, samples):
        exams = []
        for exam_index, (base_id, name, price, method, sector, sample_base_id, fields) in enumerate(LAB_EXAM_SPECS, start=1):
            custom_id = f"{base_id}-T{tenant.pk}"
            sample_id = f"{sample_base_id}-T{tenant.pk}"
            exam = _first_by_custom_id(LabExam, custom_id, tenant)
            if not exam:
                exam = LabExam(
                    tenant=tenant,
                    custom_id=custom_id,
                    name=name,
                    price=Decimal(price),
                    vat_percentage=Decimal("5.00"),
                    applies_vat_by_default=True,
                    method=method,
                    sector=sector,
                    sample_type=samples[sample_id],
                    turnaround_hours=24 + (exam_index % 3) * 12,
                )
                exam.save()
            for position, (field_name, unit, ref_min, ref_max) in enumerate(fields, start=1):
                field_custom_id = f"CMP-MZ-T{tenant.pk}-{exam_index:03d}-{position:02d}"
                if _first_by_custom_id(LabExamField, field_custom_id, tenant):
                    continue
                LabExamField(
                    tenant=tenant,
                    custom_id=field_custom_id,
                    exam=exam,
                    name=field_name,
                    type=ResultType.NUMERICO,
                    unit=unit,
                    reference_min=Decimal(ref_min) if ref_min is not None else None,
                    reference_max=Decimal(ref_max) if ref_max is not None else None,
                    critical_min=Decimal(ref_min) * Decimal("0.60") if ref_min is not None else None,
                    critical_max=Decimal(ref_max) * Decimal("1.50") if ref_max is not None else None,
                    position=position,
                ).save()
            exams.append(exam)
        return exams

    def _ensure_medical_catalog(self, tenant):
        exams = []
        for index, (base_id, name, price, method, sector) in enumerate(MEDICAL_EXAM_SPECS, start=1):
            custom_id = f"{base_id}-T{tenant.pk}"
            exam = _first_by_custom_id(MedicalExam, custom_id, tenant)
            if not exam:
                exam = MedicalExam(
                    tenant=tenant,
                    custom_id=custom_id,
                    name=name,
                    price=Decimal(price),
                    vat_percentage=Decimal("5.00"),
                    applies_vat_by_default=True,
                    method=method,
                    sector=sector,
                    turnaround_hours=24 + (index % 4) * 12,
                )
                exam.save()

            allowed = list(exam.allowed_result_types)
            preferred = [MedicalExamResultType.RELATORIO_PDF, MedicalExamResultType.IMAGEM, MedicalExamResultType.VIDEO]
            field_types = [item for item in preferred if item in allowed] or allowed[:1]
            for position, field_type in enumerate(field_types, start=1):
                field_custom_id = f"EMC-MZ-T{tenant.pk}-{index:03d}-{position:02d}"
                if _first_by_custom_id(MedicalExamField, field_custom_id, tenant):
                    continue
                label = dict(MedicalExamResultType.choices).get(field_type, str(field_type))
                MedicalExamField(
                    tenant=tenant,
                    custom_id=field_custom_id,
                    exam=exam,
                    name=label,
                    type=field_type,
                    position=position,
                ).save()
            exams.append(exam)
        return exams

    def _ensure_specialties(self, tenant):
        specialties = []
        for index, (name, price, description) in enumerate(CONSULTATION_SPECIALTIES, start=1):
            custom_id = f"ESP-MZ-T{tenant.pk}-{index:03d}"
            specialty = _first_by_custom_id(ConsultationSpecialty, custom_id, tenant)
            if not specialty:
                specialty = ConsultationSpecialty(
                    tenant=tenant,
                    custom_id=custom_id,
                    name=name,
                    description=description,
                    base_price=Decimal(price),
                    vat_percentage=Decimal("5.00"),
                    sector=infer_consultation_sector(name),
                    active=True,
                )
                specialty.save()
            elif specialty.sector == "OTHER":
                specialty.sector = infer_consultation_sector(name)
                specialty.save(update_fields=["sector", "updated_at"])
            specialties.append(specialty)
        return specialties

    def _ensure_doctors(self, tenant, specialties, rng):
        role = JobTitle.objects.filter(tenant=tenant, name="Medico").first()
        if not role:
            role = JobTitle(
                tenant=tenant,
                name="Medico",
                is_doctor=True,
                status=JobTitle.Status.ACTIVE,
                description="Cargo medico criado pelo seed MZ.",
            )
            role.save()
        elif not role.is_doctor:
            role.is_doctor = True
            role.save(update_fields=["is_doctor", "updated_at"])

        profession = Profession.objects.filter(tenant=tenant, name="Medico").first()
        if not profession:
            profession = Profession(
                tenant=tenant,
                name="Medico",
                professional_category="Saude",
                requires_license=True,
                base_salary=Decimal("55000.00"),
            )
            profession.save()

        doctors = []
        for index, specialty in enumerate(specialties, start=1):
            for slot in range(1, 3):
                document_number = f"{EMPLOYEE_DOC_PREFIX}-T{tenant.pk}-{index:03d}-{slot:02d}"
                doctor = Employee.all_objects.filter(tenant=tenant, document_number=document_number).first()
                if not doctor:
                    gender = rng.choice([Employee.Gender.MALE, Employee.Gender.FEMALE])
                    first = rng.choice(FIRST_NAMES_M if gender == Employee.Gender.MALE else FIRST_NAMES_F)
                    doctor = Employee(
                        tenant=tenant,
                        custom_id=f"FUN-MZ-T{tenant.pk}-{index:03d}-{slot:02d}",
                        name=f"Dr(a). {first} {rng.choice(SURNAMES)} {rng.choice(SURNAMES)}",
                        role=role,
                        profession=profession,
                        gender=gender,
                        status=Employee.Status.ACTIVE,
                        document_type=Employee.DocumentType.BI,
                        document_number=document_number,
                        email=f"{document_number.lower()}@exemplo.local",
                        phone=f"+2588{rng.randint(2, 7)}{rng.randint(1000000, 9999999)}",
                        address=f"Servico de {specialty.name}",
                    )
                    doctor.save()
                doctors.append(doctor)
        return doctors

    def _ensure_patients(self, tenant, count, rng):
        patients = []
        today = timezone.localdate()
        pat_prefix = f"{PATIENT_DOC_PREFIX}-T{tenant.pk}"
        for index in range(1, count + 1):
            document_number = f"{pat_prefix}-{index:05d}"
            patient = Patient.all_objects.filter(tenant=tenant, document_number=document_number).first()
            if patient:
                patients.append(patient)
                continue

            gender = rng.choice([Gender.MALE, Gender.FEMALE])
            first = rng.choice(FIRST_NAMES_M if gender == Gender.MALE else FIRST_NAMES_F)
            name = f"{first} {rng.choice(MIDDLE_NAMES)} {rng.choice(SURNAMES)} {rng.choice(SURNAMES)}"
            province, districts, postal_code = rng.choice(LOCATIONS)
            district = rng.choice(districts)
            age_years = rng.randint(1, 88)
            birth_date = today - timedelta(days=age_years * 365 + rng.randint(0, 364))
            pregnant = gender == Gender.FEMALE and 15 <= age_years <= 45 and rng.random() < 0.12

            patient = Patient(
                tenant=tenant,
                custom_id=f"PAC-MZ-T{tenant.pk}-{index:05d}",
                name=name,
                gender=gender,
                birth_date=birth_date,
                pregnant=pregnant,
                gestational_age_weeks=rng.randint(6, 38) if pregnant else None,
                blood_type=rng.choice(BLOOD_TYPES),
                race_origin=rng.choice(RACES),
                document_type=rng.choice(
                    [
                        DocumentType.BI,
                        DocumentType.BI,
                        DocumentType.BI,
                        DocumentType.PASSAPORTE,
                        DocumentType.DIRE,
                        DocumentType.NUIT,
                        DocumentType.CARTAO_ELEITOR,
                    ]
                ),
                document_number=document_number,
                address_street=rng.choice(STREETS),
                address_number=str(rng.randint(1, 999)),
                address_neighborhood=rng.choice(NEIGHBORHOODS),
                address_city=district,
                address_province=province,
                address_postal_code=postal_code,
                address_country="MZ",
                address_complement=f"Residencia familiar no distrito de {district}.",
                contact=f"+2588{rng.randint(2, 7)}{rng.randint(1000000, 9999999)}",
                email=f"{_slug(first)}.{document_number.lower()}.t{tenant.pk}@exemplo.local",
                companion_name=f"{rng.choice(FIRST_NAMES_M + FIRST_NAMES_F)} {rng.choice(SURNAMES)}",
                companion_relationship=rng.choice(["Conjuge", "Pai", "Mae", "Irmao(a)", "Filho(a)", "Tio(a)"]),
                companion_contact=f"+2588{rng.randint(2, 7)}{rng.randint(1000000, 9999999)}",
                companion_email=f"acomp.{document_number.lower()}.t{tenant.pk}@exemplo.local",
                provenance=rng.choice(CLINICAL_ORIGINS),
                is_replacement_donor_inapt=rng.random() < 0.08,
            )
            if patient.is_replacement_donor_inapt:
                patient.replacement_donor_inapt_at = timezone.now()
                patient.replacement_donor_inapt_reason = "Triagem simulada: condicao temporaria para doacao."
            patient.save()
            patients.append(patient)
        return patients

    def _ensure_consultation(self, tenant, patient, index, specialties, doctors, rng):
        custom_id = f"CONS-MZ-T{tenant.pk}-{index:05d}"
        if _first_by_custom_id(MedicalConsultation, custom_id, tenant):
            return None

        specialty = rng.choice(specialties)
        scheduled_for = _weekday_datetime(days_offset=rng.randint(-120, 45), hour=rng.randint(8, 17))
        status = (
            MedicalConsultation.Status.COMPLETED
            if scheduled_for < timezone.now()
            else MedicalConsultation.Status.SCHEDULED
        )
        if status == MedicalConsultation.Status.COMPLETED and rng.random() < 0.08:
            status = MedicalConsultation.Status.CANCELED

        consultation = MedicalConsultation(
            tenant=tenant,
            custom_id=custom_id,
            patient=patient,
            doctor=rng.choice(doctors),
            specialty=specialty,
            consultation_type=rng.choice(CONSULTATION_TYPES),
            description=f"[SEED-MZ] {rng.choice(COMPLAINTS)}",
            scheduled_for=scheduled_for,
            status=status,
            reschedule_count=rng.choices([0, 1, 2], weights=[80, 15, 5])[0],
            manual_holiday=rng.random() < 0.03,
        )
        if status == MedicalConsultation.Status.COMPLETED:
            consultation.completed_at = scheduled_for + timedelta(minutes=rng.randint(25, 70))
        elif status == MedicalConsultation.Status.CANCELED:
            consultation.canceled_at = scheduled_for - timedelta(days=rng.randint(0, 3))
        consultation.save()
        return consultation

    def _ensure_consultation_invoice(self, tenant, consultation, index):
        custom_id = f"FAT-MZ-CON-T{tenant.pk}-{index:05d}"
        if _first_by_custom_id(Invoice, custom_id, tenant):
            return 0

        invoice = Invoice(
            tenant=tenant,
            custom_id=custom_id,
            patient=consultation.patient,
            consultation=consultation,
            origin=Invoice.Origin.CONSULTATION,
        )
        invoice.save()
        InvoiceItem.objects.create(
            tenant=tenant,
            invoice=invoice,
            item_type=InvoiceItem.TipoItem.CONSULTATION,
            consultation=consultation,
        )
        invoice.persist_totals()
        return 1

    def _ensure_lab_request(self, tenant, patient, index, lab_exams, rng):
        custom_id = f"REQ-MZ-LAB-T{tenant.pk}-{index:05d}"
        if _first_by_custom_id(LabRequest, custom_id, tenant):
            return None

        request = LabRequest(
            tenant=tenant,
            custom_id=custom_id,
            patient=patient,
            type=LabRequest.Type.LABORATORY,
        )
        request.save()
        request.created_at = _weekday_datetime(days_offset=rng.randint(-90, 0), hour=rng.randint(8, 15))
        request.save(update_fields=["created_at"])

        for exam in rng.sample(lab_exams, k=rng.randint(2, 4)):
            item = request.add_exam(exam)
            if rng.random() < 0.75:
                item.receber_amostra()
        return request

    def _ensure_medical_request(self, tenant, patient, index, medical_exams, rng):
        custom_id = f"REQ-MZ-MED-T{tenant.pk}-{index:05d}"
        if _first_by_custom_id(LabRequest, custom_id, tenant):
            return None

        request = LabRequest(
            tenant=tenant,
            custom_id=custom_id,
            patient=patient,
            type=LabRequest.Type.MEDICAL_EXAM,
        )
        request.save()
        request.created_at = _weekday_datetime(days_offset=rng.randint(-90, 10), hour=rng.randint(8, 15))
        request.save(update_fields=["created_at"])

        for exam in rng.sample(medical_exams, k=rng.randint(1, 2)):
            request.add_medical_exam(exam)
        return request

    def _ensure_request_invoice(self, tenant, patient, request, kind, index):
        custom_id = f"FAT-MZ-{kind}-T{tenant.pk}-{index:05d}"
        if _first_by_custom_id(Invoice, custom_id, tenant):
            return 0

        invoice = Invoice(
            tenant=tenant,
            custom_id=custom_id,
            patient=patient,
            request=request,
            origin=Invoice.Origin.CLINICAL,
        )
        invoice.save()
        invoice.sync_items_from_origin()
        return 1
