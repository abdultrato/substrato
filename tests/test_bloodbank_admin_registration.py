from django.contrib import admin
import pytest

from apps.bloodbank.models import (
    BloodDonation,
    BloodStockMovement,
    BloodStorage,
    BloodStorageMaintenance,
    BloodTransfusion,
    BloodUnit,
)


@pytest.mark.django_db
def test_bloodbank_models_are_registered_in_admin_site():
    registry = admin.site._registry

    assert BloodDonation in registry
    assert BloodStorage in registry
    assert BloodUnit in registry
    assert BloodTransfusion in registry
    assert BloodStockMovement in registry
    assert BloodStorageMaintenance in registry
