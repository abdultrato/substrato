"""Serializers da API do Laboratório Clínico (LIS)."""

from decimal import Decimal

from rest_framework import serializers

from apps.clinical_laboratory.models import (
    AcidFastSmear,
    AntibioticSusceptibility,
    CriticalResultNotification,
    MicrobiologyCulture,
    MicrobiologyIsolate,
    MolecularResult,
    LabContainerType,
    LabOrder,
    LabOrderItem,
    LabReport,
    LabResult,
    LabSample,
    LabSector,
    LabTest,
    LabTestField,
    LabTestPanel,
    LabWorklist,
    ResultValidation,
    SampleCollection,
    SampleReception,
    SampleRejection,
    QualityDocument,
    Nonconformity,
    CorrectiveAction,
    InternalAudit,
    AuditFinding,
    QualityIndicator,
    StaffTrainingRecord,
    TrainingReplication,
    TrainingAttachment,
    TrainingAttendance,
    CompetencyAssessment,
    CustomerComplaint,
    LabRiskAssessment,
    ManagementReview,
    BiologicalHazard,
    TransmissionRoute,
    ExposureIncident,
    PPEItem,
    PPEDistribution,
    WasteRecord,
    DecontaminationRecord,
    SpillResponseRecord,
    VaccinationRecord,
    BiosafetyInspection,
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


def _sector_payload(sector):
    if sector is None:
        return None
    return {
        "id": sector.id,
        "name": sector.name,
        "code": sector.code,
    }


def _distinct_sectors_from_tests(tests):
    sectors = []
    seen = set()
    for test in tests:
        sector = getattr(test, "sector", None)
        if sector is None or sector.id in seen:
            continue
        seen.add(sector.id)
        sectors.append(_sector_payload(sector))
    return sectors


def _related_queryset(obj, related_name, *select_related):
    manager = getattr(obj, related_name)
    if related_name in getattr(obj, "_prefetched_objects_cache", {}):
        return manager.all()
    return manager.select_related(*select_related).all()


class LabSectorSerializer(serializers.ModelSerializer):
    Meta = _meta(LabSector)


class LabContainerTypeSerializer(serializers.ModelSerializer):
    cap_color_display = serializers.CharField(source="get_cap_color_display", read_only=True)
    conservation_temperature_display = serializers.CharField(
        source="get_conservation_temperature_display", read_only=True
    )

    class Meta:
        model = LabContainerType
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + [
            "cap_color_display", "conservation_temperature_display"
        ]


class LabTestSerializer(serializers.ModelSerializer):
    sector_name = serializers.CharField(source="sector.name", read_only=True)
    sector_code = serializers.CharField(source="sector.code", read_only=True)
    container_type_detail = serializers.SerializerMethodField()

    class Meta:
        model = LabTest
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + [
            "sector_name", "sector_code", "container_type_detail"
        ]

    def get_container_type_detail(self, obj):
        ct = obj.container_type
        if ct is None:
            return None
        return {
            "id": ct.id,
            "code": ct.code,
            "name": ct.name,
            "cap_color": ct.cap_color,
            "cap_color_display": ct.get_cap_color_display(),
            "additive": ct.additive,
            "specimen_yields": ct.specimen_yields,
            "volume_ml": str(ct.volume_ml) if ct.volume_ml is not None else None,
            "inversions": ct.inversions,
            "conservation_temperature": ct.conservation_temperature,
            "conservation_temperature_display": ct.get_conservation_temperature_display(),
            "conservation_max_hours": ct.conservation_max_hours,
            "notes": ct.notes,
        }


class LabTestFieldSerializer(serializers.ModelSerializer):
    """Campo/analito de um exame, com os seus limiares de referência/críticos."""

    test_name = serializers.CharField(source="test.name", read_only=True)
    test_code = serializers.CharField(source="test.code", read_only=True)

    class Meta:
        model = LabTestField
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + ["test_name", "test_code"]


class LabTestPanelSerializer(serializers.ModelSerializer):
    """O preço do pacote é derivado: soma dos preços dos exames incluídos.

    Por isso ``package_price`` é só-leitura no formulário; é recalculado a
    cada gravação a partir do M2M ``tests``.
    """

    sectors = serializers.SerializerMethodField()

    class Meta:
        model = LabTestPanel
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + ["package_price", "sectors"]

    def get_sectors(self, obj):
        return _distinct_sectors_from_tests(_related_queryset(obj, "tests", "sector"))

    @staticmethod
    def _sync_package_price(instance):
        total = sum((test.price for test in instance.tests.all()), Decimal("0.00"))
        if instance.package_price != total:
            instance.package_price = total
            instance.save(update_fields=["package_price", "updated_at"])

    def create(self, validated_data):
        instance = super().create(validated_data)
        self._sync_package_price(instance)
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        self._sync_package_price(instance)
        return instance


class LabOrderSerializer(serializers.ModelSerializer):
    sectors = serializers.SerializerMethodField()
    requested_tests = serializers.SerializerMethodField()

    class Meta:
        model = LabOrder
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + ["sectors", "requested_tests"]

    def get_sectors(self, obj):
        tests = [
            item.test
            for item in _related_queryset(obj, "items", "test__sector")
            if getattr(item, "test", None) is not None
        ]
        return _distinct_sectors_from_tests(tests)

    def get_requested_tests(self, obj):
        items = _related_queryset(obj, "items", "test__sector")
        payload = []
        for item in items:
            test = getattr(item, "test", None)
            if test is None:
                continue
            sector = getattr(test, "sector", None)
            payload.append({
                "id": item.id,
                "code": item.custom_id,
                "test_id": test.id,
                "test_name": test.name,
                "test_code": test.code,
                "sector": sector.id if sector is not None else None,
                "sector_name": getattr(sector, "name", None),
                "sector_code": getattr(sector, "code", None),
                "price": item.price,
                "status": item.status,
            })
        return payload


class LabOrderItemSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source="test.name", read_only=True)
    test_code = serializers.CharField(source="test.code", read_only=True)
    sector = serializers.SerializerMethodField()
    sector_name = serializers.CharField(source="test.sector.name", read_only=True)
    sector_code = serializers.CharField(source="test.sector.code", read_only=True)

    class Meta:
        model = LabOrderItem
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + [
            "test_name",
            "test_code",
            "sector",
            "sector_name",
            "sector_code",
        ]

    def get_sector(self, obj):
        sector = getattr(getattr(obj, "test", None), "sector", None)
        return sector.id if sector is not None else None

    @staticmethod
    def _sync_test_defaults(instance):
        test = getattr(instance, "test", None)
        if test is None:
            return

        updates = []
        if instance.price != test.price:
            instance.price = test.price
            updates.append("price")
        if instance.sample_type != test.sample_type:
            instance.sample_type = test.sample_type
            updates.append("sample_type")

        if updates:
            instance.save(update_fields=updates + ["updated_at"])

    def create(self, validated_data):
        instance = super().create(validated_data)
        self._sync_test_defaults(instance)
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        self._sync_test_defaults(instance)
        return instance


class SampleCollectionSerializer(serializers.ModelSerializer):
    order_custom_id = serializers.CharField(source="order.custom_id", read_only=True)
    patient_name = serializers.CharField(source="patient.name", read_only=True)
    patient_gender = serializers.CharField(source="patient.gender", read_only=True)
    patient_age = serializers.SerializerMethodField()
    sample_type_display = serializers.CharField(source="get_sample_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    collected_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SampleCollection
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + [
            "order_custom_id",
            "patient_name",
            "patient_gender",
            "patient_age",
            "sample_type_display",
            "status_display",
            "collected_by_name",
        ]

    def get_patient_age(self, obj):
        patient = getattr(obj, "patient", None)
        if patient is None:
            return ""
        return patient.idade()

    def get_collected_by_name(self, obj):
        user = getattr(obj, "collected_by", None)
        if user is None:
            return ""
        full = (user.get_full_name() or "").strip() if hasattr(user, "get_full_name") else ""
        return full or getattr(user, "username", "") or ""


class LabSampleSerializer(serializers.ModelSerializer):
    order_custom_id = serializers.CharField(source="order.custom_id", read_only=True)
    patient_name = serializers.CharField(source="order.patient.name", read_only=True)
    patient_gender = serializers.CharField(source="order.patient.gender", read_only=True)
    patient_age = serializers.SerializerMethodField()
    sample_type_display = serializers.CharField(source="get_sample_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    condition_display = serializers.CharField(source="get_condition_display", read_only=True)

    class Meta:
        model = LabSample
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + [
            "order_custom_id",
            "patient_name",
            "patient_gender",
            "patient_age",
            "sample_type_display",
            "status_display",
            "condition_display",
        ]

    def get_patient_age(self, obj):
        patient = getattr(getattr(obj, "order", None), "patient", None)
        if patient is None:
            return ""
        return patient.idade()


class SampleReceptionSerializer(serializers.ModelSerializer):
    Meta = _meta(SampleReception)


class SampleRejectionSerializer(serializers.ModelSerializer):
    Meta = _meta(SampleRejection)


class LabWorklistSerializer(serializers.ModelSerializer):
    Meta = _meta(LabWorklist)


class LabResultSerializer(serializers.ModelSerializer):
    order_custom_id = serializers.CharField(source="order_item.order.custom_id", read_only=True)
    patient_name = serializers.CharField(source="order_item.order.patient.name", read_only=True)
    test_name = serializers.CharField(source="order_item.test.name", read_only=True)
    field_name = serializers.CharField(source="test_field.name", read_only=True)
    sample_barcode = serializers.CharField(source="sample.barcode", read_only=True)
    flag_display = serializers.CharField(source="get_flag_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    performed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LabResult
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + [
            "order_custom_id",
            "patient_name",
            "test_name",
            "field_name",
            "sample_barcode",
            "flag_display",
            "status_display",
            "performed_by_name",
        ]

    def get_performed_by_name(self, obj):
        user = getattr(obj, "performed_by", None)
        if user is None:
            return ""
        full = (user.get_full_name() or "").strip() if hasattr(user, "get_full_name") else ""
        return full or getattr(user, "username", "") or ""


class ResultValidationSerializer(serializers.ModelSerializer):
    Meta = _meta(ResultValidation)


class LabReportSerializer(serializers.ModelSerializer):
    Meta = _meta(LabReport)


class CriticalResultNotificationSerializer(serializers.ModelSerializer):
    """Expõe a requisição e o resultado crítico em contexto para a página.

    Cada comunicação crítica carrega a requisição (pedido), o exame/campo, o
    valor e o flag do resultado, de modo a que a página de resultados críticos
    seja autossuficiente.
    """

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    order_code = serializers.CharField(source="order.custom_id", read_only=True)
    result_value = serializers.CharField(source="result.value", read_only=True)
    result_unit = serializers.CharField(source="result.unit", read_only=True)
    result_flag = serializers.CharField(source="result.flag", read_only=True)
    result_flag_display = serializers.CharField(source="result.get_flag_display", read_only=True)
    test_name = serializers.SerializerMethodField()
    field_name = serializers.CharField(source="result.test_field.name", read_only=True)

    class Meta:
        model = CriticalResultNotification
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + [
            "patient_name",
            "order_code",
            "result_value",
            "result_unit",
            "result_flag",
            "result_flag_display",
            "test_name",
            "field_name",
        ]

    def get_test_name(self, obj):
        order_item = getattr(getattr(obj, "result", None), "order_item", None)
        test = getattr(order_item, "test", None)
        return getattr(test, "name", None)


# --- sectores especializados ---
class MicrobiologyCultureSerializer(serializers.ModelSerializer):
    Meta = _meta(MicrobiologyCulture)


class MicrobiologyIsolateSerializer(serializers.ModelSerializer):
    Meta = _meta(MicrobiologyIsolate)


class AntibioticSusceptibilitySerializer(serializers.ModelSerializer):
    Meta = _meta(AntibioticSusceptibility)


class MolecularResultSerializer(serializers.ModelSerializer):
    Meta = _meta(MolecularResult)


class AcidFastSmearSerializer(serializers.ModelSerializer):
    Meta = _meta(AcidFastSmear)


# --- Gestão da Qualidade ---
class QualityDocumentSerializer(serializers.ModelSerializer):
    sector_detail   = serializers.SerializerMethodField(read_only=True)
    owner_detail    = serializers.SerializerMethodField(read_only=True)
    approver_detail = serializers.SerializerMethodField(read_only=True)
    Meta = _meta(QualityDocument)

    def get_sector_detail(self, obj):
        s = obj.sector
        return {"id": s.id, "name": str(s)} if s else None

    def get_owner_detail(self, obj):
        u = obj.owner
        if not u:
            return None
        name = (u.get_full_name() if callable(getattr(u, "get_full_name", None)) else "") or u.username
        return {"id": u.id, "name": name}

    def get_approver_detail(self, obj):
        u = obj.approved_by
        if not u:
            return None
        name = (u.get_full_name() if callable(getattr(u, "get_full_name", None)) else "") or u.username
        return {"id": u.id, "name": name}


class NonconformitySerializer(serializers.ModelSerializer):
    Meta = _meta(Nonconformity)


class CorrectiveActionSerializer(serializers.ModelSerializer):
    Meta = _meta(CorrectiveAction)


class InternalAuditSerializer(serializers.ModelSerializer):
    auditor_display = serializers.SerializerMethodField()
    findings_count = serializers.SerializerMethodField()
    findings_summary = serializers.SerializerMethodField()

    def get_auditor_display(self, obj):
        u = obj.auditor
        if not u:
            return None
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username

    def get_findings_count(self, obj):
        return obj.findings.count()

    def get_findings_summary(self, obj):
        counts = {}
        for f in obj.findings.all():
            counts[f.finding_type] = counts.get(f.finding_type, 0) + 1
        return counts

    Meta = _meta(InternalAudit)


class AuditFindingSerializer(serializers.ModelSerializer):
    Meta = _meta(AuditFinding)


class QualityIndicatorSerializer(serializers.ModelSerializer):
    Meta = _meta(QualityIndicator)


class StaffTrainingRecordSerializer(serializers.ModelSerializer):
    staff_display = serializers.SerializerMethodField()
    participants_display = serializers.SerializerMethodField()

    def get_staff_display(self, obj):
        u = obj.staff
        if not u:
            return None
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username

    def get_participants_display(self, obj):
        out = []
        for u in obj.participants.all():
            full = f"{u.first_name} {u.last_name}".strip()
            out.append({"id": u.id, "label": full or u.username})
        return out

    class Meta:
        model = StaffTrainingRecord
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class TrainingAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None

    class Meta:
        model = TrainingAttachment
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class TrainingAttendanceSerializer(serializers.ModelSerializer):
    participant_display = serializers.SerializerMethodField()

    def get_participant_display(self, obj):
        u = obj.participant
        if not u:
            return None
        full = f"{u.first_name} {u.last_name}".strip()
        return {"id": u.id, "label": full or u.username}

    class Meta:
        model = TrainingAttendance
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class TrainingReplicationSerializer(serializers.ModelSerializer):
    replicator_display = serializers.SerializerMethodField()
    participants_display = serializers.SerializerMethodField()

    def get_replicator_display(self, obj):
        u = obj.replicator
        if not u:
            return None
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username

    def get_participants_display(self, obj):
        out = []
        for u in obj.participants.all():
            full = f"{u.first_name} {u.last_name}".strip()
            out.append({"id": u.id, "label": full or u.username})
        return out

    class Meta:
        model = TrainingReplication
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class CompetencyAssessmentSerializer(serializers.ModelSerializer):
    staff_display = serializers.SerializerMethodField()
    assessed_by_display = serializers.SerializerMethodField()
    related_test_display = serializers.SerializerMethodField()

    def _user_label(self, u):
        if not u:
            return None
        full = f"{u.first_name} {u.last_name}".strip()
        return full or u.username

    def get_staff_display(self, obj):
        return self._user_label(obj.staff)

    def get_assessed_by_display(self, obj):
        return self._user_label(obj.assessed_by)

    def get_related_test_display(self, obj):
        t = obj.related_test
        return t.name if t else None

    Meta = _meta(CompetencyAssessment)


class CustomerComplaintSerializer(serializers.ModelSerializer):
    nonconformity_display = serializers.SerializerMethodField()

    def get_nonconformity_display(self, obj):
        nc = obj.nonconformity
        if not nc:
            return None
        return {"id": nc.id, "label": nc.custom_id or f"NC #{nc.id}"}

    Meta = _meta(CustomerComplaint)


class LabRiskAssessmentSerializer(serializers.ModelSerializer):
    Meta = _meta(LabRiskAssessment)


class ManagementReviewSerializer(serializers.ModelSerializer):
    Meta = _meta(ManagementReview)


class ExposureIncidentSerializer(serializers.ModelSerializer):
    staff_detail = serializers.SerializerMethodField()
    investigator_detail = serializers.SerializerMethodField()

    Meta = _meta(ExposureIncident)

    def get_staff_detail(self, obj):
        u = obj.staff
        if not u:
            return None
        name = (u.get_full_name() or "") or u.username
        return {"id": u.id, "name": name}

    def get_investigator_detail(self, obj):
        u = obj.investigated_by
        if not u:
            return None
        name = (u.get_full_name() or "") or u.username
        return {"id": u.id, "name": name}


class PPEItemSerializer(serializers.ModelSerializer):
    Meta = _meta(PPEItem)


# --- Biossegurança ---
class TransmissionRouteSerializer(serializers.ModelSerializer):
    Meta = _meta(TransmissionRoute)


class BiologicalHazardSerializer(serializers.ModelSerializer):
    transmission_routes = serializers.PrimaryKeyRelatedField(
        many=True, queryset=TransmissionRoute.objects.all(), required=False,
    )
    transmission_routes_detail = TransmissionRouteSerializer(
        source="transmission_routes", many=True, read_only=True,
    )
    required_ppe_items = serializers.PrimaryKeyRelatedField(
        many=True, queryset=PPEItem.objects.all(), required=False,
    )
    required_ppe_items_detail = PPEItemSerializer(
        source="required_ppe_items", many=True, read_only=True,
    )
    containment_level_display = serializers.CharField(
        source="get_containment_level_display", read_only=True,
    )

    class Meta:
        model = BiologicalHazard
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS + [
            "transmission_routes_detail", "required_ppe_items_detail", "containment_level_display",
        ]


class PPEDistributionSerializer(serializers.ModelSerializer):
    Meta = _meta(PPEDistribution)
    ppe_detail = serializers.SerializerMethodField()
    staff_detail = serializers.SerializerMethodField()
    distributed_by_detail = serializers.SerializerMethodField()

    def _user_ref(self, u):
        if not u:
            return None
        name = (u.get_full_name() or "").strip() or u.username
        return {"id": u.id, "name": name}

    def get_ppe_detail(self, obj):
        p = obj.ppe
        if not p:
            return None
        return {"id": p.id, "name": p.name, "category": p.category, "unit": p.unit}

    def get_staff_detail(self, obj):
        return self._user_ref(obj.staff)

    def get_distributed_by_detail(self, obj):
        return self._user_ref(obj.distributed_by)


class WasteRecordSerializer(serializers.ModelSerializer):
    Meta = _meta(WasteRecord)


class DecontaminationRecordSerializer(serializers.ModelSerializer):
    performed_by_detail = serializers.SerializerMethodField()
    verified_by_detail  = serializers.SerializerMethodField()

    Meta = _meta(DecontaminationRecord)

    def _user_ref(self, u):
        if not u:
            return None
        return {"id": u.id, "name": (u.get_full_name() or "") or u.username}

    def get_performed_by_detail(self, obj):
        return self._user_ref(obj.performed_by)

    def get_verified_by_detail(self, obj):
        return self._user_ref(obj.verified_by)


class SpillResponseRecordSerializer(serializers.ModelSerializer):
    Meta = _meta(SpillResponseRecord)


class VaccinationRecordSerializer(serializers.ModelSerializer):
    staff_detail = serializers.SerializerMethodField()

    Meta = _meta(VaccinationRecord)

    def get_staff_detail(self, obj):
        u = obj.staff
        if not u:
            return None
        name = (u.get_full_name() or "") or u.username
        return {"id": u.id, "name": name}


class BiosafetyInspectionSerializer(serializers.ModelSerializer):
    inspector_detail = serializers.SerializerMethodField(read_only=True)
    Meta = _meta(BiosafetyInspection)

    def get_inspector_detail(self, obj):
        u = obj.inspector
        if not u:
            return None
        name = (u.get_full_name() if callable(getattr(u, "get_full_name", None)) else "") or u.username
        return {"id": u.id, "name": name}
