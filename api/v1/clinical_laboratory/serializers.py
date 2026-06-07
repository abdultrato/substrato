"""Serializers da API do Laboratório Clínico (LIS)."""

from rest_framework import serializers

from apps.clinical_laboratory.models import (
    CriticalResultNotification,
    LabOrder,
    LabOrderItem,
    LabReport,
    LabResult,
    LabSample,
    LabSector,
    LabTest,
    LabTestPanel,
    LabWorklist,
    ResultValidation,
    SampleCollection,
    SampleReception,
    SampleRejection,
)

CORE_READ_ONLY_FIELDS = [
    "id", "custom_id", "tenant", "created_by", "updated_by", "created_at",
    "updated_at", "deleted", "deleted_at", "deleted_by", "version",
]


def _meta(model):
    return type("Meta", (), {
        "model": model,
        "fields": "__all__",
        "read_only_fields": CORE_READ_ONLY_FIELDS,
    })


class LabSectorSerializer(serializers.ModelSerializer):
    Meta = _meta(LabSector)


class LabTestSerializer(serializers.ModelSerializer):
    Meta = _meta(LabTest)


class LabTestPanelSerializer(serializers.ModelSerializer):
    Meta = _meta(LabTestPanel)


class LabOrderSerializer(serializers.ModelSerializer):
    Meta = _meta(LabOrder)


class LabOrderItemSerializer(serializers.ModelSerializer):
    Meta = _meta(LabOrderItem)


class SampleCollectionSerializer(serializers.ModelSerializer):
    Meta = _meta(SampleCollection)


class LabSampleSerializer(serializers.ModelSerializer):
    Meta = _meta(LabSample)


class SampleReceptionSerializer(serializers.ModelSerializer):
    Meta = _meta(SampleReception)


class SampleRejectionSerializer(serializers.ModelSerializer):
    Meta = _meta(SampleRejection)


class LabWorklistSerializer(serializers.ModelSerializer):
    Meta = _meta(LabWorklist)


class LabResultSerializer(serializers.ModelSerializer):
    Meta = _meta(LabResult)


class ResultValidationSerializer(serializers.ModelSerializer):
    Meta = _meta(ResultValidation)


class LabReportSerializer(serializers.ModelSerializer):
    Meta = _meta(LabReport)


class CriticalResultNotificationSerializer(serializers.ModelSerializer):
    Meta = _meta(CriticalResultNotification)
