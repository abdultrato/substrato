from rest_framework import serializers

from apps.bloodbank.models.blood_bank import (
    BloodDonation,
    BloodStockMovement,
    BloodStorage,
    BloodStorageMaintenance,
    BloodTransfusion,
    BloodUnit,
)


class BloodDonationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloodDonation
        fields = "__all__"


class BloodStorageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloodStorage
        fields = "__all__"


class BloodUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloodUnit
        fields = "__all__"


class BloodTransfusionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloodTransfusion
        fields = "__all__"


class BloodStockMovementSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloodStockMovement
        fields = "__all__"


class BloodStorageMaintenanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloodStorageMaintenance
        fields = "__all__"


SERIALIZER_MAP = {
    "doacao": BloodDonationSerializer,
    "armazenamento": BloodStorageSerializer,
    "unidade": BloodUnitSerializer,
    "transfusao": BloodTransfusionSerializer,
    "movimentoestoque": BloodStockMovementSerializer,
    "manutencaoarmazenamento": BloodStorageMaintenanceSerializer,
}

