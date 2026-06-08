from django.apps import apps as django_apps
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status as http_status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.pathology.services import PathologyWorkflowService
from apps.pathology.models import (
    PathologyAccession,
    PathologyArchive,
    PathologyBillingEvent,
    PathologyCytologyCase,
    PathologyDiagnosisReview,
    PathologyEmbedding,
    PathologyGrossExamination,
    PathologyHistologySlide,
    PathologyImmunohistochemistry,
    PathologyInventoryUsage,
    PathologyMicrotomy,
    PathologyMolecularTest,
    PathologyProcessing,
    PathologyQualityControl,
    PathologyReport,
    PathologyRequest,
    PathologySampleReception,
    PathologyStaining,
)

from .filters import (
    PathologyAccessionFilter,
    PathologyArchiveFilter,
    PathologyBillingEventFilter,
    PathologyCytologyCaseFilter,
    PathologyDiagnosisReviewFilter,
    PathologyEmbeddingFilter,
    PathologyGrossExaminationFilter,
    PathologyHistologySlideFilter,
    PathologyImmunohistochemistryFilter,
    PathologyInventoryUsageFilter,
    PathologyMicrotomyFilter,
    PathologyMolecularTestFilter,
    PathologyProcessingFilter,
    PathologyQualityControlFilter,
    PathologyReportFilter,
    PathologyRequestFilter,
    PathologySampleReceptionFilter,
    PathologyStainingFilter,
)
from .serializers import (
    PathologyAccessionSerializer,
    PathologyArchiveSerializer,
    PathologyBillingEventSerializer,
    PathologyCytologyCaseSerializer,
    PathologyDiagnosisReviewSerializer,
    PathologyEmbeddingSerializer,
    PathologyGrossExaminationSerializer,
    PathologyHistologySlideSerializer,
    PathologyImmunohistochemistrySerializer,
    PathologyInventoryUsageSerializer,
    PathologyMicrotomySerializer,
    PathologyMolecularTestSerializer,
    PathologyProcessingSerializer,
    PathologyQualityControlSerializer,
    PathologyReportSerializer,
    PathologyRequestSerializer,
    PathologySampleReceptionSerializer,
    PathologyStainingSerializer,
)


def _as_drf_error(exc: DjangoValidationError) -> DRFValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return DRFValidationError(detail)


def _resolve_instance(label: str, model_name: str, pk, tenant):
    if pk in (None, "", 0):
        return None
    model = django_apps.get_model(label, model_name)
    instance = model.objects.filter(pk=pk).first()
    if instance is None:
        raise DRFValidationError(f"{model_name} {pk} não encontrado.")
    if tenant is not None:
        req_tenant_id = getattr(tenant, "id", None)
        inst_tenant_id = getattr(instance, "tenant_id", None)
        if inst_tenant_id is not None and req_tenant_id is not None and inst_tenant_id != req_tenant_id:
            raise DRFValidationError(f"{model_name} pertence a outro tenant.")
    return instance


def _employee(request):
    return _resolve_instance("recursos_humanos", "Employee", request.data.get("employee"), getattr(request, "tenant", None))


class PathologyModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    ordering_fields = "__all__"
    ordering = ["-created_at"]


class PathologyRequestViewSet(PathologyModelViewSet):
    queryset = PathologyRequest.objects.select_related("patient", "lab_request", "requesting_doctor").all()
    serializer_class = PathologyRequestSerializer
    filterset_class = PathologyRequestFilter
    search_fields = [
        "custom_id",
        "patient__name",
        "requesting_doctor__name",
        "service",
        "clinical_diagnosis",
        "icd_code",
        "anatomical_site",
        "notes",
    ]
    ordering = ["-requested_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.cancel_request(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="rejeitar", url_name="rejeitar")
    def rejeitar(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.cancel_request(obj, reason=request.data.get("reason", ""), label="Rejeição")
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class PathologySampleReceptionViewSet(PathologyModelViewSet):
    queryset = PathologySampleReception.objects.select_related(
        "patient", "request", "lab_request", "surgery", "received_by"
    ).all()
    serializer_class = PathologySampleReceptionSerializer
    filterset_class = PathologySampleReceptionFilter
    search_fields = ["custom_id", "accession_number", "patient__name", "anatomical_site", "clinical_history", "notes"]
    ordering = ["-received_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="aceitar", url_name="aceitar")
    def aceitar(self, request, pk=None):
        sample = self.get_object()
        try:
            PathologyWorkflowService.accept_sample(
                sample, restriction=request.data.get("restriction", ""), received_by=_employee(request)
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(sample).data)

    @action(detail=True, methods=["post"], url_path="rejeitar", url_name="rejeitar")
    def rejeitar(self, request, pk=None):
        sample = self.get_object()
        try:
            PathologyWorkflowService.reject_sample(sample, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(sample).data)

    @action(detail=True, methods=["post"], url_path="acessionar", url_name="acessionar")
    def acessionar(self, request, pk=None):
        sample = self.get_object()
        try:
            accession = PathologyWorkflowService.generate_accession(
                sample,
                accessioned_by=_employee(request),
                sub_sample_code=request.data.get("sub_sample_code", "A"),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            PathologyAccessionSerializer(accession, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )


class PathologyAccessionViewSet(PathologyModelViewSet):
    queryset = PathologyAccession.objects.select_related("sample", "sample__patient", "accessioned_by").all()
    serializer_class = PathologyAccessionSerializer
    filterset_class = PathologyAccessionFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "accession_number",
        "sub_sample_code",
        "barcode_value",
        "notes",
    ]
    ordering = ["-accessioned_at", "accession_number", "sub_sample_code"]


class PathologyGrossExaminationViewSet(PathologyModelViewSet):
    queryset = PathologyGrossExamination.objects.select_related("sample", "sample__patient", "pathologist").all()
    serializer_class = PathologyGrossExaminationSerializer
    filterset_class = PathologyGrossExaminationFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "pathologist__name",
        "gross_description",
        "notes",
    ]
    ordering = ["-performed_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="finalizar", url_name="finalizar")
    def finalizar(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.finalize_gross(obj, gross_description=request.data.get("gross_description"))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class PathologyProcessingViewSet(PathologyModelViewSet):
    queryset = PathologyProcessing.objects.select_related("sample", "sample__patient", "processor").all()
    serializer_class = PathologyProcessingSerializer
    filterset_class = PathologyProcessingFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "batch_number",
        "processor_machine",
        "protocol",
        "notes",
    ]
    ordering = ["-started_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="iniciar", url_name="iniciar")
    def iniciar(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.start_processing(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="concluir", url_name="concluir")
    def concluir(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.complete_processing(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="falhar", url_name="falhar")
    def falhar(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.fail_processing(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class PathologyEmbeddingViewSet(PathologyModelViewSet):
    queryset = PathologyEmbedding.objects.select_related("sample", "sample__patient", "processing", "embedded_by").all()
    serializer_class = PathologyEmbeddingSerializer
    filterset_class = PathologyEmbeddingFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "block_number",
        "cassette_number",
        "paraffin_type",
        "embedding_station",
        "notes",
    ]
    ordering = ["-embedded_at", "block_number"]

    @action(detail=True, methods=["post"], url_path="incluir", url_name="incluir")
    def incluir(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.mark_embedded(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class PathologyMicrotomyViewSet(PathologyModelViewSet):
    queryset = PathologyMicrotomy.objects.select_related(
        "sample", "sample__patient", "embedding", "cut_by", "microtome"
    ).all()
    serializer_class = PathologyMicrotomySerializer
    filterset_class = PathologyMicrotomyFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "embedding__block_number",
        "microtome__name",
        "notes",
    ]
    ordering = ["-cut_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="cortar", url_name="cortar")
    def cortar(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.mark_cut(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="produzir-lamina", url_name="produzir-lamina")
    def produzir_lamina(self, request, pk=None):
        obj = self.get_object()
        try:
            slide = PathologyWorkflowService.produce_slide(
                obj,
                slide_number=request.data.get("slide_number", ""),
                stain=request.data.get("stain", "H&E"),
                prepared_by=_employee(request),
                block_number=request.data.get("block_number", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            PathologyHistologySlideSerializer(slide, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )


class PathologyHistologySlideViewSet(PathologyModelViewSet):
    queryset = PathologyHistologySlide.objects.select_related(
        "sample", "sample__patient", "processing", "microtomy", "prepared_by"
    ).all()
    serializer_class = PathologyHistologySlideSerializer
    filterset_class = PathologyHistologySlideFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "slide_number",
        "block_number",
        "stain",
        "current_location",
        "quality",
        "notes",
    ]
    ordering = ["-prepared_at", "slide_number"]

    @action(detail=True, methods=["post"], url_path="pronta", url_name="pronta")
    def pronta(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.mark_slide_ready(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="perdida", url_name="perdida")
    def perdida(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.mark_slide_lost(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class PathologyStainingViewSet(PathologyModelViewSet):
    queryset = PathologyStaining.objects.select_related(
        "sample", "sample__patient", "slide", "microtomy", "stained_by", "equipment"
    ).all()
    serializer_class = PathologyStainingSerializer
    filterset_class = PathologyStainingFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "slide__slide_number",
        "stain_name",
        "protocol",
        "reagent_lot",
        "notes",
    ]
    ordering = ["-performed_at", "stain_name"]

    @action(detail=True, methods=["post"], url_path="concluir", url_name="concluir")
    def concluir(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.complete_staining(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="repetir", url_name="repetir")
    def repetir(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.repeat_staining(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class PathologyCytologyCaseViewSet(PathologyModelViewSet):
    queryset = PathologyCytologyCase.objects.select_related("sample", "sample__patient", "cytologist").all()
    serializer_class = PathologyCytologyCaseSerializer
    filterset_class = PathologyCytologyCaseFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "specimen_source",
        "interpretation",
        "notes",
    ]
    ordering = ["-created_at"]


class PathologyImmunohistochemistryViewSet(PathologyModelViewSet):
    queryset = PathologyImmunohistochemistry.objects.select_related(
        "sample", "sample__patient", "slide", "interpreted_by", "equipment"
    ).all()
    serializer_class = PathologyImmunohistochemistrySerializer
    filterset_class = PathologyImmunohistochemistryFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "marker",
        "clone",
        "antibody_lot",
        "intensity",
        "notes",
    ]
    ordering = ["-performed_at", "marker"]


class PathologyMolecularTestViewSet(PathologyModelViewSet):
    queryset = PathologyMolecularTest.objects.select_related(
        "sample", "sample__patient", "slide", "requested_by", "performed_by", "equipment"
    ).all()
    serializer_class = PathologyMolecularTestSerializer
    filterset_class = PathologyMolecularTestFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "target",
        "gene_panel",
        "reagent_lot",
        "result",
        "interpretation",
        "notes",
    ]
    ordering = ["-performed_at", "-created_at"]


class PathologyDiagnosisReviewViewSet(PathologyModelViewSet):
    queryset = PathologyDiagnosisReview.objects.select_related(
        "sample", "sample__patient", "report", "pathologist", "reviewer"
    ).all()
    serializer_class = PathologyDiagnosisReviewSerializer
    filterset_class = PathologyDiagnosisReviewFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "report__report_number",
        "diagnosis",
        "staging",
        "margins",
        "histologic_grade",
        "comments",
    ]
    ordering = ["-reviewed_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="finalizar", url_name="finalizar")
    def finalizar(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.finalize_diagnosis(
                obj,
                diagnosis_text=request.data.get("diagnosis"),
                comments=request.data.get("comments"),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class PathologyReportViewSet(PathologyModelViewSet):
    queryset = PathologyReport.objects.select_related("sample", "sample__patient", "pathologist").all()
    serializer_class = PathologyReportSerializer
    filterset_class = PathologyReportFilter
    search_fields = [
        "custom_id",
        "report_number",
        "sample__accession_number",
        "sample__patient__name",
        "diagnosis",
        "conclusion",
        "icd_code",
    ]
    ordering = ["-signed_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="assinar", url_name="assinar")
    def assinar(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.sign_report(
                obj,
                diagnosis=request.data.get("diagnosis"),
                conclusion=request.data.get("conclusion"),
                pathologist=_employee(request),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="liberar", url_name="liberar")
    def liberar(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.release_report(
                obj, generate_base_billing=bool(request.data.get("generate_base_billing", False))
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="retificar", url_name="retificar")
    def retificar(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.amend_report(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class PathologyBillingEventViewSet(PathologyModelViewSet):
    queryset = PathologyBillingEvent.objects.select_related(
        "sample", "sample__patient", "report", "slide", "staining", "immunohistochemistry", "molecular_test", "invoice"
    ).all()
    serializer_class = PathologyBillingEventSerializer
    filterset_class = PathologyBillingEventFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "description",
        "invoice__custom_id",
        "notes",
    ]
    ordering = ["-created_at"]

    @action(detail=True, methods=["post"], url_path="faturar", url_name="faturar")
    def faturar(self, request, pk=None):
        obj = self.get_object()
        invoice = _resolve_instance("faturamento", "Invoice", request.data.get("invoice"), getattr(request, "tenant", None))
        try:
            PathologyWorkflowService.mark_billing_billed(obj, invoice=invoice)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


class PathologyInventoryUsageViewSet(PathologyModelViewSet):
    queryset = PathologyInventoryUsage.objects.select_related(
        "sample", "sample__patient", "processing", "staining", "molecular_test", "product", "consumed_by"
    ).all()
    serializer_class = PathologyInventoryUsageSerializer
    filterset_class = PathologyInventoryUsageFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "product__name",
        "lot_number",
        "notes",
    ]
    ordering = ["-consumed_at", "-created_at"]


class PathologyQualityControlViewSet(PathologyModelViewSet):
    queryset = PathologyQualityControl.objects.select_related(
        "sample", "sample__patient", "slide", "staining", "report", "reviewed_by"
    ).all()
    serializer_class = PathologyQualityControlSerializer
    filterset_class = PathologyQualityControlFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "finding",
        "corrective_action",
        "notes",
    ]
    ordering = ["-reviewed_at", "-created_at"]


class PathologyArchiveViewSet(PathologyModelViewSet):
    queryset = PathologyArchive.objects.select_related("sample", "sample__patient", "report", "responsible").all()
    serializer_class = PathologyArchiveSerializer
    filterset_class = PathologyArchiveFilter
    search_fields = [
        "custom_id",
        "sample__accession_number",
        "sample__patient__name",
        "location",
        "box_number",
        "shelf",
        "notes",
    ]
    ordering = ["-archived_at", "location"]

    @action(detail=True, methods=["post"], url_path="emprestar", url_name="emprestar")
    def emprestar(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.borrow_archive(obj, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="devolver", url_name="devolver")
    def devolver(self, request, pk=None):
        obj = self.get_object()
        try:
            PathologyWorkflowService.return_archive(obj)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(obj).data)


VIEWSET_MAP = {
    "pedidos": PathologyRequestViewSet,
    "recepcao_amostras": PathologySampleReceptionViewSet,
    "acessionamento": PathologyAccessionViewSet,
    "macroscopia": PathologyGrossExaminationViewSet,
    "processamento": PathologyProcessingViewSet,
    "inclusao": PathologyEmbeddingViewSet,
    "microtomia": PathologyMicrotomyViewSet,
    "histologia": PathologyHistologySlideViewSet,
    "coloracoes": PathologyStainingViewSet,
    "citologia": PathologyCytologyCaseViewSet,
    "imunohistoquimica": PathologyImmunohistochemistryViewSet,
    "molecular": PathologyMolecularTestViewSet,
    "diagnosticos": PathologyDiagnosisReviewViewSet,
    "laudos": PathologyReportViewSet,
    "faturacao": PathologyBillingEventViewSet,
    "inventario": PathologyInventoryUsageViewSet,
    "controlo_qualidade": PathologyQualityControlViewSet,
    "arquivamento": PathologyArchiveViewSet,
}
