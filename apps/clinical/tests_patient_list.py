from datetime import date
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest
from django.utils import timezone

from apps.bloodbank.models.blood_bank import BloodDonation
from apps.clinical.models.patient import Patient
from apps.tenants.models.tenant import Tenant
from core.constants.provenance import Provenance


def _tenant():
    return Tenant.objects.create(
        identifier="tn-pac-list",
        name="Tenant Pac List",
        domain="tenant-pac-list.local",
        active=True,
    )


@pytest.mark.django_db
def test_patient_serializer_expoe_idade_e_estado_de_doador():
    from api.v1.clinical.serializers import PatientSerializer

    tenant = _tenant()
    patient = Patient.objects.create(
        tenant=tenant,
        name="Ana Maria",
        gender="Femenino",
        birth_date=date(1990, 1, 1),
    )

    data = PatientSerializer(patient).data

    assert data["age_years"] >= 30
    assert "anos" in data["age_display"]
    # Sem doações registadas, o fallback de query devolve False.
    assert data["is_blood_donor"] is False


@pytest.mark.django_db
def test_patient_serializer_desativa_doador_com_idade_superior_a_54():
    from api.v1.clinical.serializers import PatientSerializer

    tenant = _tenant()
    patient = Patient.objects.create(
        tenant=tenant,
        name="Doador Histórico",
        document_number=f"PAC-{uuid4().hex[:8]}",
        gender="Masculino",
        birth_date=date(1990, 1, 1),
    )
    BloodDonation.objects.create(
        tenant=tenant,
        donor=patient,
        bag_identifier=f"BAG-{uuid4().hex[:8]}",
        blood_type=BloodDonation._meta.get_field("blood_type").default,
        donor_weight_kg=70,
        hemoglobin_g_dl=14,
        collected_at=timezone.now(),
        hiv_test=BloodDonation.TestResult.NEGATIVE,
        syphilis_rpr_test=BloodDonation.TestResult.NEGATIVE,
        hepatitis_b_hbsag_test=BloodDonation.TestResult.NEGATIVE,
        hepatitis_c_anti_hcv_test=BloodDonation.TestResult.NEGATIVE,
        malaria_test=BloodDonation.TestResult.NEGATIVE,
    )
    patient.birth_date = date(1960, 1, 1)
    patient.save(update_fields=["birth_date"])

    data = PatientSerializer(patient).data

    assert data["age_years"] > 54
    assert data["is_blood_donor"] is False


@pytest.mark.django_db(transaction=True)
def test_patient_summary_conta_por_categoria(api_client):
    tenant = _tenant()
    user = get_user_model().objects.create_user(
        username="user-pac-list",
        email="user-pac-list@example.test",
        password="123456",
        name="user-pac-list",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Recepcionista")
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)

    Patient.objects.create(tenant=tenant, name="Fem 1", gender="Femenino")
    Patient.objects.create(
        tenant=tenant,
        name="Fem 2 grávida",
        gender="Femenino",
        pregnant=True,
        gestational_age_weeks=12,
    )
    Patient.objects.create(
        tenant=tenant,
        name="Masc Ocupacional",
        gender="Masculino",
        provenance=Provenance.MEDICINA_OCUPACIONAL,
    )

    response = api_client.get("/api/v1/clinical/patient/summary/")

    assert response.status_code == 200
    data = response.data
    assert data["total"] == 3
    assert data["female"] == 2
    assert data["male"] == 1
    assert data["pregnant"] == 1
    assert data["occupational"] == 1
    assert data["blood_donors"] == 0


@pytest.mark.django_db(transaction=True)
def test_patient_list_is_blood_donor_exclui_maiores_de_54(api_client):
    tenant = _tenant()
    user = get_user_model().objects.create_user(
        username="user-pac-donor-filter",
        email="user-pac-donor-filter@example.test",
        password="123456",
        name="user-pac-donor-filter",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Recepcionista")
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)

    younger = Patient.objects.create(
        tenant=tenant,
        name="Doador Elegível",
        document_number=f"PAC-{uuid4().hex[:8]}",
        gender="Masculino",
        birth_date=date(1995, 1, 1),
    )
    older = Patient.objects.create(
        tenant=tenant,
        name="Doador Inativo",
        document_number=f"PAC-{uuid4().hex[:8]}",
        gender="Masculino",
        birth_date=date(1990, 1, 1),
    )

    for patient in (younger, older):
        BloodDonation.objects.create(
            tenant=tenant,
            donor=patient,
            bag_identifier=f"BAG-{uuid4().hex[:8]}",
            blood_type=BloodDonation._meta.get_field("blood_type").default,
            donor_weight_kg=70,
            hemoglobin_g_dl=14,
            collected_at=timezone.now(),
            hiv_test=BloodDonation.TestResult.NEGATIVE,
            syphilis_rpr_test=BloodDonation.TestResult.NEGATIVE,
            hepatitis_b_hbsag_test=BloodDonation.TestResult.NEGATIVE,
            hepatitis_c_anti_hcv_test=BloodDonation.TestResult.NEGATIVE,
            malaria_test=BloodDonation.TestResult.NEGATIVE,
        )

    older.birth_date = date(1960, 1, 1)
    older.save(update_fields=["birth_date"])

    response = api_client.get("/api/v1/clinical/patient/?is_blood_donor=true")

    assert response.status_code == 200
    payload = response.data.get("results", response.data)
    names = {item["name"] for item in payload}
    assert "Doador Elegível" in names
    assert "Doador Inativo" not in names
