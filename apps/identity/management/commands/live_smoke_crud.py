from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, time, timedelta
from decimal import Decimal
import json
import secrets

from django.apps import apps
from django.contrib.admin.models import ADDITION, LogEntry
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.contrib.sessions.backends.db import SessionStore
from django.contrib.sessions.models import Session
from django.core.files.base import ContentFile
from django.core.management import BaseCommand
from django.db import models
from django.utils import timezone

from apps.audit_activities.models import UserActivity
from apps.clinical.models import (
    LabExamField,
    LabRequest,
    LabRequestItem,
    MedicalExam,
    MedicalResultFile,
    Patient,
    Result,
)
from apps.consultations.models import ConsultationSpecialty, Holiday, MedicalConsultation
from apps.equipment.models import Equipment
from apps.equipment_integrations.models import (
    IntegrationAnalyteMapping,
    IntegrationCredential,
    IntegrationDocument,
    IntegrationEquipment,
    IntegrationMessage,
    IntegrationOrder,
    IntegrationOrderItem,
    IntegrationRouting,
)
from apps.external_entities.models import Company
from apps.human_resources.models import (
    Absence,
    Employee,
    FamilyDependent,
    JobTitle,
    Overtime,
    Payroll,
    Profession,
    Termination,
    Vacation,
    WorkSchedule,
)
from apps.incidents.models import Incident
from apps.inspections.models import DailyInspection
from apps.maintenance.models import Maintenance
from apps.maternity.models import Pregnancy
from apps.medical_records.models import MedicalRecordEntry, PrescriptionItem
from apps.monitoring.models import SystemError
from apps.nursing.models import Ward, WardAdmission, WardBed
from apps.pharmacy.models import Product
from apps.surgery.models import Surgery, SurgicalProcedure
from apps.tenants.models import Tenant
from core.constants.laboratory.sector import Sector
from core.constants.medical_exam.medical_exam_result_type import MedicalExamResultType

User = get_user_model()


@dataclass
class SmokeState:
    tenant: Tenant
    user: User
    patient: Patient
    request: LabRequest
    request_item: LabRequestItem
    result: Result
    medical_exam: MedicalExam
    lab_exam_field: LabExamField
    product: Product
    surgeon_user: User
    keep: dict[str, models.Model] = field(default_factory=dict)


class Command(BaseCommand):
    help = "Cria dados mínimos nos modelos em falta e executa smoke CRUD via ORM."

    def handle(self, *args, **options):
        state = self._build_state()

        creators = [
            ("admin.LogEntry", self._create_log_entry, self._update_log_entry),
            ("auditoria_atividades.UserActivity", self._create_user_activity, self._update_textual),
            ("consultas.ConsultationSpecialty", self._create_specialty, self._update_textual),
            ("consultas.Holiday", self._create_holiday, self._update_textual),
            ("recursos_humanos.JobTitle", self._create_job_title, self._update_textual),
            ("recursos_humanos.Employee", self._create_employee, self._update_textual),
            ("recursos_humanos.FamilyDependent", self._create_family_dependent, self._update_textual),
            ("recursos_humanos.WorkSchedule", self._create_work_schedule, self._update_work_schedule),
            ("recursos_humanos.Absence", self._create_absence, self._update_textual),
            ("recursos_humanos.Overtime", self._create_overtime, self._update_overtime),
            ("recursos_humanos.Vacation", self._create_vacation, self._update_textual),
            ("recursos_humanos.Termination", self._create_termination, self._update_textual),
            ("recursos_humanos.Payroll", self._create_payroll, self._update_payroll),
            ("consultas.MedicalConsultation", self._create_medical_consultation, self._update_textual),
            ("prontuario.MedicalRecordEntry", self._create_medical_record_entry, self._update_textual),
            ("prontuario.PrescriptionItem", self._create_prescription_item, self._update_prescription_item),
            ("maternidade.Pregnancy", self._create_pregnancy, self._update_textual),
            ("cirurgia.SurgicalProcedure", self._create_surgical_procedure, self._update_textual),
            ("cirurgia.Surgery", self._create_surgery, self._update_textual),
            ("enfermagem.Ward", self._create_ward, self._update_textual),
            ("enfermagem.WardBed", self._create_ward_bed, self._update_textual),
            ("enfermagem.WardAdmission", self._create_ward_admission, self._update_textual),
            ("entidades.Company", self._create_company, self._update_textual),
            ("equipamentos.Equipment", self._create_equipment, self._update_equipment),
            ("inspecoes.DailyInspection", self._create_daily_inspection, self._update_textual),
            ("manutencoes.Maintenance", self._create_maintenance, self._update_textual),
            ("ocorrencias.Incident", self._create_incident, self._update_textual),
            ("monitoramento.SystemError", self._create_system_error, self._update_textual),
            ("clinical.MedicalResultFile", self._create_medical_result_file, self._update_medical_result_file),
            ("integracoes_equipamentos.IntegrationEquipment", self._create_integration_equipment, self._update_integration_equipment),
            ("integracoes_equipamentos.IntegrationCredential", self._create_integration_credential, self._update_integration_credential),
            ("integracoes_equipamentos.IntegrationRouting", self._create_integration_routing, self._update_integration_routing),
            ("integracoes_equipamentos.IntegrationOrder", self._create_integration_order, self._update_textual),
            ("integracoes_equipamentos.IntegrationOrderItem", self._create_integration_order_item, self._update_textual),
            ("integracoes_equipamentos.IntegrationMessage", self._create_integration_message, self._update_integration_message),
            ("integracoes_equipamentos.IntegrationDocument", self._create_integration_document, self._update_integration_document),
            ("integracoes_equipamentos.IntegrationAnalyteMapping", self._create_integration_mapping, self._update_integration_mapping),
            ("sessions.Session", self._create_session, self._update_session),
        ]

        for label, creator, updater in creators:
            self._crud_cycle(label, creator, updater, state)

        zero_models = self._zero_models()
        if zero_models:
            labels = ", ".join(zero_models)
            raise RuntimeError(f"Ainda existem modelos sem dados: {labels}")

        self.stdout.write(self.style.SUCCESS("Smoke CRUD concluido com cobertura de todos os modelos."))

    def _build_state(self) -> SmokeState:
        patient = Patient.objects.select_related("tenant").order_by("id").first()
        if patient is None:
            raise RuntimeError("Nao ha pacientes. Execute bootstrap_dev/seed_demo antes do smoke.")

        tenant = patient.tenant
        request = LabRequest.objects.filter(tenant=tenant).order_by("id").first()
        request_item = LabRequestItem.objects.filter(tenant=tenant).order_by("id").first()
        result = Result.objects.filter(tenant=tenant).order_by("id").first()
        medical_exam = MedicalExam.objects.filter(tenant=tenant).order_by("id").first()
        lab_exam_field = LabExamField.objects.filter(tenant=tenant).order_by("id").first()
        product = Product.objects.filter(
            tenant=tenant,
            type=Product.ProductType.MEDICAMENTO,
        ).order_by("id").first()

        if not all([request, request_item, result, medical_exam, lab_exam_field, product]):
            raise RuntimeError("Contexto base incompleto no tenant escolhido. Execute seed_demo antes do smoke.")

        user = User.objects.filter(tenant=tenant).order_by("id").first()
        if user is None:
            username = f"smokeuser-{tenant.id}"
            user = User.objects.create_user(
                username=username,
                email=f"{username}@local.test",
                password="Smoke123!",
                tenant=tenant,
                first_name="Smoke",
                last_name="User",
                name="Smoke User",
            )

        surgeon_user = User.objects.filter(tenant=tenant, username__startswith="smoke-surgeon-").order_by("id").first()
        if surgeon_user is None:
            suffix = secrets.token_hex(3)
            surgeon_user = User.objects.create_user(
                username=f"smoke-surgeon-{suffix}",
                email=f"smoke-surgeon-{suffix}@local.test",
                password="Smoke123!",
                tenant=tenant,
                first_name="Smoke",
                last_name="Surgeon",
                name="Smoke Surgeon",
            )

        return SmokeState(
            tenant=tenant,
            user=user,
            patient=patient,
            request=request,
            request_item=request_item,
            result=result,
            medical_exam=medical_exam,
            lab_exam_field=lab_exam_field,
            product=product,
            surgeon_user=surgeon_user,
        )

    def _crud_cycle(self, label, creator, updater, state: SmokeState):
        temp = creator("tmp", state)
        self._read_back(temp)
        updater(temp, "upd")
        self._delete_and_verify(temp)

        keep = creator("keep", state)
        self._read_back(keep)
        updater(keep, "final")
        state.keep[label] = keep
        self.stdout.write(self.style.SUCCESS(f"[ok] {label}"))

    def _read_back(self, obj):
        obj.__class__._default_manager.get(pk=obj.pk)

    def _delete_and_verify(self, obj):
        model = obj.__class__
        pk = obj.pk
        obj.delete()

        if hasattr(model, "all_objects") and any(field.name == "deleted" for field in model._meta.concrete_fields):
            deleted_obj = model.all_objects.get(pk=pk)
            if not deleted_obj.deleted:
                raise RuntimeError(f"{model.__name__} deveria estar em soft delete.")
            return

        if model._default_manager.filter(pk=pk).exists():
            raise RuntimeError(f"{model.__name__} deveria ter sido removido.")

    def _zero_models(self):
        labels = []
        for model in sorted(apps.get_models(), key=lambda m: (m._meta.app_label, m.__name__)):
            if model._default_manager.count() == 0:
                labels.append(f"{model._meta.app_label}.{model.__name__}")
        return labels

    def _next_counter(self, model):
        manager = getattr(model, "all_objects", model._default_manager)
        return manager.count() + 1

    def _date_offset(self, model, extra=0):
        return timezone.localdate() + timedelta(days=self._next_counter(model) + extra)

    def _content_file(self, name: str, payload: bytes):
        return ContentFile(payload, name=name)

    def _medical_file(self, exam: MedicalExam, suffix: str):
        allowed = sorted(exam.tipos_result_cadastrados or {MedicalExamResultType.RELATORIO_PDF})
        type_value = allowed[0]

        if type_value == MedicalExamResultType.RELATORIO_PDF:
            payload = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
            return type_value, self._content_file(f"resultado-{suffix}.pdf", payload)
        if type_value == MedicalExamResultType.IMAGEM:
            payload = (
                b"\x89PNG\r\n\x1a\n"
                b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
                b"\x00\x00\x00\x0cIDAT\x08\xd7c\xf8\xff\xff?\x00\x05\xfe\x02\xfeA\x0f\xd2\x9f"
                b"\x00\x00\x00\x00IEND\xaeB`\x82"
            )
            return type_value, self._content_file(f"resultado-{suffix}.png", payload)
        if type_value == MedicalExamResultType.DICOM:
            return type_value, self._content_file(f"resultado-{suffix}.dcm", b"DICMsmoke")
        if type_value == MedicalExamResultType.VIDEO:
            return type_value, self._content_file(f"resultado-{suffix}.mp4", b"smoke-video")
        return type_value, self._content_file(f"resultado-{suffix}.txt", b"smoke-text")

    def _touch_text_field(self, obj, marker: str):
        for field_name in (
            "description",
            "notes",
            "message",
            "observation",
            "assessment",
            "full_path",
            "support_contact",
            "filename",
            "content_type",
            "label",
            "contacts",
            "location",
            "responsible",
            "manufacturer",
            "model",
            "user_agent",
            "path",
        ):
            if hasattr(obj, field_name):
                current = getattr(obj, field_name) or ""
                setattr(obj, field_name, f"{current} {marker}".strip())
                obj.save()
                return

        if hasattr(obj, "active"):
            obj.active = not bool(obj.active)
            obj.save()
            return

        if hasattr(obj, "name"):
            obj.name = f"{obj.name} {marker}".strip()
            obj.save()
            return

        obj.save()

    def _update_textual(self, obj, marker: str):
        self._touch_text_field(obj, marker)

    def _update_log_entry(self, obj: LogEntry, marker: str):
        obj.change_message = json.dumps([{"changed": {"fields": [marker]}}])
        obj.save(update_fields=["change_message"])

    def _update_work_schedule(self, obj: WorkSchedule, marker: str):
        obj.end_time = (datetime.combine(timezone.localdate(), obj.end_time) + timedelta(minutes=15)).time()
        obj.save()

    def _update_overtime(self, obj: Overtime, marker: str):
        obj.notes = f"{obj.notes} {marker}".strip()
        obj.hours = (obj.hours or Decimal("0.00")) + Decimal("0.50")
        obj.save()

    def _update_payroll(self, obj: Payroll, marker: str):
        obj.closed = not obj.closed
        obj.save()

    def _update_prescription_item(self, obj: PrescriptionItem, marker: str):
        obj.notes = f"{obj.notes} {marker}".strip()
        obj.dose_count = int(obj.dose_count or 1) + 1
        obj.save()

    def _update_equipment(self, obj: Equipment, marker: str):
        obj.location = f"Laboratorio {marker}"
        obj.save()

    def _update_medical_result_file(self, obj: MedicalResultFile, marker: str):
        obj.description = f"{obj.description} {marker}".strip()
        obj.save()

    def _update_integration_equipment(self, obj: IntegrationEquipment, marker: str):
        obj.config = {**(obj.config or {}), "marker": marker}
        obj.save()

    def _update_integration_credential(self, obj: IntegrationCredential, marker: str):
        obj.label = f"{obj.label} {marker}".strip()
        obj.save()

    def _update_integration_message(self, obj: IntegrationMessage, marker: str):
        obj.payload_json = {**(obj.payload_json or {}), "marker": marker}
        obj.status = IntegrationMessage.Status.PROCESSED
        obj.save()

    def _update_integration_document(self, obj: IntegrationDocument, marker: str):
        obj.content_type = f"text/{marker}"
        obj.save()

    def _update_integration_routing(self, obj: IntegrationRouting, marker: str):
        obj.save()

    def _update_integration_mapping(self, obj: IntegrationAnalyteMapping, marker: str):
        obj.unit_override = f"g/dL-{marker}"
        obj.active = True
        obj.save()

    def _update_session(self, obj: Session, marker: str):
        store = SessionStore(session_key=obj.session_key)
        store["marker"] = marker
        store.save()

    def _create_log_entry(self, suffix: str, state: SmokeState):
        return LogEntry.objects.create(
            user=state.user,
            content_type=ContentType.objects.get_for_model(Patient),
            object_id=str(state.patient.pk),
            object_repr=state.patient.name,
            action_flag=ADDITION,
            change_message=json.dumps([{"added": {"name": f"smoke-{suffix}"}}]),
        )

    def _create_user_activity(self, suffix: str, state: SmokeState):
        return UserActivity.objects.create(
            tenant=state.tenant,
            user=state.user,
            method="GET",
            path=f"/api/v1/smoke/{suffix}",
            full_path=f"http://127.0.0.1:8000/api/v1/smoke/{suffix}",
            status_code=200,
            duration_ms=12,
            ip="127.0.0.1",
            user_agent="live-smoke-crud",
            view_basename="smoke",
            view_action="list",
            object_id=str(state.patient.pk),
            message=f"Smoke {suffix}",
            metadata={"scope": suffix},
        )

    def _create_specialty(self, suffix: str, state: SmokeState):
        return ConsultationSpecialty.objects.create(
            tenant=state.tenant,
            name=f"Especialidade Smoke {suffix}",
            description=f"Especialidade de smoke {suffix}",
            base_price=Decimal("1500.00"),
            vat_percentage=Decimal("5.00"),
            active=True,
        )

    def _create_holiday(self, suffix: str, state: SmokeState):
        return Holiday.objects.create(
            tenant=state.tenant,
            date=self._date_offset(Holiday, 30 if suffix == "keep" else 0),
            description=f"Feriado smoke {suffix}",
            active=True,
        )

    def _create_job_title(self, suffix: str, state: SmokeState):
        obj = JobTitle.objects.create(
            tenant=state.tenant,
            name=f"Cargo Smoke {suffix}",
            description=f"Cargo de teste {suffix}",
            is_doctor=True,
        )
        if suffix == "keep":
            state.keep["job_title"] = obj
        return obj

    def _create_employee(self, suffix: str, state: SmokeState):
        role = state.keep.get("job_title")
        profession, _ = Profession.objects.get_or_create(
            tenant=state.tenant,
            name="Medico",
            defaults={
                "base_salary": Decimal("35000.00"),
                "ordinary_hour_value": Decimal("198.8636"),
                "extraordinary_hour_value": Decimal("298.2954"),
            },
        )
        obj = Employee.objects.create(
            tenant=state.tenant,
            name=f"Funcionario Smoke {suffix}",
            role=role,
            profession=profession,
            nuit=f"NUIT-{self._next_counter(Employee)}",
            nib=f"NIB-{self._next_counter(Employee)}",
            document_number=f"DOC-{self._next_counter(Employee)}",
            email=f"employee-{self._next_counter(Employee)}@local.test",
            phone=f"+25884000{self._next_counter(Employee):04d}",
            nominal_salary=Decimal("35000.00"),
            salary_increase=Decimal("2500.00"),
            base_month_hours=176,
        )
        if suffix == "keep":
            state.keep["employee"] = obj
        return obj

    def _create_family_dependent(self, suffix: str, state: SmokeState):
        return FamilyDependent.objects.create(
            tenant=state.tenant,
            employee=state.keep["employee"],
            name=f"Dependente Smoke {suffix}",
            relationship=FamilyDependent.Parentesco.FILHO,
            birth_date=self._date_offset(FamilyDependent, -4000),
            phone=f"+25885000{self._next_counter(FamilyDependent):04d}",
            notes=f"Dependente {suffix}",
        )

    def _create_work_schedule(self, suffix: str, state: SmokeState):
        weekday = (self._next_counter(WorkSchedule) - 1) % 7
        return WorkSchedule.objects.create(
            tenant=state.tenant,
            employee=state.keep["employee"],
            weekday=weekday,
            start_time=time(8, 0),
            end_time=time(16, 0),
            active=True,
        )

    def _create_absence(self, suffix: str, state: SmokeState):
        return Absence.objects.create(
            tenant=state.tenant,
            employee=state.keep["employee"],
            date=self._date_offset(Absence),
            reason=f"Ausencia smoke {suffix}",
            justified=suffix == "keep",
        )

    def _create_overtime(self, suffix: str, state: SmokeState):
        return Overtime.objects.create(
            tenant=state.tenant,
            employee=state.keep["employee"],
            date=self._date_offset(Overtime),
            hours=Decimal("2.50"),
            multiplier=Decimal("1.50"),
            notes=f"Horas extra {suffix}",
        )

    def _create_vacation(self, suffix: str, state: SmokeState):
        start = self._date_offset(Vacation)
        return Vacation.objects.create(
            tenant=state.tenant,
            employee=state.keep["employee"],
            start_date=start,
            end_date=start + timedelta(days=5),
            status=Vacation.Status.REQUESTED,
            notes=f"Ferias {suffix}",
        )

    def _create_termination(self, suffix: str, state: SmokeState):
        return Termination.objects.create(
            tenant=state.tenant,
            employee=state.keep["employee"],
            date=self._date_offset(Termination),
            type=Termination.Type.OTHER,
            reason=f"Motivo smoke {suffix}",
        )

    def _create_payroll(self, suffix: str, state: SmokeState):
        idx = self._next_counter(Payroll)
        return Payroll.objects.create(
            tenant=state.tenant,
            employee=state.keep["employee"],
            year=2030 + idx,
            month=((idx - 1) % 12) + 1,
            nominal_salary=Decimal("37500.00"),
            base_month_hours=176,
            overtime_hour_multiplier=Decimal("1.50"),
            closed=False,
        )

    def _create_medical_consultation(self, suffix: str, state: SmokeState):
        specialty = state.keep["consultas.ConsultationSpecialty"]
        obj = MedicalConsultation.objects.create(
            patient=state.patient,
            doctor=state.keep["employee"],
            specialty=specialty,
            type=specialty.name,
            description=f"Consulta smoke {suffix}",
            scheduled_for=timezone.now() + timedelta(days=self._next_counter(MedicalConsultation)),
            manual_holiday=False,
        )
        if suffix == "keep":
            state.keep["medical_consultation"] = obj
        return obj

    def _create_medical_record_entry(self, suffix: str, state: SmokeState):
        obj = MedicalRecordEntry.objects.create(
            patient=state.patient,
            doctor=state.keep["employee"],
            symptoms=f"Sintomas smoke {suffix}",
            diagnosis=f"Diagnostico smoke {suffix}",
            prescription=f"Prescricao smoke {suffix}",
            medical_report=f"Relatorio smoke {suffix}",
        )
        obj.consultations.add(state.keep["medical_consultation"])
        if suffix == "keep":
            state.keep["medical_record"] = obj
        return obj

    def _create_prescription_item(self, suffix: str, state: SmokeState):
        return PrescriptionItem.objects.create(
            tenant=state.tenant,
            record=state.keep["medical_record"],
            medication=state.product,
            dosage_value=Decimal("1.00"),
            dosage_unit=PrescriptionItem.DosageUnit.MG,
            interval_hours=8,
            dose_count=3,
            notes=f"Prescricao item {suffix}",
        )

    def _create_pregnancy(self, suffix: str, state: SmokeState):
        return Pregnancy.objects.create(
            patient=state.patient,
            responsible_doctor=state.keep["employee"],
            last_menstrual_period_date=self._date_offset(Pregnancy, -280),
            expected_delivery_date=self._date_offset(Pregnancy, 10),
            nursery=f"Berco {suffix}",
            maternity_bed=f"M-{self._next_counter(Pregnancy)}",
            total_deliveries=1,
            normal_deliveries=1,
            cesareans=0,
            notes=f"Gestacao smoke {suffix}",
        )

    def _create_surgical_procedure(self, suffix: str, state: SmokeState):
        obj = SurgicalProcedure.objects.create(
            tenant=state.tenant,
            name=f"Procedimento Smoke {suffix}",
            description=f"Procedimento de teste {suffix}",
            base_price=Decimal("10000.00"),
            vat_percentage=Decimal("5.00"),
            applies_vat_by_default=True,
            active=True,
        )
        if suffix == "keep":
            state.keep["surgical_procedure"] = obj
        return obj

    def _create_surgery(self, suffix: str, state: SmokeState):
        index = self._next_counter(Surgery)
        obj = Surgery.objects.create(
            patient=state.patient,
            surgeon=state.surgeon_user,
            procedure=f"Cirurgia smoke {suffix}",
            description=f"Cirurgia de teste {suffix}",
            estimated_price=Decimal("12000.00"),
            vat_percentage=Decimal("5.00"),
            applies_vat_by_default=True,
            scheduled_for=timezone.now() + timedelta(days=index),
            surgery_size=Surgery.Size.SMALL if index % 2 else Surgery.Size.LARGE,
        )
        obj.procedures.add(state.keep["surgical_procedure"])
        return obj

    def _create_ward(self, suffix: str, state: SmokeState):
        obj = Ward.objects.create(
            tenant=state.tenant,
            name=f"Enfermaria Smoke {suffix}",
            description=f"Enfermaria de teste {suffix}",
            active=True,
        )
        if suffix == "keep":
            state.keep["ward"] = obj
        return obj

    def _create_ward_bed(self, suffix: str, state: SmokeState):
        obj = WardBed.objects.create(
            tenant=state.tenant,
            ward=state.keep["ward"],
            number=f"C-{self._next_counter(WardBed)}",
            active=True,
        )
        if suffix == "keep":
            state.keep["ward_bed"] = obj
        return obj

    def _create_ward_admission(self, suffix: str, state: SmokeState):
        return WardAdmission.objects.create(
            tenant=state.tenant,
            bed=state.keep["ward_bed"],
            patient=state.patient,
            estimated_observation_hours=12,
            admission_date=timezone.now(),
            expected_discharge_date=timezone.now() + timedelta(hours=24),
            next_medication_at=timezone.now() + timedelta(hours=6),
            next_medication_description=f"Medicacao {suffix}",
            active=False,
            notes=f"Internamento smoke {suffix}",
        )

    def _create_company(self, suffix: str, state: SmokeState):
        return Company.objects.create(
            tenant=state.tenant,
            name=f"Empresa Smoke {suffix}",
            nuit=f"EMP-NUIT-{self._next_counter(Company)}",
            headquarters_address=f"Sede {suffix}",
            contacts=f"Contacto {suffix}",
            email=f"company-{self._next_counter(Company)}@local.test",
            phone1=f"+25886000{self._next_counter(Company):04d}",
            phone2=f"+25886100{self._next_counter(Company):04d}",
            nib=f"NIB-COMP-{self._next_counter(Company)}",
            active=True,
            notes=f"Observacao {suffix}",
        )

    def _create_equipment(self, suffix: str, state: SmokeState):
        obj = Equipment.objects.create(
            tenant=state.tenant,
            name=f"Equipamento Smoke {suffix}",
            serial_number=f"SER-{self._next_counter(Equipment)}-{suffix}",
            acquisition_date=self._date_offset(Equipment, -200),
            acquisition_status=Equipment.AcquisitionStatus.NEW,
            initial_operational_status=Equipment.OperationalStatus.WORKING,
            manufacturer="SmokeTech",
            model=f"Modelo {suffix}",
            location=f"Laboratorio {suffix}",
            responsible="Biomedico",
            active=True,
        )
        if suffix == "keep":
            state.keep["equipment"] = obj
        return obj

    def _create_daily_inspection(self, suffix: str, state: SmokeState):
        return DailyInspection.objects.create(
            equipment=state.keep["equipment"],
            date=self._date_offset(DailyInspection, 60 if suffix == "keep" else 0),
            operation_status=DailyInspection.Funcionamento.FUNCIONANDO,
            cleaning_performed=True,
            assessment=f"Avaliacao {suffix}",
            notes=f"Inspecao smoke {suffix}",
        )

    def _create_maintenance(self, suffix: str, state: SmokeState):
        return Maintenance.objects.create(
            equipment=state.keep["equipment"],
            type=Maintenance.Type.MONTHLY,
            maintenance_type=Maintenance.MaintenanceType.PREVENTIVE,
            scheduled_date=self._date_offset(Maintenance),
            performed_date=None,
            description=f"Manutencao smoke {suffix}",
            technician=f"Tecnico {suffix}",
        )

    def _create_incident(self, suffix: str, state: SmokeState):
        return Incident.objects.create(
            equipment=state.keep["equipment"],
            date=timezone.now(),
            type=Incident.Type.INCIDENT,
            description=f"Ocorrencia smoke {suffix}",
            support_contact=f"Suporte {suffix}",
            resolved=False,
        )

    def _create_system_error(self, suffix: str, state: SmokeState):
        return SystemError.objects.create(
            tenant=state.tenant,
            user=state.user,
            method="POST",
            path=f"/api/v1/error/{suffix}",
            full_path=f"http://127.0.0.1:8000/api/v1/error/{suffix}",
            status_code=500,
            duration_ms=23,
            ip="127.0.0.1",
            user_agent="live-smoke-crud",
            view_basename="smoke-errors",
            view_action="create",
            object_id=str(state.patient.pk),
            exception_class="RuntimeError",
            message=f"Erro smoke {suffix}",
            traceback="RuntimeError: smoke",
            metadata={"scope": suffix},
        )

    def _create_medical_result_file(self, suffix: str, state: SmokeState):
        type_value, payload = self._medical_file(state.medical_exam, suffix)
        return MedicalResultFile.objects.create(
            tenant=state.tenant,
            result=state.result,
            request_item=state.request_item,
            medical_exam=state.medical_exam,
            type=type_value,
            description=f"Arquivo medico {suffix}",
            file=payload,
        )

    def _create_integration_equipment(self, suffix: str, state: SmokeState):
        obj = IntegrationEquipment.objects.create(
            tenant=state.tenant,
            name=f"Integracao Equipamento {suffix}",
            modality=IntegrationEquipment.Modalidade.HEMOGRAMA,
            protocol=IntegrationEquipment.Protocolo.HTTP_JSON,
            manufacturer="SmokeTech",
            model=f"Integrator {suffix}",
            serial_number=f"INT-{self._next_counter(IntegrationEquipment)}-{suffix}",
            active=True,
            config={"base_url": "http://127.0.0.1:8000"},
        )
        if suffix == "keep":
            state.keep["integration_equipment"] = obj
        return obj

    def _create_integration_credential(self, suffix: str, state: SmokeState):
        obj, _raw_key = IntegrationCredential.generate(
            equipment=state.keep["integration_equipment"],
            label=f"Credential {suffix}",
            scopes=[IntegrationCredential.Scope.WORKLIST_READ, IntegrationCredential.Scope.RESULT_WRITE],
        )
        return obj

    def _create_integration_routing(self, suffix: str, state: SmokeState):
        return IntegrationRouting.objects.create(
            tenant=state.tenant,
            equipment=state.keep["integration_equipment"],
            exam_type=IntegrationRouting.ExamType.LABORATORIO,
            sector=Sector.HEMATOLOGIA,
            active=True,
        )

    def _create_integration_order(self, suffix: str, state: SmokeState):
        obj = IntegrationOrder.objects.create(
            tenant=state.tenant,
            equipment=state.keep["integration_equipment"],
            request=state.request,
            status=IntegrationOrder.Status.PENDING,
            observation=f"Worklist smoke {suffix}",
        )
        if suffix == "keep":
            state.keep["integration_order"] = obj
        return obj

    def _create_integration_order_item(self, suffix: str, state: SmokeState):
        obj = IntegrationOrderItem.objects.create(
            tenant=state.tenant,
            order=state.keep["integration_order"],
            request_item=state.request_item,
            status=IntegrationOrderItem.Status.PENDING,
        )
        if suffix == "keep":
            state.keep["integration_order_item"] = obj
        return obj

    def _create_integration_message(self, suffix: str, state: SmokeState):
        obj = IntegrationMessage.create_from_payload(
            equipment=state.keep["integration_equipment"],
            order=state.keep.get("integration_order"),
            direction=IntegrationMessage.Direction.OUTBOUND,
            protocol="HTTP_JSON",
            message_id=f"MSG-{suffix}-{self._next_counter(IntegrationMessage)}",
            content_type="application/json",
            raw_body=json.dumps({"scope": suffix}).encode("utf-8"),
            payload_json={"scope": suffix},
        )
        if suffix == "keep":
            state.keep["integration_message"] = obj
        return obj

    def _create_integration_document(self, suffix: str, state: SmokeState):
        return IntegrationDocument.objects.create(
            tenant=state.tenant,
            message=state.keep["integration_message"],
            order_item=state.keep.get("integration_order_item"),
            file=self._content_file(f"integration-{suffix}.txt", f"document-{suffix}".encode()),
            content_type="text/plain",
        )

    def _create_integration_mapping(self, suffix: str, state: SmokeState):
        return IntegrationAnalyteMapping.objects.create(
            tenant=state.tenant,
            name=f"Mapeamento {suffix}",
            equipment=state.keep["integration_equipment"],
            code=f"HB-{self._next_counter(IntegrationAnalyteMapping)}-{suffix}",
            exam_field=state.lab_exam_field,
            unit_override="g/dL",
            active=True,
        )

    def _create_session(self, suffix: str, state: SmokeState):
        store = SessionStore()
        store["scope"] = suffix
        store["tenant_id"] = state.tenant.id
        store.create()
        return Session.objects.get(session_key=store.session_key)
