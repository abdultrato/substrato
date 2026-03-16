import django_filters

from api.core.filters import SafeFilterSet
from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.exame_campo import ExameCampo
from aplicativos.clinico.modelos.exames_medicos import ExameMedico, ExameMedicoCampo
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_item import RequisicaoItem
from aplicativos.clinico.modelos.resultado_analise import ResultadoItem
from infrastrutura.orm.fields.endereco_field import EnderecoField

# =====================================================
# EXAME
# =====================================================


class ExameFilter(SafeFilterSet):
    class Meta:
        model = Exame
        fields = [
            "inquilino",
            "id_custom",
            "deletado",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "nome",
            "trl_horas",
            "preco",
            "metodo",
            "setor",
        ]


class ExameMedicoFilter(SafeFilterSet):
    class Meta:
        model = ExameMedico
        fields = [
            "inquilino",
            "id_custom",
            "deletado",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "nome",
            "trl_horas",
            "preco",
            "metodo",
            "setor",
        ]


# =====================================================
# EXAME CAMPO
# =====================================================


class ExameCampoFilter(SafeFilterSet):
    class Meta:
        model = ExameCampo
        fields = [
            "inquilino",
            "id_custom",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "exame",
            "nome",
            "tipo",
            "unidade",
        ]


class ExameMedicoCampoFilter(SafeFilterSet):
    class Meta:
        model = ExameMedicoCampo
        fields = [
            "inquilino",
            "id_custom",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "exame",
            "nome",
            "tipo",
            "unidade",
        ]


# =====================================================
# PACIENTE
# =====================================================


class PacienteFilter(SafeFilterSet):
    class Meta:
        model = Paciente

        fields = [
            "inquilino",
            "id_custom",
            "deletado",
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
        ]

        filter_overrides = {
            EnderecoField: {
                "filter_class": django_filters.CharFilter,
                "extra": lambda f: {"lookup_expr": "icontains"},
            },
        }


# =====================================================
# REQUISIÇÃO
# =====================================================


class RequisicaoAnaliseFilter(SafeFilterSet):
    class Meta:
        model = RequisicaoAnalise
        fields = [
            "inquilino",
            "id_custom",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "paciente",
            "analista",
            "tipo",
            "estado",
            "status_clinico",
            "possui_resultado_critico",
        ]


# =====================================================
# REQUISIÇÃO ITEM
# =====================================================


class RequisicaoItemFilter(SafeFilterSet):
    class Meta:
        model = RequisicaoItem
        fields = [
            "inquilino",
            "id_custom",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "requisicao",
            "exame",
            "exame_medico",
        ]


# =====================================================
# RESULTADO
# =====================================================


class ResultadoItemFilter(SafeFilterSet):
    class Meta:
        model = ResultadoItem
        fields = [
            "inquilino",
            "id_custom",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "atualizado_por",
            "requisicao",
            "exame_campo",
            "resultado",
            "status_clinico",
            "cor_laudo",
            "alerta_critico",
            "estado",
            "validado_por",
            "data_validacao",
        ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {
    "exame": ExameFilter,
    "examemedico": ExameMedicoFilter,
    "examecampo": ExameCampoFilter,
    "examemedicocampo": ExameMedicoCampoFilter,
    "paciente": PacienteFilter,
    "requisicaoanalise": RequisicaoAnaliseFilter,
    "requisicaoitem": RequisicaoItemFilter,
    "resultadoitem": ResultadoItemFilter,
}
