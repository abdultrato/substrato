from uuid import uuid4

import pytest

from api.v1.clinical_laboratory.serializers import (
    LabOrderItemSerializer,
    LabOrderSerializer,
    LabTestPanelSerializer,
    LabTestSerializer,
)
from apps.clinical.models.patient import Patient
from apps.clinical_laboratory.models import LabOrder, LabOrderItem, LabSector, LabTest, LabTestPanel
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-lab-sectors-{suffix}",
        name="Tenant Lab Sectors",
        domain=f"lab-sectors-{suffix}.local",
        active=True,
    )


def _sector(tenant, *, code: str, name: str):
    return LabSector.objects.create(tenant=tenant, code=code, name=name)


def _test(tenant, *, code: str, name: str, sector: LabSector):
    return LabTest.objects.create(tenant=tenant, code=code, name=name, sector=sector)


@pytest.mark.django_db
def test_lab_order_and_panel_expose_distinct_sectors_from_selected_tests():
    tenant = _tenant()
    bioquimica = _sector(tenant, code="BIO", name="Bioquímica")
    serologia = _sector(tenant, code="SER", name="Serologia")
    hematologia = _sector(tenant, code="HEM", name="Hematologia")

    glicemia = _test(tenant, code="GLI", name="Glicemia", sector=bioquimica)
    rpr_vdrl = _test(tenant, code="RPR", name="RPR/VDRL", sector=serologia)
    hemograma = _test(tenant, code="HEMOGR", name="Hemograma", sector=hematologia)

    panel = LabTestPanel.objects.create(tenant=tenant, code="TRISET", name="Painel Trissetorial")
    panel.tests.set([glicemia, rpr_vdrl, hemograma])

    patient = Patient.objects.create(tenant=tenant, name="Paciente Laboratório")
    order = LabOrder.objects.create(tenant=tenant, patient=patient)
    items = [
        LabOrderItem.objects.create(tenant=tenant, order=order, test=glicemia, price=glicemia.price),
        LabOrderItem.objects.create(tenant=tenant, order=order, test=rpr_vdrl, price=rpr_vdrl.price),
        LabOrderItem.objects.create(tenant=tenant, order=order, test=hemograma, price=hemograma.price),
    ]

    assert {sector["name"] for sector in LabTestPanelSerializer(panel).data["sectors"]} == {
        "Bioquímica",
        "Serologia",
        "Hematologia",
    }
    assert [sector["name"] for sector in LabOrderSerializer(order).data["sectors"]] == [
        "Bioquímica",
        "Serologia",
        "Hematologia",
    ]
    assert LabTestSerializer(glicemia).data["sector_name"] == "Bioquímica"

    item_payload = LabOrderItemSerializer(items[1]).data
    assert item_payload["test_code"] == "RPR"
    assert item_payload["sector"] == serologia.id
    assert item_payload["sector_name"] == "Serologia"
