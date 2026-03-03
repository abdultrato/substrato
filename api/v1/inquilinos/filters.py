from api.core.filters import SafeFilterSet

from aplicativos.inquilinos.modelos.configuracao import ConfiguracaoInquilino
from aplicativos.inquilinos.modelos.feature_flags import FeatureFlagTenant
from aplicativos.inquilinos.modelos.inquilino import Inquilino
from aplicativos.inquilinos.modelos.plano_assinatura import PlanoAssinatura
from aplicativos.inquilinos.modelos.uso_tenant import UsoTenant


# =====================================================
# CONFIGURAÇÃO INQUILINO
# =====================================================

class ConfiguracaoInquilinoFilter(SafeFilterSet) :
	class Meta :
		model = ConfiguracaoInquilino
		fields = ['id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'inquilino', 'fuso_horario', 'moeda', 'idioma', 'permite_multi_unidade', 'limite_usuarios', ]


# =====================================================
# FEATURE FLAG TENANT
# =====================================================

class FeatureFlagTenantFilter(SafeFilterSet) :
	class Meta :
		model = FeatureFlagTenant
		fields = ['inquilino', 'id_custom', 'descricao', 'nome', 'ordem', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'chave', 'ativo', ]


# =====================================================
# INQUILINO
# =====================================================

class InquilinoFilter(SafeFilterSet) :
	class Meta :
		model = Inquilino
		fields = ['id_custom', 'descricao', 'ordem', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'identificador', 'nome', 'dominio', 'ativo', 'status_comercial', 'trial_ate', 'bloqueado_em', ]


# =====================================================
# PLANO ASSINATURA
# =====================================================

class PlanoAssinaturaFilter(SafeFilterSet) :
	class Meta :
		model = PlanoAssinatura
		fields = ['id_custom', 'descricao', 'nome', 'ordem', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'tipo', 'limite_usuarios', 'limite_requisicoes_mes', 'preco_mensal', 'preco_excedente_requisicao', 'suporte_prioritario', 'permite_multi_unidade', 'ativo', ]


# =====================================================
# USO TENANT
# =====================================================

class UsoTenantFilter(SafeFilterSet) :
	class Meta :
		model = UsoTenant
		fields = ['id_custom', 'descricao', 'nome', 'ordem', 'ativo', 'deletado', 'deletado_em', 'criado_em', 'atualizado_em', 'criado_por', 'atualizado_por', 'inquilino', 'usuarios_ativos', 'requisicoes_mes_atual', ]


# =====================================================
# MAPA
# =====================================================

FILTER_MAP = {'configuracaoinquilino' : ConfiguracaoInquilinoFilter, 'featureflagtenant' : FeatureFlagTenantFilter, 'inquilino' : InquilinoFilter, 'planoassinatura' : PlanoAssinaturaFilter, 'usotenant' : UsoTenantFilter, }