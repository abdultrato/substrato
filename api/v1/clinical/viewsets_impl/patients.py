from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient

from ..filters import PatientFilter
from ..serializers import LabRequestSerializer, PatientSerializer


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
        """
        História clínica contém dados sensíveis. Limitamos explicitamente a:
        - Administrador
        - Médico
        - Medicina Ocupacional
        """
        if not user or not getattr(user, "is_authenticated", False):
            return False
        if getattr(user, "is_superuser", False):
            return True
        try:
            from security.permissions.rbac import GROUPS as RBAC_GROUPS, _normalize

            raw_groups = list(user.groups.values_list("name", flat=True))
            user_groups = {_normalize(g) for g in raw_groups if g}
            permitidos = {
                _normalize(RBAC_GROUPS["ADMIN"]),
                _normalize(RBAC_GROUPS["MEDICINA"]),
                _normalize(RBAC_GROUPS["MEDICINA_OCUPACIONAL"]),
            }
            return bool(user_groups & permitidos)
        except Exception:
            return False

    def _montar_historia_clinica(self, request, patient: Patient) -> dict:
        tenant = getattr(request, "tenant", None) or getattr(patient, "tenant", None)

        try:
            limit = int(request.query_params.get("limit") or 200)
        except Exception:
            limit = 200
        limit = max(1, min(limit, 1000))

        # Vincular por número do documento: se houver, incluir eventuais registros
        # associados ao mesmo documento no mesmo tenant.
        patient_ids = [patient.id]
        document_number = (getattr(patient, "document_number", None) or "").strip()
        if document_number:
            qs_pacs = Patient.objects.filter(deleted=False, document_number=document_number)
            if tenant is not None:
                qs_pacs = qs_pacs.filter(tenant=tenant)
            patient_ids = list(qs_pacs.values_list("id", flat=True))

        # Prontuário (Cardex)
        from api.v1.medical_records.serializers import RegistroProntuarioSerializer
        from apps.medical_records.models.medical_record_entry import MedicalRecordEntry

        qs_prontuario = (
            MedicalRecordEntry.objects.filter(
                deleted=False,
                patient_id__in=patient_ids,
            )
            .select_related("patient", "doctor")
            .prefetch_related("consultations", "itens_prescription", "itens_prescription__medication")
            .order_by("-care_start_at", "-created_at")
        )
        if tenant is not None:
            qs_prontuario = qs_prontuario.filter(tenant=tenant)

        # Requisições (exams)
        qs_requisicoes = (
            LabRequest.objects.filter(
                deleted=False,
                patient_id__in=patient_ids,
            )
            .select_related("patient", "requesting_company", "external_executing_company")
            .prefetch_related("itens", "itens__exam", "itens__medical_exam")
            .order_by("-created_at")
        )
        if tenant is not None:
            qs_requisicoes = qs_requisicoes.filter(tenant=tenant)

        # Consultas
        from api.v1.consultations.serializers import MedicalConsultationSerializer
        from apps.consultations.models.medical_consultation import MedicalConsultation

        qs_consultations = (
            MedicalConsultation.objects.filter(
                deleted=False,
                patient_id__in=patient_ids,
            )
            .select_related("patient", "doctor", "specialty")
            .order_by("-scheduled_for", "-created_at")
        )
        if tenant is not None:
            qs_consultations = qs_consultations.filter(tenant=tenant)

        # Enfermagem: procedures + internamentos
        from api.v1.nursing.serializers import (
            InternamentoEnfermariaSerializer,
            ProcedimentoSerializer,
        )
        from apps.nursing.models.procedure import Procedure
        from apps.nursing.models.ward import WardAdmission

        qs_procedures = (
            Procedure.objects.filter(
                deleted=False,
                patient_id__in=patient_ids,
            )
            .select_related("patient", "professional")
            .order_by("-performed_date", "-created_at")
        )
        if tenant is not None:
            qs_procedures = qs_procedures.filter(tenant=tenant)

        qs_internamentos = (
            WardAdmission.objects.filter(
                deleted=False,
                patient_id__in=patient_ids,
            )
            .select_related("patient", "bed", "bed__ward")
            .order_by("-admission_date", "-created_at")
        )
        if tenant is not None:
            qs_internamentos = qs_internamentos.filter(tenant=tenant)

        # Farmácia: vendas
        from api.v1.pharmacy.serializers import VendaSerializer
        from apps.pharmacy.models.sale import Sale

        qs_vendas = (
            Sale.objects.filter(
                deleted=False,
                patient_id__in=patient_ids,
            )
            .select_related("patient")
            .order_by("-created_at")
        )
        if tenant is not None:
            qs_vendas = qs_vendas.filter(tenant=tenant)

        # Financeiro: faturas e recibos
        from api.v1.billing.serializers import InvoiceSerializer
        from apps.billing.models.invoice import Invoice

        qs_faturas = Invoice.objects.filter(
            deleted=False,
            patient_id__in=patient_ids,
        ).order_by("-created_at")
        if tenant is not None:
            qs_faturas = qs_faturas.filter(tenant=tenant)

        from api.v1.payments.serializers import ReceiptSerializer
        from apps.payments.models.receipt import Receipt

        qs_recibos = (
            Receipt.objects.filter(
                invoice__deleted=False,
                invoice__patient_id__in=patient_ids,
            )
            .select_related("invoice", "invoice__patient", "payment")
            .order_by("-created_at")
        )
        if tenant is not None:
            qs_recibos = qs_recibos.filter(invoice__tenant=tenant)

        return {
            "patient": PatientSerializer(patient).data,
            "referencia": {
                "document_number": document_number or None,
                "pacientes_vinculados": len(set(patient_ids)),
            },
            "cardex": RegistroProntuarioSerializer(qs_prontuario[:limit], many=True).data,
            "consultations": MedicalConsultationSerializer(qs_consultations[:limit], many=True).data,
            "requisicoes": LabRequestSerializer(
                qs_requisicoes[:limit], many=True, context={"request": request}
            ).data,
            "procedures_enfermagem": ProcedimentoSerializer(qs_procedures[:limit], many=True).data,
            "internamentos_ward": InternamentoEnfermariaSerializer(qs_internamentos[:limit], many=True).data,
            "vendas_farmacia": VendaSerializer(qs_vendas[:limit], many=True).data,
            "faturas": InvoiceSerializer(qs_faturas[:limit], many=True).data,
            "recibos": ReceiptSerializer(qs_recibos[:limit], many=True).data,
        }

    @extend_schema(operation_id="v1_clinico_patient_historia_clinica_por_id")
    @action(detail=True, methods=["get"])
    def historia_clinica(self, request, pk=None):
        if not self._user_pode_ver_historia_clinica(getattr(request, "user", None)):
            raise PermissionDenied("Requer Médico/Medicina Ocupacional/Administrador para ver a história clínica.")

        patient = self.get_object()
        return Response(self._montar_historia_clinica(request, patient))

    @extend_schema(operation_id="v1_clinico_patient_historia_clinica_por_documento")
    @action(detail=False, methods=["get"], url_path="historia_clinica")
    def historia_clinica_busca(self, request):
        """
        Busca História Clínica por número de documento.
        Ex.: /api/v1/clinico/patient/historia_clinica/?document_number=...
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


PacienteViewSet = PatientViewSet
