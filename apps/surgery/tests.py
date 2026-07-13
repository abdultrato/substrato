from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from api.v1.surgery.serializers import OperatingRoomSerializer, PreoperativeAssessmentSerializer
from api.v1.surgery.filters import SurgicalProcedureFilter
from api.v1.surgery.serializers import SmallSurgerySerializer
from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.medical_exam import MedicalExam
from apps.clinical.models.patient import Patient
from apps.clinical_laboratory.models import LabSector, LabTest
from apps.human_resources.models import Employee
from apps.equipment.models import Equipment
from apps.surgery.models import (
    OperatingRoom,
    PreoperativeAssessment,
    Surgery,
    SurgeryProcedureItem,
    SurgicalAuthorization,
    SurgicalBillingItem,
    SurgicalConsumption,
    SurgicalMaterial,
    SurgicalProcedure,
    SurgicalRequest,
    SurgicalSchedule,
)
from apps.tenants.models.tenant import Tenant
from core.constants.medical_exam.medical_exam_method import MedicalExamMethod
from core.constants.medical_exam.medical_exam_sector import MedicalExamSector


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-cirurgia-{suffix}",
        name=f"Tenant Cirurgia {suffix}",
        domain=f"cirurgia-{suffix}.test",
        active=True,
    )


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Cirurgia",
        gender="Feminino",
        address_street="Rua Cirurgia",
    )


def _employee(tenant, name="Profissional Cirurgia"):
    return Employee.objects.create(
        tenant=tenant,
        name=name,
        email=f"{uuid4().hex[:8]}@cirurgia.test",
    )


def _surgery(tenant=None, patient=None, **kwargs):
    tenant = tenant or _tenant()
    patient = patient or _patient(tenant)
    defaults = {
        "tenant": tenant,
        "patient": patient,
        "procedure": "Colecistectomia",
        "estimated_price": Decimal("1500.00"),
        "surgery_size": Surgery.Size.LARGE,
    }
    defaults.update(kwargs)
    return Surgery.objects.create(**defaults)


def _lab_test(tenant, code="LAB-T"):
    sector = LabSector.objects.create(
        tenant=tenant,
        name=f"Sector {code}",
        code=code,
    )
    return LabTest.objects.create(
        tenant=tenant,
        name=f"Exame {code}",
        code=code,
        sector=sector,
        price=Decimal("120.00"),
    )


def _medical_exam(tenant, name="Ecografia pré-op."):
    return MedicalExam.objects.create(
        tenant=tenant,
        name=name,
        price=Decimal("250.00"),
        method=MedicalExamMethod.ULTRASSONOGRAFIA,
        sector=MedicalExamSector.RADIOLOGIA,
    )


class _FixedSmallSurgeryView:
    fixed_surgery_size = Surgery.Size.SMALL


@pytest.mark.django_db
def test_surgical_request_propagates_to_surgery_fields():
    tenant = _tenant()
    patient = _patient(tenant)
    surgeon = _employee(tenant, "Cirurgião")
    request = SurgicalRequest.objects.create(
        patient=patient,
        requesting_doctor=surgeon,
        requested_procedure="Herniorrafia inguinal",
        clinical_diagnosis="Hérnia inguinal sintomática",
        priority=SurgicalRequest.Priority.URGENT,
        status=SurgicalRequest.Status.APPROVED,
    )

    surgery = Surgery.objects.create(
        patient=patient,
        surgical_request=request,
        procedure="",
        surgery_size=Surgery.Size.LARGE,
    )

    assert request.tenant == tenant
    assert request.reviewed_at is not None
    assert surgery.tenant == tenant
    assert surgery.procedure == "Herniorrafia inguinal"
    assert surgery.preoperative_diagnosis == "Hérnia inguinal sintomática"
    assert surgery.priority == Surgery.Priority.URGENT


@pytest.mark.django_db
def test_schedule_blocks_overlapping_room_for_elective_surgery():
    tenant = _tenant()
    patient = _patient(tenant)
    room = OperatingRoom.objects.create(
        tenant=tenant,
        name="Bloco A",
        code="BA-01",
    )
    first_surgery = _surgery(tenant, patient)
    second_surgery = _surgery(tenant, patient, procedure="Apendicectomia")
    start = timezone.now() + timedelta(days=1)

    SurgicalSchedule.objects.create(
        surgery=first_surgery,
        operating_room=room,
        scheduled_start=start,
        scheduled_end=start + timedelta(hours=2),
        priority=SurgicalSchedule.Priority.ELECTIVE,
    )

    with pytest.raises(ValidationError):
        SurgicalSchedule.objects.create(
            surgery=second_surgery,
            operating_room=room,
            scheduled_start=start + timedelta(minutes=30),
            scheduled_end=start + timedelta(hours=3),
            priority=SurgicalSchedule.Priority.ELECTIVE,
        )


@pytest.mark.django_db
def test_operating_room_generates_code_from_custom_id():
    room = OperatingRoom.objects.create(tenant=_tenant(), name="Bloco automático")

    assert room.custom_id
    assert room.code == room.custom_id


@pytest.mark.django_db
def test_operating_room_rejects_equipment_from_another_tenant():
    tenant = _tenant()
    foreign_equipment = Equipment.objects.create(
        tenant=_tenant(),
        name="Monitor externo",
        serial_number=f"SER-{uuid4().hex[:8]}",
    )
    serializer = OperatingRoomSerializer(
        data={"name": "Bloco A", "equipment": [foreign_equipment.pk]},
        context={"request": SimpleNamespace(tenant=tenant)},
    )

    assert not serializer.is_valid()
    assert "equipment" in serializer.errors


@pytest.mark.django_db
def test_confirmed_elective_schedule_requires_financial_authorization():
    tenant = _tenant()
    patient = _patient(tenant)
    surgery = _surgery(tenant, patient)
    room = OperatingRoom.objects.create(
        tenant=tenant,
        name="Bloco B",
        code="BB-01",
    )
    start = timezone.now() + timedelta(days=2)

    with pytest.raises(ValidationError):
        SurgicalSchedule.objects.create(
            surgery=surgery,
            operating_room=room,
            scheduled_start=start,
            scheduled_end=start + timedelta(hours=2),
            status=SurgicalSchedule.Status.CONFIRMED,
            priority=SurgicalSchedule.Priority.ELECTIVE,
        )

    SurgicalAuthorization.objects.create(
        patient=patient,
        surgery=surgery,
        status=SurgicalAuthorization.Status.APPROVED,
        budget_approved=True,
        initial_payment_received=True,
        preoperative_assessment_completed=True,
        consent_signed=True,
    )

    schedule = SurgicalSchedule.objects.create(
        surgery=surgery,
        operating_room=room,
        scheduled_start=start,
        scheduled_end=start + timedelta(hours=2),
        status=SurgicalSchedule.Status.CONFIRMED,
        priority=SurgicalSchedule.Priority.ELECTIVE,
    )

    assert schedule.pk


@pytest.mark.django_db
def test_surgical_invoice_uses_billing_items_as_authoritative_lines():
    tenant = _tenant()
    patient = _patient(tenant)
    surgery = _surgery(tenant, patient, estimated_price=Decimal("0.00"))
    SurgicalBillingItem.objects.create(
        surgery=surgery,
        event_type=SurgicalBillingItem.EventType.ROOM_FEE,
        description="Taxa de sala operatória",
        quantity=Decimal("1.00"),
        unit_price=Decimal("500.00"),
        vat_percentage=Decimal("16.00"),
        status=SurgicalBillingItem.Status.READY,
    )

    invoice = Invoice.objects.create(
        tenant=tenant,
        origin=Invoice.Origin.SURGERY,
        surgery=surgery,
        patient=patient,
    )
    invoice.sync_items_from_origin()

    assert invoice.items.count() == 1
    assert invoice.subtotal == Decimal("500.00")
    assert invoice.total == Decimal("580.00")
    assert surgery.billing_items.first().status == SurgicalBillingItem.Status.INVOICED


@pytest.mark.django_db
def test_surgical_invoice_falls_back_to_procedures_and_consumptions():
    tenant = _tenant()
    patient = _patient(tenant)
    surgery = _surgery(tenant, patient, estimated_price=Decimal("0.00"))
    SurgeryProcedureItem.objects.create(
        surgery=surgery,
        description="Sutura complexa",
        status=SurgeryProcedureItem.Status.COMPLETED,
        unit_price=Decimal("200.00"),
        vat_percentage=Decimal("16.00"),
    )
    material = SurgicalMaterial.objects.create(
        tenant=tenant,
        name="Fio cirúrgico",
        code="FIO-01",
        sale_price=Decimal("50.00"),
    )
    SurgicalConsumption.objects.create(
        surgery=surgery,
        material=material,
        quantity=Decimal("2.00"),
    )

    invoice = Invoice.objects.create(
        tenant=tenant,
        origin=Invoice.Origin.SURGERY,
        surgery=surgery,
        patient=patient,
    )
    invoice.sync_items_from_origin()

    assert invoice.items.count() == 2
    assert invoice.subtotal == Decimal("300.00")
    assert invoice.total == Decimal("348.00")
    assert surgery.consumptions.first().billing_status == SurgicalConsumption.BillingStatus.BILLED


@pytest.mark.django_db
def test_surgical_procedure_filter_for_surgery_size_includes_specific_and_ambas():
    tenant = _tenant()
    small = SurgicalProcedure.objects.create(tenant=tenant, name="Exérese simples", surgery_type="PEQUENA")
    large = SurgicalProcedure.objects.create(tenant=tenant, name="Laparotomia", surgery_type="GRANDE")
    both = SurgicalProcedure.objects.create(tenant=tenant, name="Sutura", surgery_type="AMBAS")

    filtered_ids = list(
        SurgicalProcedureFilter(
            data={"for_surgery_size": Surgery.Size.SMALL},
            queryset=SurgicalProcedure.objects.filter(tenant=tenant),
        ).qs.values_list("id", flat=True)
    )

    assert small.id in filtered_ids
    assert both.id in filtered_ids
    assert large.id not in filtered_ids


@pytest.mark.django_db
def test_small_surgery_serializer_rejects_large_only_procedure():
    tenant = _tenant()
    patient = _patient(tenant)
    procedure = SurgicalProcedure.objects.create(tenant=tenant, name="Laparotomia", surgery_type="GRANDE")

    serializer = SmallSurgerySerializer(
        data={"patient": patient.id, "procedures": [procedure.id]},
        context={"view": _FixedSmallSurgeryView()},
    )

    assert not serializer.is_valid()
    assert "procedures" in serializer.errors


@pytest.mark.django_db
def test_preoperative_assessment_serializer_creates_lab_and_medical_requests():
    tenant = _tenant()
    patient = _patient(tenant)
    evaluator = _employee(tenant, "Avaliador Pré-op.")
    lab_test = _lab_test(tenant, "HEMO")
    medical_exam = _medical_exam(tenant)

    serializer = PreoperativeAssessmentSerializer(data={
        "patient": patient.id,
        "evaluator": evaluator.id,
        "status": PreoperativeAssessment.Status.REQUIRES_EXAMS,
        "laboratory_exams": [lab_test.id],
        "medical_exams": [medical_exam.id],
    })

    assert serializer.is_valid(), serializer.errors
    assessment = serializer.save()

    lab_request = LabRequest.objects.get(
        patient=patient,
        type=LabRequest.Type.LABORATORY,
    )
    medical_request = LabRequest.objects.get(
        patient=patient,
        type=LabRequest.Type.MEDICAL_EXAM,
    )

    assert lab_request.requesting_physician == evaluator
    assert medical_request.requesting_physician == evaluator
    assert list(lab_request.items.values_list("exam_id", flat=True)) == [lab_test.id]
    assert list(medical_request.items.values_list("medical_exam_id", flat=True)) == [medical_exam.id]
    assert assessment.required_exams["laboratory_request"]["id"] == lab_request.id
    assert assessment.required_exams["medical_request"]["id"] == medical_request.id
    assert assessment.required_exams["laboratory_exams"][0]["id"] == lab_test.id
    assert assessment.required_exams["medical_exams"][0]["id"] == medical_exam.id
