import django_filters

from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.exame_campo import ExameCampo
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_analise_item import RequisicaoItem
from aplicativos.clinico.modelos.resultado_analise import ResultadoItem


class ExameFilter(django_filters.FilterSet) :
	class Meta :
		model = Exame
		fields = ["inquilino", "id_custom", "ordem", "ativo", "deletado", "deletado_em", "criado_em", "atualizado_em", "criado_por", "atualizado_por", "nome", "descricao", "trl_horas", "preco", "metodo", "setor", ]


class ExameCampoFilter(django_filters.FilterSet) :
	class Meta :
		model = ExameCampo
		fields = ["inquilino", "id_custom", "nome", "ordem", "ativo", "criado_em", "atualizado_em", "criado_por", "atualizado_por", "exame", "tipo", "unidade", "descricao", "valor_minimo", "valor_maximo", "critico_baixo", "critico_alto", "delta_check_ativo", "detectar_tendencia", "destacar_no_laudo", ]


class PacienteFilter(django_filters.FilterSet) :
	class Meta :
		model = Paciente
		fields = ["inquilino", "id_custom", "descricao", "ordem", "ativo", "deletado", "deletado_em", "criado_em", "atualizado_em", "criado_por", "atualizado_por", "nome", "data_nascimento", "genero", "raca_origem", "tipo_documento", "numero_id", "morada", "contacto", "email", "proveniencia", ]


class RequisicaoAnaliseFilter(django_filters.FilterSet) :
	class Meta :
		model = RequisicaoAnalise
		fields = ["inquilino", "id_custom", "descricao", "ordem", "ativo", "deletado", "deletado_em", "criado_em", "atualizado_em", "criado_por", "atualizado_por", "paciente", "analista", "observacoes", "status", "status_clinico", "possui_resultado_critico", ]


class RequisicaoItemFilter(django_filters.FilterSet) :
	class Meta :
		model = RequisicaoItem
		fields = ["inquilino", "deletado", "deletado_em", "criado_por", "atualizado_por", "id_custom", "criado_em", "atualizado_em", "descricao", "ordem", "ativo", "requisicao", "exame", "preco_unitario", "quantidade", ]


class ResultadoItemFilter(django_filters.FilterSet) :
	class Meta :
		model = ResultadoItem
		fields = ["inquilino", "id_custom", "descricao", "ordem", "ativo", "deletado", "deletado_em", "criado_em", "atualizado_em", "criado_por", "atualizado_por", "requisicao", "exame_campo", "resultado", "status_clinico", "cor_laudo", "alerta_critico", "delta_alerta", "tendencia", "interpretacao", "validado", "validado_por", "data_validacao", ]


FILTER_MAP = {"exame" : ExameFilter, "examecampo" : ExameCampoFilter, "paciente" : PacienteFilter, "requisicaoanalise" : RequisicaoAnaliseFilter, "requisicaoitem" : RequisicaoItemFilter, "resultadoitem" : ResultadoItemFilter, }