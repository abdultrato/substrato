"""Seed de consultas médicas hipotéticas (realistas) em TODAS as especialidades.

Gera dados de desenvolvimento/QA/demonstração para o módulo de Consultas:

1. Garante o catálogo de especialidades (cria as que faltarem, com preço base).
2. Garante pacientes suficientes no tenant (chama ``seed_patients`` se faltarem).
3. Cria médicos hipotéticos (Employee) associados a cada especialidade.
4. Gera consultas distribuídas por todas as especialidades, com estados
   (marcada/concluída/cancelada), datas (passado e futuro), modalidades
   (presencial/telemedicina/etc.) e descrições clínicas variadas.

O preço, o tipo e o multiplicador de horário são calculados automaticamente
pelo próprio modelo ``MedicalConsultation.save()`` a partir da especialidade.

Uso:
    python manage.py seed_consultations                     # 10 consultas/especialidade, 1º tenant
    python manage.py seed_consultations --per-specialty 20
    python manage.py seed_consultations --tenant 1
    python manage.py seed_consultations --patients 80       # garante >= 80 pacientes
    python manage.py seed_consultations --clear             # remove o seed anterior antes
"""

from __future__ import annotations

import random
from datetime import timedelta
from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.clinical.models.patient import Patient
from apps.consultations.models import ConsultationSpecialty, MedicalConsultation
from apps.consultations.models.consultation_specialty import infer_consultation_sector
from apps.human_resources.models.employee import Employee
from apps.tenants.models import Tenant

# Marcador para identificar (e poder limpar) os médicos criados por este seed.
SEED_DOC_TAG = "SEEDDOC"

# Catálogo de especialidades: nome -> preço base (MZN).
SPECIALTIES: dict[str, str] = {
    "Clínica Geral": "1500.00",
    "Medicina Interna": "2000.00",
    "Cardiologia": "3500.00",
    "Pediatria": "2000.00",
    "Ginecologia-Obstetrícia": "2800.00",
    "Ortopedia": "3000.00",
    "Dermatologia": "2500.00",
    "Oftalmologia": "2700.00",
    "Otorrinolaringologia": "2600.00",
    "Neurologia": "3500.00",
    "Psiquiatria": "3000.00",
    "Urologia": "3000.00",
    "Gastroenterologia": "3200.00",
    "Endocrinologia": "3000.00",
    "Pneumologia": "2800.00",
    "Nefrologia": "3300.00",
    "Reumatologia": "2900.00",
    "Oncologia": "4500.00",
    "Hematologia": "3400.00",
    "Infecciologia": "2800.00",
    "Estomatologia": "2500.00",
    "Cirurgia Geral": "3500.00",
    "Anestesiologia": "3000.00",
    "Fisiatria": "2200.00",
    "Nutrição": "1800.00",
    "Psicologia Clínica": "2000.00",
}

# Queixas/motivos típicos por especialidade (para descrições realistas).
COMPLAINTS: dict[str, list[str]] = {
    "Clínica Geral": ["Febre e mal-estar geral", "Cefaleias recorrentes", "Check-up de rotina", "Cansaço persistente"],
    "Medicina Interna": ["Hipertensão de difícil controlo", "Diabetes descompensada", "Seguimento de comorbilidades"],
    "Cardiologia": ["Dor torácica em esforço", "Palpitações", "Avaliação de hipertensão arterial", "Dispneia"],
    "Pediatria": ["Tosse e febre na criança", "Avaliação de crescimento", "Vacinação e seguimento", "Diarreia aguda"],
    "Ginecologia-Obstetrícia": ["Consulta pré-natal", "Dor pélvica", "Planeamento familiar", "Rastreio do colo do útero"],
    "Ortopedia": ["Dor lombar crónica", "Entorse do tornozelo", "Dor no joelho", "Avaliação pós-fratura"],
    "Dermatologia": ["Lesão cutânea suspeita", "Acne severa", "Prurido generalizado", "Dermatite de contacto"],
    "Oftalmologia": ["Diminuição da acuidade visual", "Olho vermelho e dor", "Rastreio de glaucoma", "Cataratas"],
    "Otorrinolaringologia": ["Otalgia e otorreia", "Obstrução nasal crónica", "Odinofagia recorrente", "Vertigens"],
    "Neurologia": ["Crises convulsivas", "Cefaleia tipo enxaqueca", "Parestesias dos membros", "Tremor de repouso"],
    "Psiquiatria": ["Sintomas depressivos", "Ansiedade generalizada", "Insónia crónica", "Seguimento de medicação"],
    "Urologia": ["Disúria e polaquiúria", "Litíase renal", "Hiperplasia prostática", "Hematúria"],
    "Gastroenterologia": ["Dor abdominal recorrente", "Refluxo gastroesofágico", "Alteração do trânsito intestinal"],
    "Endocrinologia": ["Alterações da tiroide", "Diabetes mellitus tipo 2", "Obesidade", "Dislipidemia"],
    "Pneumologia": ["Tosse crónica", "Dispneia ao esforço", "Asma mal controlada", "Suspeita de DPOC"],
    "Nefrologia": ["Edema dos membros inferiores", "Doença renal crónica", "Proteinúria", "Hipertensão renovascular"],
    "Reumatologia": ["Artralgias múltiplas", "Rigidez matinal", "Suspeita de artrite reumatoide", "Lúpus em seguimento"],
    "Oncologia": ["Seguimento oncológico", "Avaliação de massa palpável", "Estadiamento", "Quimioterapia de seguimento"],
    "Hematologia": ["Anemia em estudo", "Alterações no hemograma", "Distúrbio da coagulação", "Linfadenopatia"],
    "Infecciologia": ["Febre prolongada de origem indeterminada", "Seguimento de VIH", "Tuberculose em tratamento"],
    "Estomatologia": ["Dor dentária aguda", "Avaliação para extração", "Doença periodontal", "Revisão e profilaxia"],
    "Cirurgia Geral": ["Hérnia inguinal", "Avaliação para colecistectomia", "Apendicite a esclarecer", "Pós-operatório"],
    "Anestesiologia": ["Consulta pré-anestésica", "Avaliação de risco cirúrgico", "Gestão de dor crónica"],
    "Fisiatria": ["Reabilitação pós-AVC", "Lombalgia crónica", "Reabilitação pós-cirúrgica", "Avaliação funcional"],
    "Nutrição": ["Aconselhamento nutricional", "Plano alimentar para diabético", "Controlo de peso", "Desnutrição"],
    "Psicologia Clínica": ["Avaliação psicológica", "Apoio em luto", "Gestão de stress", "Terapia de seguimento"],
}

DEFAULT_COMPLAINTS = ["Consulta de rotina", "Primeira consulta", "Consulta de seguimento", "Reavaliação clínica"]

DOC_FIRST_M = ["Carlos", "Fernando", "Daniel", "Ricardo", "Manuel", "Hélder", "Mateus", "Armando", "Nélio", "Wilson"]
DOC_FIRST_F = ["Cláudia", "Helena", "Isabel", "Catarina", "Filomena", "Lúcia", "Beatriz", "Rita", "Joana", "Graça"]
DOC_SURNAMES = ["Macamo", "Chivambo", "Matsinhe", "Mondlane", "Sitoe", "Langa", "Cossa", "Nhantumbo", "Tembe", "Mabunda"]

CONSULTATION_TYPES = [
    MedicalConsultation.ConsultationType.IN_PERSON,
    MedicalConsultation.ConsultationType.IN_PERSON,
    MedicalConsultation.ConsultationType.IN_PERSON,
    MedicalConsultation.ConsultationType.TELEMEDICINE,
    MedicalConsultation.ConsultationType.ASYNC,
    MedicalConsultation.ConsultationType.REMOTE_MONITORING,
]


class Command(BaseCommand):
    help = "Cria consultas médicas hipotéticas realistas em todas as especialidades."

    def add_arguments(self, parser):
        parser.add_argument("--per-specialty", type=int, default=10, help="Consultas por especialidade (default: 10).")
        parser.add_argument("--tenant", type=int, default=None, help="ID do tenant (default: o primeiro).")
        parser.add_argument("--patients", type=int, default=60, help="Mínimo de pacientes garantidos no tenant (default: 60).")
        parser.add_argument("--doctors-per-specialty", type=int, default=2, help="Médicos por especialidade (default: 2).")
        parser.add_argument("--seed", type=int, default=42, help="Semente do gerador (reprodutível).")
        parser.add_argument("--clear", action="store_true", help="Remove consultas e médicos deste seed antes de criar.")

    def handle(self, *args, **options):
        rng = random.Random(options["seed"])
        per_specialty = options["per_specialty"]

        tenant = (
            Tenant.objects.filter(pk=options["tenant"]).first()
            if options["tenant"]
            else Tenant.objects.order_by("pk").first()
        )
        if not tenant:
            raise CommandError("Nenhum tenant encontrado. Crie um tenant antes de correr o seed.")

        if options["clear"]:
            self._clear(tenant)

        specialties = self._ensure_specialties(tenant)
        patients = self._ensure_patients(tenant, options["patients"], options["tenant"])
        doctors_by_specialty = self._ensure_doctors(tenant, specialties, options["doctors_per_specialty"], rng)

        created = self._create_consultations(tenant, specialties, patients, doctors_by_specialty, per_specialty, rng)

        self.stdout.write(self.style.SUCCESS(
            f"Seed de consultas concluído: {created} consultas criadas em {len(specialties)} especialidades. "
            f"Pacientes disponíveis: {len(patients)}. Tenant: {tenant.pk} ({getattr(tenant, 'name', '')})."
        ))

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _clear(self, tenant):
        cons_qs = MedicalConsultation.all_objects.filter(
            tenant=tenant, doctor__document_number__startswith=f"{SEED_DOC_TAG}-"
        )
        removed_cons = cons_qs.count()
        cons_qs.delete()
        doc_qs = Employee.all_objects.filter(tenant=tenant, document_number__startswith=f"{SEED_DOC_TAG}-")
        removed_docs = doc_qs.count()
        doc_qs.delete()
        self.stdout.write(self.style.WARNING(
            f"Removidas {removed_cons} consultas e {removed_docs} médicos do seed anterior."
        ))

    def _ensure_specialties(self, tenant) -> list[ConsultationSpecialty]:
        result: list[ConsultationSpecialty] = []
        created = 0
        for name, base_price in SPECIALTIES.items():
            obj = ConsultationSpecialty.objects.filter(tenant=tenant, name=name).first()
            if not obj:
                obj = ConsultationSpecialty(
                    tenant=tenant,
                    name=name,
                    description=f"Consulta de {name}.",
                    base_price=Decimal(base_price),
                    sector=infer_consultation_sector(name),
                    active=True,
                )
                obj.save()
                created += 1
            elif obj.sector == "OTHER":
                obj.sector = infer_consultation_sector(name)
                obj.save(update_fields=["sector", "updated_at"])
            result.append(obj)
        self.stdout.write(f"Especialidades: {len(result)} no total ({created} criadas agora).")
        return result

    def _ensure_patients(self, tenant, minimum, tenant_arg) -> list[Patient]:
        existing = Patient.objects.filter(tenant=tenant).count()
        if existing < minimum:
            self.stdout.write(f"Apenas {existing} pacientes; a gerar até {minimum} via seed_patients...")
            kwargs = {"count": minimum}
            if tenant_arg:
                kwargs["tenant"] = tenant_arg
            else:
                kwargs["tenant"] = tenant.pk
            call_command("seed_patients", **kwargs)
        patients = list(Patient.objects.filter(tenant=tenant))
        if not patients:
            raise CommandError("Sem pacientes disponíveis após o seed.")
        return patients

    def _ensure_doctor_role_and_profession(self, tenant):
        """Garante um Cargo (is_doctor=True) e uma Profissão "Médico" no tenant.

        Sem um cargo marcado como médico, os funcionários não aparecem no
        seletor de médico da marcação de consulta (DoctorsViewSet filtra por
        role__is_doctor=True).
        """
        from apps.human_resources.models.job_title import JobTitle
        from apps.human_resources.models.profession import Profession

        role = JobTitle.objects.filter(tenant=tenant, name="Médico").order_by("pk").first()
        if not role:
            role = JobTitle(
                tenant=tenant,
                name="Médico",
                is_doctor=True,
                status=JobTitle.Status.ACTIVE,
                description="Cargo clínico (médico assistente).",
            )
            role.save()
        elif not role.is_doctor:
            role.is_doctor = True
            role.save(update_fields=["is_doctor", "updated_at"])

        profession = Profession.objects.filter(tenant=tenant, name="Médico").order_by("pk").first()
        if not profession:
            profession = Profession(
                tenant=tenant,
                name="Médico",
                professional_category="Saúde",
                requires_license=True,
            )
            profession.save()

        return role, profession

    def _ensure_doctors(self, tenant, specialties, per_specialty, rng) -> dict[int, list[Employee]]:
        role, profession = self._ensure_doctor_role_and_profession(tenant)
        doctors_by_specialty: dict[int, list[Employee]] = {}
        created = 0
        patched = 0
        for sp_index, specialty in enumerate(specialties):
            docs: list[Employee] = []
            for d in range(per_specialty):
                document_number = f"{SEED_DOC_TAG}-{sp_index:02d}{d:02d}"
                existing = Employee.all_objects.filter(tenant=tenant, document_number=document_number).first()
                if existing:
                    # Garante que médicos já criados ganham o cargo/profissão e
                    # passam a aparecer no seletor de médico e em RH.
                    fields = []
                    if existing.role_id != role.id:
                        existing.role = role
                        fields.append("role")
                    if not existing.profession_id:
                        existing.profession = profession
                        fields.append("profession")
                    if existing.status != Employee.Status.ACTIVE:
                        existing.status = Employee.Status.ACTIVE
                        fields.append("status")
                    if fields:
                        existing.save(update_fields=fields + ["updated_at"])
                        patched += 1
                    docs.append(existing)
                    continue
                gender = rng.choice([Employee.Gender.MALE, Employee.Gender.FEMALE])
                first = rng.choice(DOC_FIRST_M if gender == Employee.Gender.MALE else DOC_FIRST_F)
                name = f"Dr(a). {first} {rng.choice(DOC_SURNAMES)} {rng.choice(DOC_SURNAMES)}"
                emp = Employee(
                    tenant=tenant,
                    name=name,
                    gender=gender,
                    status=Employee.Status.ACTIVE,
                    role=role,
                    profession=profession,
                    document_type=Employee.DocumentType.BI,
                    document_number=document_number,
                    email=f"{document_number.lower()}@exemplo.local",
                    phone=f"+2588{rng.randint(2, 7)}{rng.randint(1000000, 9999999)}",
                )
                emp.save()
                docs.append(emp)
                created += 1
            doctors_by_specialty[specialty.pk] = docs
        self.stdout.write(f"Médicos: {created} criados agora, {patched} atualizados (cargo/profissão).")
        return doctors_by_specialty

    def _create_consultations(self, tenant, specialties, patients, doctors_by_specialty, per_specialty, rng) -> int:
        now = timezone.now()
        created = 0
        with transaction.atomic():
            for specialty in specialties:
                docs = doctors_by_specialty.get(specialty.pk) or [None]
                complaints = COMPLAINTS.get(specialty.name, DEFAULT_COMPLAINTS)
                for _ in range(per_specialty):
                    # ~60% no passado (concluída/cancelada), ~40% no futuro (marcada)
                    if rng.random() < 0.6:
                        offset_days = -rng.randint(1, 120)
                        status = rng.choices(
                            [MedicalConsultation.Status.COMPLETED, MedicalConsultation.Status.CANCELED],
                            weights=[85, 15],
                        )[0]
                    else:
                        offset_days = rng.randint(1, 45)
                        status = MedicalConsultation.Status.SCHEDULED

                    scheduled_for = now + timedelta(
                        days=offset_days,
                        hours=rng.randint(-6, 6),
                        minutes=rng.choice([0, 15, 30, 45]),
                    )

                    consultation = MedicalConsultation(
                        tenant=tenant,
                        patient=rng.choice(patients),
                        doctor=rng.choice(docs),
                        specialty=specialty,
                        consultation_type=rng.choice(CONSULTATION_TYPES),
                        description=rng.choice(complaints),
                        scheduled_for=scheduled_for,
                        status=status,
                        reschedule_count=rng.choices([0, 1, 2], weights=[80, 15, 5])[0],
                        manual_holiday=rng.random() < 0.05,
                    )
                    if status == MedicalConsultation.Status.COMPLETED:
                        consultation.completed_at = scheduled_for + timedelta(minutes=rng.randint(20, 60))
                    elif status == MedicalConsultation.Status.CANCELED:
                        consultation.canceled_at = scheduled_for - timedelta(days=rng.randint(0, 3))

                    consultation.save()
                    created += 1
        return created
