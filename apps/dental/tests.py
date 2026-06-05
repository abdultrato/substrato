from decimal import Decimal

import pytest

from api.v1.dental.serializers import DentalProcedureExecutionSerializer, DentalProcedureSerializer
from apps.clinical.models import Patient
from apps.dental.models import DentalProcedure, DentalProcedureExecution, DentalTreatmentPlan, DentalTreatmentPlanItem
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(
        identifier="tn-dental",
        name="Tenant Dental",
        domain="tn-dental.local",
        active=True,
    )


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Dental",
        document_number="DENTAL-001",
    )


@pytest.mark.django_db
def test_dental_procedure_generates_code_from_custom_id():
    tenant = _tenant()

    procedure = DentalProcedure.objects.create(
        tenant=tenant,
        name="Restauração simples",
        category=DentalProcedure.Category.RESTORATIVE,
        default_duration_minutes=30,
        base_price=Decimal("1200.00"),
    )

    procedure.refresh_from_db()

    assert procedure.custom_id
    assert procedure.code == procedure.custom_id


@pytest.mark.django_db
def test_dental_procedure_serializer_does_not_require_manual_code():
    tenant = _tenant()
    serializer = DentalProcedureSerializer(
        data={
            "name": "Profilaxia",
            "category": DentalProcedure.Category.PREVENTIVE,
            "default_duration_minutes": 20,
            "base_price": "800.00",
            "active": True,
        }
    )

    assert serializer.is_valid(), serializer.errors
    procedure = serializer.save(tenant=tenant)
    procedure.refresh_from_db()

    assert serializer.fields["code"].read_only is True
    assert procedure.code == procedure.custom_id


@pytest.mark.django_db
def test_dental_treatment_item_calculates_total_and_final_price():
    tenant = _tenant()
    patient = _patient(tenant)
    procedure = DentalProcedure.objects.create(
        tenant=tenant,
        name="Restauração composta",
        category=DentalProcedure.Category.RESTORATIVE,
        base_price=Decimal("1000.00"),
    )
    plan = DentalTreatmentPlan.objects.create(
        tenant=tenant,
        patient=patient,
        title="Plano restaurador",
        estimated_total=Decimal("2000.00"),
    )

    item = DentalTreatmentPlanItem.objects.create(
        treatment_plan=plan,
        procedure=procedure,
        quantity=Decimal("2.00"),
        unit_price=Decimal("1000.00"),
        discount_amount=Decimal("250.00"),
    )

    assert item.total_price == Decimal("2000.00")
    assert item.final_price == Decimal("1750.00")
    assert item.financial_status == DentalTreatmentPlanItem.FinancialStatus.NOT_BILLED


@pytest.mark.django_db
def test_dental_procedure_execution_serializer_accepts_required_backend_fields():
    tenant = _tenant()
    patient = _patient(tenant)
    procedure = DentalProcedure.objects.create(
        tenant=tenant,
        name="Extração simples",
        category=DentalProcedure.Category.SURGERY,
        base_price=Decimal("1500.00"),
    )

    serializer = DentalProcedureExecutionSerializer(
        data={
            "patient": patient.id,
            "procedure": procedure.id,
            "status": DentalProcedureExecution.Status.COMPLETED,
            "tooth_number": "38",
            "materials_used": "Anestésico local",
            "clinical_notes": "Procedimento concluído sem intercorrências.",
        }
    )

    assert serializer.is_valid(), serializer.errors
    execution = serializer.save(tenant=tenant)

    assert execution.patient == patient
    assert execution.procedure == procedure
    assert execution.tenant == tenant
