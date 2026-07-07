"""ViewSets da API do Laboratório Clínico (LIS).

Seguem o padrão do projeto: ValidatedSearchOrderingMixin + TenantScopedQuerysetMixin
+ ModelViewSet. O isolamento por tenant e o RBAC são aplicados centralmente
(register_routes força RBACPermission).
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from datetime import timedelta
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


def _current_user(request):
    user = getattr(request, "user", None)
    return user if (user is not None and getattr(user, "is_authenticated", False)) else None
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
    LaboratoryQualityControl,
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

from .serializers import (
    LabContainerTypeSerializer,
    QualityDocumentSerializer,
    NonconformitySerializer,
    CorrectiveActionSerializer,
    InternalAuditSerializer,
    AuditFindingSerializer,
    QualityIndicatorSerializer,
    StaffTrainingRecordSerializer,
    TrainingReplicationSerializer,
    TrainingAttachmentSerializer,
    TrainingAttendanceSerializer,
    CompetencyAssessmentSerializer,
    CustomerComplaintSerializer,
    LabRiskAssessmentSerializer,
    ManagementReviewSerializer,
    BiologicalHazardSerializer,
    TransmissionRouteSerializer,
    ExposureIncidentSerializer,
    PPEItemSerializer,
    PPEDistributionSerializer,
    WasteRecordSerializer,
    DecontaminationRecordSerializer,
    SpillResponseRecordSerializer,
    VaccinationRecordSerializer,
    BiosafetyInspectionSerializer,
    AcidFastSmearSerializer,
    AntibioticSusceptibilitySerializer,
    CriticalResultNotificationSerializer,
    MicrobiologyCultureSerializer,
    MicrobiologyIsolateSerializer,
    MolecularResultSerializer,
    LabOrderItemSerializer,
    LabOrderSerializer,
    LabReportSerializer,
    LabResultSerializer,
    LabSampleSerializer,
    LabSectorSerializer,
    LaboratoryQualityControlSerializer,
    LabTestFieldSerializer,
    LabTestPanelSerializer,
    LabTestSerializer,
    LabWorklistSerializer,
    ResultValidationSerializer,
    SampleCollectionSerializer,
    SampleReceptionSerializer,
    SampleRejectionSerializer,
)


class _CatalogActivationMixin:
    """Acções comuns de ativar/inativar para itens de catálogo (`active`)."""

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        obj = self.get_object()
        obj.activate()
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="inativar", url_name="inativar")
    def inativar(self, request, pk=None):
        obj = self.get_object()
        obj.deactivate()
        return Response(self.get_serializer(obj).data)


class LabContainerTypeViewSet(_CatalogActivationMixin, ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabContainerType.objects.all()
    serializer_class = LabContainerTypeSerializer
    filterset_fields = ["active", "cap_color", "conservation_temperature"]
    search_fields = ["custom_id", "code", "name", "additive", "specimen_yields"]
    ordering_fields = ["code", "name", "cap_color", "active", "created_at"]


class LabSectorViewSet(_CatalogActivationMixin, ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabSector.objects.all()
    serializer_class = LabSectorSerializer
    filterset_fields = ["active"]
    search_fields = ["custom_id", "code", "name"]
    ordering_fields = ["code", "name", "active", "created_at"]


class LaboratoryQualityControlViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LaboratoryQualityControl.objects.select_related(
        "test",
        "test_field",
        "result",
        "performed_by",
        "reviewed_by",
        "nonconformity",
    ).all()
    serializer_class = LaboratoryQualityControlSerializer
    filterset_fields = ["test", "test_field", "control_type", "result_mode", "decision", "status", "approved_for_use"]
    search_fields = ["custom_id", "test__name", "test__code", "material_name", "material_lot", "equipment"]
    ordering_fields = ["run_at", "decision", "status", "created_at"]

    @action(detail=False, methods=["get"], url_path="report/pdf", url_name="report-pdf")
    def report_pdf(self, request):
        """PDF institucional do CQ de um exame: Levey-Jennings + tabela por analito."""
        from django.http import HttpResponse
        from django.utils.dateparse import parse_datetime

        test_id = request.query_params.get("test")
        if not test_id:
            raise DRFValidationError({"test": "Parâmetro obrigatório."})

        queryset = self.get_queryset().filter(test_id=test_id).order_by("run_at")

        exact_filters = {
            "material_lot": "Lote",
            "material_name": "Material",
            "control_type": "Tipo de controlo",
            "result_mode": "Modo",
            "equipment": "Equipamento",
            "method": "Método",
        }
        header_filters: dict[str, str] = {}
        for field, label in exact_filters.items():
            value = request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{field: value})
                header_filters[label] = value

        base_queryset = queryset

        run_from = parse_datetime(request.query_params.get("run_from") or "")
        run_to = parse_datetime(request.query_params.get("run_to") or "")
        run_second = parse_datetime(request.query_params.get("run_second") or "")
        if run_second and not (run_from or run_to):
            from datetime import timedelta

            run_from = run_second.replace(microsecond=0)
            run_to = run_from + timedelta(seconds=1)
        if run_from:
            queryset = queryset.filter(run_at__gte=run_from)
        if run_to:
            queryset = queryset.filter(run_at__lte=run_to)
        if run_from or run_to:
            from django.utils import timezone as dj_timezone

            def _fmt_local(value):
                if value is None:
                    return "…"
                if dj_timezone.is_aware(value):
                    value = dj_timezone.localtime(value)
                return value.strftime("%d/%m/%Y %H:%M")

            header_filters["Período"] = f"{_fmt_local(run_from)} — {_fmt_local(run_to)}"

        field_name = (request.query_params.get("field_name") or "").strip()
        records = list(queryset[:1000])
        if field_name:
            records = [r for r in records if (r.test_field.name if r.test_field else "Exame completo") == field_name]

        test = records[0].test if records else LabTest.objects.filter(pk=test_id).first()
        if test is None:
            raise DRFValidationError({"test": "Exame não encontrado."})

        analytes_map: dict[str, dict] = {}
        for record in records:
            name = record.test_field.name if record.test_field else "Exame completo"
            entry = analytes_map.setdefault(name, {
                "name": name,
                "code": record.test_field.code if record.test_field else "",
                "unit": (record.test_field.unit if record.test_field else "") or record.unit or "",
                "records": [],
            })
            entry["records"].append({
                "custom_id": record.custom_id,
                "run_at": record.run_at,
                "expected": record.expected_result,
                "observed": record.observed_result,
                "observed_numeric": record.observed_numeric,
                "deviation": record.deviation,
                "decision_display": record.get_decision_display(),
            })

        # Série mínima para gráfico/tabela: se a janela de execução deixar um
        # analito com menos de 3 registos, completa com os controlos anteriores
        # do mesmo analito (mantendo lote/material/equipamento filtrados).
        MIN_SERIES = 3
        if run_from or run_to:
            included_ids = {r.id for r in records}
            for name, entry in analytes_map.items():
                missing = MIN_SERIES - len(entry["records"])
                if missing <= 0:
                    continue
                earlier_qs = base_queryset.exclude(id__in=included_ids)
                if name == "Exame completo":
                    earlier_qs = earlier_qs.filter(test_field__isnull=True)
                else:
                    earlier_qs = earlier_qs.filter(test_field__name=name)
                first_run = entry["records"][0]["run_at"]
                if first_run:
                    earlier_qs = earlier_qs.filter(run_at__lt=first_run)
                earlier = list(earlier_qs.order_by("-run_at")[:missing])
                if not earlier:
                    continue
                backfill = [{
                    "custom_id": record.custom_id,
                    "run_at": record.run_at,
                    "expected": record.expected_result,
                    "observed": record.observed_result,
                    "observed_numeric": record.observed_numeric,
                    "deviation": record.deviation,
                    "decision_display": record.get_decision_display(),
                } for record in reversed(earlier)]
                entry["records"] = backfill + entry["records"]

        # Série do gráfico Levey-Jennings: igual à da página ("Gerar gráfico LJ"),
        # ou seja, TODOS os controlos do analito neste exame (sem filtros de
        # janela/lote), últimos 12 valores numéricos por ordem de execução.
        for name, entry in analytes_map.items():
            chart_qs = self.get_queryset().filter(test_id=test_id)
            if name == "Exame completo":
                chart_qs = chart_qs.filter(test_field__isnull=True)
            else:
                chart_qs = chart_qs.filter(test_field__name=name)
            chart_records = list(chart_qs.order_by("-run_at")[:200])
            chart_records.reverse()
            values = []
            for record in chart_records:
                raw = record.observed_numeric if record.observed_numeric is not None else record.observed_result
                try:
                    number = float(str(raw).strip().replace(",", "."))
                except (TypeError, ValueError):
                    continue
                values.append(number)
            entry["chart_values"] = values[-12:]

        sections = request.query_params.get("sections") or "all"
        payload = {
            "test": {"code": test.code, "name": test.name, "method": test.method},
            "filters": header_filters,
            "sections": sections if sections in ("all", "grafico", "tabela") else "all",
            "analytes": list(analytes_map.values()),
        }

        from tasks.generate_pdf.lab_qc_report_pdf_generator import generate_lab_qc_report_pdf

        pdf_bytes, filename = generate_lab_qc_report_pdf(payload, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response


class LabTestViewSet(_CatalogActivationMixin, ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabTest.objects.select_related("sector").all()
    serializer_class = LabTestSerializer
    search_fields = ["custom_id", "code", "name", "method", "unit"]
    ordering_fields = ["code", "name", "price", "turnaround_hours", "active", "created_at"]
    filterset_fields = ["sector", "active", "sample_type", "requires_fasting", "requires_consent"]


class LabTestFieldViewSet(_CatalogActivationMixin, ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabTestField.objects.select_related("test").all()
    serializer_class = LabTestFieldSerializer
    # Campos são "segunda camada": o frontend lista-os filtrados pelo exame
    # (`?test=<id>`) dentro do detalhe do exame.
    filterset_fields = ["test", "active"]
    search_fields = ["custom_id", "code", "name", "unit"]
    ordering_fields = ["test", "sequence", "name", "active", "created_at"]


class LabTestPanelViewSet(_CatalogActivationMixin, ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabTestPanel.objects.select_related("sector").prefetch_related("tests__sector").all()
    serializer_class = LabTestPanelSerializer
    filterset_fields = ["sector", "active", "profile_type"]
    search_fields = ["custom_id", "code", "name"]
    ordering_fields = ["code", "name", "package_price", "active", "created_at"]


class LabOrderViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabOrder.objects.select_related(
        "patient",
        "requesting_physician",
    ).prefetch_related("items__test__sector").all()
    serializer_class = LabOrderSerializer
    search_fields = ["custom_id", "origin", "diagnosis", "clinical_indication"]
    ordering_fields = ["requested_at", "status", "priority", "payment_status", "created_at"]

    @action(detail=True, methods=["post"], url_path="autorizar", url_name="autorizar")
    def autorizar(self, request, pk=None):
        order = self.get_object()
        try:
            order.authorize()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        order = self.get_object()
        try:
            order.cancel()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(order).data)


class LabOrderItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabOrderItem.objects.select_related("order", "test", "test__sector").all()
    serializer_class = LabOrderItemSerializer
    # Itens são "segunda camada": o frontend lista-os filtrados pelo pedido
    # (`?order=<id>`) dentro do detalhe da requisição, nunca como lista solta.
    filterset_fields = ["order", "status"]
    search_fields = ["custom_id"]
    ordering_fields = ["status", "price", "created_at"]


class SampleCollectionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SampleCollection.objects.select_related("order", "patient", "collected_by").all()
    serializer_class = SampleCollectionSerializer
    search_fields = ["custom_id", "barcode", "location"]
    ordering_fields = ["status", "collection_at", "created_at"]

    @action(detail=True, methods=["post"], url_path="colher", url_name="colher")
    def colher(self, request, pk=None):
        collection = self.get_object()
        if collection.status not in {SampleCollection.Status.PENDING, SampleCollection.Status.FAILED}:
            raise _as_drf_error(DjangoValidationError("Só é possível registar a colheita de colheitas pendentes ou falhadas."))
        collection.mark_collected(by=_current_user(request))
        return Response(self.get_serializer(collection).data)

    @action(detail=True, methods=["post"], url_path="enviar", url_name="enviar")
    def enviar(self, request, pk=None):
        collection = self.get_object()
        if collection.status != SampleCollection.Status.COLLECTED:
            raise _as_drf_error(DjangoValidationError("Só é possível enviar ao laboratório colheitas no estado 'Colhida'."))
        collection.send_to_lab()
        return Response(self.get_serializer(collection).data)

    @action(detail=True, methods=["post"], url_path="falhar", url_name="falhar")
    def falhar(self, request, pk=None):
        collection = self.get_object()
        if collection.status in {SampleCollection.Status.SENT, SampleCollection.Status.CANCELLED}:
            raise _as_drf_error(DjangoValidationError("Não é possível marcar como falhada uma colheita já enviada ou cancelada."))
        collection.mark_failed()
        return Response(self.get_serializer(collection).data)


class LabSampleViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabSample.objects.select_related("order", "order__patient", "collection").all()
    serializer_class = LabSampleSerializer
    search_fields = ["custom_id", "barcode", "storage_location"]
    ordering_fields = ["status", "received_at", "collected_at", "created_at"]

    @action(detail=True, methods=["post"], url_path="receber", url_name="receber")
    def receber(self, request, pk=None):
        sample = self.get_object()
        try:
            sample.receive()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(sample).data)

    @action(detail=True, methods=["post"], url_path="aceitar", url_name="aceitar")
    def aceitar(self, request, pk=None):
        sample = self.get_object()
        try:
            sample.accept()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(sample).data)

    @action(detail=True, methods=["post"], url_path="rejeitar", url_name="rejeitar")
    def rejeitar(self, request, pk=None):
        sample = self.get_object()
        try:
            sample.reject()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(sample).data)


class SampleReceptionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SampleReception.objects.select_related("sample", "received_by").all()
    serializer_class = SampleReceptionSerializer
    search_fields = ["custom_id", "notes"]
    ordering_fields = ["received_at", "accepted", "created_at"]


class SampleRejectionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SampleRejection.objects.select_related("sample", "rejected_by").all()
    serializer_class = SampleRejectionSerializer
    search_fields = ["custom_id", "details"]
    ordering_fields = ["rejected_at", "reason", "requires_recollection", "created_at"]


class LabWorklistViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabWorklist.objects.select_related("sector", "assigned_to").all()
    serializer_class = LabWorklistSerializer
    search_fields = ["custom_id"]
    ordering_fields = ["work_date", "status", "priority", "created_at"]


class LabResultViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabResult.objects.select_related(
        "order_item__order__patient", "order_item__test", "test_field", "sample", "performed_by"
    ).all()
    serializer_class = LabResultSerializer
    search_fields = ["custom_id", "value", "unit", "method", "equipment"]
    ordering_fields = ["status", "flag", "performed_at", "created_at"]

    @action(detail=True, methods=["post"], url_path="inserir-resultado", url_name="inserir-resultado")
    def inserir_resultado(self, request, pk=None):
        result = self.get_object()
        try:
            result.enter_result(value=request.data.get("value", ""), by=_current_user(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(result).data)

    @action(detail=True, methods=["post"], url_path="validar", url_name="validar")
    def validar(self, request, pk=None):
        result = self.get_object()
        try:
            result.mark_validated()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(result).data)


class ResultValidationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ResultValidation.objects.select_related("result", "validated_by").all()
    serializer_class = ResultValidationSerializer
    # Validação é vinculada ao resultado: o frontend lista-as filtradas por
    # `?result=<id>` no detalhe do resultado e cria-as em contexto, não como
    # recurso solto. Ver FRONTEND_API_EXPOSURE_MATRIX.md / readiness.
    filterset_fields = ["result", "status", "validation_type"]
    search_fields = ["custom_id", "notes"]
    ordering_fields = ["validation_type", "status", "validated_at", "created_at"]

    @action(detail=True, methods=["post"], url_path="aprovar", url_name="aprovar")
    def aprovar(self, request, pk=None):
        validation = self.get_object()
        try:
            validation.approve(by=_current_user(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(validation).data)


class LabReportViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabReport.objects.select_related("order", "patient", "signed_by").all()
    serializer_class = LabReportSerializer
    search_fields = ["custom_id", "report_number"]
    ordering_fields = ["status", "issued_at", "delivered_at", "created_at"]

    @action(detail=True, methods=["post"], url_path="assinar", url_name="assinar")
    def assinar(self, request, pk=None):
        report = self.get_object()
        try:
            report.sign(by=_current_user(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=["post"], url_path="entregar", url_name="entregar")
    def entregar(self, request, pk=None):
        report = self.get_object()
        try:
            report.deliver(channel=request.data.get("channel", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(report).data)


class CriticalResultNotificationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CriticalResultNotification.objects.select_related(
        "result",
        "result__order_item__test",
        "result__test_field",
        "order",
        "patient",
        "notified_by",
    ).all()
    serializer_class = CriticalResultNotificationSerializer
    filterset_fields = ["readback_confirmed", "method", "order"]
    search_fields = ["custom_id", "notified_professional", "notes"]
    ordering_fields = ["notified_at", "readback_confirmed", "method", "created_at"]


class MicrobiologyCultureViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MicrobiologyCulture.objects.select_related(
        "order_item",
        "order_item__order",
        "order_item__order__patient",
        "order_item__test",
        "sample",
        "performed_by",
    ).all()
    serializer_class = MicrobiologyCultureSerializer
    filterset_fields = ["status", "culture_type"]
    search_fields = ["custom_id", "specimen", "notes"]
    ordering_fields = ["status", "culture_type", "read_at", "created_at"]

    def _culture_queue_sample(self, order_item):
        return (
            LabSample.objects.filter(
                order=order_item.order,
                status__in=[
                    LabSample.Status.RECEIVED,
                    LabSample.Status.ACCEPTED,
                    LabSample.Status.IN_PROCESSING,
                ],
            )
            .order_by("-received_at", "-created_at")
            .first()
        )

    def _queue_item_payload(self, *, order_item, sample=None, culture=None):
        order = order_item.order
        patient = getattr(order, "patient", None)
        test = order_item.test
        sample = sample or getattr(culture, "sample", None) or self._culture_queue_sample(order_item)
        return {
            "id": f"culture-{culture.id}" if culture else f"pending-{order_item.id}",
            "kind": "culture" if culture else "pending",
            "culture_id": culture.id if culture else None,
            "culture_custom_id": getattr(culture, "custom_id", "") if culture else "",
            "order_item": order_item.id,
            "order_item_custom_id": order_item.custom_id,
            "order_custom_id": order.custom_id,
            "patient_name": getattr(patient, "name", "") or "",
            "test_name": getattr(test, "name", "") or "",
            "test_code": getattr(test, "code", "") or "",
            "test_method": getattr(test, "method", "") or "",
            "sample": sample.id if sample else None,
            "sample_barcode": getattr(sample, "barcode", "") if sample else "",
            "sample_type": getattr(sample, "sample_type", "") if sample else getattr(order_item, "sample_type", ""),
            "sample_received_at": getattr(sample, "received_at", None) if sample else None,
            "status": getattr(culture, "status", "PENDENTE"),
            "status_display": culture.get_status_display() if culture else "Pendente para cultura",
            "incubation_started_at": getattr(culture, "incubation_started_at", None) if culture else None,
            "incubation_expected_end_at": getattr(culture, "incubation_expected_end_at", None) if culture else None,
        }

    @action(detail=False, methods=["get"], url_path="queue", url_name="queue")
    def queue(self, request):
        tenant = self._get_request_tenant()

        existing = list(
            self.get_queryset()
            .filter(order_item__test__method__icontains="Cultura")
            .exclude(status=MicrobiologyCulture.Status.COMPLETED)
            .order_by("-created_at")[:200]
        )
        existing_order_item_ids = {culture.order_item_id for culture in existing}
        payload = [
            self._queue_item_payload(order_item=culture.order_item, culture=culture)
            for culture in existing
        ]

        pending = (
            LabOrderItem.objects.select_related("order", "order__patient", "test")
            .filter(test__method__icontains="Cultura")
            .exclude(id__in=existing_order_item_ids)
            .filter(order__samples__status__in=[
                LabSample.Status.RECEIVED,
                LabSample.Status.ACCEPTED,
                LabSample.Status.IN_PROCESSING,
            ])
            .distinct()
        )
        if tenant is not None:
            pending = pending.filter(tenant=tenant)
        pending = pending.order_by("-created_at")[:200]

        payload.extend(
            self._queue_item_payload(order_item=item)
            for item in pending
            if self._culture_queue_sample(item) is not None
        )
        return Response(payload)

    @action(detail=True, methods=["post"], url_path="iniciar-incubacao", url_name="iniciar_incubacao")
    def iniciar_incubacao(self, request, pk=None):
        culture = self.get_object()
        hours = float(request.data.get("hours") or request.data.get("duration_hours") or 24)
        if hours <= 0:
            raise DRFValidationError({"hours": "Informe um período de incubação maior que zero."})
        plates = request.data.get("plates", culture.culture_plates or [])
        if not isinstance(plates, list) or not plates:
            raise DRFValidationError({"plates": "Informe pelo menos uma placa/meio de cultura."})

        now = timezone.now()
        expected = now + timedelta(hours=hours)
        accumulated_start = float(culture.incubation_accumulated_hours or 0)
        period = {
            "started_at": now.isoformat(),
            "expected_end_at": expected.isoformat(),
            "duration_hours": hours,
            "accumulated_start_hours": accumulated_start,
            "accumulated_expected_hours": accumulated_start + hours,
            "type": "reincubation" if culture.incubation_periods else "initial",
        }
        culture.culture_plates = plates
        culture.incubation_periods = [*(culture.incubation_periods or []), period]
        culture.incubation_started_at = culture.incubation_started_at or now
        culture.incubation_expected_end_at = expected
        culture.status = MicrobiologyCulture.Status.INCUBATING
        culture.performed_by = culture.performed_by or _current_user(request)
        culture.save(update_fields=[
            "culture_plates",
            "incubation_periods",
            "incubation_started_at",
            "incubation_expected_end_at",
            "status",
            "performed_by",
            "updated_at",
        ])
        return Response(self.get_serializer(culture).data)

    @action(detail=True, methods=["post"], url_path="registrar-observacao", url_name="registrar_observacao")
    def registrar_observacao(self, request, pk=None):
        culture = self.get_object()
        observation = (request.data.get("observation") or "").strip()
        if not observation:
            raise DRFValidationError({"observation": "Descreva o crescimento observado na placa."})
        positive = bool(request.data.get("positive", False))
        now = timezone.now()
        accumulated = float(request.data.get("accumulated_hours") or culture.incubation_accumulated_hours or 0)
        entry = {
            "observed_at": now.isoformat(),
            "accumulated_hours": accumulated,
            "observation": observation,
            "positive": positive,
        }
        culture.growth_observations = [*(culture.growth_observations or []), entry]
        culture.read_at = now
        culture.incubation_accumulated_hours = accumulated
        culture.status = MicrobiologyCulture.Status.POSITIVE if positive else MicrobiologyCulture.Status.NO_GROWTH
        culture.save(update_fields=[
            "growth_observations",
            "read_at",
            "incubation_accumulated_hours",
            "status",
            "updated_at",
        ])
        return Response(self.get_serializer(culture).data)

    @action(detail=True, methods=["post"], url_path="reincubar", url_name="reincubar")
    def reincubar(self, request, pk=None):
        culture = self.get_object()
        hours = float(request.data.get("hours") or request.data.get("duration_hours") or 24)
        if hours <= 0:
            raise DRFValidationError({"hours": "Informe um período de reincubação maior que zero."})
        now = timezone.now()
        accumulated_start = float(culture.incubation_accumulated_hours or 0)
        expected = now + timedelta(hours=hours)
        culture.incubation_periods = [*(culture.incubation_periods or []), {
            "started_at": now.isoformat(),
            "expected_end_at": expected.isoformat(),
            "duration_hours": hours,
            "accumulated_start_hours": accumulated_start,
            "accumulated_expected_hours": accumulated_start + hours,
            "type": "reincubation",
        }]
        culture.incubation_expected_end_at = expected
        culture.status = MicrobiologyCulture.Status.REINCUBATING
        culture.save(update_fields=["incubation_periods", "incubation_expected_end_at", "status", "updated_at"])
        return Response(self.get_serializer(culture).data)

    @action(detail=True, methods=["post"], url_path="finalizar", url_name="finalizar")
    def finalizar(self, request, pk=None):
        culture = self.get_object()
        positive = request.data.get("positive", None)
        if positive is not None:
            culture.status = MicrobiologyCulture.Status.POSITIVE if bool(positive) else MicrobiologyCulture.Status.NEGATIVE
        else:
            culture.status = MicrobiologyCulture.Status.COMPLETED
        culture.read_at = culture.read_at or timezone.now()
        culture.save(update_fields=["status", "read_at", "updated_at"])
        return Response(self.get_serializer(culture).data)

    @action(detail=True, methods=["post"], url_path="salvar-gram", url_name="salvar_gram")
    def salvar_gram(self, request, pk=None):
        culture = self.get_object()
        culture.gram_exam = {
            "performed_at": timezone.now().isoformat(),
            "result": request.data.get("result", ""),
            "morphology": request.data.get("morphology", ""),
            "arrangement": request.data.get("arrangement", ""),
            "notes": request.data.get("notes", ""),
        }
        culture.save(update_fields=["gram_exam", "updated_at"])
        return Response(self.get_serializer(culture).data)

    @action(detail=True, methods=["post"], url_path="salvar-provas-bioquimicas", url_name="salvar_provas_bioquimicas")
    def salvar_provas_bioquimicas(self, request, pk=None):
        culture = self.get_object()
        tests = request.data.get("tests", [])
        if not isinstance(tests, list):
            raise DRFValidationError({"tests": "Envie uma lista de provas bioquímicas."})
        now = timezone.now()
        normalized = []
        for test in tests:
            hours = float(test.get("hours") or test.get("duration_hours") or 0)
            normalized.append({
                "name": test.get("name", ""),
                "started_at": test.get("started_at") or now.isoformat(),
                "expected_end_at": test.get("expected_end_at") or ((now + timedelta(hours=hours)).isoformat() if hours else ""),
                "duration_hours": hours,
                "result": test.get("result", ""),
                "status": test.get("status") or ("EM_INCUBACAO" if hours else "AGUARDA_RESULTADO"),
            })
        culture.biochemical_tests = normalized
        culture.save(update_fields=["biochemical_tests", "updated_at"])
        return Response(self.get_serializer(culture).data)


class MicrobiologyIsolateViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MicrobiologyIsolate.objects.select_related("culture").all()
    serializer_class = MicrobiologyIsolateSerializer
    search_fields = ["custom_id", "organism_name", "gram_stain", "notes"]
    ordering_fields = ["organism_name", "is_significant", "created_at"]


class AntibioticSusceptibilityViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = AntibioticSusceptibility.objects.select_related("isolate").all()
    serializer_class = AntibioticSusceptibilitySerializer
    filterset_fields = ["result", "method", "isolate"]
    search_fields = ["custom_id", "antibiotic", "mic_value"]
    ordering_fields = ["antibiotic", "result", "method", "created_at"]


class MolecularResultViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MolecularResult.objects.select_related("order_item", "sample", "performed_by").all()
    serializer_class = MolecularResultSerializer
    filterset_fields = ["assay", "detection", "rif_resistance"]
    search_fields = ["custom_id", "instrument", "notes"]
    ordering_fields = ["assay", "detection", "performed_at", "created_at"]


class AcidFastSmearViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = AcidFastSmear.objects.select_related("order_item", "sample", "performed_by").all()
    serializer_class = AcidFastSmearSerializer
    filterset_fields = ["stain", "grade"]
    search_fields = ["custom_id", "afb_count", "notes"]
    ordering_fields = ["grade", "stain", "performed_at", "created_at"]


# --- Gestão da Qualidade ---
class QualityDocumentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = QualityDocument.objects.select_related("sector", "owner").all()
    serializer_class = QualityDocumentSerializer
    search_fields = ["custom_id", "code", "title"]
    ordering_fields = ["code", "status", "document_type", "review_date", "created_at"]

    def perform_update(self, serializer):
        serializer.save()
        serializer.instance.increment_version()

    @action(detail=True, methods=["post"], url_path="aprovar", url_name="aprovar")
    def aprovar(self, request, pk=None):
        document = self.get_object()
        try:
            document.approve(by=_current_user(request))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(document).data)


class NonconformityViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = Nonconformity.objects.select_related("sector").all()
    serializer_class = NonconformitySerializer
    search_fields = ["custom_id", "code", "description", "source_ref"]
    ordering_fields = ["detected_at", "severity", "status", "created_at"]

    @action(detail=True, methods=["post"], url_path="encerrar", url_name="encerrar")
    def encerrar(self, request, pk=None):
        nc = self.get_object()
        try:
            nc.close()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(nc).data)


class CorrectiveActionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CorrectiveAction.objects.select_related("nonconformity").all()
    serializer_class = CorrectiveActionSerializer
    search_fields = ["custom_id", "description"]
    ordering_fields = ["due_date", "status", "action_type", "created_at"]

    @action(detail=True, methods=["post"], url_path="concluir", url_name="concluir")
    def concluir(self, request, pk=None):
        capa = self.get_object()
        try:
            capa.complete()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(capa).data)

    @action(detail=True, methods=["post"], url_path="verificar", url_name="verificar")
    def verificar(self, request, pk=None):
        capa = self.get_object()
        effective = request.data.get("effective", True)
        if isinstance(effective, str):
            effective = effective.strip().lower() not in ("false", "0", "nao", "não", "no")
        try:
            capa.verify(effective=bool(effective), notes=request.data.get("notes", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(capa).data)

    @action(detail=True, methods=["post"], url_path="fechar", url_name="fechar")
    def fechar(self, request, pk=None):
        capa = self.get_object()
        try:
            capa.close()
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(capa).data)


class InternalAuditViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = InternalAudit.objects.select_related("auditor").prefetch_related("findings").all()
    serializer_class = InternalAuditSerializer
    filterset_fields = ["status", "auditor"]
    search_fields = ["custom_id", "code", "area"]
    ordering_fields = ["audit_date", "status", "created_at"]


class AuditFindingViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = AuditFinding.objects.select_related("audit", "nonconformity").all()
    serializer_class = AuditFindingSerializer
    filterset_fields = ["audit", "finding_type"]
    search_fields = ["custom_id", "description", "clause"]
    ordering_fields = ["finding_type", "created_at"]


class QualityIndicatorViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = QualityIndicator.objects.select_related("sector").all()
    serializer_class = QualityIndicatorSerializer
    search_fields = ["custom_id", "name"]
    ordering_fields = ["name", "status", "created_at"]


class StaffTrainingRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = StaffTrainingRecord.objects.select_related("staff").prefetch_related("participants").all()
    serializer_class = StaffTrainingRecordSerializer
    search_fields = ["custom_id", "title", "trainer"]
    ordering_fields = ["training_date", "expiry_date", "status", "created_at"]

    @action(detail=True, methods=["post"], url_path="marcar-realizada", url_name="marcar_realizada")
    def marcar_realizada(self, request, pk=None):
        from django.db import transaction
        obj = self.get_object()
        attendances = request.data.get("attendances", [])  # [{participant_id, present}]

        with transaction.atomic():
            obj.status = StaffTrainingRecord.Status.COMPLETED
            obj.save(update_fields=["status", "updated_at"])

            tenant = self._get_request_tenant()
            user = _current_user(request)
            for entry in attendances:
                pid = entry.get("participant_id")
                present = bool(entry.get("present", True))
                if not pid:
                    continue
                defaults = {"present": present}
                if tenant:
                    defaults["tenant"] = tenant
                if user:
                    defaults["created_by"] = user
                    defaults["updated_by"] = user
                TrainingAttendance.objects.update_or_create(
                    training=obj, participant_id=pid,
                    defaults=defaults,
                )

        return Response(self.get_serializer(obj).data)


class TrainingReplicationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TrainingReplication.objects.select_related("original", "replicator").prefetch_related("participants").all()
    serializer_class = TrainingReplicationSerializer
    search_fields = ["custom_id", "original__title"]
    ordering_fields = ["replication_date", "created_at"]
    filterset_fields = ["original"]


class TrainingAttachmentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TrainingAttachment.objects.select_related("training").all()
    serializer_class = TrainingAttachmentSerializer
    filterset_fields = ["training"]
    ordering_fields = ["created_at"]
    parser_classes_override = None  # accept multipart for file uploads

    def get_parsers(self):
        from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
        return [MultiPartParser(), FormParser(), JSONParser()]

    def perform_create(self, serializer):
        file = self.request.FILES.get("file")
        original_name = file.name if file else ""
        tenant = self._get_request_tenant()
        kwargs = {"original_name": original_name}
        if tenant:
            kwargs["tenant"] = tenant
        serializer.save(**kwargs)


class TrainingAttendanceViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TrainingAttendance.objects.select_related("training", "participant").all()
    serializer_class = TrainingAttendanceSerializer
    filterset_fields = ["training", "participant", "present"]
    ordering_fields = ["created_at"]


class CompetencyAssessmentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CompetencyAssessment.objects.select_related("staff", "assessed_by", "related_test").all()
    serializer_class = CompetencyAssessmentSerializer
    filterset_fields = ["status", "staff", "related_test"]
    search_fields = ["custom_id", "area"]
    ordering_fields = ["assessment_date", "expiry_date", "status", "created_at"]


class CustomerComplaintViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = CustomerComplaint.objects.select_related("nonconformity").all()
    serializer_class = CustomerComplaintSerializer
    filterset_fields = ["status"]
    search_fields = ["custom_id", "code", "description", "source"]
    ordering_fields = ["received_at", "status", "created_at"]


class LabRiskAssessmentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = LabRiskAssessment.objects.all()
    serializer_class = LabRiskAssessmentSerializer
    search_fields = ["custom_id", "description", "area"]
    ordering_fields = ["level", "category", "status", "created_at"]


class ManagementReviewViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ManagementReview.objects.all()
    serializer_class = ManagementReviewSerializer
    search_fields = ["custom_id", "title"]
    ordering_fields = ["review_date", "status", "created_at"]


# --- Biossegurança ---
class TransmissionRouteViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TransmissionRoute.objects.all()
    serializer_class = TransmissionRouteSerializer
    search_fields = ["custom_id", "name", "description"]
    ordering_fields = ["name", "active", "created_at"]


class BiologicalHazardViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = BiologicalHazard.objects.prefetch_related("transmission_routes", "required_ppe_items").all()
    serializer_class = BiologicalHazardSerializer
    search_fields = ["custom_id", "name", "hazard_type"]
    ordering_fields = ["name", "risk_group", "containment_level", "active", "created_at"]


class ExposureIncidentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = ExposureIncident.objects.select_related("staff", "nonconformity").all()
    serializer_class = ExposureIncidentSerializer
    search_fields = ["custom_id", "material_involved", "body_site", "activity"]
    ordering_fields = ["incident_at", "status", "exposure_type", "created_at"]


class PPEItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PPEItem.objects.all()
    serializer_class = PPEItemSerializer
    search_fields = ["custom_id", "name", "category"]
    ordering_fields = ["name", "minimum_stock", "current_stock", "active", "created_at"]


class PPEDistributionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = PPEDistribution.objects.select_related("ppe", "staff").all()
    serializer_class = PPEDistributionSerializer
    search_fields = ["custom_id", "department", "purpose"]
    ordering_fields = ["distribution_date", "quantity", "created_at"]


class WasteRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = WasteRecord.objects.all()
    serializer_class = WasteRecordSerializer
    search_fields = ["custom_id", "container_code", "department"]
    ordering_fields = ["generated_at", "waste_type", "status", "created_at"]


class DecontaminationRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = DecontaminationRecord.objects.all()
    serializer_class = DecontaminationRecordSerializer
    search_fields = ["custom_id", "area", "disinfectant", "equipment"]
    ordering_fields = ["performed_at", "created_at"]


class SpillResponseRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = SpillResponseRecord.objects.select_related("exposure_incident").all()
    serializer_class = SpillResponseRecordSerializer
    search_fields = ["custom_id", "location", "material_involved"]
    ordering_fields = ["occurred_at", "spill_type", "created_at"]


class VaccinationRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VaccinationRecord.objects.select_related("staff").all()
    serializer_class = VaccinationRecordSerializer
    search_fields = ["custom_id", "vaccine"]
    ordering_fields = ["vaccination_date", "next_dose_due", "status", "created_at"]


class BiosafetyInspectionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = BiosafetyInspection.objects.select_related("inspector", "nonconformity").all()
    serializer_class = BiosafetyInspectionSerializer
    search_fields = ["custom_id", "area", "findings"]
    ordering_fields = ["inspection_date", "status", "created_at"]


VIEWSET_MAP = {
    "container_type": LabContainerTypeViewSet,
    "sector": LabSectorViewSet,
    "quality_control": LaboratoryQualityControlViewSet,
    "test": LabTestViewSet,
    "test_field": LabTestFieldViewSet,
    "panel": LabTestPanelViewSet,
    "order": LabOrderViewSet,
    "order_item": LabOrderItemViewSet,
    "collection": SampleCollectionViewSet,
    "sample": LabSampleViewSet,
    "reception": SampleReceptionViewSet,
    "rejection": SampleRejectionViewSet,
    "worklist": LabWorklistViewSet,
    "result": LabResultViewSet,
    "validation": ResultValidationViewSet,
    "report": LabReportViewSet,
    "critical_notification": CriticalResultNotificationViewSet,
    "culture": MicrobiologyCultureViewSet,
    "isolate": MicrobiologyIsolateViewSet,
    "antibiogram": AntibioticSusceptibilityViewSet,
    "molecular_result": MolecularResultViewSet,
    "afb_smear": AcidFastSmearViewSet,
    # Gestão da Qualidade
    "quality_document": QualityDocumentViewSet,
    "nonconformity": NonconformityViewSet,
    "corrective_action": CorrectiveActionViewSet,
    "internal_audit": InternalAuditViewSet,
    "audit_finding": AuditFindingViewSet,
    "quality_indicator": QualityIndicatorViewSet,
    "training_record": StaffTrainingRecordViewSet,
    "training_replication": TrainingReplicationViewSet,
    "training_attachment": TrainingAttachmentViewSet,
    "training_attendance": TrainingAttendanceViewSet,
    "competency": CompetencyAssessmentViewSet,
    "complaint": CustomerComplaintViewSet,
    "risk_assessment": LabRiskAssessmentViewSet,
    "management_review": ManagementReviewViewSet,
    # Biossegurança
    "transmission_route": TransmissionRouteViewSet,
    "hazard": BiologicalHazardViewSet,
    "exposure_incident": ExposureIncidentViewSet,
    "ppe": PPEItemViewSet,
    "ppe_distribution": PPEDistributionViewSet,
    "waste": WasteRecordViewSet,
    "decontamination": DecontaminationRecordViewSet,
    "spill": SpillResponseRecordViewSet,
    "vaccination": VaccinationRecordViewSet,
    "biosafety_inspection": BiosafetyInspectionViewSet,
}

__all__ = ["VIEWSET_MAP"]
