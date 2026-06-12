"""Testes do perfil ocupacional (bandeja de exames) em requisições laboratoriais."""

from datetime import date
from decimal import Decimal

import pytest

from api.v1.clinical.serializers import LabRequestSerializer, OccupationalExamProfileSerializer
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.occupational_profile import OccupationalExamProfile
from apps.clinical.models.patient import Patient
from apps.clinical.models.sample import Sample
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.sector import Sector


def _tenant():
    return Tenant.objects.create(identifier="tn-ocp", name="Tenant Ocupacional")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Ocupacional",
        gender="Masculino",
        address_street="Rua O",
        birth_date=date(1990, 1, 1),
    )


def _exam(tenant, name):
    sample = Sample.objects.create(
        tenant=tenant,
        name=f"Amostra {name}",
        bottle_type=Sample.BottleType.EDTA_TUBE,
    )
    return LabExam.objects.create(
        tenant=tenant,
        name=name,
        price=Decimal("10.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
        turnaround_hours=4,
        sample_type=sample,
    )


def _profile(tenant, exams, name="Motorista"):
    profile = OccupationalExamProfile.objects.create(
        tenant=tenant,
        name=name,
        profession=name,
    )
    profile.exams.set(exams)
    return profile


@pytest.mark.django_db
def test_profile_serializer_exposes_exams():
    tenant = _tenant()
    exam = _exam(tenant, "Hemograma")
    profile = _profile(tenant, [exam])

    data = OccupationalExamProfileSerializer(profile).data
    assert data["exams"] == [exam.id]
    assert data["exam_names"] == [exam.name]


@pytest.mark.django_db
def test_create_request_merges_profile_exams_with_manual_selection():
    tenant = _tenant()
    patient = _patient(tenant)
    manual = _exam(tenant, "Glicemia")
    shared = _exam(tenant, "Hemograma")
    profile_only = _exam(tenant, "Audiometria")
    profile = _profile(tenant, [shared, profile_only])

    serializer = LabRequestSerializer(
        data={
            "patient": patient.id,
            "exams": [manual.id, shared.id],
            "is_occupational": True,
            "occupational_profile": profile.id,
        }
    )
    assert serializer.is_valid(), serializer.errors
    request = serializer.save(tenant=tenant)

    exam_ids = set(request.items.values_list("exam_id", flat=True))
    assert exam_ids == {manual.id, shared.id, profile_only.id}
    assert request.is_occupational is True
    assert request.occupational_profile_id == profile.id


@pytest.mark.django_db
def test_create_request_with_profile_only_needs_no_manual_exams():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant, "Hemograma")
    profile = _profile(tenant, [exam])

    serializer = LabRequestSerializer(
        data={
            "patient": patient.id,
            "occupational_profile": profile.id,
        }
    )
    assert serializer.is_valid(), serializer.errors
    request = serializer.save(tenant=tenant)

    assert set(request.items.values_list("exam_id", flat=True)) == {exam.id}
    # Selecionar o perfil implica requisição ocupacional.
    assert request.is_occupational is True


@pytest.mark.django_db
def test_profile_rejected_on_medical_exam_request():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant, "Hemograma")
    profile = _profile(tenant, [exam])

    serializer = LabRequestSerializer(
        data={
            "patient": patient.id,
            "type": "MED",
            "occupational_profile": profile.id,
        }
    )
    assert not serializer.is_valid()
    assert "occupational_profile" in serializer.errors


@pytest.mark.django_db
def test_collection_workflow_validar_colher_processar():
    from domain.clinical.result_state import ResultState
    from tasks.generate_pdf.request_label_pdf_generator import generate_request_label_pdf

    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant, "Hemograma")

    from apps.clinical.models.lab_request import LabRequest

    request = LabRequest.objects.create(tenant=tenant, patient=patient)
    request.add_exam(exam)

    # colheita antes da validação é rejeitada
    import pytest as _pytest
    from django.core.exceptions import ValidationError as DjangoValidationError

    with _pytest.raises(DjangoValidationError):
        request.registar_colheita()

    request.validar()
    assert request.validated_at is not None

    with _pytest.raises(DjangoValidationError):
        request.validar()  # idempotência: segunda validação falha

    request.registar_colheita()
    assert request.collected_at is not None

    pdf_bytes, filename = generate_request_label_pdf(request)
    assert pdf_bytes[:4] == b"%PDF"
    assert request.custom_id in filename

    request.iniciar_processamento()
    request.refresh_from_db()
    assert request.status == ResultState.IN_ANALYSIS
