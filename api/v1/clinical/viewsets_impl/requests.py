from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.utils.async_exports import queue_export_if_requested
from api.v1.clinical.lab_permissions import ensure_laboratory_result_privilege
from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from application.clinical.commands import (
    DisregardEmptyRequestResultsCommand,
    ValidateRequestResultsCommand,
)
from application.clinical.handlers import (
    handle_disregard_empty_request_results,
    handle_validate_request_results,
)
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.result_item import ResultItem
from apps.clinical_laboratory.models import LabOrder, LabOrderItem, LabSample
from apps.notifications.use_cases import send_lab_results_notification
from core.constants.laboratory.clinical_status import clinical_attendance_priority_case
from domain.clinical.result_state import ResultState
from drf_spectacular.utils import extend_schema

from ..filters import LabRequestFilter, LabRequestItemFilter
from ..serializers import (
    LaboratoryResultItemSerializer,
    LabRequestItemSerializer,
    LabRequestSerializer,
)


@extend_schema(
    description="Gerenciamento de requisições de análise",
    tags=["Clínico - Requisições"],
)
class LabRequestViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """Viewset for laboratory and medical requests."""

    queryset = LabRequest.objects.all()
    serializer_class = LabRequestSerializer
    filterset_class = LabRequestFilter
    permission_classes = [IsAuthenticated]
    extra_ordering_fields = ("clinical_attendance_priority",)
    # LabRequest does not expose `name`/`description`/`active`/`order`/`notes`/`status`.
    # Keep search focused on request code, patient, and state.
    search_fields = [
        "custom_id",
        "patient__custom_id",
        "patient__name",
        "patient__document_number",
        "analyst__username",
        "type",
        "status",
        "clinical_status",
        "requires_fasting",
        "fasting_hours",
        "requesting_company__name",
        "external_executing_company__name",
    ]
    ordering_fields = [
        "tenant",
        "custom_id",
        "deleted",
        "deleted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "patient",
        "analyst",
        "type",
        "status",
        "clinical_status",
        "has_critical_result",
        "requires_fasting",
        "fasting_hours",
        "version",
        "clinical_attendance_priority",
    ]
    ordering = ["clinical_attendance_priority", "-created_at", "-id"]

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .select_related(
                "patient",
                "analyst",
                "requesting_company",
                "external_executing_company",
                "requesting_physician",
                "requesting_physician__profession",
                "requesting_physician__role",
                "occupational_profile",
            )
            .prefetch_related(
                "items",
                "items__exam",
                "items__exam__fields",
                "items__medical_exam",
                "items__rejection_reasons",
                "samples",
            )
            .annotate(clinical_attendance_priority=clinical_attendance_priority_case())
        )

    def _execute_command(self, handler, command):
        try:
            return handler(command)
        except DjangoValidationError as err:
            if hasattr(err, "message_dict"):
                raise ValidationError(err.message_dict) from err
            if hasattr(err, "messages"):
                raise ValidationError(err.messages) from err
            raise ValidationError(str(err)) from err
        except Exception as err:
            raise ValidationError(str(err)) from err

    def _sync_lis_order_for_processing(self, request_record):
        """Materializa a requisição clínica no LIS novo ao iniciar processamento."""
        if request_record.type != LabRequest.Type.LABORATORY:
            return None

        order, _ = LabOrder.objects.get_or_create(
            tenant=request_record.tenant,
            diagnosis=f"LEGACY-LABREQUEST-{request_record.id}",
            defaults={
                "patient": request_record.patient,
                "origin": "Requisição clínica",
                "status": LabOrder.Status.IN_PROGRESS,
                "payment_status": LabOrder.PaymentStatus.PAID,
                "clinical_indication": f"Sincronizada da requisição {request_record.custom_id or request_record.id}.",
                "requested_at": request_record.created_at,
            },
        )
        order.patient = request_record.patient
        order.status = LabOrder.Status.IN_PROGRESS
        order.payment_status = LabOrder.PaymentStatus.PAID
        order.save(update_fields=["patient", "status", "payment_status", "updated_at"])

        sample, _ = LabSample.objects.get_or_create(
            tenant=request_record.tenant,
            barcode=f"LR-{request_record.id}",
            defaults={
                "order": order,
                "sample_type": LabSample._meta.get_field("sample_type").default,
                "status": LabSample.Status.RECEIVED,
                "collected_at": request_record.collected_at,
                "received_at": request_record.updated_at,
                "storage_location": "Recepção de amostras",
            },
        )
        sample.order = order
        sample.status = LabSample.Status.RECEIVED
        sample.collected_at = sample.collected_at or request_record.collected_at
        sample.received_at = sample.received_at or request_record.updated_at
        sample.save(update_fields=["order", "status", "collected_at", "received_at", "updated_at"])

        for item in request_record.items.filter(deleted=False, exam__isnull=False).select_related("exam"):
            order_item, _ = LabOrderItem.objects.get_or_create(
                tenant=request_record.tenant,
                order=order,
                test=item.exam,
                defaults={
                    "sample_type": item.exam.sample_type,
                    "price": item.exam.price,
                    "status": LabOrderItem.Status.IN_PROGRESS,
                    "billed": True,
                },
            )
            order_item.sample_type = item.exam.sample_type
            order_item.price = item.exam.price
            order_item.status = LabOrderItem.Status.IN_PROGRESS
            order_item.billed = True
            order_item.save(update_fields=["sample_type", "price", "status", "billed", "updated_at"])
        return order

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        """Cancela a requisição pendente (antes de ir para colheita)."""
        request_record = self.get_object()
        try:
            request_record.cancelar(user=getattr(request, "user", None))
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or getattr(err, "messages", None) or str(err)) from err
        return Response(LabRequestSerializer(request_record, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="validar", url_name="validar")
    def validar(self, request, pk=None):
        """Valida a requisição pendente para seguir para colheita."""
        request_record = self.get_object()
        try:
            request_record.validar(user=getattr(request, "user", None))
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or getattr(err, "messages", None) or str(err)) from err
        return Response(LabRequestSerializer(request_record, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="registar-colheita", url_name="registar-colheita")
    def registar_colheita(self, request, pk=None):
        """Regista a colheita das amostras (enfermagem); segue para o laboratório."""
        request_record = self.get_object()
        try:
            request_record.registar_colheita(user=getattr(request, "user", None))
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or getattr(err, "messages", None) or str(err)) from err
        return Response(LabRequestSerializer(request_record, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="colher-todas-amostras", url_name="colher-todas-amostras")
    def colher_todas_amostras(self, request, pk=None):
        """Regista a colheita de todas as amostras pendentes da requisição (enfermagem)."""
        request_record = self.get_object()
        try:
            request_record.colher_todas_amostras(user=getattr(request, "user", None))
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or getattr(err, "messages", None) or str(err)) from err
        request_record.refresh_from_db()
        return Response(LabRequestSerializer(request_record, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="receber-todas-amostras", url_name="receber-todas-amostras")
    def receber_todas_amostras(self, request, pk=None):
        """Recebe (confere) de uma vez todas as amostras pendentes da requisição."""
        request_record = self.get_object()
        try:
            request_record.receber_todas_amostras(user=getattr(request, "user", None))
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or getattr(err, "messages", None) or str(err)) from err
        request_record.refresh_from_db()
        return Response(LabRequestSerializer(request_record, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="iniciar-processamento", url_name="iniciar-processamento")
    def iniciar_processamento(self, request, pk=None):
        """Laboratório inicia o processamento da requisição colhida."""
        request_record = self.get_object()
        try:
            request_record.iniciar_processamento(user=getattr(request, "user", None))
            self._sync_lis_order_for_processing(request_record)
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or getattr(err, "messages", None) or str(err)) from err
        request_record.refresh_from_db()
        return Response(LabRequestSerializer(request_record, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="repetir-colheita", url_name="repetir-colheita")
    def repetir_colheita(self, request, pk=None):
        """Enfermagem repete a colheita das amostras rejeitadas na receção."""
        request_record = self.get_object()
        try:
            request_record.repetir_colheita(user=getattr(request, "user", None))
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or getattr(err, "messages", None) or str(err)) from err
        return Response(LabRequestSerializer(request_record, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="transferir-analise", url_name="transferir-analise")
    def transferir_analise(self, request, pk=None):
        """Transfere a execução das análises para uma empresa/unidade externa."""
        request_record = self.get_object()
        company_id = (request.data or {}).get("external_executing_company")
        company = None
        if company_id:
            from apps.external_entities.models import Company

            company = Company.objects.filter(pk=company_id).first()
        try:
            request_record.transferir_analise(company, user=getattr(request, "user", None))
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or getattr(err, "messages", None) or str(err)) from err
        return Response(LabRequestSerializer(request_record, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="request-pdf", url_name="request-pdf")
    def request_pdf(self, request, pk=None):
        """PDF institucional da requisição sem resultados — para uso interno e referenciamento externo."""
        request_record = self.get_object()
        from tasks.generate_pdf.request_pdf_generator import generate_request_pdf
        pdf_bytes, filename = generate_request_pdf(request_record)
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp

    @action(detail=True, methods=["get"], url_path="etiqueta", url_name="etiqueta")
    def etiqueta(self, request, pk=None):
        """Etiqueta PDF (60x30 mm) com código de barras para impressora de etiquetas."""
        request_record = self.get_object()

        from tasks.generate_pdf.request_label_pdf_generator import generate_request_label_pdf

        pdf_bytes, filename = generate_request_label_pdf(request_record)
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp

    @action(detail=True, methods=["get"], url_path="results-pdf", url_name="results-pdf")
    def results_pdf(self, request, pk=None):
        """
        Generate the institutional PDF for validated laboratory results.

        Access is still restricted via RBAC to avoid accidental exposure.
        """
        from security.permissions.rbac import GROUPS as RBAC_GROUPS, _normalize

        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            raise PermissionDenied("Autenticação obrigatória.")

        if not getattr(user, "is_superuser", False):
            try:
                raw_groups = list(user.groups.values_list("name", flat=True))
            except Exception:
                raw_groups = []
            user_groups = {_normalize(g) for g in raw_groups if g}
            permitidos = {
                _normalize(RBAC_GROUPS["ADMIN"]),
                _normalize(RBAC_GROUPS["LABORATORIO"]),
            }
            if not (user_groups & permitidos):
                raise PermissionDenied("Requer Técnico de Laboratório ou Administrador para emitir PDF de resultados.")

        request_record = self.get_object()
        # Result PDFs only apply to the laboratory workflow.
        if request_record.type != request_record.Type.LABORATORY:
            raise PermissionDenied("Esta requisição não possui PDF de resultados laboratoriais.")

        from apps.clinical.lab_specialized import request_has_specialized_results

        result = getattr(request_record, "result", None)
        has_generic = bool(result and result.items.filter(status=ResultState.VALIDATED).exists())
        if not has_generic and not request_has_specialized_results(request_record):
            return self._results_pdf_not_ready_response(request_record)

        queued = queue_export_if_requested(
            request,
            export_key="lab_results_pdf",
            payload={"lab_request_id": request_record.id, "apenas_validados": True},
            content_disposition="inline",
        )
        if queued is not None:
            return queued

        from tasks.generate_pdf.result_pdf_generator import generate_results_pdf

        pdf_bytes, filename = generate_results_pdf(request_record, apenas_validados=True)
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'inline; filename="{filename}"'
        return resp

    def _results_pdf_not_ready_response(self, request_record):
        result = getattr(request_record, "result", None)
        items = result.items.all() if result else ResultItem.objects.none()
        summary = {
            "total": items.count(),
            "validated": items.filter(status=ResultState.VALIDATED).count(),
            "pending": items.filter(status=ResultState.PENDING).count(),
            "in_analysis": items.filter(status=ResultState.IN_ANALYSIS).count(),
            "awaiting_validation": items.filter(status=ResultState.AWAITING_VALIDATION).count(),
            "rejected": items.filter(status=ResultState.REJECTED).count(),
            "disregarded": items.filter(status=ResultState.DISREGARDED).count(),
            "disregard_awaiting_validation": items.filter(
                status=ResultState.DISREGARDED,
                disregard_validation_date__isnull=True,
            ).count(),
        }
        return Response(
            {
                "code": "lab_results_pdf_not_ready",
                "status": "not_ready",
                "expected": True,
                "message": "O PDF ainda não pode ser emitido: valide pelo menos um resultado antes de gerar o documento.",
                "message_en": "The PDF is not ready yet: validate at least one result before generating the document.",
                "detail": "A emissão de PDF de resultados laboratoriais exige pelo menos um resultado validado.",
                "action": "Lance e valide pelo menos um item de resultado; depois tente gerar o PDF novamente.",
                "request": {
                    "id": request_record.id,
                    "custom_id": request_record.custom_id,
                    "status": request_record.status,
                    "clinical_status": request_record.clinical_status,
                },
                "summary": summary,
            },
            status=status.HTTP_409_CONFLICT,
        )

    @action(detail=True, methods=["get"], url_path="result-items", url_name="result-items")
    def result_items(self, request, pk=None):
        """
        Return LAB result items with derived fields for inline entry/validation.
        """
        request_record = self.get_object()

        if request_record.type != request_record.Type.LABORATORY:
            raise PermissionDenied("Esta requisição não possui resultados laboratoriais.")

        return self._result_items_response(request_record)

    @action(detail=True, methods=["post"], url_path="disregard-empty-results", url_name="disregard-empty-results")
    def disregard_empty_results(self, request, pk=None):
        """
        Mark empty result fields as disregarded with a required reason.
        """
        ensure_laboratory_result_privilege(getattr(request, "user", None))
        request_record = self.get_object()
        if request_record.type != request_record.Type.LABORATORY:
            raise PermissionDenied("Esta requisição não possui resultados laboratoriais.")

        workflow = self._execute_command(
            handle_disregard_empty_request_results,
            DisregardEmptyRequestResultsCommand(
                lab_request=request_record,
                reason=(request.data or {}).get("reason") or "",
                user=getattr(request, "user", None),
                idempotent=True,
            ),
        )
        request_record.refresh_from_db()
        return self._result_items_response(request_record, workflow=workflow)

    @action(detail=True, methods=["post"], url_path="validate-results", url_name="validate-results")
    def validate_results(self, request, pk=None):
        """
        Validate filled results and validate previously disregarded empty fields.
        """
        ensure_laboratory_result_privilege(getattr(request, "user", None))
        request_record = self.get_object()
        if request_record.type != request_record.Type.LABORATORY:
            raise PermissionDenied("Esta requisição não possui resultados laboratoriais.")

        workflow = self._execute_command(
            handle_validate_request_results,
            ValidateRequestResultsCommand(
                lab_request=request_record,
                user=getattr(request, "user", None),
                idempotent=True,
            ),
        )
        request_record.refresh_from_db()
        return self._result_items_response(request_record, workflow=workflow)

    @action(
        detail=True,
        methods=["post"],
        url_path="send-results-notification",
        url_name="send-results-notification",
    )
    def send_results_notification(self, request, pk=None):
        ensure_laboratory_result_privilege(getattr(request, "user", None))
        request_record = self.get_object()
        if request_record.type != request_record.Type.LABORATORY:
            raise PermissionDenied("Esta requisição não possui resultados laboratoriais.")

        try:
            payload = send_lab_results_notification(
                request_record,
                payload=request.data or {},
            )
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise ValidationError(exc.message_dict) from exc
            raise ValidationError(exc.messages) from exc
        return Response(payload)

    def _result_items_response(self, request_record, workflow: dict | None = None):
        from apps.clinical.models.result import Result
        from apps.clinical.lab_specialized import (
            SPECIALIZED_METHODS,
            resolve_sector_link,
        )

        result, created = Result.objects.get_or_create(
            request=request_record,
            defaults={"tenant": request_record.tenant},
        )

        # Garante que todos os campos de exame têm o seu ResultItem.
        # Necessário quando exames sem campos foram adicionados antes de os
        # campos (LabTestField) serem configurados no catálogo.
        if not created:
            result._create_items()

        qs = result.items.select_related(
            "exam_field",
            "exam_field__test",
            "result",
            "result__request",
            "result__request__patient",
        ).exclude(
            # Exames de método especializado (cultura, baciloscopia, GeneXpert,
            # PCR) não se preenchem aqui — têm a sua própria área dedicada.
            exam_field__test__method__in=SPECIALIZED_METHODS,
        ).order_by(
            "position",
            "exam_field__sequence",
            "exam_field__test__name",
            "exam_field__name",
            "id",
        )

        items = LaboratoryResultItemSerializer(qs, many=True).data

        summary = {
            "total": qs.count(),
            "pending": qs.filter(status=ResultState.PENDING).count(),
            "in_analysis": qs.filter(status=ResultState.IN_ANALYSIS).count(),
            "awaiting_validation": qs.filter(status=ResultState.AWAITING_VALIDATION).count(),
            "validated": qs.filter(status=ResultState.VALIDATED).count(),
            "rejected": qs.filter(status=ResultState.REJECTED).count(),
            "disregarded": qs.filter(status=ResultState.DISREGARDED).count(),
            "disregard_awaiting_validation": qs.filter(
                status=ResultState.DISREGARDED,
                disregard_validation_date__isnull=True,
            ).count(),
        }

        patient = request_record.patient
        try:
            patient_age = patient.idade() or ""
        except Exception:
            patient_age = ""
        patient_gender = getattr(patient, "gender", "") or ""

        request_payload = {
            "id": request_record.id,
            "custom_id": request_record.custom_id,
            "patient": request_record.patient_id,
            "patient_name": patient.name,
            "patient_age": patient_age,
            "patient_gender": patient_gender,
            "status": request_record.status,
            "clinical_status": request_record.clinical_status,
            "clinical_status_display": request_record.get_clinical_status_display(),
            "has_critical_result": request_record.has_critical_result,
        }

        # Exames de método especializado presentes na requisição — encaminham
        # para a sua área dedicada em vez de campos genéricos.
        specialized_items = []
        seen_exams: set[int] = set()
        for item in request_record.items.select_related("exam", "request", "sector_order_item").order_by("position", "id"):
            exam = getattr(item, "exam", None)
            if exam is None or exam.id in seen_exams:
                continue
            link = resolve_sector_link(item)
            if link is None:
                continue
            seen_exams.add(exam.id)
            specialized_items.append({
                "exam_id": exam.id,
                "exam_name": exam.name,
                "method": exam.method,
                "sector": link["sector"],
                "sector_label": link["sector_label"],
                "href": link["href"],
                "status": link["status"],
                "record_id": link["record_id"],
            })

        payload = {
            "request": request_payload,
            "summary": summary,
            "items": items,
            "specialized_items": specialized_items,
        }
        if workflow is not None:
            payload["workflow"] = workflow
        return Response(payload)


@extend_schema(
    description="Gerenciamento de itens de requisição",
    tags=["Clínico - Requisições"],
)
class LabRequestItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """Viewset for request items."""

    @action(detail=True, methods=["post"], url_path="colher-amostra", url_name="colher-amostra")
    def colher_amostra(self, request, pk=None):
        """Enfermagem regista a colheita da amostra de um exame específico."""
        from django.utils import timezone

        item = self.get_object()
        try:
            # Coleta agrupada: uma coleta cobre todos os exames pendentes da
            # requisição que aceitam a mesma amostra principal deste item.
            item.colher_amostra(user=getattr(request, "user", None), cascade_same_sample=True)
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or getattr(err, "messages", None) or str(err)) from err

        # Garante que a requisição-mãe fica marcada como colhida
        parent = item.request
        if parent and not parent.collected_at:
            parent.collected_at = timezone.now()
            parent.collected_by = getattr(request, "user", None)
            parent.save(update_fields=["collected_at", "collected_by", "updated_at"])

        return Response(LabRequestItemSerializer(item, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="receber-amostra", url_name="receber-amostra")
    def receber_amostra(self, request, pk=None):
        """Receção de amostras: marca a amostra do exame como recebida."""
        item = self.get_object()
        try:
            item.receber_amostra(user=getattr(request, "user", None))
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or getattr(err, "messages", None) or str(err)) from err
        return Response(LabRequestItemSerializer(item, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="rejeitar-amostra", url_name="rejeitar-amostra")
    def rejeitar_amostra(self, request, pk=None):
        """Receção de amostras: rejeita a amostra (motivos do catálogo + nota)."""
        from apps.clinical.models.sample_rejection import SampleRejectionReason

        item = self.get_object()
        payload = request.data or {}
        reason_ids = payload.get("rejection_reasons") or payload.get("reasons") or []
        reasons = list(SampleRejectionReason.objects.filter(pk__in=reason_ids))
        try:
            item.rejeitar_amostra(reasons, note=payload.get("note") or payload.get("rejection_note") or "", user=getattr(request, "user", None))
        except DjangoValidationError as err:
            raise ValidationError(getattr(err, "message_dict", None) or getattr(err, "messages", None) or str(err)) from err
        return Response(LabRequestItemSerializer(item, context={"request": request}).data)

    queryset = LabRequestItem.objects.all()
    serializer_class = LabRequestItemSerializer
    filterset_class = LabRequestItemFilter
    permission_classes = [IsAuthenticated]
    # LabRequestItem expõe `position` para ordenar os itens na requisição.
    search_fields = [
        "custom_id",
        "request__custom_id",
        "exam__custom_id",
        "exam__name",
        "medical_exam__custom_id",
        "medical_exam__name",
    ]
    ordering_fields = [
        "tenant",
        "deleted",
        "deleted_at",
        "created_by",
        "updated_by",
        "custom_id",
        "position",
        "created_at",
        "updated_at",
        "request",
        "exam",
        "medical_exam",
        "version",
    ]
    ordering = ["request", "position", "id"]
