from decimal import Decimal

import pytest

from api.v1.dental.serializers import DentalProcedureSerializer
from apps.dental.models import DentalProcedure
from apps.tenants.models.tenant import Tenant


def _tenant():
    return Tenant.objects.create(
        identifier="tn-dental",
        name="Tenant Dental",
        domain="tn-dental.local",
        active=True,
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
