from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from api.v1.viewset_mixins import TenantScopedQuerysetMixin, ValidatedSearchOrderingMixin
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise

from ..filters import PacienteFilter
from ..serializers import PacienteSerializer, RequisicaoAnaliseSerializer


@extend_schema(
    description="Gerenciamento de pacientes",
    tags=["Clínico - Pacientes"],
)
class PacienteViewSet(ValidatedSearchOrderingMixin, TenantScopedQuerysetMixin, ModelViewSet):
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

    queryset = Paciente.objects.all()
    serializer_class = PacienteSerializer
    filterset_class = PacienteFilter
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
        request=PacienteSerializer,
        responses={201: PacienteSerializer},
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @extend_schema(
        description="Obter detalhes de um paciente",
        responses={200: PacienteSerializer},
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        description="Atualizar paciente completamente",
        request=PacienteSerializer,
        responses={200: PacienteSerializer},
    )
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @extend_schema(
        description="Atualizar parcialmente um paciente",
        request=PacienteSerializer,
        responses={200: PacienteSerializer},
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
            from seguranca.permissoes.rbac import GROUPS as RBAC_GROUPS, _normalize

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

    def _montar_historia_clinica(self, request, paciente: Paciente) -> dict:
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
            qs_pacs = Paciente.objects.filter(deletado=False, numero_id=numero_id)
            if inquilino is not None:
                qs_pacs = qs_pacs.filter(inquilino=inquilino)
            paciente_ids = list(qs_pacs.values_list("id", flat=True))

        # Prontuário (Cardex)
        from api.v1.prontuario.serializers import RegistroProntuarioSerializer
        from aplicativos.prontuario.modelos.registro_prontuario import RegistroProntuario

        qs_prontuario = (
            RegistroProntuario.objects.filter(
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
            RequisicaoAnalise.objects.filter(
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
        from api.v1.consultas.serializers import ConsultaMedicaSerializer
        from aplicativos.consultas.modelos.consulta_medica import ConsultaMedica

        qs_consultas = (
            ConsultaMedica.objects.filter(
                deletado=False,
                paciente_id__in=paciente_ids,
            )
            .select_related("paciente", "medico", "especialidade")
            .order_by("-agendada_para", "-criado_em")
        )
        if inquilino is not None:
            qs_consultas = qs_consultas.filter(inquilino=inquilino)

        # Enfermagem: procedimentos + internamentos
        from api.v1.enfermagem.serializers import (
            InternamentoEnfermariaSerializer,
            ProcedimentoSerializer,
        )
        from aplicativos.enfermagem.modelos.enfermaria import InternamentoEnfermaria
        from aplicativos.enfermagem.modelos.procedimento import Procedimento

        qs_procedimentos = (
            Procedimento.objects.filter(
                deletado=False,
                paciente_id__in=paciente_ids,
            )
            .select_related("paciente", "profissional")
            .order_by("-data_realizacao", "-criado_em")
        )
        if inquilino is not None:
            qs_procedimentos = qs_procedimentos.filter(inquilino=inquilino)

        qs_internamentos = (
            InternamentoEnfermaria.objects.filter(
                deletado=False,
                paciente_id__in=paciente_ids,
            )
            .select_related("paciente", "cama", "cama__enfermaria")
            .order_by("-data_internamento", "-criado_em")
        )
        if inquilino is not None:
            qs_internamentos = qs_internamentos.filter(inquilino=inquilino)

        # Farmácia: vendas
        from api.v1.farmacia.serializers import VendaSerializer
        from aplicativos.farmacia.models.venda import Venda

        qs_vendas = (
            Venda.objects.filter(
                deletado=False,
                paciente_id__in=paciente_ids,
            )
            .select_related("paciente")
            .order_by("-criado_em")
        )
        if inquilino is not None:
            qs_vendas = qs_vendas.filter(inquilino=inquilino)

        # Financeiro: faturas e recibos
        from api.v1.faturamento.serializers import FaturaSerializer
        from aplicativos.faturamento.modelos.fatura import Fatura

        qs_faturas = Fatura.objects.filter(
            deletado=False,
            paciente_id__in=paciente_ids,
        ).order_by("-criado_em")
        if inquilino is not None:
            qs_faturas = qs_faturas.filter(inquilino=inquilino)

        from api.v1.pagamentos.serializers import ReciboSerializer
        from aplicativos.pagamentos.modelos.recibo import Recibo

        qs_recibos = (
            Recibo.objects.filter(
                fatura__deletado=False,
                fatura__paciente_id__in=paciente_ids,
            )
            .select_related("fatura", "fatura__paciente", "pagamento")
            .order_by("-criado_em")
        )
        if inquilino is not None:
            qs_recibos = qs_recibos.filter(fatura__inquilino=inquilino)

        return {
            "paciente": PacienteSerializer(paciente).data,
            "referencia": {
                "numero_documento": numero_id or None,
                "pacientes_vinculados": len(set(paciente_ids)),
            },
            "cardex": RegistroProntuarioSerializer(qs_prontuario[:limit], many=True).data,
            "consultas": ConsultaMedicaSerializer(qs_consultas[:limit], many=True).data,
            "requisicoes": RequisicaoAnaliseSerializer(
                qs_requisicoes[:limit], many=True, context={"request": request}
            ).data,
            "procedimentos_enfermagem": ProcedimentoSerializer(qs_procedimentos[:limit], many=True).data,
            "internamentos_enfermaria": InternamentoEnfermariaSerializer(qs_internamentos[:limit], many=True).data,
            "vendas_farmacia": VendaSerializer(qs_vendas[:limit], many=True).data,
            "faturas": FaturaSerializer(qs_faturas[:limit], many=True).data,
            "recibos": ReciboSerializer(qs_recibos[:limit], many=True).data,
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
        qs = Paciente.objects.filter(deletado=False, numero_id=numero_id)
        if inquilino is not None:
            qs = qs.filter(inquilino=inquilino)

        paciente = qs.first()
        if not paciente:
            raise NotFound("Paciente não encontrado para este número de documento.")

        return Response(self._montar_historia_clinica(request, paciente))
