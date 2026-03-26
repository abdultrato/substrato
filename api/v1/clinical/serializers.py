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
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.medical_exam import MedicalExam, MedicalExamField
from apps.clinical.models.medical_result_file import (
    MedicalResultFile,
    validate_medical_file_for_type,
)
from apps.clinical.models.patient import Patient
from apps.clinical.models.result_item import ResultItem
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
    legacy_input_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "data_nascimento": "birth_date",
        "genero": "gender",
        "raca_origem": "race_origin",
        "tipo_documento": "document_type",
        "numero_id": "document_number",
        "contacto": "contact",
        "morada": "address",
        "empresa_origem": "origin_company",
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

    def validate_email(self, value):
        """Validação adicional de email."""
        if (
            value
            and Patient.objects.filter(email=value).exclude(id=self.instance.id if self.instance else None).exists()
        ):
            raise serializers.ValidationError("Este email já está registrado.")
        return value

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

    legacy_input_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "trl_horas": "turnaround_hours",
        "preco": "price",
        "metodo": "method",
        "setor": "sector",
        "ativo": "active",
        "criado_em": "created_at",
        "atualizado_em": "updated_at",
    }
    legacy_output_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "trl_horas": "turnaround_hours",
        "preco": "price",
        "metodo": "method",
        "setor": "sector",
        "ativo": "active",
        "criado_em": "created_at",
        "atualizado_em": "updated_at",
    }

    class Meta:
        model = LabExam
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
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


class MedicalExamSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    """Serializer para Exame Médico (imagem/diagnóstico)."""

    allowed_result_types = serializers.SerializerMethodField(method_name="get_allowed_result_types")
    registered_result_types = serializers.SerializerMethodField(method_name="get_registered_result_types")
    legacy_input_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "trl_horas": "turnaround_hours",
        "preco": "price",
        "metodo": "method",
        "setor": "sector",
        "ativo": "active",
        "criado_em": "created_at",
        "atualizado_em": "updated_at",
    }
    legacy_output_aliases = {
        "id_custom": "custom_id",
        "nome": "name",
        "trl_horas": "turnaround_hours",
        "preco": "price",
        "metodo": "method",
        "setor": "sector",
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


class LabExamFieldSerializer(serializers.ModelSerializer):
    """
    Serializer para campos de exam.
    Define parâmetros específicos de cada exam.
    """

    class Meta:
        model = LabExamField
        fields = "__all__"
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


class MedicalExamFieldSerializer(serializers.ModelSerializer):
    """Serializer para parâmetros de exam médico."""

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
        queryset=LabExam.objects.all(),
        required=False,
    )

    medical_exams = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=MedicalExam.objects.all(),
        required=False,
    )
    legacy_input_aliases = {
        "id_custom": "custom_id",
        "paciente": "patient",
        "tipo": "type",
        "estado": "status",
        "status_clinico": "clinical_status",
        "empresa_solicitante": "requesting_company",
        "empresa_executora_externa": "external_executing_company",
        "analista": "analyst",
        "exams_medicos": "medical_exams",
        "itens": "items",
    }
    legacy_output_aliases = {
        "id_custom": "custom_id",
        "paciente_nome": "patient_name",
        "paciente_codigo": "patient_code",
        "empresa_solicitante_nome": "requesting_company_name",
        "empresa_executora_externa_nome": "external_executing_company_name",
        "tipo": "type",
        "estado": "status",
        "status_clinico": "clinical_status",
        "possui_resultado_critico": "has_critical_result",
        "exams_medicos": "medical_exams",
        "itens": "items",
    }

    patient_name = serializers.CharField(source="patient.name", read_only=True)
    patient_code = serializers.CharField(source="patient.custom_id", read_only=True)
    requesting_company_name = serializers.CharField(source="requesting_company.name", read_only=True)
    external_executing_company_name = serializers.CharField(source="external_executing_company.name", read_only=True)

    class LabRequestItemSummarySerializer(serializers.ModelSerializer):
        exam_name = serializers.CharField(source="exam.name", read_only=True)
        medical_exam_name = serializers.CharField(source="medical_exam.name", read_only=True)

        class Meta:
            model = LabRequestItem
            fields = [
                "id",
                "custom_id",
                "exam",
                "exam_name",
                "medical_exam",
                "medical_exam_name",
            ]

    items = LabRequestItemSummarySerializer(source="itens", many=True, read_only=True)

    class Meta:
        model = LabRequest
        fields = "__all__"
        read_only_fields = [
            *CORE_READ_ONLY_FIELDS,
            "patient_name",
            "patient_code",
            "requesting_company_name",
            "external_executing_company_name",
            "items",
            "has_critical_result",
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
            if type == LabRequest.Type.LABORATORY and not exams:
                raise serializers.ValidationError({"exams": "Informe ao menos um exam laboratorial."})
            if type == LabRequest.Type.MEDICAL_EXAM and not medical_exams:
                raise serializers.ValidationError({"medical_exams": "Informe ao menos um exam médico."})

        return attrs

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
                atuais = set(instance.items.filter(exam__isnull=False).values_list("exam_id", flat=True))

                remover = atuais - desejados
                adicionar = desejados - atuais

                if remover:
                    instance.items.filter(exam_id__in=remover).delete()

                for exam in LabExam.objects.filter(id__in=adicionar):
                    instance.add_exam(exam)

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

        return instance


class LabRequestItemSerializer(serializers.ModelSerializer):
    """
    Serializer para itens de uma requisição de análise.
    Vincula exams específicos a uma requisição.
    """

    class Meta:
        model = LabRequestItem
        fields = "__all__"
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
        extra_kwargs = {
            "request_item": {
                "required": True,
                "help_text": "Item da requisição para o qual este é o result",
            },
            "value": {
                "required": False,
                "allow_null": True,
                "help_text": "Valor medido do parâmetro",
            },
        }


class LaboratoryResultItemSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):
    """
    Serializer enxuto para a tela do laboratório.

    Inclui campos derivados para evitar N+1 requests no frontend.
    """

    exam_name = serializers.CharField(source="exam_field.exam.name", read_only=True)
    exam_id = serializers.IntegerField(source="exam_field.exam_id", read_only=True)

    exam_field_name = serializers.CharField(source="exam_field.name", read_only=True)
    exam_field_unit = serializers.CharField(source="exam_field.unit", read_only=True)
    exam_field_type = serializers.CharField(source="exam_field.type", read_only=True)
    exam_field_reference = serializers.CharField(source="exam_field.referencia", read_only=True)
    legacy_output_aliases = {
        "paciente_nome": "patient_name",
        "requisicao_id": "request_id",
        "requisicao_codigo": "request_code",
        "exame_id": "exam_id",
        "exame_nome": "exam_name",
        "exame_campo_nome": "exam_field_name",
        "exame_campo_unidade": "exam_field_unit",
        "exame_campo_tipo": "exam_field_type",
        "exam_field_referencia": "exam_field_reference",
        "exame_campo_referencia": "exam_field_reference",
    }

    patient_name = serializers.CharField(source="result.request.patient.name", read_only=True)
    request_id = serializers.IntegerField(source="result.request_id", read_only=True)
    request_code = serializers.CharField(source="result.request.custom_id", read_only=True)

    class Meta:
        model = ResultItem
        fields = [
            "id",
            "custom_id",
            "result",
            "request_id",
            "request_code",
            "patient_name",
            "exam_field",
            "exam_id",
            "exam_name",
            "exam_field_name",
            "exam_field_unit",
            "exam_field_type",
            "exam_field_reference",
            "result_value",
            "clinical_status",
            "report_color",
            "critical_alert",
            "status",
            "validated_by",
            "validation_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "custom_id",
            "result",
            "request_id",
            "request_code",
            "patient_name",
            "exam_field",
            "exam_id",
            "exam_name",
            "exam_field_name",
            "exam_field_unit",
            "exam_field_type",
            "exam_field_reference",
            "clinical_status",
            "report_color",
            "critical_alert",
            "status",
            "validated_by",
            "validation_date",
            "created_at",
            "updated_at",
        ]


class MedicalResultFileSerializer(LegacyAliasSerializerMixin, serializers.ModelSerializer):

    file = serializers.FileField(required=True)
    legacy_input_aliases = {
        "arquivo": "file",
        "tipo": "type",
        "descricao": "description",
        "requisicao_item": "request_item",
        "exame_medico": "medical_exam",
        "resultado": "result",
        "id_custom": "custom_id",
        "criado_em": "created_at",
        "atualizado_em": "updated_at",
    }
    legacy_output_aliases = {
        "arquivo": "file",
        "tipo": "type",
        "descricao": "description",
        "requisicao_item": "request_item",
        "exame_medico": "medical_exam",
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


SERIALIZER_MAP = {
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
