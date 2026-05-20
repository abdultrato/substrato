from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient
from apps.clinical.models.sample import Sample
from apps.nursing.models import NursingRecord
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.sector import Sector


def _tenant():
    return Tenant.objects.create(
        identifier="tn-lab-coleta",
        name="Tenant Lab Coleta",
        domain="tenant-lab-coleta.local",
        active=True,
    )


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Coleta",
        gender="Masculino",
        address_street="Rua da Coleta",
    )


def _sample(tenant, *, name, bottle_type, minimum_volume):
    return Sample.objects.create(
        tenant=tenant,
        name=name,
        bottle_type=bottle_type,
        minimum_volume_ml=Decimal(minimum_volume),
    )


def _exam(tenant, sample_type):
    return LabExam.objects.create(
        tenant=tenant,
        name="GeneXpert MTB/RIF",
        turnaround_hours=24,
        price=Decimal("1500.00"),
        method=Method.PCR,
        sector=Sector.BIOLOGIA_MOLECULAR,
        sample_type=sample_type,
    )


def _authenticate(api_client, tenant, *, username, group_name):
    User = get_user_model()
    user = User.objects.create_user(
        username=username,
        email=f"{username}@example.test",
        password="123456",
        name=username,
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name=group_name)
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_lab_exam_exposes_primary_and_alternative_sample_options():
    tenant = _tenant()
    sputum = _sample(
        tenant,
        name="Expectoração",
        bottle_type=Sample.BottleType.STERILE_CONTAINER,
        minimum_volume="2.00",
    )
    saliva = _sample(
        tenant,
        name="Saliva",
        bottle_type=Sample.BottleType.STERILE_CONTAINER,
        minimum_volume="1.50",
    )
    exam = _exam(tenant, sputum)
    exam.sample_options.add(saliva)

    options = exam.get_sample_options()
    option_ids = {item.id for item in options}

    assert sputum.id in option_ids
    assert saliva.id in option_ids


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize(
    ("group_name", "expected_origin_role", "username"),
    [
        ("Recepcionista", "Receção", "user-recepcao"),
        ("Médico", "Médico", "user-medico"),
    ],
)
def test_lab_request_created_by_reception_or_doctor_syncs_nursing_entry(
    api_client,
    group_name,
    expected_origin_role,
    username,
):
    tenant = _tenant()
    patient = _patient(tenant)
    sputum = _sample(
        tenant,
        name="Expectoração",
        bottle_type=Sample.BottleType.STERILE_CONTAINER,
        minimum_volume="2.00",
    )
    saliva = _sample(
        tenant,
        name="Saliva",
        bottle_type=Sample.BottleType.STERILE_CONTAINER,
        minimum_volume="1.50",
    )
    exam = _exam(tenant, sputum)
    exam.sample_options.add(saliva)

    _authenticate(
        api_client,
        tenant,
        username=username,
        group_name=group_name,
    )

    response = api_client.post(
        "/api/v1/clinical/labrequest/",
        {
            "patient": patient.id,
            "type": LabRequest.Type.LABORATORY,
            "exams": [exam.id],
        },
        format="json",
    )

    assert response.status_code == 201

    lab_request = LabRequest.objects.get(id=response.data["id"])
    record = NursingRecord.objects.get(lab_request=lab_request)

    assert record.record_kind == NursingRecord.RecordKind.LAB_COLLECTION_REQUEST
    assert record.origin_role == expected_origin_role
    assert record.patient_id == patient.id
    assert record.collection_guidance

    first_exam = record.collection_guidance[0]
    assert first_exam["exam_id"] == exam.id
    sample_ids = {option["sample_id"] for option in first_exam["sample_options"]}
    assert sputum.id in sample_ids
    assert saliva.id in sample_ids

    lab_request.refresh_from_db()
    assert lab_request.samples.filter(id=sputum.id).exists()
    assert lab_request.samples.filter(id=saliva.id).exists()


@pytest.mark.django_db(transaction=True)
def test_lab_request_created_by_other_profile_does_not_auto_create_nursing_entry():
    tenant = _tenant()
    patient = _patient(tenant)
    sputum = _sample(
        tenant,
        name="Expectoração",
        bottle_type=Sample.BottleType.STERILE_CONTAINER,
        minimum_volume="2.00",
    )
    exam = _exam(tenant, sputum)

    User = get_user_model()
    user = User.objects.create_user(
        username="user-lab-profile",
        email="user-lab-profile@example.test",
        password="123456",
        name="User Lab Profile",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Técnico de Laboratório")
    user.groups.add(group)

    request_obj = LabRequest.objects.create(
        tenant=tenant,
        patient=patient,
        type=LabRequest.Type.LABORATORY,
        created_by=user,
    )
    request_obj.add_exam(exam)

    assert not NursingRecord.objects.filter(lab_request=request_obj).exists()
