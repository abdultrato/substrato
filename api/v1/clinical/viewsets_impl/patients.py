from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.patient import Patient
from api.v1.clinical.services import build_patient_clinical_history, user_can_view_clinical_history
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema

from ..filters import PatientFilter
from ..serializers import PatientSerializer


@extend_schema(
    description="Gerenciamento de pacientes",
    tags=["Clínico - Pacientes"],
)
class PatientViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
    """
    ViewSet para gerenciar pacientes.

    Campos principais:
    - name: Nome completo (obrigatório)
    - email: Email único para contato
    - birth_date: Data de nascimento (para cálculo de idade)
    - gender: Gênero (M/F)
    - document_number: Documento de identidade (único)
    - address: Endereço residencial
    - pregnant: Indicador de gestação
    """

    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    filterset_class = PatientFilter
    permission_classes = [IsAuthenticated]
    # Paciente nao possui `description`/`active`/`order`.
    search_fields = [
        "custom_id",
        "name",
        "email",
        "document_number",
        "contact",
        "gender",
        "race_origin",
        "provenance",
        "origin_company__name",
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
        "name",
        "birth_date",
        "gender",
        "race_origin",
        "document_type",
        "document_number",
        "address",
        "contact",
        "email",
        "provenance",
        "pregnant",
        "gestational_age_weeks",
        "origin_company",
        "version",
    ]
    ordering = ["-created_at"]

    @extend_schema(
        description="Listar pacientes com filtros, busca e paginação",
        parameters=[
            OpenApiParameter(
                "search", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Buscar por name, email, género"
            ),
            OpenApiParameter("gender", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Filtrar por gênero"),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        description="Criar novo patient com validação de email e documento únicos",
        request=PatientSerializer,
        responses={201: PatientSerializer},
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        description="Obter detalhes de um patient",
        responses={200: PatientSerializer},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        description="Atualizar patient completamente",
        request=PatientSerializer,
        responses={200: PatientSerializer},
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        description="Atualizar parcialmente um patient",
        request=PatientSerializer,
        responses={200: PatientSerializer},
    )
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    def _user_pode_ver_historia_clinica(self, user) -> bool:
        return user_can_view_clinical_history(user)

    def _montar_historia_clinica(self, request, patient: Patient) -> dict:
        return build_patient_clinical_history(request, patient)

    @extend_schema(operation_id="v1_clinical_patient_clinical_history_by_id")
    @action(detail=True, methods=["get"])
    def historia_clinica(self, request, pk=None):
        if not self._user_pode_ver_historia_clinica(getattr(request, "user", None)):
            raise PermissionDenied("Requer Médico/Medicina Ocupacional/Administrador para ver a história clínica.")

        patient = self.get_object()
        return Response(self._montar_historia_clinica(request, patient))

    @extend_schema(operation_id="v1_clinical_patient_clinical_history_by_document")
    @action(detail=False, methods=["get"], url_path="historia_clinica")
    def historia_clinica_busca(self, request):
        """
        Busca História Clínica por número de documento.
        Ex.: /api/v1/clinical/patient/historia_clinica/?document_number=...
        """
        if not self._user_pode_ver_historia_clinica(getattr(request, "user", None)):
            raise PermissionDenied("Requer Médico/Medicina Ocupacional/Administrador para ver a história clínica.")

        document_number = (request.query_params.get("document_number") or "").strip()
        if not document_number:
            raise ValidationError({"document_number": "Informe o número do documento."})

        tenant = getattr(request, "tenant", None)
        qs = Patient.objects.filter(deleted=False, document_number=document_number)
        if tenant is not None:
            qs = qs.filter(tenant=tenant)

        patient = qs.first()
        if not patient:
            raise NotFound("Paciente não encontrado para este número de documento.")

        return Response(self._montar_historia_clinica(request, patient))

