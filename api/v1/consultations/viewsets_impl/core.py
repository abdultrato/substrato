from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from api.utils.async_exports import queue_export_if_requested
from api.v1.clinical.services import build_patient_clinical_history, user_can_view_clinical_history
from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.billing.models.credit_note_request import CreditNoteRequest
from apps.billing.models.invoice import Invoice
from apps.billing.models.invoice_items import InvoiceItem
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.consultations.models.consultation_specialty import ConsultationSpecialty
from apps.consultations.models.holiday import Holiday
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.human_resources.models.employee import Employee
from apps.nursing.models.procedure_item import ProcedureItem
from apps.nursing.models.procedure_material import ProcedureMaterial
from apps.pharmacy.models.sale_item import SaleItem
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema

from ..filters import (
    ConsultationSpecialtyFilter,
    DoctorFilter,
    HolidayFilter,
    MedicalConsultationFilter,
)
from ..serializers import (
    CancelConsultationSerializer,
    ConsultationInvoicePreviewSerializer,
    ConsultationPricePreviewSerializer,
    ConsultationSpecialtySerializer,
    CreateConsultationInvoiceResponseSerializer,
    CreateConsultationInvoiceSerializer,
    DoctorSerializer,
    HolidaySerializer,
    MedicalConsultationSerializer,
    RescheduleConsultationSerializer,
)


class DoctorsViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ReadOnlyModelViewSet):
    queryset = Employee.objects.select_related("role", "profession").all()
    serializer_class = DoctorSerializer
    filterset_class = DoctorFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["name", "profession__name", "role__name"]
    ordering_fields = ["name", "profession__name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        qs = super().get_queryset()
        # Doctors are employees with a role flagged as doctor and active.
        return qs.filter(role__is_doctor=True, status="ATIVO").distinct()


def _specialty_as_drf_error(exc: DjangoValidationError) -> ValidationError:
    detail = getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or [str(exc)]
    return ValidationError(detail)


class TenantScopedModelViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]


class ConsultationSpecialtyViewSet(TenantScopedModelViewSet):
    queryset = ConsultationSpecialty.objects.all()
    serializer_class = ConsultationSpecialtySerializer
    filterset_class = ConsultationSpecialtyFilter
    search_fields = ["custom_id", "name"]
    ordering_fields = ["name", "base_price", "created_at"]
    ordering = ["name"]

    @action(detail=True, methods=["post"], url_path="ativar", url_name="ativar")
    def ativar(self, request, pk=None):
        specialty = self.get_object()
        try:
            specialty.activate()
        except DjangoValidationError as exc:
            raise _specialty_as_drf_error(exc)
        return Response(self.get_serializer(specialty).data)

    @action(detail=True, methods=["post"], url_path="inativar", url_name="inativar")
    def inativar(self, request, pk=None):
        specialty = self.get_object()
        try:
            specialty.deactivate()
        except DjangoValidationError as exc:
            raise _specialty_as_drf_error(exc)
        return Response(self.get_serializer(specialty).data)


class HolidayViewSet(TenantScopedModelViewSet):
    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer
    filterset_class = HolidayFilter
    search_fields = ["custom_id", "description"]
    ordering_fields = ["date", "active", "created_at"]
    ordering = ["-date", "-created_at"]


class MedicalConsultationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MedicalConsultation.objects.select_related("patient", "doctor", "specialty").all()
    serializer_class = MedicalConsultationSerializer
    filterset_class = MedicalConsultationFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "type", "patient__name", "doctor__name"]
    ordering_fields = ["scheduled_for", "created_at", "type", "status", "price"]
    ordering = ["-scheduled_for", "-created_at"]

    @staticmethod
    def _money(value) -> str:
        try:
            return str(Decimal(value or 0).quantize(Decimal("0.01")))
        except Exception:
            return "0.00"

    @staticmethod
    def _decimal(value) -> Decimal:
        try:
            return Decimal(value or 0)
        except Exception:
            return Decimal("0.00")

    def _consultation_entry_window(self, consultation: MedicalConsultation):
        tenant_tz = consultation._tenant_timezone() or timezone.get_current_timezone()
        scheduled_for = consultation.scheduled_for
        if timezone.is_naive(scheduled_for):
            scheduled_for = timezone.make_aware(scheduled_for, tenant_tz)
        local_dt = timezone.localtime(scheduled_for, tenant_tz)
        entry_date = local_dt.date()
        start = timezone.make_aware(datetime.combine(entry_date, time.min), tenant_tz)
        end = start + timedelta(days=1)
        return entry_date, start, end

    def _invoice_candidate_key_from_existing_item(self, item: InvoiceItem) -> str | None:
        if item.item_type == InvoiceItem.TipoItem.CONSULTATION and item.consultation_id:
            return f"consultation:{item.consultation_id}"
        if item.item_type == InvoiceItem.TipoItem.EXAME and item.exam_id:
            return f"exam:{item.exam_id}"
        if item.item_type == InvoiceItem.TipoItem.EXAME_MEDICO and item.medical_exam_id:
            return f"medical_exam:{item.medical_exam_id}"
        if item.item_type == InvoiceItem.TipoItem.ITEM_VENDA and item.sale_item_id:
            return f"sale_item:{item.sale_item_id}"
        if item.item_type == InvoiceItem.TipoItem.PROCEDIMENTO_ITEM and item.procedure_item_id:
            return f"procedure_item:{item.procedure_item_id}"
        if item.item_type == InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL and item.procedure_material_id:
            return f"procedure_material:{item.procedure_material_id}"
        return None

    def _existing_invoice_for_consultation(self, consultation: MedicalConsultation) -> Invoice | None:
        try:
            invoice = getattr(consultation, "invoice", None)
        except Exception:
            return None
        return invoice if getattr(invoice, "pk", None) else None

    def _existing_invoice_candidate_keys(self, invoice: Invoice | None) -> set[str]:
        if not invoice:
            return set()
        keys: set[str] = set()
        for item in invoice.items.filter(deleted=False):
            key = self._invoice_candidate_key_from_existing_item(item)
            if key:
                keys.add(key)
        return keys

    def _reference_invoiced_elsewhere(self, *, field_name: str, reference_id: int | None, invoice: Invoice | None) -> bool:
        if not reference_id:
            return False
        qs = InvoiceItem.objects.filter(deleted=False, **{field_name: reference_id})
        if invoice and invoice.pk:
            qs = qs.exclude(invoice=invoice)
        return qs.exists()

    def _preview_line(
        self,
        *,
        key: str,
        category: str,
        item_type: str,
        source: str,
        source_code: str,
        description: str,
        quantity,
        unit_price,
        vat_percentage=None,
        applies_vat: bool = True,
        selected: bool = True,
        kind: str,
        reference,
    ) -> dict:
        quantity_value = self._decimal(quantity)
        unit_price_value = self._decimal(unit_price)
        vat_percentage_value = self._decimal(vat_percentage)
        subtotal = (quantity_value * unit_price_value).quantize(Decimal("0.01"))
        vat_amount = Decimal("0.00")
        if applies_vat:
            vat_amount = (subtotal * (vat_percentage_value / Decimal("100.00"))).quantize(Decimal("0.01"))
        total = (subtotal + vat_amount).quantize(Decimal("0.01"))

        return {
            "key": key,
            "category": category,
            "item_type": item_type,
            "item_type_label": dict(InvoiceItem.ItemType.choices).get(item_type, item_type),
            "source": source,
            "source_code": source_code or "",
            "description": description or source or key,
            "quantity": self._money(quantity_value),
            "unit_price": self._money(unit_price_value),
            "subtotal": self._money(subtotal),
            "vat_percentage": self._money(vat_percentage_value),
            "vat_amount": self._money(vat_amount),
            "total": self._money(total),
            "selected": selected,
            "_kind": kind,
            "_reference": reference,
        }

    def _public_preview_line(self, line: dict) -> dict:
        return {key: value for key, value in line.items() if not key.startswith("_")}

    def _build_consultation_invoice_candidates(self, consultation: MedicalConsultation) -> tuple[dict, list[dict]]:
        invoice = self._existing_invoice_for_consultation(consultation)
        existing_keys = self._existing_invoice_candidate_keys(invoice)
        entry_date, start, end = self._consultation_entry_window(consultation)
        patient = consultation.patient
        tenant = consultation.tenant
        has_existing_draft_selection = invoice is not None and invoice.status == Invoice.Status.DRAFT and bool(existing_keys)
        default_selected = not has_existing_draft_selection

        candidates: list[dict] = []
        seen_keys: set[str] = set()

        def add(line: dict) -> None:
            key = str(line["key"])
            if key in seen_keys:
                return
            seen_keys.add(key)
            if has_existing_draft_selection:
                line["selected"] = key in existing_keys
            candidates.append(line)

        specialty = getattr(consultation, "specialty", None)
        add(
            self._preview_line(
                key=f"consultation:{consultation.id}",
                category="Consulta",
                item_type=InvoiceItem.TipoItem.CONSULTATION,
                source="Consulta",
                source_code=consultation.custom_id or str(consultation.id),
                description=(consultation.type or "").strip() or "Consulta médica",
                quantity=Decimal("1.00"),
                unit_price=consultation.price or Decimal("0.00"),
                vat_percentage=getattr(specialty, "vat_percentage", None) or Decimal("0.00"),
                applies_vat=True,
                selected=default_selected,
                kind="consultation",
                reference=consultation,
            )
        )

        lab_items = (
            LabRequestItem.objects.filter(
                request__tenant=tenant,
                request__patient=patient,
                request__created_at__gte=start,
                request__created_at__lt=end,
                deleted=False,
                request__deleted=False,
            )
            .select_related("request", "exam", "medical_exam")
            .order_by("request__created_at", "position", "id")
        )
        for item in lab_items:
            if item.exam_id:
                exam = item.exam
                add(
                    self._preview_line(
                        key=f"exam:{exam.id}",
                        category="Exames",
                        item_type=InvoiceItem.TipoItem.EXAME,
                        source="Requisição",
                        source_code=item.request.custom_id or str(item.request_id),
                        description=exam.name,
                        quantity=Decimal("1.00"),
                        unit_price=getattr(exam, "price", Decimal("0.00")) or Decimal("0.00"),
                        vat_percentage=getattr(exam, "vat_percentage", None) or Decimal("0.00"),
                        applies_vat=getattr(exam, "applies_vat_by_default", True),
                        selected=default_selected,
                        kind="exam",
                        reference=exam,
                    )
                )
            elif item.medical_exam_id:
                medical_exam = item.medical_exam
                add(
                    self._preview_line(
                        key=f"medical_exam:{medical_exam.id}",
                        category="Exames",
                        item_type=InvoiceItem.TipoItem.EXAME_MEDICO,
                        source="Requisição",
                        source_code=item.request.custom_id or str(item.request_id),
                        description=medical_exam.name,
                        quantity=Decimal("1.00"),
                        unit_price=getattr(medical_exam, "price", Decimal("0.00")) or Decimal("0.00"),
                        vat_percentage=getattr(medical_exam, "vat_percentage", None) or Decimal("0.00"),
                        applies_vat=getattr(medical_exam, "applies_vat_by_default", True),
                        selected=default_selected,
                        kind="medical_exam",
                        reference=medical_exam,
                    )
                )

        sale_items = (
            SaleItem.objects.filter(
                sale__tenant=tenant,
                sale__patient=patient,
                sale__created_at__gte=start,
                sale__created_at__lt=end,
                deleted=False,
                sale__deleted=False,
            )
            .select_related("sale", "product")
            .order_by("sale__created_at", "position", "id")
        )
        for item in sale_items:
            if self._reference_invoiced_elsewhere(field_name="sale_item_id", reference_id=item.id, invoice=invoice):
                continue
            product = item.product
            add(
                self._preview_line(
                    key=f"sale_item:{item.id}",
                    category="Medicamentos",
                    item_type=InvoiceItem.TipoItem.ITEM_VENDA,
                    source="Venda",
                    source_code=item.sale.number or item.sale.custom_id or str(item.sale_id),
                    description=getattr(product, "name", "") or str(product),
                    quantity=item.quantity,
                    unit_price=item.unit_price or getattr(product, "sale_price", Decimal("0.00")) or Decimal("0.00"),
                    vat_percentage=getattr(product, "vat_percentage", None) or Decimal("0.00"),
                    applies_vat=getattr(product, "applies_vat_by_default", True),
                    selected=default_selected,
                    kind="sale_item",
                    reference=item,
                )
            )

        used_statuses = {
            ProcedureItem.ExecutionStatus.EXECUTED,
            ProcedureItem.ExecutionStatus.COMPLETED,
        }
        procedure_filter = Q(procedure__performed_date__gte=start, procedure__performed_date__lt=end) | Q(
            procedure__created_at__gte=start,
            procedure__created_at__lt=end,
        )
        procedure_items = (
            ProcedureItem.objects.filter(
                procedure_filter,
                procedure__tenant=tenant,
                procedure__patient=patient,
                deleted=False,
                procedure__deleted=False,
                execution_status__in=used_statuses,
            )
            .select_related("procedure", "catalog")
            .order_by("procedure__performed_date", "position", "id")
        )
        for item in procedure_items:
            if (
                item.billed
                and f"procedure_item:{item.id}" not in existing_keys
            ) or self._reference_invoiced_elsewhere(field_name="procedure_item_id", reference_id=item.id, invoice=invoice):
                continue
            if (item.total_linha or Decimal("0.00")) <= Decimal("0.00"):
                continue
            add(
                self._preview_line(
                    key=f"procedure_item:{item.id}",
                    category="Procedimentos",
                    item_type=InvoiceItem.TipoItem.PROCEDIMENTO_ITEM,
                    source="Procedimento",
                    source_code=item.procedure.custom_id or str(item.procedure_id),
                    description=item.description or getattr(item.catalog, "name", "") or "Procedimento de enfermagem",
                    quantity=item.quantity,
                    unit_price=getattr(getattr(item, "value", None), "unit_price", item.unit_price),
                    vat_percentage=getattr(getattr(item, "catalog", None), "vat_percentage", None) or Decimal("16.00"),
                    applies_vat=getattr(getattr(item, "catalog", None), "applies_vat_by_default", True),
                    selected=default_selected,
                    kind="procedure_item",
                    reference=item,
                )
            )

        procedure_materials = (
            ProcedureMaterial.objects.filter(
                procedure_filter,
                procedure__tenant=tenant,
                procedure__patient=patient,
                deleted=False,
                procedure__deleted=False,
            )
            .select_related("procedure", "procedure_item", "product")
            .order_by("procedure__performed_date", "position", "id")
        )
        for material in procedure_materials:
            if self._reference_invoiced_elsewhere(
                field_name="procedure_material_id",
                reference_id=material.id,
                invoice=invoice,
            ):
                continue
            linked_item = getattr(material, "procedure_item", None)
            if linked_item is not None and linked_item.execution_status not in used_statuses:
                continue
            if (material.total_linha or Decimal("0.00")) <= Decimal("0.00"):
                continue
            product = material.product
            add(
                self._preview_line(
                    key=f"procedure_material:{material.id}",
                    category="Procedimentos",
                    item_type=InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL,
                    source="Material",
                    source_code=material.procedure.custom_id or str(material.procedure_id),
                    description=getattr(product, "name", "") or "Material de procedimento",
                    quantity=material.quantity,
                    unit_price=getattr(getattr(material, "value", None), "unit_cost", material.unit_cost),
                    vat_percentage=getattr(product, "vat_percentage", None) or Decimal("0.00"),
                    applies_vat=getattr(product, "applies_vat_by_default", True),
                    selected=default_selected,
                    kind="procedure_material",
                    reference=material,
                )
            )

        payload = self._build_consultation_invoice_preview_payload(
            consultation=consultation,
            entry_date=entry_date,
            candidates=candidates,
        )
        return payload, candidates

    def _build_consultation_invoice_preview_payload(
        self,
        *,
        consultation: MedicalConsultation,
        entry_date,
        candidates: list[dict],
    ) -> dict:
        subtotal = Decimal("0.00")
        vat_amount = Decimal("0.00")
        total = Decimal("0.00")
        for item in candidates:
            if not item.get("selected"):
                continue
            subtotal += self._decimal(item.get("subtotal"))
            vat_amount += self._decimal(item.get("vat_amount"))
            total += self._decimal(item.get("total"))

        return {
            "consultation_id": consultation.id,
            "consultation_code": consultation.custom_id or str(consultation.id),
            "patient_name": getattr(consultation.patient, "name", "") or "",
            "entry_date": entry_date,
            "items": [self._public_preview_line(item) for item in candidates],
            "subtotal": self._money(subtotal),
            "vat_amount": self._money(vat_amount),
            "total": self._money(total),
        }

    def _create_selected_invoice_items(self, *, invoice: Invoice, candidates: list[dict], selected_items: list[str]) -> list[dict]:
        selected_keys = {str(key) for key in selected_items}
        if not selected_keys:
            raise ValidationError({"selected_items": "Selecione pelo menos um item para a fatura."})

        candidate_by_key = {str(item["key"]): item for item in candidates}
        unknown = sorted(selected_keys - set(candidate_by_key))
        if unknown:
            raise ValidationError({"selected_items": f"Itens inválidos para esta entrada: {', '.join(unknown)}"})

        for item in invoice.items.filter(deleted=False):
            item.delete()

        selected_public_items = []
        for candidate in candidates:
            if str(candidate["key"]) not in selected_keys:
                continue
            kind = candidate["_kind"]
            reference = candidate["_reference"]
            if kind == "consultation":
                InvoiceItem.objects.create(
                    tenant=invoice.tenant,
                    invoice=invoice,
                    item_type=InvoiceItem.TipoItem.CONSULTATION,
                    consultation=reference,
                )
            elif kind == "exam":
                InvoiceItem.objects.create(
                    tenant=invoice.tenant,
                    invoice=invoice,
                    item_type=InvoiceItem.TipoItem.EXAME,
                    exam=reference,
                )
            elif kind == "medical_exam":
                InvoiceItem.objects.create(
                    tenant=invoice.tenant,
                    invoice=invoice,
                    item_type=InvoiceItem.TipoItem.EXAME_MEDICO,
                    medical_exam=reference,
                )
            elif kind == "sale_item":
                InvoiceItem.objects.create(
                    tenant=invoice.tenant,
                    invoice=invoice,
                    item_type=InvoiceItem.TipoItem.ITEM_VENDA,
                    sale_item=reference,
                )
            elif kind == "procedure_item":
                InvoiceItem.objects.create(
                    tenant=invoice.tenant,
                    invoice=invoice,
                    item_type=InvoiceItem.TipoItem.PROCEDIMENTO_ITEM,
                    procedure_item=reference,
                )
            elif kind == "procedure_material":
                InvoiceItem.objects.create(
                    tenant=invoice.tenant,
                    invoice=invoice,
                    item_type=InvoiceItem.TipoItem.PROCEDIMENTO_MATERIAL,
                    procedure_material=reference,
                )
            selected_public_items.append(self._public_preview_line(candidate))

        invoice.persist_totals()
        return selected_public_items

    def _issue_original_invoice_for_consultation(self, consultation: MedicalConsultation) -> Invoice:
        """Garante a fatura ORIGINAL (emitida) da consulta com todos os itens do dia.

        Usado quando se conclui a consulta: concluir implica emitir a original.
        - Sem fatura → cria, inclui todos os itens faturáveis do dia e emite.
        - Rascunho sem itens → preenche com todos os itens do dia e emite.
        - Rascunho já com itens → emite tal como está (respeita a seleção feita).
        - Já emitida/paga → mantém (já é a original).
        """
        invoice = self._existing_invoice_for_consultation(consultation)
        if invoice is None:
            invoice = Invoice(
                tenant=consultation.tenant,
                origin=Invoice.Origin.CONSULTATION,
                consultation=consultation,
                patient=consultation.patient,
            )
            invoice.full_clean()
            invoice.save()

        if invoice.status in {Invoice.Status.ISSUED, Invoice.Status.PAID}:
            return invoice
        if invoice.status == Invoice.Status.CANCELED:
            raise ValidationError("A fatura da consulta está cancelada; não é possível emitir a original.")

        if not invoice.items.filter(deleted=False).exists():
            _, candidates = self._build_consultation_invoice_candidates(consultation)
            all_keys = [str(candidate["key"]) for candidate in candidates]
            if invoice.origin != Invoice.Origin.MIXED:
                invoice.origin = Invoice.Origin.MIXED
                invoice.save(update_fields=["origin"])
            self._create_selected_invoice_items(
                invoice=invoice,
                candidates=candidates,
                selected_items=all_keys,
            )

        invoice.issue()
        return invoice

    @action(detail=True, methods=["get"], url_path="clinical-history", url_name="clinical-history")
    def clinical_history(self, request, pk=None):
        """
        Return the aggregated clinical history for the consultation patient.

        This endpoint keeps sensitive clinical aggregation on the backend.
        """
        if not user_can_view_clinical_history(getattr(request, "user", None)):
            raise PermissionDenied("Requer Médico/Medicina Ocupacional/Administrador para ver a história clínica.")

        consultation = self.get_object()
        patient = getattr(consultation, "patient", None)
        if not patient:
            raise ValidationError("Consulta sem paciente associado.")

        return Response(build_patient_clinical_history(request, patient))

    @action(detail=True, methods=["get"], url_path="clinical-history/pdf", url_name="clinical-history-pdf")
    def clinical_history_pdf(self, request, pk=None):
        """
        Return the aggregated clinical history PDF for the consultation patient.
        """
        if not user_can_view_clinical_history(getattr(request, "user", None)):
            raise PermissionDenied("Requer Médico/Medicina Ocupacional/Administrador para emitir a história clínica.")

        consultation = self.get_object()
        patient = getattr(consultation, "patient", None)
        if not patient:
            raise ValidationError("Consulta sem paciente associado.")

        payload = build_patient_clinical_history(request, patient)
        queued = queue_export_if_requested(
            request,
            export_key="patient_history_pdf",
            payload=payload,
            content_disposition="inline",
        )
        if queued is not None:
            return queued

        from tasks.generate_pdf.patient_history_pdf_generator import generate_patient_history_pdf

        pdf_bytes, filename = generate_patient_history_pdf(payload, request=request)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response

    @extend_schema(
        parameters=[
            OpenApiParameter("specialty", OpenApiTypes.INT, OpenApiParameter.QUERY, required=True),
            OpenApiParameter("scheduled_for", OpenApiTypes.DATETIME, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("manual_holiday", OpenApiTypes.BOOL, OpenApiParameter.QUERY, required=False),
        ],
        responses=ConsultationPricePreviewSerializer,
    )
    @action(detail=False, methods=["get"], url_path="price", url_name="price")
    def price_preview(self, request):
        """
        Price preview for a specialty at a given date/time.

        Query params:
        - specialty: id (required)
        - scheduled_for: ISO datetime (optional; default: now)
        - manual_holiday: bool (optional; default: False)
        """
        tenant = getattr(request, "tenant", None)
        if tenant is None:
            raise ValidationError("Tenant não identificado.")

        specialty_id = (request.query_params.get("specialty") or "").strip()
        if not specialty_id:
            raise ValidationError({"specialty": "Informe o id da specialty."})

        specialty = ConsultationSpecialty.objects.filter(tenant=tenant, pk=specialty_id).first()
        if not specialty:
            raise ValidationError({"specialty": "Especialidade não encontrada."})

        raw_dt = (request.query_params.get("scheduled_for") or "").strip()
        dt = parse_datetime(raw_dt) if raw_dt else None
        if raw_dt and not dt:
            # Accept YYYY-MM-DD as a convenience fallback.
            d = parse_date(raw_dt)
            if not d:
                raise ValidationError({"scheduled_for": "Datetime inválido (use ISO 8601)."})
            dt = timezone.make_aware(datetime.combine(d, time.min))

        if not dt:
            dt = timezone.now()

        manual_holiday_raw = request.query_params.get("manual_holiday") or ""
        manual_holiday = manual_holiday_raw.lower() in {"1", "true", "t", "yes"}

        consultation = MedicalConsultation(
            tenant=tenant,
            specialty=specialty,
            scheduled_for=dt,
            type="tmp",
            price=Decimal("0.00"),
            manual_holiday=manual_holiday,
        )

        # Reuse the model pricing rules (holiday + percentage uplift).
        consultation._sync_specialty_and_price(None)

        try:
            currency = getattr(getattr(tenant, "configuracao", None), "currency", "MZN")
        except Exception:
            currency = "MZN"

        payload = {
            "specialty": specialty.id,
            "specialty_name": specialty.name,
            "base_price": str(specialty.base_price or Decimal("0.00")),
            "manual_holiday": bool(manual_holiday),
            "is_holiday": bool(consultation._is_holiday()),
            "schedule_type": consultation.schedule_type,
            "price_multiplier": str(consultation.price_multiplier or Decimal("1.00")),
            "price_final": str(consultation.price or Decimal("0.00")),
            "currency": currency,
        }
        return Response(payload, status=status.HTTP_200_OK)

    @extend_schema(
        parameters=[
            OpenApiParameter("doctor", OpenApiTypes.INT, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("start", OpenApiTypes.DATETIME, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("end", OpenApiTypes.DATETIME, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("status", OpenApiTypes.STR, OpenApiParameter.QUERY, required=False),
        ],
        responses=MedicalConsultationSerializer(many=True),
    )
    @action(detail=False, methods=["get"], url_path="schedule", url_name="schedule")
    def schedule(self, request):
        """
        List consultations by doctor and time range.

        Query params:
        - doctor: user id (optional)
        - start: ISO datetime (optional)
        - end: ISO datetime (optional)
        - status: MARCADA|CONCLUIDA|CANCELADA (optional)
        """

        qs = self.get_queryset()

        doctor_id = (request.query_params.get("doctor") or "").strip()
        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)

        requested_status = (request.query_params.get("status") or "").strip()
        if requested_status:
            qs = qs.filter(status=requested_status)

        start = (request.query_params.get("start") or "").strip()
        if start:
            dt = parse_datetime(start)
            if not dt:
                raise ValidationError({"start": "Datetime inválido (use ISO 8601)."})
            qs = qs.filter(scheduled_for__gte=dt)

        end = (request.query_params.get("end") or "").strip()
        if end:
            dt = parse_datetime(end)
            if not dt:
                raise ValidationError({"end": "Datetime inválido (use ISO 8601)."})
            qs = qs.filter(scheduled_for__lte=dt)

        qs = qs.order_by("scheduled_for", "id")

        page = self.paginate_queryset(qs)
        if page is not None:
            ser = self.get_serializer(page, many=True)
            return self.get_paginated_response(ser.data)

        ser = self.get_serializer(qs, many=True)
        return Response(ser.data, status=status.HTTP_200_OK)

    @extend_schema(
        responses=ConsultationInvoicePreviewSerializer,
    )
    @action(detail=True, methods=["get"], url_path="invoice-preview", url_name="invoice-preview")
    def invoice_preview(self, request, pk=None):
        consultation = self.get_object()
        payload, _ = self._build_consultation_invoice_candidates(consultation)
        return Response(payload, status=status.HTTP_200_OK)

    @extend_schema(
        request=CreateConsultationInvoiceSerializer,
        responses=CreateConsultationInvoiceResponseSerializer,
    )
    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="create-invoice", url_name="create-invoice")
    def create_invoice(self, request, pk=None):
        consultation = self.get_object()

        payload = CreateConsultationInvoiceSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)
        should_issue = payload.validated_data.get("issue", True)
        selected_items = payload.validated_data.get("selected_items", None)

        if hasattr(consultation, "invoice") and getattr(consultation, "invoice", None):
            invoice = consultation.invoice
        else:
            invoice = Invoice(
                tenant=consultation.tenant,
                origin=Invoice.Origin.CONSULTATION,
                consultation=consultation,
                patient=consultation.patient,
            )
            invoice.full_clean()
            invoice.save()

        # Keep the draft invoice aligned with the consultation pricing.
        if invoice.status != Invoice.Status.DRAFT:
            raise ValidationError("A fatura vinculada já foi emitida/paga/cancelada.")

        selected_public_items = None
        if selected_items is None:
            # Compatibilidade com o contrato anterior.
            invoice.sync_items_from_origin()
        else:
            if invoice.origin != Invoice.Origin.MIXED:
                invoice.origin = Invoice.Origin.MIXED
                invoice.save(update_fields=["origin"])
            _, candidates = self._build_consultation_invoice_candidates(consultation)
            selected_public_items = self._create_selected_invoice_items(
                invoice=invoice,
                candidates=candidates,
                selected_items=selected_items,
            )

        if should_issue:
            invoice.issue()

        return Response(
            {
                "consultation_id": consultation.id,
                "invoice_id": invoice.id,
                "invoice_code": invoice.custom_id,
                "invoice_status": invoice.status,
                "total": str(invoice.total or Decimal("0.00")),
                "items": selected_public_items or [],
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=RescheduleConsultationSerializer,
        responses=MedicalConsultationSerializer,
    )
    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="reschedule", url_name="reschedule")
    def reschedule(self, request, pk=None):
        consultation = self.get_object()

        if consultation.status in {MedicalConsultation.Status.CANCELED, MedicalConsultation.Status.COMPLETED}:
            raise ValidationError("Consulta não pode ser remarcada (já finalizada).")

        payload = RescheduleConsultationSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)

        consultation.scheduled_for = payload.validated_data["scheduled_for"]
        consultation.reschedule_count = (consultation.reschedule_count or 0) + 1
        consultation.save(update_fields=["scheduled_for", "reschedule_count"])

        return Response(
            MedicalConsultationSerializer(consultation).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=CancelConsultationSerializer,
        responses=MedicalConsultationSerializer,
    )
    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="cancel", url_name="cancel")
    def cancel(self, request, pk=None):
        consultation = self.get_object()

        if consultation.status == MedicalConsultation.Status.COMPLETED:
            raise ValidationError("Consulta concluída não pode ser cancelada.")

        invoice = self._existing_invoice_for_consultation(consultation)
        if invoice and invoice.status in {Invoice.Status.ISSUED, Invoice.Status.PAID}:
            raise ValidationError(
                "Consulta com fatura original emitida não pode ser cancelada. "
                "Solicite uma nota de crédito."
            )

        # Keep accepting a payload for future extensions (reason, actor, etc).
        payload = CancelConsultationSerializer(data=request.data or {})
        payload.is_valid(raise_exception=True)

        consultation.status = MedicalConsultation.Status.CANCELED
        consultation.canceled_at = timezone.now()
        consultation.save(update_fields=["status", "canceled_at"])

        return Response(
            MedicalConsultationSerializer(consultation).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=None,
        responses=MedicalConsultationSerializer,
    )
    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="complete", url_name="complete")
    def complete(self, request, pk=None):
        consultation = self.get_object()

        if consultation.status == MedicalConsultation.Status.CANCELED:
            raise ValidationError("Consulta cancelada não pode ser concluída.")

        consultation.status = MedicalConsultation.Status.COMPLETED
        consultation.completed_at = timezone.now()
        consultation.save(update_fields=["status", "completed_at"])

        # Concluir implica emitir a fatura original (com todos os itens do dia).
        self._issue_original_invoice_for_consultation(consultation)

        return Response(
            MedicalConsultationSerializer(consultation).data,
            status=status.HTTP_200_OK,
        )

    @extend_schema(
        request=None,
        responses=None,
    )
    @transaction.atomic
    @action(detail=True, methods=["post"], url_path="request-credit-note", url_name="request-credit-note")
    def request_credit_note(self, request, pk=None):
        """Solicita uma nota de crédito para a fatura original da consulta.

        Disponível após a emissão da fatura original (manual ou via conclusão).
        Cria um pedido na fila da Contabilidade, que aprova ou rejeita.
        """
        consultation = self.get_object()
        invoice = self._existing_invoice_for_consultation(consultation)
        if invoice is None or invoice.status not in {Invoice.Status.ISSUED, Invoice.Status.PAID}:
            raise ValidationError(
                "Só é possível solicitar nota de crédito após a emissão da fatura original."
            )

        if CreditNoteRequest.objects.filter(
            invoice=invoice,
            status=CreditNoteRequest.Status.PENDING,
            deleted=False,
        ).exists():
            raise ValidationError("Já existe um pedido de nota de crédito pendente para esta fatura.")

        reason = ""
        if isinstance(request.data, dict):
            reason = (request.data.get("reason") or "").strip()

        credit_note = CreditNoteRequest(
            tenant=consultation.tenant,
            invoice=invoice,
            consultation=consultation,
            patient=consultation.patient,
            reason=reason,
        )
        try:
            credit_note.save()
        except DjangoValidationError as exc:
            raise _specialty_as_drf_error(exc)

        from api.v1.billing.serializers import CreditNoteRequestSerializer

        return Response(
            CreditNoteRequestSerializer(credit_note).data,
            status=status.HTTP_201_CREATED,
        )

VIEWSET_MAP = {
    "consultation": MedicalConsultationViewSet,
    "doctors": DoctorsViewSet,
    "holiday": HolidayViewSet,
    "specialty": ConsultationSpecialtyViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "DoctorsViewSet",
    "MedicalConsultationViewSet",
]
