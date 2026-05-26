from api.core.filters import SafeFilterSet
from apps.bloodbank.models.blood_bank import (
    BloodDonation,
    BloodStockMovement,
    BloodStorage,
    BloodStorageMaintenance,
    BloodTransfusion,
    BloodUnit,
)


class BloodDonationFilter(SafeFilterSet):
    class Meta:
        model = BloodDonation
        fields = "__all__"


class BloodStorageFilter(SafeFilterSet):
    class Meta:
        model = BloodStorage
        fields = "__all__"


class BloodUnitFilter(SafeFilterSet):
    class Meta:
        model = BloodUnit
        fields = "__all__"


class BloodTransfusionFilter(SafeFilterSet):
    class Meta:
        model = BloodTransfusion
        fields = "__all__"


class BloodStockMovementFilter(SafeFilterSet):
    class Meta:
        model = BloodStockMovement
        fields = "__all__"


class BloodStorageMaintenanceFilter(SafeFilterSet):
    class Meta:
        model = BloodStorageMaintenance
        fields = "__all__"


FILTER_MAP = {
    "donation": BloodDonationFilter,
    "storage": BloodStorageFilter,
    "unit": BloodUnitFilter,
    "transfusion": BloodTransfusionFilter,
    "stock_movement": BloodStockMovementFilter,
    "storage_maintenance": BloodStorageMaintenanceFilter,
}

