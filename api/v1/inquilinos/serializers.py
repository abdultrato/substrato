from rest_framework import serializers

from aplicativos.inquilinos.modelos.configuracao import ConfiguracaoInquilino
from aplicativos.inquilinos.modelos.feature_flags import FeatureFlagTenant
from aplicativos.inquilinos.modelos.inquilino import Inquilino
from aplicativos.inquilinos.modelos.plano_assinatura import PlanoAssinatura
from aplicativos.inquilinos.modelos.uso_tenant import UsoTenant


class ConfiguracaoInquilinoSerializer(serializers.ModelSerializer) :
	class Meta :
		model = ConfiguracaoInquilino
		fields = "__all__"


class FeatureFlagTenantSerializer(serializers.ModelSerializer) :
	class Meta :
		model = FeatureFlagTenant
		fields = "__all__"


class InquilinoSerializer(serializers.ModelSerializer) :
	class Meta :
		model = Inquilino
		fields = "__all__"


class PlanoAssinaturaSerializer(serializers.ModelSerializer) :
	class Meta :
		model = PlanoAssinatura
		fields = "__all__"


class UsoTenantSerializer(serializers.ModelSerializer) :
	class Meta :
		model = UsoTenant
		fields = "__all__"


SERIALIZER_MAP = {
	"configuracaoinquilino" : ConfiguracaoInquilinoSerializer,
	"featureflagtenant"     : FeatureFlagTenantSerializer,
	"inquilino"             : InquilinoSerializer,
	"planoassinatura"       : PlanoAssinaturaSerializer,
	"usotenant"             : UsoTenantSerializer,
	}
