from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from apps.clinical.models.patient import Patient
from apps.clinical.models.lab_request import LabRequest

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
    - nome: Nome completo (obrigatório)
    - email: Email único para contato
    - data_nascimento: Data de nascimento (para cálculo de idade)
    - genero: Gênero (M/F)
    - numero_id: Documento de identidade (único)
    - morada: Endereço residencial
    - gestante: Indicador de gestação
    """

    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    filterset_class = PatientFilter
    permission_classes = [IsAuthenticated]
    # Paciente nao possui `descricao`/`ativo`/`ordem`.
    search_fields = [
        "id_custom",
        "nome",
        "email",
        "numero_id",
        "contacto",
        "genero",
        "raca_origem",
        "proveniencia",
        "empresa_origem__nome",
    ]
    ordering_fields = [
        "inquilino",
        "id_custom",
        "deletado",
        "deletado_em",
        "criado_em",
        "atualizado_em",
        "criado_por",
        "atualizado_por",
        "nome",
        "data_nascimento",
        "genero",
        "raca_origem",
        "tipo_documento",
        "numero_id",
        "morada",
        "contacto",
        "email",
        "proveniencia",
        "gestante",
        "idade_gestacional_semanas",
        "empresa_origem",
        "versao",
    ]
    ordering = ["-criado_em"]

    @extend_schema(
        description="Listar pacientes com filtros, busca e paginação",
        parameters=[
            OpenApiParameter(
                "search", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Buscar por nome, email, género"
            ),
            OpenApiParameter("genero", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Filtrar por gênero"),
        ],
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        description="Criar novo paciente com validação de email e documento únicos",
        request=PatientSerializer,
        responses={201: PatientSerializer},
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        description="Obter detalhes de um paciente",
        responses={200: PatientSerializer},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        description="Atualizar paciente completamente",
        request=PatientSerializer,
        responses={200: PatientSerializer},
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        description="Atualizar parcialmente um paciente",
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

    def _montar_historia_clinica(self, request, paciente: Patient) -> dict:
        inquilino = getattr(request, "inquilino", None) or getattr(paciente, "inquilino", None)

        try:
            limit = int(request.query_params.get("limit") or 200)
        except Exception:
            limit = 200
        limit = max(1, min(limit, 1000))

        # Vincular por número do documento: se houver, incluir eventuais registros
        # associados ao mesmo documento no mesmo inquilino.
        paciente_ids = [paciente.id]
        numero_id = (getattr(paciente, "numero_id", None) or "").strip()
        if numero_id:
            qs_pacs = Patient.objects.filter(deletado=False, numero_id=numero_id)
            if inquilino is not None:
                qs_pacs = qs_pacs.filter(inquilino=inquilino)
            paciente_ids = list(qs_pacs.values_list("id", flat=True))

        # Prontuário (Cardex)
        from api.v1.medical_records.serializers import RegistroProntuarioSerializer
        from apps.medical_records.models.medical_record_entry import MedicalRecordEntry

        qs_prontuario = (
            MedicalRecordEntry.objects.filter(
                deletado=False,
                paciente_id__in=paciente_ids,
            )
            .select_related("paciente", "medico")
            .prefetch_related("consultas", "itens_prescricao", "itens_prescricao__medicacao")
            .order_by("-inicio_atendimento", "-criado_em")
        )
        if inquilino is not None:
            qs_prontuario = qs_prontuario.filter(inquilino=inquilino)

        # Requisições (exames)
        qs_requisicoes = (
            LabRequest.objects.filter(
                deletado=False,
                paciente_id__in=paciente_ids,
            )
            .select_related("paciente", "empresa_solicitante", "empresa_executora_externa")
            .prefetch_related("itens", "itens__exame", "itens__exame_medico")
            .order_by("-criado_em")
        )
        if inquilino is not None:
            qs_requisicoes = qs_requisicoes.filter(inquilino=inquilino)

        # Consultas
        from api.v1.consultations.serializers import MedicalConsultationSerializer
        from apps.consultations.models.medical_consultation import MedicalConsultation

        qs_consultas = (
            MedicalConsultation.objects.filter(
                deletado=False,
                paciente_id__in=paciente_ids,
            )
            .select_related("paciente", "medico", "especialidade")
            .order_by("-agendada_para", "-criado_em")
        )
        if inquilino is not None:
            qs_consultas = qs_consultas.filter(inquilino=inquilino)

        # Enfermagem: procedimentos + internamentos
        from api.v1.nursing.serializers import (
            InternamentoEnfermariaSerializer,
            ProcedimentoSerializer,
        )
        from apps.nursing.models.ward import WardAdmission
        from apps.nursing.models.procedure import Procedure

        qs_procedimentos = (
            Procedure.objects.filter(
                deletado=False,
                paciente_id__in=paciente_ids,
            )
            .select_related("paciente", "profissional")
            .order_by("-data_realizacao", "-criado_em")
        )
        if inquilino is not None:
            qs_procedimentos = qs_procedimentos.filter(inquilino=inquilino)

        qs_internamentos = (
            WardAdmission.objects.filter(
                deletado=False,
                paciente_id__in=paciente_ids,
            )
            .select_related("paciente", "cama", "cama__enfermaria")
            .order_by("-data_internamento", "-criado_em")
        )
        if inquilino is not None:
            qs_internamentos = qs_internamentos.filter(inquilino=inquilino)

        # Farmácia: vendas
        from api.v1.pharmacy.serializers import VendaSerializer
        from apps.pharmacy.models.sale import Sale

        qs_vendas = (
            Sale.objects.filter(
                deletado=False,
                paciente_id__in=paciente_ids,
            )
            .select_related("paciente")
            .order_by("-criado_em")
        )
        if inquilino is not None:
            qs_vendas = qs_vendas.filter(inquilino=inquilino)

        # Financeiro: faturas e recibos
        from api.v1.billing.serializers import InvoiceSerializer
        from apps.billing.models.invoice import Invoice

        qs_faturas = Invoice.objects.filter(
            deletado=False,
            paciente_id__in=paciente_ids,
        ).order_by("-criado_em")
        if inquilino is not None:
            qs_faturas = qs_faturas.filter(inquilino=inquilino)

        from api.v1.payments.serializers import ReceiptSerializer
        from apps.payments.models.receipt import Receipt

        qs_recibos = (
            Receipt.objects.filter(
                fatura__deletado=False,
                fatura__paciente_id__in=paciente_ids,
            )
            .select_related("fatura", "fatura__paciente", "pagamento")
            .order_by("-criado_em")
        )
        if inquilino is not None:
            qs_recibos = qs_recibos.filter(fatura__inquilino=inquilino)

        return {
            "paciente": PatientSerializer(paciente).data,
            "referencia": {
                "numero_documento": numero_id or None,
                "pacientes_vinculados": len(set(paciente_ids)),
            },
            "cardex": RegistroProntuarioSerializer(qs_prontuario[:limit], many=True).data,
            "consultas": MedicalConsultationSerializer(qs_consultas[:limit], many=True).data,
            "requisicoes": LabRequestSerializer(
                qs_requisicoes[:limit], many=True, context={"request": request}
            ).data,
            "procedimentos_enfermagem": ProcedimentoSerializer(qs_procedimentos[:limit], many=True).data,
            "internamentos_enfermaria": InternamentoEnfermariaSerializer(qs_internamentos[:limit], many=True).data,
            "vendas_farmacia": VendaSerializer(qs_vendas[:limit], many=True).data,
            "faturas": InvoiceSerializer(qs_faturas[:limit], many=True).data,
            "recibos": ReceiptSerializer(qs_recibos[:limit], many=True).data,
        }

    @extend_schema(operation_id="v1_clinico_paciente_historia_clinica_por_id")
    @action(detail=True, methods=["get"])
    def historia_clinica(self, request, pk=None):
        if not self._user_pode_ver_historia_clinica(getattr(request, "user", None)):
            raise PermissionDenied("Requer Médico/Medicina Ocupacional/Administrador para ver a história clínica.")

        paciente = self.get_object()
        return Response(self._montar_historia_clinica(request, paciente))

    @extend_schema(operation_id="v1_clinico_paciente_historia_clinica_por_documento")
    @action(detail=False, methods=["get"], url_path="historia_clinica")
    def historia_clinica_busca(self, request):
        """
        Busca História Clínica por número de documento.
        Ex.: /api/v1/clinico/paciente/historia_clinica/?numero_id=...
        """
        if not self._user_pode_ver_historia_clinica(getattr(request, "user", None)):
            raise PermissionDenied("Requer Médico/Medicina Ocupacional/Administrador para ver a história clínica.")

        numero_id = (request.query_params.get("numero_id") or "").strip()
        if not numero_id:
            raise ValidationError({"numero_id": "Informe o número do documento."})

        inquilino = getattr(request, "inquilino", None)
        qs = Patient.objects.filter(deletado=False, numero_id=numero_id)
        if inquilino is not None:
            qs = qs.filter(inquilino=inquilino)

        paciente = qs.first()
        if not paciente:
            raise NotFound("Paciente não encontrado para este número de documento.")

        return Response(self._montar_historia_clinica(request, paciente))


PacienteViewSet = PatientViewSet
