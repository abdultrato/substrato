from rest_framework import serializers  # DRF base

from api.v1.compat import LegacyAliasSerializerMixin
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from apps.insurer.models.tenant_coverage_plan import TenantCoveragePlan

CORE_READ_ONLY_FIELDS = (
    "id",
    "custom_id",
    "tenant",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted",
    "deleted_at",
    "deleted_by",
    "version",
)

BASE_ALIASES = {
    "id_custom": "custom_id",
    "descricao": "description",
    "descrição": "description",
    "detalhes": "description",
    "ordem": "order",
    "ativo": "active",
    "ativa": "active",
}

INSURER_ALIASES = {
    **BASE_ALIASES,
    "nome": "name",
    "seguradora": "name",
    "seguro": "name",
    "codigo_externo": "external_code",
    "código_externo": "external_code",
    "codigo": "external_code",
    "código": "external_code",
    "external": "external_code",
    "telefone": "phone",
    "contacto": "phone",
    "contato": "phone",
}

COVERAGE_PLAN_ALIASES = {
    **BASE_ALIASES,
    "nome": "name",
    "plano": "name",
    "plano_cobertura": "name",
    "seguradora": "insurer",
    "seguro": "insurer",
    "percentual_cobertura": "coverage_percentage",
    "percentagem_cobertura": "coverage_percentage",
    "percentagem_de_cobertura": "coverage_percentage",
    "percentual_de_cobertura": "coverage_percentage",
    "cobertura": "coverage_percentage",
    "coverage": "coverage_percentage",
    "requer_autorizacao": "requires_authorization",
    "requer_autorização": "requires_authorization",
    "exige_autorizacao": "requires_authorization",
    "exige_autorização": "requires_authorization",
    "autorizacao_obrigatoria": "requires_authorization",
    "autorização_obrigatória": "requires_authorization",
}

TENANT_COVERAGE_PLAN_ALIASES = {
    **BASE_ALIASES,
    "nome": "name",
    "plano": "global_plan",
    "plano_global": "global_plan",
    "plano_base": "global_plan",
    "plano_cobertura": "global_plan",
    "percentual_sobrescrito": "override_percentage",
    "percentagem_sobrescrita": "override_percentage",
    "percentagem_override": "override_percentage",
    "percentual_override": "override_percentage",
    "percentual_local": "override_percentage",
    "percentagem_local": "override_percentage",
    "cobertura_local": "override_percentage",
}

PROCEDURE_AUTHORIZATION_ALIASES = {
    **BASE_ALIASES,
    "nome": "name",
    "requisicao": "request_id",
    "requisição": "request_id",
    "id_requisicao": "request_id",
    "id_requisição": "request_id",
    "pedido": "request_id",
    "request": "request_id",
    "plano": "plan",
    "plano_cobertura": "plan",
    "situacao": "status",
    "situação": "status",
    "estado": "status",
    "codigo_autorizacao": "authorization_code",
    "código_autorização": "authorization_code",
    "codigo_de_autorizacao": "authorization_code",
    "código_de_autorização": "authorization_code",
    "autorizacao": "authorization_code",
    "autorização": "authorization_code",
    "data_resposta": "response_date",
    "respondido_em": "response_date",
}


class ProcedureAuthorizationSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = PROCEDURE_AUTHORIZATION_ALIASES
    legacy_output_aliases = PROCEDURE_AUTHORIZATION_ALIASES

    class Meta:
        model = ProcedureAuthorization
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class CoveragePlanSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = COVERAGE_PLAN_ALIASES
    legacy_output_aliases = COVERAGE_PLAN_ALIASES

    class Meta:
        model = CoveragePlan
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class TenantCoveragePlanSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = TENANT_COVERAGE_PLAN_ALIASES
    legacy_output_aliases = TENANT_COVERAGE_PLAN_ALIASES

    class Meta:
        model = TenantCoveragePlan
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class InsurerSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    legacy_input_aliases = INSURER_ALIASES
    legacy_output_aliases = INSURER_ALIASES

    class Meta:
        model = Insurer
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


SERIALIZER_MAP = {
    "procedure_authorization": ProcedureAuthorizationSerializer,
    "coverage_plan": CoveragePlanSerializer,
    "tenant_coverage_plan": TenantCoveragePlanSerializer,
    "insurer": InsurerSerializer,
}

