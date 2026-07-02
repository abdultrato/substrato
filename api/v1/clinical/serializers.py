from __future__ import annotations

from functools import lru_cache
import unicodedata

from django.core.exceptions import ValidationError
from django.utils.translation import override
from django_countries import countries
from rest_framework import serializers

from api.v1.compat import LegacyAliasSerializerMixin, append_legacy_aliases, normalize_legacy_input
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.lab_request import LabRequest
from apps.clinical_laboratory.models import LabTest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.medical_exam import MedicalExam, MedicalExamField
from apps.clinical.models.occupational_profile import OccupationalExamProfile
from apps.clinical.models.medical_result_file import (
    MedicalResultFile,
    validate_medical_file_for_type,
)
from apps.clinical.models.patient import Patient
from apps.clinical.models.result_item import ResultItem
from apps.clinical.models.sample import Sample
from apps.clinical.models.sample_rejection import SampleRejectionRecord, SampleRejectionReason
from core.constants.provenance import Provenance

CORE_READ_ONLY_FIELDS = [
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
]


def _normalize_country_name(value: str) -> str:
    value = (value or "").strip().lower()
    if not value:
        return ""
    value = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in value if unicodedata.category(ch) != "Mn")


@lru_cache(maxsize=1)
def _country_name_to_code_map() -> dict[str, str]:
    """
    Reverse map used for compatibility:
    some clients stored/sent country names (ex.: "Moçambique") instead of ISO codes.
    """
    name_to_code: dict[str, str] = {}

    for lang in ("pt-br", "pt", "en"):
        try:
            with override(lang):
                for code, name in list(countries):
                    name_to_code[_normalize_country_name(str(name))] = code
        except Exception:
            continue

    # Defensive: keep our common default stable even if translations change.
    name_to_code[_normalize_country_name("Moçambique")] = "MZ"
    name_to_code[_normalize_country_name("Mozambique")] = "MZ"

    return name_to_code


def _coerce_country_to_code(value: str | None) -> str | None:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return raw

    # Already a country code (or alpha3/numeric): normalize to alpha2.
    code = countries.alpha2(raw)
    if code:
        return code

    # Legacy: country name.
    mapped = _country_name_to_code_map().get(_normalize_country_name(raw))
    return mapped or raw


class PatientSerializer(serializers.ModelSerializer):
    """
    Serializer para a entidade Paciente com validação robusta.
    Inclui campos de patient para leitura/escrita com validação de domínio.
    """

    origin_company_name = serializers.CharField(source="origin_company.name", read_only=True)
    age_display = serializers.CharField(source="idade", read_only=True)
    age_years = serializers.SerializerMethodField()
    is_blood_donor = serializers.SerializerMethodField()
    legacy_input_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "data_nascimento": "birth_date",
        "nascimento": "birth_date",
        "genero": "gender",
        "género": "gender",
        "sexo": "gender",
        "raca_origem": "race_origin",
        "raça_origem": "race_origin",
        "tipo_documento": "document_type",
        "documento_tipo": "document_type",
        "numero_id": "document_number",
        "numero_documento": "document_number",
        "número_documento": "document_number",
        "documento": "document_number",
        "contacto": "contact",
        "contato": "contact",
        "telefone": "contact",
        "phone": "contact",
        "nome_acompanhante": "companion_name",
        "acompanhante_nome": "companion_name",
        "parentesco_acompanhante": "companion_relationship",
        "relacao_acompanhante": "companion_relationship",
        "relação_acompanhante": "companion_relationship",
        "telefone_acompanhante": "companion_contact",
        "contacto_acompanhante": "companion_contact",
        "contato_acompanhante": "companion_contact",
        "companion_phone": "companion_contact",
        "email_acompanhante": "companion_email",
        "morada": "address",
        "endereco": "address",
        "endereço": "address",
        "empresa_origem": "origin_company",
        "proveniencia": "provenance",
        "proveniência": "provenance",
        "gestante": "pregnant",
        "gravida": "pregnant",
        "grávida": "pregnant",
        "idade_gestacional": "gestational_age_weeks",
        "semanas_gestacao": "gestational_age_weeks",
        "semanas_gestação": "gestational_age_weeks",
        "endereco_rua": "address_street",
        "endereco_numero": "address_number",
        "endereco_bairro": "address_neighborhood",
        "endereco_cidade": "address_city",
        "endereco_provincia": "address_province",
        "endereco_codigo_postal": "address_postal_code",
        "endereco_pais": "address_country",
        "endereco_complemento": "address_complement",
        "criado_em": "created_at",
    }
    legacy_output_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "data_nascimento": "birth_date",
        "genero": "gender",
        "raca_origem": "race_origin",
        "tipo_documento": "document_type",
        "numero_id": "document_number",
        "contacto": "contact",
        "nome_acompanhante": "companion_name",
        "parentesco_acompanhante": "companion_relationship",
        "telefone_acompanhante": "companion_contact",
        "contacto_acompanhante": "companion_contact",
        "email_acompanhante": "companion_email",
        "morada": "address",
        "empresa_origem": "origin_company",
        "empresa_origem_nome": "origin_company_name",
        "endereco_rua": "address_street",
        "endereco_numero": "address_number",
        "endereco_bairro": "address_neighborhood",
        "endereco_cidade": "address_city",
        "endereco_provincia": "address_province",
        "endereco_codigo_postal": "address_postal_code",
        "endereco_pais": "address_country",
        "endereco_complemento": "address_complement",
        "criado_em": "created_at",
    }

    class Meta:
        model = Patient
        # Expor todos os campos do model (incluindo os de auditoria/tenant).
        # Campos corporativos permanecem read-only para evitar manipulação via API.
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
        extra_kwargs = {
            "name": {
                "required": True,
                "min_length": 2,
                "max_length": 150,
                "help_text": "Nome completo do patient (2-150 caracteres)",
                "error_messages": {
                    "required": "Nome é obrigatório",
                    "min_length": "Nome deve ter no mínimo 2 caracteres",
                    "max_length": "Nome não pode ter mais de 150 caracteres",
                },
            },
            "email": {
                "required": False,
                "allow_blank": True,
                "help_text": "Email único do patient para contato",
                "error_messages": {
                    "invalid": "Email inválido",
                    "unique": "Este email já está registrado no sistema",
                },
            },
            "contact": {
                "required": False,
                "allow_blank": True,
                "help_text": "Número de phone para contato (incluir indicativo país)",
            },
            "companion_name": {
                "required": False,
                "allow_blank": True,
                "help_text": "Nome do acompanhante para notificações quando necessário",
            },
            "companion_relationship": {
                "required": False,
                "allow_blank": True,
                "help_text": "Parentesco ou relação do acompanhante com o paciente",
            },
            "companion_contact": {
                "required": False,
                "allow_blank": True,
                "help_text": "Telefone do acompanhante para WhatsApp/SMS",
            },
            "companion_email": {
                "required": False,
                "allow_blank": True,
                "allow_null": True,
                "help_text": "Email do acompanhante para notificações",
                "error_messages": {
                    "invalid": "Email do acompanhante inválido",
                },
            },
            "birth_date": {
                "required": False,
                "allow_null": True,
                "help_text": "Data de nascimento do patient (formato YYYY-MM-DD)",
            },
            "gender": {
                # O model já define default, então não pode ser required=True
                "required": False,
                "help_text": "Gênero do patient (M ou F)",
            },
            "race_origin": {
                "required": False,
                "help_text": "Classificação de raça/origin",
            },
            "document_type": {
                "required": False,
                "help_text": "Tipo de documento de identidade (BI, CC, Passaporte, etc)",
            },
            "document_number": {
                "required": False,
                "allow_blank": True,
                "help_text": "Número único do documento de identidade",
                "error_messages": {
                    "unique": "Este número de documento já está registrado",
                },
            },
            "provenance": {
                "required": False,
                "help_text": "Origem/proveniência do patient na clínica",
            },
            "pregnant": {
                "required": False,
                "help_text": "Indicador se patient está pregnant",
            },
            "gestational_age_weeks": {
                "required": False,
                "allow_null": True,
                "help_text": "Semanas de gestação (preencher se pregnant)",
            },
        }

    def to_internal_value(self, date):
        date = normalize_legacy_input(date, self.legacy_input_aliases)

        """
        Compat:
        - Antes, `address` era JSON (rua/number/bairro/cidade/provincia/...).
        - Agora, o model usa campos reais `endereco_*` + `address` (texto).

        Aceitamos `address` como objeto e mapeamos para `endereco_*` para não
        quebrar clientes legados.
        """
        if isinstance(date, dict) and isinstance(date.get("address"), dict):
            address_obj = date.get("address") or {}
            # QueryDict (request.date) pode ser imutável; usar cópia.
            date = date.copy() if hasattr(date, "copy") else dict(date)
            date.pop("address", None)

            mapping = {
                "rua": "address_street",
                "number": "address_number",
                "bairro": "address_neighborhood",
                "cidade": "address_city",
                "provincia": "address_province",
                "code_postal": "address_postal_code",
                "pais": "address_country",
                "complemento": "address_complement",
            }
            for src_key, dst_field in mapping.items():
                if dst_field in date:
                    continue
                v = address_obj.get(src_key)
                if v is None:
                    continue
                date[dst_field] = v

            if "address" not in date:
                parts = []
                for k in (
                    "rua",
                    "number",
                    "bairro",
                    "cidade",
                    "provincia",
                    "code_postal",
                    "complemento",
                ):
                    v = address_obj.get(k)
                    if v:
                        parts.append(str(v).strip())
                date["address"] = ", ".join([p for p in parts if p]).strip()

        # Compat: aceitar nomes de países (ex.: "Moçambique") e converter para
        # ISO alpha-2 (ex.: "MZ") para passar na validação do CountryField.
        if isinstance(date, dict) and "address_country" in date:
            date = date.copy() if hasattr(date, "copy") else dict(date)
            date["address_country"] = _coerce_country_to_code(date.get("address_country"))

        return super().to_internal_value(date)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return append_legacy_aliases(data, self.legacy_output_aliases)

    def get_age_years(self, obj):
        try:
            return obj.idade_em_anos()
        except Exception:
            return None

    def get_is_blood_donor(self, obj):
        # Em listagem o viewset anota `blood_donation_count` para evitar N+1;
        # no detalhe/após criação recorre a uma única query de fallback.
        annotated = getattr(obj, "blood_donation_count", None)
        if annotated is not None:
            return bool(annotated)
        return obj.blood_donations.filter(deleted=False).exists()

    def validate_email(self, value):
        """Validação adicional de email."""
        if (
            value
            and Patient.objects.filter(email=value).exclude(id=self.instance.id if self.instance else None).exists()
        ):
            raise serializers.ValidationError("Este email já está registrado.")
        return value

    def validate_companion_contact(self, value):
        """Mantém o telefone do acompanhante flexível para formatos com indicativo."""
        if value in (None, ""):
            return value
        return str(value).strip()

    def validate_document_number(self, value):
        """Validação adicional de número de documento."""
        if (
            value
            and Patient.objects.filter(document_number=value)
            .exclude(id=self.instance.id if self.instance else None)
            .exists()
        ):
            raise serializers.ValidationError("Este número de documento já está registrado.")
        return value

    def validate(self, date):
        """Validación de campos interdependientes."""
        if date.get("pregnant") and not date.get("gestational_age_weeks"):
            raise serializers.ValidationError(
                {"gestational_age_weeks": "Idade gestacional é obrigatória quando pregnant é true"}
            )

        # Medicina ocupacional: patient deve estar associado a uma empresa.
        provenance = (
            date.get("provenance") if "provenance" in date else getattr(self.instance, "provenance", None)
        )
        empresa = (
            date.get("origin_company") if "origin_company" in date else getattr(self.instance, "origin_company", None)
        )
        if provenance == Provenance.MEDICINA_OCUPACIONAL and not empresa:
            raise serializers.ValidationError(
                {"origin_company": "Empresa é obrigatória quando a proveniência é Medicina Ocupacional."}
            )
        return date


class LabExamSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    """
    Serializer para a entidade Exame com validação robusta.
    Inclui validação de preço e tempo de response.
    """

    sample_type_name = serializers.CharField(source="sample_type.name", read_only=True)
    sample_options_details = serializers.SerializerMethodField()
    legacy_input_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "trl_horas": "turnaround_hours",
        "tempo_resposta": "turnaround_hours",
        "tempo_de_resposta": "turnaround_hours",
        "horas_resposta": "turnaround_hours",
        "preco": "price",
        "preço": "price",
        "metodo": "method",
        "método": "method",
        "setor": "sector",
        "sector": "sector",
        "amostra": "sample_type",
        "tipo_amostra": "sample_type",
        "tipo_de_amostra": "sample_type",
        "amostra_principal": "sample_type",
        "amostras": "sample_options",
        "opcoes_amostra": "sample_options",
        "opções_amostra": "sample_options",
        "amostras_aceites": "sample_options",
        "amostras_aceitas": "sample_options",
        "opcoes_de_amostra": "sample_options",
        "opções_de_amostra": "sample_options",
        "iva": "vat_percentage",
        "percentagem_iva": "vat_percentage",
        "percentual_iva": "vat_percentage",
        "aplica_iva": "applies_vat_by_default",
        "aplica_iva_padrao": "applies_vat_by_default",
        "aplica_iva_padrão": "applies_vat_by_default",
        "ativo": "active",
        "criado_em": "created_at",
        "atualizado_em": "updated_at",
    }
    legacy_output_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "trl_horas": "turnaround_hours",
        "preco": "price",
        "preço": "price",
        "metodo": "method",
        "método": "method",
        "setor": "sector",
        "sector": "sector",
        "amostra": "sample_type",
        "tipo_amostra": "sample_type",
        "amostras": "sample_options",
        "opcoes_amostra": "sample_options",
        "opções_amostra": "sample_options",
        "iva": "vat_percentage",
        "percentagem_iva": "vat_percentage",
        "aplica_iva": "applies_vat_by_default",
        "ativo": "active",
        "criado_em": "created_at",
        "atualizado_em": "updated_at",
    }

    class Meta:
        model = LabExam
        fields = "__all__"
        read_only_fields = [*CORE_READ_ONLY_FIELDS, "sample_type_name", "sample_options_details"]
        extra_kwargs = {
            "name": {
                "required": True,
                "min_length": 3,
                "max_length": 100,
                "help_text": "Nome descritivo do exam (3-100 caracteres)",
                "error_messages": {
                    "required": "Nome do exam é obrigatório",
                    "min_length": "Nome deve ter no mínimo 3 caracteres",
                    "max_length": "Nome não pode ter mais de 100 caracteres",
                },
            },
            "turnaround_hours": {
                # O model já define default.
                "required": False,
                "min_value": 1,
                "max_value": 720,  # 30 dias máximo
                "help_text": "Tempo de response em hours (1-720)",
                "error_messages": {
                    "required": "Tempo de response é obrigatório",
                    "min_value": "TRL deve ser no mínimo 1 hora",
                    "max_value": "TRL não pode ser maior que 720 hours (30 dias)",
                },
            },
            "price": {
                # O model já define default (mas validamos > 0 em validate_price).
                "required": False,
                "decimal_places": 2,
                "help_text": "Preço do exam em unidades monetárias (≥0.01)",
                "error_messages": {
                    "required": "Preço é obrigatório",
                    "invalid": "Preço deve ser um value decimal válido",
                },
            },
            "method": {
                "required": True,
                "help_text": "Método utilizado para realizar o exam",
            },
            "sample_type": {
                "required": True,
                "help_text": "Tipo de amostra biológica exigida para o exame.",
            },
            "sample_options": {
                "required": False,
                "help_text": "Opções de amostras aceites para o exame.",
            },
            "sector": {
                # O model permite null/blank (e há constraint de unicidade).
                # DRF injeta `default=None` para campos nullable em constraints, então
                # não podemos forçar required=True aqui.
                "required": False,
                "help_text": "Setor do laboratório responsável pelo exam",
            },
        }

    def validate_price(self, value):
        """Validação que preço deve ser positivo."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Preço deve ser maior que zero.")
        return value

    def validate(self, attrs):
        tenant = attrs.get("tenant") or getattr(self.instance, "tenant", None)
        request = self.context.get("request")
        if tenant is None and request is not None:
            tenant = getattr(request, "tenant", None)

        sample_type = attrs.get("sample_type") or getattr(self.instance, "sample_type", None)
        sample_options = attrs.get("sample_options", None)

        if sample_type is not None and tenant is not None and sample_type.tenant_id != getattr(tenant, "id", None):
            raise serializers.ValidationError({"sample_type": "A amostra principal deve pertencer ao tenant atual."})

        if sample_options is not None and tenant is not None:
            invalid_ids = [
                sample.id for sample in sample_options
                if sample.tenant_id != getattr(tenant, "id", None)
            ]
            if invalid_ids:
                raise serializers.ValidationError(
                    {"sample_options": f"Existem amostras fora do tenant atual: {', '.join(map(str, invalid_ids))}."}
                )

        return attrs

    def _normalized_sample_options(self, sample_type, sample_options):
        options = list(sample_options or [])
        option_ids = {item.id for item in options if getattr(item, "id", None)}

        if sample_type is not None and sample_type.id and sample_type.id not in option_ids:
            options.insert(0, sample_type)

        return options

    def create(self, validated_data):
        sample_options = validated_data.pop("sample_options", None)
        instance = super().create(validated_data)
        normalized = self._normalized_sample_options(instance.sample_type, sample_options)
        instance.sample_options.set(normalized)
        return instance

    def update(self, instance, validated_data):
        sample_options = validated_data.pop("sample_options", None)
        instance = super().update(instance, validated_data)

        if sample_options is None:
            sample_options = list(instance.sample_options.all())
        normalized = self._normalized_sample_options(instance.sample_type, sample_options)
        instance.sample_options.set(normalized)

        return instance

    def get_sample_options_details(self, obj):
        options = []
        for sample in obj.get_sample_options():
            options.append(
                {
                    "id": sample.id,
                    "custom_id": sample.custom_id,
                    "name": sample.name,
                    "bottle_type": sample.bottle_type,
                    "bottle_type_display": sample.get_bottle_type_display(),
                    "minimum_volume_ml": str(sample.minimum_volume_ml),
                    "fasting_required": bool(sample.fasting_required),
                    "fasting_hours": int(sample.fasting_hours or 0),
                }
            )
        return options


class SampleSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    """Serializer de amostras biológicas."""

    legacy_input_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "tipo_frasco": "bottle_type",
        "tipo de frasco": "bottle_type",
        "tipo_frasco_tubo": "bottle_type",
        "frasco": "bottle_type",
        "tubo": "bottle_type",
        "cor_tampa": "cap_color",
        "cor da tampa": "cap_color",
        "volume_minimo": "minimum_volume_ml",
        "volume_mínimo": "minimum_volume_ml",
        "volume mínimo": "minimum_volume_ml",
        "volume": "minimum_volume_ml",
        "jejum": "fasting_required",
        "exige_jejum": "fasting_required",
        "requer_jejum": "fasting_required",
        "horas_jejum": "fasting_hours",
        "horas de jejum": "fasting_hours",
        "temperatura": "storage_temperature",
        "temperatura_conservacao": "storage_temperature",
        "temperatura_conservação": "storage_temperature",
        "estabilidade_horas": "stability_hours",
        "horas_estabilidade": "stability_hours",
        "anticoagulante": "anticoagulant",
        "instrucoes_colheita": "collection_instructions",
        "instruções_colheita": "collection_instructions",
        "instrucoes_coleta": "collection_instructions",
        "instruções_coleta": "collection_instructions",
    }
    legacy_output_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "tipo_frasco": "bottle_type",
        "frasco": "bottle_type",
        "tubo": "bottle_type",
        "cor_tampa": "cap_color",
        "volume_minimo": "minimum_volume_ml",
        "volume_mínimo": "minimum_volume_ml",
        "jejum": "fasting_required",
        "horas_jejum": "fasting_hours",
        "temperatura": "storage_temperature",
        "estabilidade_horas": "stability_hours",
        "anticoagulante": "anticoagulant",
        "instrucoes_colheita": "collection_instructions",
        "instruções_colheita": "collection_instructions",
    }

    class Meta:
        model = Sample
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class MedicalExamSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    """Serializer para Exame Médico (imagem/diagnóstico)."""

    allowed_result_types = serializers.SerializerMethodField(method_name="get_allowed_result_types")
    registered_result_types = serializers.SerializerMethodField(method_name="get_registered_result_types")
    legacy_input_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "trl_horas": "turnaround_hours",
        "tempo_resposta": "turnaround_hours",
        "tempo_de_resposta": "turnaround_hours",
        "horas_resposta": "turnaround_hours",
        "preco": "price",
        "preço": "price",
        "metodo": "method",
        "método": "method",
        "setor": "sector",
        "sector": "sector",
        "iva": "vat_percentage",
        "percentagem_iva": "vat_percentage",
        "percentual_iva": "vat_percentage",
        "aplica_iva": "applies_vat_by_default",
        "aplica_iva_padrao": "applies_vat_by_default",
        "aplica_iva_padrão": "applies_vat_by_default",
        "ativo": "active",
        "criado_em": "created_at",
        "atualizado_em": "updated_at",
    }
    legacy_output_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "trl_horas": "turnaround_hours",
        "preco": "price",
        "preço": "price",
        "metodo": "method",
        "método": "method",
        "setor": "sector",
        "sector": "sector",
        "iva": "vat_percentage",
        "percentagem_iva": "vat_percentage",
        "aplica_iva": "applies_vat_by_default",
        "ativo": "active",
        "criado_em": "created_at",
        "atualizado_em": "updated_at",
        "tipos_result_permitidos": "allowed_result_types",
        "tipos_result_cadastrados": "registered_result_types",
        "tipos_resultado_permitidos": "allowed_result_types",
        "tipos_resultado_cadastrados": "registered_result_types",
    }

    def get_allowed_result_types(self, obj):
        return sorted(obj.tipos_result_permitidos)

    def get_registered_result_types(self, obj):
        return sorted(obj.tipos_result_cadastrados)

    class Meta:
        model = MedicalExam
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class LabExamFieldSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    """
    Serializer para campos de exam.
    Define parâmetros específicos de cada exam.
    """

    legacy_input_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "posicao": "position",
        "posição": "position",
        "ordem": "position",
        "exame": "exam",
        "tipo": "type",
        "unidade": "unit",
        "referencia_minima": "reference_min",
        "referência_mínima": "reference_min",
        "referencia_maxima": "reference_max",
        "referência_máxima": "reference_max",
        "critico_minimo": "critical_min",
        "crítico_mínimo": "critical_min",
        "critico_maximo": "critical_max",
        "crítico_máximo": "critical_max",
        "delta_maximo": "max_delta",
        "delta_máximo": "max_delta",
    }
    legacy_output_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "posicao": "position",
        "posição": "position",
        "ordem": "position",
        "exame": "exam",
        "tipo": "type",
        "unidade": "unit",
        "referencia_minima": "reference_min",
        "referência_mínima": "reference_min",
        "referencia_maxima": "reference_max",
        "referência_máxima": "reference_max",
        "critico_minimo": "critical_min",
        "crítico_mínimo": "critical_min",
        "critico_maximo": "critical_max",
        "crítico_máximo": "critical_max",
        "delta_maximo": "max_delta",
        "delta_máximo": "max_delta",
    }

    class Meta:
        model = LabExamField
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
        extra_kwargs = {
            "name": {
                "required": True,
                "help_text": "Nome do parâmetro/campo do exam",
            },
            "unit": {
                "required": False,
                "help_text": "Unidade de medida do parâmetro (ex: mg/dL, g/L)",
            },
        }


class MedicalExamFieldSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    """Serializer para parâmetros de exam médico."""

    legacy_input_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "posicao": "position",
        "posição": "position",
        "ordem": "position",
        "exame": "exam",
        "exame_medico": "exam",
        "exame_médico": "exam",
        "tipo": "type",
    }
    legacy_output_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "posicao": "position",
        "posição": "position",
        "ordem": "position",
        "exame": "exam",
        "exame_medico": "exam",
        "exame_médico": "exam",
        "tipo": "type",
    }

    def validate(self, attrs):
        exam = attrs.get("exam") or getattr(self.instance, "exam", None)
        type = attrs.get("type") or getattr(self.instance, "type", None)
        if exam and type:
            permitidos = exam.tipos_result_permitidos
            if type not in permitidos:
                method = exam.get_method_display() or exam.method
                permitidos_fmt = ", ".join(sorted(permitidos))
                raise serializers.ValidationError(
                    {"type": f"Tipo não permitido para o método {method}. Permitidos: {permitidos_fmt}."}
                )
        return attrs

    class Meta:
        model = MedicalExamField
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class OccupationalExamProfileSerializer(serializers.ModelSerializer):
    """Perfil ocupacional: bandeja de exames por profissão (medicina do trabalho)."""

    exams = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=LabTest.objects.all(),
        required=False,
    )
    exam_names = serializers.SerializerMethodField()

    class Meta:
        model = OccupationalExamProfile
        fields = "__all__"
        read_only_fields = [*CORE_READ_ONLY_FIELDS, "exam_names"]

    def get_exam_names(self, obj):
        return [exam.name for exam in obj.exams.all()]


class SampleRejectionReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = SampleRejectionReason
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class SampleRejectionSerializer(serializers.ModelSerializer):
    request_custom_id = serializers.CharField(source="request.custom_id", read_only=True)
    patient_name = serializers.CharField(source="request.patient.name", read_only=True)
    exam_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    def get_exam_name(self, obj):
        item = getattr(obj, "request_item", None)
        if item is None:
            return ""
        exam = getattr(item, "exam", None) or getattr(item, "medical_exam", None)
        return getattr(exam, "name", "") if exam else ""

    class Meta:
        model = SampleRejectionRecord
        fields = [
            "id",
            "custom_id",
            "request",
            "request_custom_id",
            "request_item",
            "patient_name",
            "exam_name",
            "reasons_text",
            "note",
            "status",
            "status_display",
            "created_at",
            "resolved_at",
        ]
        read_only_fields = fields


class LabRequestSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    """
    Serializer para requisições (por sector).

    - LAB: aceita `exams` (laboratoriais)
    - MED: aceita `medical_exams`
    """

    # DRF marca ManyToMany com `through` como read-only por padrão. Mantemos a
    # key `exams` (compatível com o frontend) mas tratamos manualmente.
    exams = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=LabTest.objects.all(),
        required=False,
    )

    medical_exams = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=MedicalExam.objects.all(),
        required=False,
    )
    samples = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    collection_guidance = serializers.SerializerMethodField()

    class SampleSummarySerializer(serializers.ModelSerializer):
        bottle_type_display = serializers.CharField(source="get_bottle_type_display", read_only=True)

        class Meta:
            model = Sample
            fields = [
                "id",
                "custom_id",
                "name",
                "bottle_type",
                "bottle_type_display",
                "cap_color",
                "minimum_volume_ml",
                "fasting_required",
                "fasting_hours",
            ]

    sample_details = SampleSummarySerializer(source="samples", many=True, read_only=True)
    legacy_input_aliases = {
        "id_custom": "custom_id",
        "paciente": "patient",
        "utente": "patient",
        "paciente_codigo": "patient",
        "paciente_código": "patient",
        "tipo": "type",
        "sector": "type",
        "setor": "type",
        "estado": "status",
        "situacao": "status",
        "situação": "status",
        "status_clinico": "clinical_status",
        "estado_clinico": "clinical_status",
        "estado_clínico": "clinical_status",
        "prioridade": "clinical_status",
        "urgencia": "clinical_status",
        "urgência": "clinical_status",
        "empresa_solicitante": "requesting_company",
        "empresa_requisitante": "requesting_company",
        "empresa_executora_externa": "external_executing_company",
        "empresa_externa": "external_executing_company",
        "analista": "analyst",
        "medico_solicitante": "requesting_physician",
        "médico_solicitante": "requesting_physician",
        "responsavel_analise": "analyst",
        "responsável_análise": "analyst",
        "exame": "exams",
        "exames": "exams",
        "exames_laboratoriais": "exams",
        "exame_laboratorial": "exams",
        "laboratoriais": "exams",
        "exame_medico": "medical_exams",
        "exame_médico": "medical_exams",
        "exames_medicos": "medical_exams",
        "exames_médicos": "medical_exams",
        "exams_medicos": "medical_exams",
        "itens": "items",
    }
    legacy_output_aliases = {
        "id_custom": "custom_id",
        "paciente_nome": "patient_name",
        "paciente_codigo": "patient_code",
        "paciente_código": "patient_code",
        "empresa_solicitante_nome": "requesting_company_name",
        "empresa_executora_externa_nome": "external_executing_company_name",
        "tipo": "type",
        "estado": "status",
        "status_clinico": "clinical_status",
        "estado_clinico": "clinical_status",
        "estado_clínico": "clinical_status",
        "prioridade": "clinical_status",
        "prioridade_display": "clinical_status_display",
        "possui_resultado_critico": "has_critical_result",
        "possui_resultado_crítico": "has_critical_result",
        "exames": "exams",
        "exames_laboratoriais": "exams",
        "exames_medicos": "medical_exams",
        "exames_médicos": "medical_exams",
        "exams_medicos": "medical_exams",
        "itens": "items",
        "guia_coleta": "collection_guidance",
        "guia_colheita": "collection_guidance",
    }

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    patient_code = serializers.CharField(source="patient.custom_id", read_only=True)
    patient_gender = serializers.CharField(source="patient.gender", read_only=True)
    occupational_profile_name = serializers.CharField(source="occupational_profile.name", read_only=True)
    requesting_physician_name = serializers.CharField(source="requesting_physician.name", read_only=True)
    requesting_physician_profession_name = serializers.CharField(
        source="requesting_physician.profession.name",
        read_only=True,
        default=None,
    )
    requesting_physician_role_name = serializers.CharField(
        source="requesting_physician.role.name",
        read_only=True,
        default=None,
    )
    requesting_physician_document_number = serializers.CharField(
        source="requesting_physician.document_number",
        read_only=True,
        default=None,
    )
    patient_age = serializers.SerializerMethodField()
    clinical_status_display = serializers.CharField(source="get_clinical_status_display", read_only=True)
    requesting_company_name = serializers.CharField(source="requesting_company.name", read_only=True)
    external_executing_company_name = serializers.CharField(source="external_executing_company.name", read_only=True)

    class LabRequestItemSummarySerializer(serializers.ModelSerializer):
        exam_name = serializers.CharField(source="exam.name", read_only=True)
        exam_custom_id = serializers.CharField(source="exam.custom_id", read_only=True)
        exam_method = serializers.CharField(source="exam.method", read_only=True)
        medical_exam_name = serializers.CharField(source="medical_exam.name", read_only=True)
        sample_options = serializers.SerializerMethodField()
        sample_status_display = serializers.CharField(source="get_sample_status_display", read_only=True)
        rejection_reason_names = serializers.SerializerMethodField()

        def get_rejection_reason_names(self, obj):
            return [reason.name for reason in obj.rejection_reasons.all()]

        def get_sample_options(self, obj):
            exam = getattr(obj, "exam", None)
            if exam is None:
                return []

            # LabTest (new model): sample_type is a CharField, container_type is a FK.
            if not callable(getattr(exam, "get_sample_options", None)):
                sample_type = getattr(exam, "sample_type", "") or ""
                ct = getattr(exam, "container_type", None)
                entry = {"name": sample_type}
                if ct is not None:
                    entry.update({
                        "container_type_id": ct.id,
                        "container_code": ct.code,
                        "container_name": ct.name,
                        "cap_color": ct.cap_color,
                        "cap_color_display": ct.get_cap_color_display(),
                        "additive": ct.additive,
                        "specimen_yields": ct.specimen_yields,
                        "volume_ml": str(ct.volume_ml) if ct.volume_ml is not None else None,
                        "inversions": ct.inversions,
                        "conservation_temperature": ct.conservation_temperature,
                        "conservation_temperature_display": ct.get_conservation_temperature_display(),
                        "conservation_max_hours": ct.conservation_max_hours,
                        "notes": ct.notes,
                    })
                return [entry] if sample_type or ct else []

            payload = []
            for sample in exam.get_sample_options():
                payload.append(
                    {
                        "id": sample.id,
                        "custom_id": sample.custom_id,
                        "name": sample.name,
                        "bottle_type": sample.bottle_type,
                        "bottle_type_display": sample.get_bottle_type_display(),
                        "minimum_volume_ml": str(sample.minimum_volume_ml),
                        "fasting_required": bool(sample.fasting_required),
                        "fasting_hours": int(sample.fasting_hours or 0),
                    }
                )
            return payload

        class Meta:
            model = LabRequestItem
            fields = [
                "id",
                "custom_id",
                "position",
                "exam",
                "exam_name",
                "exam_custom_id",
                "exam_method",
                "medical_exam",
                "medical_exam_name",
                "sample_options",
                "sample_status",
                "sample_status_display",
                "rejection_reason_names",
                "rejection_note",
                "sample_received_at",
            ]

    items = LabRequestItemSummarySerializer(many=True, read_only=True)

    class Meta:
        model = LabRequest
        fields = "__all__"
        read_only_fields = [
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "patient_code",
            "patient_gender",
            "requesting_company_name",
            "external_executing_company_name",
            "occupational_profile_name",
            "requesting_physician_name",
            "requesting_physician_profession_name",
            "requesting_physician_role_name",
            "requesting_physician_document_number",
            "patient_age",
            "clinical_status_display",
            "validated_at",
            "validated_by",
            "collected_at",
            "collected_by",
            "items",
            "sample_details",
            "collection_guidance",
            "has_critical_result",
            "requires_fasting",
            "fasting_hours",
        ]
        extra_kwargs = {
            "patient": {
                "required": True,
                "help_text": "Paciente para o qual a análise foi requisitada",
            },
            "type": {
                "required": False,
                "help_text": "Tipo/sector da requisição (LAB ou MED).",
            },
        }

    def validate(self, attrs):
        # Normaliza para permitir "default LAB" quando não informado.
        type = attrs.get("type") or getattr(self.instance, "type", None) or LabRequest.Type.LABORATORY

        exams = attrs.get("exams", None)
        medical_exams = attrs.get("medical_exams", None)
        occupational_profile = attrs.get(
            "occupational_profile",
            getattr(self.instance, "occupational_profile", None),
        )
        requesting_company = attrs.get("requesting_company", None)
        external_executing_company = attrs.get("external_executing_company", None)

        # Multi-tenant safety: empresas precisam estar no mesmo tenant da request.
        req = self.context.get("request")
        tenant = getattr(req, "tenant", None) if req is not None else None
        for field_name, empresa in (
            ("requesting_company", requesting_company),
            ("external_executing_company", external_executing_company),
        ):
            if (
                empresa is not None
                and tenant is not None
                and getattr(empresa, "tenant_id", None) != getattr(tenant, "id", None)
            ):
                raise serializers.ValidationError({field_name: "Empresa fora do escopo do tenant."})

        # Perfil ocupacional só faz sentido em requisições laboratoriais.
        if occupational_profile is not None:
            if type != LabRequest.Type.LABORATORY:
                raise serializers.ValidationError(
                    {"occupational_profile": "Perfil ocupacional só se aplica a requisições laboratoriais."}
                )
            attrs["is_occupational"] = True

        # Regra: requisição por sector, sem mistura.
        if type == LabRequest.Type.LABORATORY:
            if medical_exams:
                raise serializers.ValidationError({"medical_exams": "Requisição LAB não aceita exams médicos."})
        elif type == LabRequest.Type.MEDICAL_EXAM:
            if exams:
                raise serializers.ValidationError({"exams": "Requisição MED não aceita exams laboratoriais."})
        else:
            raise serializers.ValidationError({"type": "Tipo de requisição inválido."})

        # No create: exigir pelo menos um item.
        if self.instance is None:
            profile_has_exams = occupational_profile is not None and occupational_profile.exams.exists()
            if type == LabRequest.Type.LABORATORY and not exams and not profile_has_exams:
                raise serializers.ValidationError({"exams": "Informe ao menos um exam laboratorial."})
            if type == LabRequest.Type.MEDICAL_EXAM and not medical_exams:
                raise serializers.ValidationError({"medical_exams": "Informe ao menos um exam médico."})

        return attrs

    def get_collection_guidance(self, obj):
        return obj.build_collection_guidance()

    def get_patient_age(self, obj):
        try:
            return obj.patient.idade()
        except Exception:
            return ""

    def create(self, validated_date):
        # `exams` (LAB) é ManyToMany com `through`. `medical_exams` (MED) é derivado dos itens.
        exams = validated_date.pop("exams", [])
        medical_exams = validated_date.pop("medical_exams", [])

        type = validated_date.get("type") or LabRequest.Type.LABORATORY

        # Auto-associar empresa solicitante pela empresa do patient (quando não fornecida).
        if not validated_date.get("requesting_company") and validated_date.get("patient"):
            try:
                origin_company = getattr(validated_date["patient"], "origin_company", None)
                if origin_company is not None:
                    validated_date["requesting_company"] = origin_company
            except Exception:
                pass

        request = LabRequest.objects.create(**validated_date)

        if type == LabRequest.Type.LABORATORY:
            # Exames do perfil ocupacional somam-se aos escolhidos manualmente.
            profile = validated_date.get("occupational_profile")
            if profile is not None:
                seen = {exam.id for exam in exams}
                exams = list(exams) + [exam for exam in profile.exams.all() if exam.id not in seen]
            for exam in exams:
                request.add_exam(exam)
        elif type == LabRequest.Type.MEDICAL_EXAM:
            for medical_exam in medical_exams:
                request.add_medical_exam(medical_exam)

        return request

    def update(self, instance, validated_date):
        # type é imutável por regra de sector
        type_novo = validated_date.get("type", instance.type)
        if type_novo != instance.type:
            raise serializers.ValidationError({"type": "Tipo/sector da requisição é imutável."})

        exams = validated_date.pop("exams", None)
        medical_exams = validated_date.pop("medical_exams", None)

        instance = super().update(instance, validated_date)

        if instance.type == LabRequest.Type.LABORATORY:
            if medical_exams is not None:
                raise serializers.ValidationError({"medical_exams": "Requisição LAB não aceita exams médicos."})
            if exams is not None:
                desejados = {e.id for e in exams}
                if instance.occupational_profile_id:
                    # Exames da bandeja do perfil ocupacional somam-se aos escolhidos.
                    desejados |= set(instance.occupational_profile.exams.values_list("id", flat=True))
                atuais = set(instance.items.filter(exam__isnull=False).values_list("exam_id", flat=True))

                remover = atuais - desejados
                adicionar = desejados - atuais

                if remover:
                    instance.items.filter(exam_id__in=remover).delete()

                for exam in LabTest.objects.filter(id__in=adicionar):
                    instance.add_exam(exam)

                instance._sync_samples_from_items()

        elif instance.type == LabRequest.Type.MEDICAL_EXAM:
            if exams is not None:
                raise serializers.ValidationError({"exams": "Requisição MED não aceita exams laboratoriais."})
            if medical_exams is not None:
                desejados = {e.id for e in medical_exams}
                atuais = set(
                    instance.items.filter(medical_exam__isnull=False).values_list("medical_exam_id", flat=True)
                )

                remover = atuais - desejados
                adicionar = desejados - atuais

                if remover:
                    instance.items.filter(medical_exam_id__in=remover).delete()

                for medical_exam in MedicalExam.objects.filter(id__in=adicionar):
                    instance.add_medical_exam(medical_exam)

                instance._sync_samples_from_items()

        return instance


class LabRequestItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    """
    Serializer para itens de uma requisição de análise.
    Vincula exams específicos a uma requisição.
    """

    legacy_input_aliases = {
        "id_custom": "custom_id",
        "posicao": "position",
        "posição": "position",
        "ordem": "position",
        "requisicao": "request",
        "requisição": "request",
        "pedido": "request",
        "exame": "exam",
        "exame_laboratorial": "exam",
        "exame_medico": "medical_exam",
        "exame_médico": "medical_exam",
    }
    legacy_output_aliases = {
        "id_custom": "custom_id",
        "posicao": "position",
        "posição": "position",
        "ordem": "position",
        "requisicao": "request",
        "requisição": "request",
        "pedido": "request",
        "exame": "exam",
        "exame_laboratorial": "exam",
        "exame_medico": "medical_exam",
        "exame_médico": "medical_exam",
    }

    class Meta:
        model = LabRequestItem
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
        extra_kwargs = {
            "request": {
                "required": True,
                "help_text": "Requisição pai que contém este item",
            },
        }


class ResultItemSerializer(serializers.ModelSerializer):
    """
    Serializer para resultados de análises.
    Contém os valores medidos para cada parâmetro.
    """

    class Meta:
        model = ResultItem
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
        extra_kwargs = {
            "result_value": {
                "required": False,
                "allow_null": True,
                "help_text": "Valor medido do parâmetro",
            },
        }


class LaboratoryResultItemSerializer(serializers.ModelSerializer):
    """
    Serializer enxuto para a tela do laboratório.

    Inclui campos derivados para evitar N+1 requests no frontend.
    """

    exam_name = serializers.CharField(source="exam_field.test.name", read_only=True)
    exam_id = serializers.IntegerField(source="exam_field.test_id", read_only=True)

    exam_field_name = serializers.CharField(source="exam_field.name", read_only=True)
    exam_field_unit = serializers.CharField(source="exam_field.unit", read_only=True)
    exam_field_type = serializers.CharField(source="exam_field.result_type", read_only=True)
    exam_field_choices = serializers.JSONField(source="exam_field.result_choices", read_only=True)
    exam_field_position = serializers.IntegerField(source="exam_field.sequence", read_only=True)
    exam_field_reference = serializers.SerializerMethodField()
    exam_field_reference_low = serializers.DecimalField(source="exam_field.reference_low", max_digits=12, decimal_places=4, read_only=True)
    exam_field_reference_high = serializers.DecimalField(source="exam_field.reference_high", max_digits=12, decimal_places=4, read_only=True)
    exam_field_critical_low = serializers.DecimalField(source="exam_field.critical_low", max_digits=12, decimal_places=4, read_only=True)
    exam_field_critical_high = serializers.DecimalField(source="exam_field.critical_high", max_digits=12, decimal_places=4, read_only=True)

    def get_exam_field_reference(self, obj):
        ef = obj.exam_field
        if ef is None:
            return ""
        if ef.reference_range:
            return ef.reference_range
        lo = ef.reference_low
        hi = ef.reference_high
        if lo is not None and hi is not None:
            def _fmt(v):
                v = float(v)
                return str(int(v)) if v == int(v) else f"{v:g}"
            return f"{_fmt(lo)} – {_fmt(hi)}"
        if lo is not None:
            return f"≥ {float(lo):g}"
        if hi is not None:
            return f"≤ {float(hi):g}"
        return ""
    patient_name = serializers.CharField(source="result.request.patient.name", read_only=True)
    request_id = serializers.IntegerField(source="result.request_id", read_only=True)
    request_code = serializers.CharField(source="result.request.custom_id", read_only=True)

    class Meta:
        model = ResultItem
        fields = [
            "id",
            "custom_id",
            "position",
            "result",
            "request_id",
            "request_code",
            "patient_name",
            "exam_field",
            "exam_id",
            "exam_name",
            "exam_field_name",
            "exam_field_position",
            "exam_field_unit",
            "exam_field_type",
            "exam_field_choices",
            "exam_field_reference",
            "exam_field_reference_low",
            "exam_field_reference_high",
            "exam_field_critical_low",
            "exam_field_critical_high",
            "result_value",
            "result_text",
            "clinical_status",
            "report_color",
            "critical_alert",
            "status",
            "validated_by",
            "validation_date",
            "disregard_reason",
            "disregarded_by",
            "disregarded_at",
            "disregard_validated_by",
            "disregard_validation_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "custom_id",
            "position",
            "result",
            "request_id",
            "request_code",
            "patient_name",
            "exam_field",
            "exam_id",
            "exam_name",
            "exam_field_name",
            "exam_field_position",
            "exam_field_unit",
            "exam_field_type",
            "exam_field_reference",
            "exam_field_reference_low",
            "exam_field_reference_high",
            "exam_field_critical_low",
            "exam_field_critical_high",
            "clinical_status",
            "report_color",
            "critical_alert",
            "status",
            "validated_by",
            "validation_date",
            "disregard_reason",
            "disregarded_by",
            "disregarded_at",
            "disregard_validated_by",
            "disregard_validation_date",
            "created_at",
            "updated_at",
        ]


class MedicalResultFileSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):

    file = serializers.FileField(required=True)
    legacy_input_aliases = {
        "arquivo": "file",
        "ficheiro": "file",
        "ficheiro_resultado": "file",
        "arquivo_resultado": "file",
        "tipo": "type",
        "descricao": "description",
        "descrição": "description",
        "laudo": "description",
        "relatorio": "description",
        "relatório": "description",
        "requisicao_item": "request_item",
        "requisição_item": "request_item",
        "item_requisicao": "request_item",
        "item_requisição": "request_item",
        "exame_medico": "medical_exam",
        "exame_médico": "medical_exam",
        "resultado": "result",
        "id_custom": "custom_id",
        "criado_em": "created_at",
        "atualizado_em": "updated_at",
    }
    legacy_output_aliases = {
        "arquivo": "file",
        "ficheiro": "file",
        "tipo": "type",
        "descricao": "description",
        "descrição": "description",
        "requisicao_item": "request_item",
        "requisição_item": "request_item",
        "exame_medico": "medical_exam",
        "exame_médico": "medical_exam",
        "resultado": "result",
        "id_custom": "custom_id",
        "criado_em": "created_at",
        "atualizado_em": "updated_at",
    }

    def validate(self, attrs):
        medical_exam = attrs.get("medical_exam") or getattr(self.instance, "medical_exam", None)
        type = attrs.get("type") or getattr(self.instance, "type", None)
        file = attrs.get("file") or getattr(self.instance, "file", None)

        erros = {}
        if medical_exam and type:
            tipos_permitidos = medical_exam.tipos_result_cadastrados
            if type not in tipos_permitidos:
                method = medical_exam.get_method_display() or medical_exam.method
                permitidos_fmt = ", ".join(sorted(tipos_permitidos))
                erros["type"] = f"Tipo não permitido para o método {method}. Permitidos: {permitidos_fmt}."

        if file and type:
            try:
                validate_medical_file_for_type(file, type)
            except ValidationError as err:
                erros["file"] = err.messages[0] if err.messages else "Arquivo inválido."

        if erros:
            raise serializers.ValidationError(erros)

        return attrs

    class Meta:
        model = MedicalResultFile
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


SERIALIZER_MAP = {
    "sample": SampleSerializer,
    "exam": LabExamSerializer,
    "examemedico": MedicalExamSerializer,
    "examecampo": LabExamFieldSerializer,
    "examemedicocampo": MedicalExamFieldSerializer,
    "patient": PatientSerializer,
    "requisicaoanalise": LabRequestSerializer,
    "requisicaoitem": LabRequestItemSerializer,
    "resultadoitem": ResultItemSerializer,
    "resultadomedicoarquivo": MedicalResultFileSerializer,
}

# Backwards-compatible aliases while imports are migrated incrementally.
