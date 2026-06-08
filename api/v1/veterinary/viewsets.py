from django.apps import apps as django_apps
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status as http_status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.veterinary.services import VeterinaryWorkflowService
from apps.veterinary.models import (
    VeterinaryAdmission,
    VeterinaryAnimal,
    VeterinaryAppointment,
    VeterinaryLabExam,
    VeterinaryLabRequest,
    VeterinaryLabRequestItem,
    VeterinaryMedicalRecord,
    VeterinaryPrescription,
    VeterinaryPrescriptionItem,
    VeterinaryVaccination,
    VeterinaryVaccine,
)

from .filters import (
    VeterinaryAdmissionFilter,
    VeterinaryAnimalFilter,
    VeterinaryAppointmentFilter,
    VeterinaryLabExamFilter,
    VeterinaryLabRequestFilter,
    VeterinaryLabRequestItemFilter,
    VeterinaryMedicalRecordFilter,
    VeterinaryPrescriptionFilter,
    VeterinaryPrescriptionItemFilter,
    VeterinaryVaccinationFilter,
    VeterinaryVaccineFilter,
)
from .serializers import (
    VeterinaryAdmissionSerializer,
    VeterinaryAnimalSerializer,
    VeterinaryAppointmentSerializer,
    VeterinaryLabExamSerializer,
    VeterinaryLabRequestItemSerializer,
    VeterinaryLabRequestSerializer,
    VeterinaryMedicalRecordSerializer,
    VeterinaryPrescriptionItemSerializer,
    VeterinaryPrescriptionSerializer,
    VeterinaryVaccinationSerializer,
    VeterinaryVaccineSerializer,
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


def _resolve_many(label: str, model_name: str, pks, tenant):
    return [_resolve_instance(label, model_name, pk, tenant) for pk in (pks or []) if pk not in (None, "", 0)]


class VeterinaryAnimalViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryAnimal.objects.all()
    serializer_class = VeterinaryAnimalSerializer
    filterset_class = VeterinaryAnimalFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "breed", "microchip_number", "owner_name", "owner_phone", "owner_email", "notes"]
    ordering_fields = ["name", "species", "breed", "sex", "owner_name", "status", "birth_date", "created_at"]
    ordering = ["name", "owner_name"]

    @action(detail=False, methods=["post"], url_path="cadastrar", url_name="cadastrar")
    def cadastrar(self, request):
        tenant = getattr(request, "tenant", None)
        data = request.data
        if not str(data.get("name", "")).strip() or not str(data.get("owner_name", "")).strip():
            raise DRFValidationError({"name": "Nome do animal e tutor são obrigatórios."})
        extra = {
            key: data[key]
            for key in ("breed", "sex", "birth_date", "color", "microchip_number", "owner_phone", "owner_email", "allergies", "notes")
            if key in data and data[key] not in (None, "")
        }
        try:
            animal = VeterinaryWorkflowService.register_animal(
                tenant=tenant,
                name=data["name"],
                owner_name=data["owner_name"],
                species=data.get("species") or VeterinaryAnimal._meta.get_field("species").default,
                open_record=bool(data.get("open_record", True)),
                **extra,
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(animal).data, status=http_status.HTTP_201_CREATED)


class VeterinaryAppointmentViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryAppointment.objects.select_related("animal", "veterinarian").all()
    serializer_class = VeterinaryAppointmentSerializer
    filterset_class = VeterinaryAppointmentFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "animal__name", "animal__owner_name", "veterinarian__name", "reason", "room", "notes"]
    ordering_fields = ["scheduled_start", "scheduled_end", "status", "animal", "veterinarian", "created_at"]
    ordering = ["-scheduled_start", "-created_at"]

    @action(detail=True, methods=["post"], url_path="confirmar", url_name="confirmar")
    def confirmar(self, request, pk=None):
        appointment = self.get_object()
        try:
            VeterinaryWorkflowService.confirm_appointment(appointment)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(appointment).data)

    @action(detail=True, methods=["post"], url_path="iniciar-atendimento", url_name="iniciar-atendimento")
    def iniciar_atendimento(self, request, pk=None):
        appointment = self.get_object()
        tenant = getattr(request, "tenant", None)
        veterinarian = _resolve_instance("recursos_humanos", "Employee", request.data.get("veterinarian"), tenant)
        try:
            record = VeterinaryWorkflowService.start_attendance(
                appointment,
                veterinarian=veterinarian,
                anamnesis=request.data.get("anamnesis", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(
            VeterinaryMedicalRecordSerializer(record, context=self.get_serializer_context()).data,
            status=http_status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="finalizar", url_name="finalizar")
    def finalizar(self, request, pk=None):
        appointment = self.get_object()
        try:
            VeterinaryWorkflowService.finalize_appointment(appointment)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(appointment).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        appointment = self.get_object()
        try:
            VeterinaryWorkflowService.cancel_appointment(appointment, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(appointment).data)

    @action(detail=True, methods=["post"], url_path="faltou", url_name="faltou")
    def faltou(self, request, pk=None):
        appointment = self.get_object()
        try:
            VeterinaryWorkflowService.mark_no_show(appointment)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(appointment).data)


class VeterinaryMedicalRecordViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryMedicalRecord.objects.select_related("animal", "veterinarian", "appointment").all()
    serializer_class = VeterinaryMedicalRecordSerializer
    filterset_class = VeterinaryMedicalRecordFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "animal__name",
        "animal__owner_name",
        "veterinarian__name",
        "anamnesis",
        "symptoms",
        "diagnosis",
        "treatment_plan",
        "prescription_notes",
    ]
    ordering_fields = ["opened_at", "closed_at", "status", "animal", "veterinarian", "created_at"]
    ordering = ["-opened_at", "-created_at"]


class VeterinaryVaccineViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryVaccine.objects.all()
    serializer_class = VeterinaryVaccineSerializer
    filterset_class = VeterinaryVaccineFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "name", "species", "disease", "manufacturer", "notes"]
    ordering_fields = ["name", "species", "disease", "manufacturer", "active", "created_at"]
    ordering = ["name", "species"]


class VeterinaryVaccinationViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryVaccination.objects.select_related("animal", "vaccine", "veterinarian").all()
    serializer_class = VeterinaryVaccinationSerializer
    filterset_class = VeterinaryVaccinationFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "animal__name", "animal__owner_name", "vaccine__name", "vaccine__disease", "lot_number", "notes"]
    ordering_fields = ["scheduled_for", "administered_at", "next_due_date", "status", "animal", "vaccine", "created_at"]
    ordering = ["-administered_at", "-scheduled_for", "-created_at"]

    @action(detail=False, methods=["post"], url_path="registar", url_name="registar")
    def registar(self, request):
        tenant = getattr(request, "tenant", None)
        animal = _resolve_instance("veterinaria", "VeterinaryAnimal", request.data.get("animal"), tenant)
        vaccine = _resolve_instance("veterinaria", "VeterinaryVaccine", request.data.get("vaccine"), tenant)
        if animal is None or vaccine is None:
            raise DRFValidationError({"animal": "Animal e vacina são obrigatórios."})
        veterinarian = _resolve_instance("recursos_humanos", "Employee", request.data.get("veterinarian"), tenant)
        try:
            vaccination = VeterinaryWorkflowService.register_vaccination(
                animal=animal,
                vaccine=vaccine,
                veterinarian=veterinarian,
                lot_number=request.data.get("lot_number", ""),
                notes=request.data.get("notes", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(vaccination).data, status=http_status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="aplicar", url_name="aplicar")
    def aplicar(self, request, pk=None):
        vaccination = self.get_object()
        try:
            VeterinaryWorkflowService.apply_scheduled_vaccination(
                vaccination, lot_number=request.data.get("lot_number")
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(vaccination).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        vaccination = self.get_object()
        try:
            VeterinaryWorkflowService.cancel_vaccination(vaccination, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(vaccination).data)

    @action(detail=True, methods=["post"], url_path="reacao-adversa", url_name="reacao-adversa")
    def reacao_adversa(self, request, pk=None):
        vaccination = self.get_object()
        try:
            VeterinaryWorkflowService.register_adverse_reaction(
                vaccination, description=request.data.get("description", "")
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(vaccination).data)


class VeterinaryLabExamViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryLabExam.objects.all()
    serializer_class = VeterinaryLabExamSerializer
    filterset_class = VeterinaryLabExamFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "code", "name", "species", "sample_type", "notes"]
    ordering_fields = ["code", "name", "species", "sample_type", "turnaround_hours", "active", "created_at"]
    ordering = ["name", "code"]


class VeterinaryLabRequestViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryLabRequest.objects.select_related(
        "animal",
        "veterinarian",
        "appointment",
        "record",
    ).prefetch_related("items").all()
    serializer_class = VeterinaryLabRequestSerializer
    filterset_class = VeterinaryLabRequestFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "animal__name", "animal__owner_name", "veterinarian__name", "clinical_notes", "notes"]
    ordering_fields = ["requested_at", "priority", "status", "animal", "veterinarian", "created_at"]
    ordering = ["-requested_at", "-created_at"]

    @action(detail=False, methods=["post"], url_path="criar", url_name="criar")
    def criar(self, request):
        tenant = getattr(request, "tenant", None)
        animal = _resolve_instance("veterinaria", "VeterinaryAnimal", request.data.get("animal"), tenant)
        if animal is None:
            raise DRFValidationError({"animal": "Animal é obrigatório."})
        exams = _resolve_many("veterinaria", "VeterinaryLabExam", request.data.get("exams"), tenant)
        veterinarian = _resolve_instance("recursos_humanos", "Employee", request.data.get("veterinarian"), tenant)
        appointment = _resolve_instance("veterinaria", "VeterinaryAppointment", request.data.get("appointment"), tenant)
        record = _resolve_instance("veterinaria", "VeterinaryMedicalRecord", request.data.get("record"), tenant)
        try:
            lab_request = VeterinaryWorkflowService.create_lab_request(
                animal=animal,
                exams=exams,
                veterinarian=veterinarian,
                appointment=appointment,
                record=record,
                priority=request.data.get("priority") or VeterinaryLabRequest.Priority.ROUTINE,
                clinical_notes=request.data.get("clinical_notes", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(lab_request).data, status=http_status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="colher-amostra", url_name="colher-amostra")
    def colher_amostra(self, request, pk=None):
        lab_request = self.get_object()
        try:
            VeterinaryWorkflowService.collect_sample(
                lab_request, sample_identifier=request.data.get("sample_identifier", "")
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(lab_request).data)

    @action(detail=True, methods=["post"], url_path="processar", url_name="processar")
    def processar(self, request, pk=None):
        lab_request = self.get_object()
        try:
            VeterinaryWorkflowService.start_processing(lab_request)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(lab_request).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        lab_request = self.get_object()
        try:
            VeterinaryWorkflowService.cancel_lab_request(lab_request, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(lab_request).data)


class VeterinaryLabRequestItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryLabRequestItem.objects.select_related("request", "request__animal", "exam").all()
    serializer_class = VeterinaryLabRequestItemSerializer
    filterset_class = VeterinaryLabRequestItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = [
        "custom_id",
        "request__custom_id",
        "request__animal__name",
        "exam__name",
        "exam__code",
        "sample_identifier",
        "result_summary",
        "result_value",
    ]
    ordering_fields = ["position", "status", "collected_at", "resulted_at", "request", "exam", "created_at"]
    ordering = ["request", "position", "id"]

    @action(detail=True, methods=["post"], url_path="registrar-resultado", url_name="registrar-resultado")
    def registrar_resultado(self, request, pk=None):
        item = self.get_object()
        try:
            VeterinaryWorkflowService.register_item_result(
                item,
                result_value=request.data.get("result_value", ""),
                result_summary=request.data.get("result_summary", ""),
                reference_range=request.data.get("reference_range", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(item).data)


class VeterinaryAdmissionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryAdmission.objects.select_related("animal", "veterinarian", "appointment").all()
    serializer_class = VeterinaryAdmissionSerializer
    filterset_class = VeterinaryAdmissionFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "animal__name", "animal__owner_name", "veterinarian__name", "ward", "cage", "reason", "diagnosis"]
    ordering_fields = ["admitted_at", "discharged_at", "status", "ward", "cage", "animal", "veterinarian", "created_at"]
    ordering = ["-admitted_at", "-created_at"]

    @action(detail=False, methods=["post"], url_path="internar", url_name="internar")
    def internar(self, request):
        tenant = getattr(request, "tenant", None)
        animal = _resolve_instance("veterinaria", "VeterinaryAnimal", request.data.get("animal"), tenant)
        if animal is None:
            raise DRFValidationError({"animal": "Animal é obrigatório."})
        veterinarian = _resolve_instance("recursos_humanos", "Employee", request.data.get("veterinarian"), tenant)
        appointment = _resolve_instance("veterinaria", "VeterinaryAppointment", request.data.get("appointment"), tenant)
        try:
            admission = VeterinaryWorkflowService.admit_animal(
                animal=animal,
                veterinarian=veterinarian,
                reason=request.data.get("reason", ""),
                appointment=appointment,
                ward=request.data.get("ward", ""),
                cage=request.data.get("cage", ""),
                diagnosis=request.data.get("diagnosis", ""),
                care_plan=request.data.get("care_plan", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(admission).data, status=http_status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="registrar-evolucao", url_name="registrar-evolucao")
    def registrar_evolucao(self, request, pk=None):
        admission = self.get_object()
        try:
            VeterinaryWorkflowService.register_admission_evolution(
                admission,
                text=request.data.get("text", ""),
                author_name=request.data.get("author_name", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(admission).data)

    @action(detail=True, methods=["post"], url_path="alta", url_name="alta")
    def alta(self, request, pk=None):
        admission = self.get_object()
        try:
            VeterinaryWorkflowService.discharge_admission(
                admission,
                condition=request.data.get("condition", ""),
                summary=request.data.get("summary", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(admission).data)

    @action(detail=True, methods=["post"], url_path="transferir", url_name="transferir")
    def transferir(self, request, pk=None):
        admission = self.get_object()
        try:
            VeterinaryWorkflowService.transfer_admission(
                admission,
                destination=request.data.get("destination", ""),
                reason=request.data.get("reason", ""),
            )
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(admission).data)

    @action(detail=True, methods=["post"], url_path="registrar-obito", url_name="registrar-obito")
    def registrar_obito(self, request, pk=None):
        admission = self.get_object()
        try:
            VeterinaryWorkflowService.register_admission_death(admission, notes=request.data.get("notes", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(admission).data)


class VeterinaryPrescriptionViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryPrescription.objects.select_related("animal", "record", "veterinarian").prefetch_related("items").all()
    serializer_class = VeterinaryPrescriptionSerializer
    filterset_class = VeterinaryPrescriptionFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "animal__name", "animal__owner_name", "veterinarian__name", "instructions", "notes"]
    ordering_fields = ["issued_at", "status", "animal", "veterinarian", "created_at"]
    ordering = ["-issued_at", "-created_at"]

    @action(detail=True, methods=["post"], url_path="emitir", url_name="emitir")
    def emitir(self, request, pk=None):
        prescription = self.get_object()
        try:
            VeterinaryWorkflowService.emit_prescription(prescription)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(prescription).data)

    @action(detail=True, methods=["post"], url_path="cancelar", url_name="cancelar")
    def cancelar(self, request, pk=None):
        prescription = self.get_object()
        try:
            VeterinaryWorkflowService.cancel_prescription(prescription, reason=request.data.get("reason", ""))
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(prescription).data)

    @action(detail=True, methods=["post"], url_path="concluir", url_name="concluir")
    def concluir(self, request, pk=None):
        prescription = self.get_object()
        try:
            VeterinaryWorkflowService.complete_prescription(prescription)
        except DjangoValidationError as exc:
            raise _as_drf_error(exc)
        return Response(self.get_serializer(prescription).data)


class VeterinaryPrescriptionItemViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    queryset = VeterinaryPrescriptionItem.objects.select_related("prescription", "prescription__animal", "medication").all()
    serializer_class = VeterinaryPrescriptionItemSerializer
    filterset_class = VeterinaryPrescriptionItemFilter
    permission_classes = [IsAuthenticated]
    search_fields = ["custom_id", "prescription__custom_id", "prescription__animal__name", "medication__name", "medication_name", "dosage"]
    ordering_fields = ["position", "route", "duration_days", "quantity", "prescription", "medication", "created_at"]
    ordering = ["prescription", "position", "id"]


VIEWSET_MAP = {
    "animal": VeterinaryAnimalViewSet,
    "appointment": VeterinaryAppointmentViewSet,
    "record": VeterinaryMedicalRecordViewSet,
    "vaccine": VeterinaryVaccineViewSet,
    "vaccination": VeterinaryVaccinationViewSet,
    "lab_exam": VeterinaryLabExamViewSet,
    "lab_request": VeterinaryLabRequestViewSet,
    "lab_request_item": VeterinaryLabRequestItemViewSet,
    "admission": VeterinaryAdmissionViewSet,
    "prescription": VeterinaryPrescriptionViewSet,
    "prescription_item": VeterinaryPrescriptionItemViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "VeterinaryAdmissionViewSet",
    "VeterinaryAnimalViewSet",
    "VeterinaryAppointmentViewSet",
    "VeterinaryLabExamViewSet",
    "VeterinaryLabRequestItemViewSet",
    "VeterinaryLabRequestViewSet",
    "VeterinaryMedicalRecordViewSet",
    "VeterinaryPrescriptionItemViewSet",
    "VeterinaryPrescriptionViewSet",
    "VeterinaryVaccinationViewSet",
    "VeterinaryVaccineViewSet",
]
