from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

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
