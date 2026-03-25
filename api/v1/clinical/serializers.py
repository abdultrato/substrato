from __future__ import annotations

from functools import lru_cache
import unicodedata

from django.core.exceptions import ValidationError
from django.utils.translation import override
from django_countries import countries
from rest_framework import serializers

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.medical_exam import MedicalExam, MedicalExamField
from apps.clinical.models.medical_result_file import (
    MedicalResultFile,
    validar_arquivo_medico_por_tipo,
)
from apps.clinical.models.patient import Patient
from apps.clinical.models.result_item import ResultItem
from core.constants.provenance import Proveniencia

CORE_READ_ONLY_FIELDS = [
    "id",
    "id_custom",
    "inquilino",
    "criado_por",
    "atualizado_por",
    "criado_em",
    "atualizado_em",
    "deletado",
    "deletado_em",
    "deletado_por",
    "versao",
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
    Inclui campos de paciente para leitura/escrita com validação de domínio.
    """

    empresa_origem_nome = serializers.CharField(source="empresa_origem.nome", read_only=True)

    class Meta:
        model = Patient
        # Expor todos os campos do modelo (incluindo os de auditoria/tenant).
        # Campos corporativos permanecem read-only para evitar manipulação via API.
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
        extra_kwargs = {
            "nome": {
                "required": True,
                "min_length": 2,
                "max_length": 150,
                "help_text": "Nome completo do paciente (2-150 caracteres)",
                "error_messages": {
                    "required": "Nome é obrigatório",
                    "min_length": "Nome deve ter no mínimo 2 caracteres",
                    "max_length": "Nome não pode ter mais de 150 caracteres",
                },
            },
            "email": {
                "required": False,
                "allow_blank": True,
                "help_text": "Email único do paciente para contato",
                "error_messages": {
                    "invalid": "Email inválido",
                    "unique": "Este email já está registrado no sistema",
                },
            },
            "contacto": {
                "required": False,
                "allow_blank": True,
                "help_text": "Número de telefone para contato (incluir indicativo país)",
            },
            "data_nascimento": {
                "required": False,
                "allow_null": True,
                "help_text": "Data de nascimento do paciente (formato YYYY-MM-DD)",
            },
            "genero": {
                # O modelo já define default, então não pode ser required=True
                "required": False,
                "help_text": "Gênero do paciente (M ou F)",
            },
            "raca_origem": {
                "required": False,
                "help_text": "Classificação de raça/origem",
            },
            "tipo_documento": {
                "required": False,
                "help_text": "Tipo de documento de identidade (BI, CC, Passaporte, etc)",
            },
            "numero_id": {
                "required": False,
                "allow_blank": True,
                "help_text": "Número único do documento de identidade",
                "error_messages": {
                    "unique": "Este número de documento já está registrado",
                },
            },
            "proveniencia": {
                "required": False,
                "help_text": "Origem/proveniência do paciente na clínica",
            },
            "gestante": {
                "required": False,
                "help_text": "Indicador se paciente está gestante",
            },
            "idade_gestacional_semanas": {
                "required": False,
                "allow_null": True,
                "help_text": "Semanas de gestação (preencher se gestante)",
            },
        }

    def to_internal_value(self, data):
        """
        Compat:
        - Antes, `morada` era JSON (rua/numero/bairro/cidade/provincia/...).
        - Agora, o modelo usa campos reais `endereco_*` + `morada` (texto).

        Aceitamos `morada` como objeto e mapeamos para `endereco_*` para não
        quebrar clientes legados.
        """
        if isinstance(data, dict) and isinstance(data.get("morada"), dict):
            morada_obj = data.get("morada") or {}
            # QueryDict (request.data) pode ser imutável; usar cópia.
            data = data.copy() if hasattr(data, "copy") else dict(data)
            data.pop("morada", None)

            mapping = {
                "rua": "endereco_rua",
                "numero": "endereco_numero",
                "bairro": "endereco_bairro",
                "cidade": "endereco_cidade",
                "provincia": "endereco_provincia",
                "codigo_postal": "endereco_codigo_postal",
                "pais": "endereco_pais",
                "complemento": "endereco_complemento",
            }
            for src_key, dst_field in mapping.items():
                if dst_field in data:
                    continue
                v = morada_obj.get(src_key)
                if v is None:
                    continue
                data[dst_field] = v

            if "morada" not in data:
                parts = []
                for k in (
                    "rua",
                    "numero",
                    "bairro",
                    "cidade",
                    "provincia",
                    "codigo_postal",
                    "complemento",
                ):
                    v = morada_obj.get(k)
                    if v:
                        parts.append(str(v).strip())
                data["morada"] = ", ".join([p for p in parts if p]).strip()

        # Compat: aceitar nomes de países (ex.: "Moçambique") e converter para
        # ISO alpha-2 (ex.: "MZ") para passar na validação do CountryField.
        if isinstance(data, dict) and "endereco_pais" in data:
            data = data.copy() if hasattr(data, "copy") else dict(data)
            data["endereco_pais"] = _coerce_country_to_code(data.get("endereco_pais"))

        return super().to_internal_value(data)

    def validate_email(self, value):
        """Validação adicional de email."""
        if (
            value
            and Patient.objects.filter(email=value).exclude(id=self.instance.id if self.instance else None).exists()
        ):
            raise serializers.ValidationError("Este email já está registrado.")
        return value

    def validate_numero_id(self, value):
        """Validação adicional de número de documento."""
        if (
            value
            and Patient.objects.filter(numero_id=value)
            .exclude(id=self.instance.id if self.instance else None)
            .exists()
        ):
            raise serializers.ValidationError("Este número de documento já está registrado.")
        return value

    def validate(self, data):
        """Validación de campos interdependientes."""
        if data.get("gestante") and not data.get("idade_gestacional_semanas"):
            raise serializers.ValidationError(
                {"idade_gestacional_semanas": "Idade gestacional é obrigatória quando gestante é true"}
            )

        # Medicina ocupacional: paciente deve estar associado a uma empresa.
        proveniencia = (
            data.get("proveniencia") if "proveniencia" in data else getattr(self.instance, "proveniencia", None)
        )
        empresa = (
            data.get("empresa_origem") if "empresa_origem" in data else getattr(self.instance, "empresa_origem", None)
        )
        if proveniencia == Proveniencia.MEDICINA_OCUPACIONAL and not empresa:
            raise serializers.ValidationError(
                {"empresa_origem": "Empresa é obrigatória quando a proveniência é Medicina Ocupacional."}
            )
        return data


class LabExamSerializer(serializers.ModelSerializer):
    """
    Serializer para a entidade Exame com validação robusta.
    Inclui validação de preço e tempo de resposta.
    """

    class Meta:
        model = LabExam
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS
        extra_kwargs = {
            "nome": {
                "required": True,
                "min_length": 3,
                "max_length": 100,
                "help_text": "Nome descritivo do exame (3-100 caracteres)",
                "error_messages": {
                    "required": "Nome do exame é obrigatório",
                    "min_length": "Nome deve ter no mínimo 3 caracteres",
                    "max_length": "Nome não pode ter mais de 100 caracteres",
                },
            },
            "trl_horas": {
                # O modelo já define default.
                "required": False,
                "min_value": 1,
                "max_value": 720,  # 30 dias máximo
                "help_text": "Tempo de resposta em horas (1-720)",
                "error_messages": {
                    "required": "Tempo de resposta é obrigatório",
                    "min_value": "TRL deve ser no mínimo 1 hora",
                    "max_value": "TRL não pode ser maior que 720 horas (30 dias)",
                },
            },
            "preco": {
                # O modelo já define default (mas validamos > 0 em validate_preco).
                "required": False,
                "decimal_places": 2,
                "help_text": "Preço do exame em unidades monetárias (≥0.01)",
                "error_messages": {
                    "required": "Preço é obrigatório",
                    "invalid": "Preço deve ser um valor decimal válido",
                },
            },
            "metodo": {
                "required": True,
                "help_text": "Método utilizado para realizar o exame",
            },
            "setor": {
                # O modelo permite null/blank (e há constraint de unicidade).
                # DRF injeta `default=None` para campos nullable em constraints, então
                # não podemos forçar required=True aqui.
                "required": False,
                "help_text": "Setor do laboratório responsável pelo exame",
            },
        }

    def validate_preco(self, value):
        """Validação que preço deve ser positivo."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Preço deve ser maior que zero.")
        return value


class MedicalExamSerializer(serializers.ModelSerializer):
    """Serializer para Exame Médico (imagem/diagnóstico)."""

    tipos_resultado_permitidos = serializers.SerializerMethodField(method_name="get_allowed_result_types")
    tipos_resultado_cadastrados = serializers.SerializerMethodField(method_name="get_registered_result_types")

    def get_allowed_result_types(self, obj):
        return sorted(obj.tipos_resultado_permitidos)

    def get_registered_result_types(self, obj):
        return sorted(obj.tipos_resultado_cadastrados)

    class Meta:
        model = MedicalExam
        fields = "__all__"
        read_only_fields = CORE_READ_ONLY_FIELDS


class LabExamFieldSerializer(serializers.ModelSerializer):
    """
    Serializer para campos de exame.
    Define parâmetros específicos de cada exame.
    """

    class Meta:
        model = LabExamField
        fields = "__all__"
        extra_kwargs = {
            "nome": {
                "required": True,
                "help_text": "Nome do parâmetro/campo do exame",
            },
            "unidade": {
                "required": False,
                "help_text": "Unidade de medida do parâmetro (ex: mg/dL, g/L)",
            },
        }


class MedicalExamFieldSerializer(serializers.ModelSerializer):
    """Serializer para parâmetros de exame médico."""

    def validate(self, attrs):
        exame = attrs.get("exame") or getattr(self.instance, "exame", None)
        tipo = attrs.get("tipo") or getattr(self.instance, "tipo", None)
        if exame and tipo:
            permitidos = exame.tipos_resultado_permitidos
            if tipo not in permitidos:
                metodo = exame.get_metodo_display() or exame.metodo
                permitidos_fmt = ", ".join(sorted(permitidos))
                raise serializers.ValidationError(
                    {"tipo": f"Tipo não permitido para o método {metodo}. Permitidos: {permitidos_fmt}."}
                )
        return attrs

    class Meta:
        model = MedicalExamField
        fields = "__all__"


class LabRequestSerializer(serializers.ModelSerializer):
    """
    Serializer para requisições (por setor).

    - LAB: aceita `exames` (laboratoriais)
    - MED: aceita `exames_medicos`
    """

    # DRF marca ManyToMany com `through` como read-only por padrão. Mantemos a
    # chave `exames` (compatível com o frontend) mas tratamos manualmente.
    exames = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=LabExam.objects.all(),
        required=False,
    )

    exames_medicos = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=MedicalExam.objects.all(),
        required=False,
    )

    paciente_nome = serializers.CharField(source="paciente.nome", read_only=True)
    paciente_codigo = serializers.CharField(source="paciente.id_custom", read_only=True)
    empresa_solicitante_nome = serializers.CharField(source="empresa_solicitante.nome", read_only=True)
    empresa_executora_externa_nome = serializers.CharField(source="empresa_executora_externa.nome", read_only=True)

    class LabRequestItemSummarySerializer(serializers.ModelSerializer):
        exame_nome = serializers.CharField(source="exame.nome", read_only=True)
        exame_medico_nome = serializers.CharField(source="exame_medico.nome", read_only=True)

        class Meta:
            model = LabRequestItem
            fields = [
                "id",
                "id_custom",
                "exame",
                "exame_nome",
                "exame_medico",
                "exame_medico_nome",
            ]

    itens = LabRequestItemSummarySerializer(many=True, read_only=True)

    class Meta:
        model = LabRequest
        fields = "__all__"
        read_only_fields = [
            *CORE_READ_ONLY_FIELDS,
            "paciente_nome",
            "paciente_codigo",
            "empresa_solicitante_nome",
            "empresa_executora_externa_nome",
            "itens",
            "possui_resultado_critico",
        ]
        extra_kwargs = {
            "paciente": {
                "required": True,
                "help_text": "Paciente para o qual a análise foi requisitada",
            },
            "tipo": {
                "required": False,
                "help_text": "Tipo/setor da requisição (LAB ou MED).",
            },
        }

    def validate(self, attrs):
        # Normaliza para permitir "default LAB" quando não informado.
        tipo = attrs.get("tipo") or getattr(self.instance, "tipo", None) or LabRequest.Tipo.LABORATORIO

        exames = attrs.get("exames", None)
        exames_medicos = attrs.get("exames_medicos", None)
        empresa_solicitante = attrs.get("empresa_solicitante", None)
        empresa_executora_externa = attrs.get("empresa_executora_externa", None)

        # Multi-tenant safety: empresas precisam estar no mesmo inquilino da request.
        req = self.context.get("request")
        tenant = getattr(req, "inquilino", None) if req is not None else None
        for field_name, empresa in (
            ("empresa_solicitante", empresa_solicitante),
            ("empresa_executora_externa", empresa_executora_externa),
        ):
            if (
                empresa is not None
                and tenant is not None
                and getattr(empresa, "inquilino_id", None) != getattr(tenant, "id", None)
            ):
                raise serializers.ValidationError({field_name: "Empresa fora do escopo do inquilino."})

        # Regra: requisição por setor, sem mistura.
        if tipo == LabRequest.Tipo.LABORATORIO:
            if exames_medicos:
                raise serializers.ValidationError({"exames_medicos": "Requisição LAB não aceita exames médicos."})
        elif tipo == LabRequest.Tipo.EXAME_MEDICO:
            if exames:
                raise serializers.ValidationError({"exames": "Requisição MED não aceita exames laboratoriais."})
        else:
            raise serializers.ValidationError({"tipo": "Tipo de requisição inválido."})

        # No create: exigir pelo menos um item.
        if self.instance is None:
            if tipo == LabRequest.Tipo.LABORATORIO and not exames:
                raise serializers.ValidationError({"exames": "Informe ao menos um exame laboratorial."})
            if tipo == LabRequest.Tipo.EXAME_MEDICO and not exames_medicos:
                raise serializers.ValidationError({"exames_medicos": "Informe ao menos um exame médico."})

        return attrs

    def create(self, validated_data):
        # `exames` (LAB) é ManyToMany com `through`. `exames_medicos` (MED) é derivado dos itens.
        exames = validated_data.pop("exames", [])
        exames_medicos = validated_data.pop("exames_medicos", [])

        tipo = validated_data.get("tipo") or LabRequest.Tipo.LABORATORIO

        # Auto-associar empresa solicitante pela empresa do paciente (quando não fornecida).
        if not validated_data.get("empresa_solicitante") and validated_data.get("paciente"):
            try:
                empresa_origem = getattr(validated_data["paciente"], "empresa_origem", None)
                if empresa_origem is not None:
                    validated_data["empresa_solicitante"] = empresa_origem
            except Exception:
                pass

        requisicao = LabRequest.objects.create(**validated_data)

        if tipo == LabRequest.Tipo.LABORATORIO:
            for exame in exames:
                requisicao.add_exam(exame)
        elif tipo == LabRequest.Tipo.EXAME_MEDICO:
            for exame_medico in exames_medicos:
                requisicao.add_medical_exam(exame_medico)

        return requisicao

    def update(self, instance, validated_data):
        # tipo é imutável por regra de setor
        tipo_novo = validated_data.get("tipo", instance.tipo)
        if tipo_novo != instance.tipo:
            raise serializers.ValidationError({"tipo": "Tipo/setor da requisição é imutável."})

        exames = validated_data.pop("exames", None)
        exames_medicos = validated_data.pop("exames_medicos", None)

        instance = super().update(instance, validated_data)

        if instance.tipo == LabRequest.Tipo.LABORATORIO:
            if exames_medicos is not None:
                raise serializers.ValidationError({"exames_medicos": "Requisição LAB não aceita exames médicos."})
            if exames is not None:
                desejados = {e.id for e in exames}
                atuais = set(instance.itens.filter(exame__isnull=False).values_list("exame_id", flat=True))

                remover = atuais - desejados
                adicionar = desejados - atuais

                if remover:
                    instance.itens.filter(exame_id__in=remover).delete()

                for exame in LabExam.objects.filter(id__in=adicionar):
                    instance.add_exam(exame)

        elif instance.tipo == LabRequest.Tipo.EXAME_MEDICO:
            if exames is not None:
                raise serializers.ValidationError({"exames": "Requisição MED não aceita exames laboratoriais."})
            if exames_medicos is not None:
                desejados = {e.id for e in exames_medicos}
                atuais = set(
                    instance.itens.filter(exame_medico__isnull=False).values_list("exame_medico_id", flat=True)
                )

                remover = atuais - desejados
                adicionar = desejados - atuais

                if remover:
                    instance.itens.filter(exame_medico_id__in=remover).delete()

                for exame_medico in MedicalExam.objects.filter(id__in=adicionar):
                    instance.add_medical_exam(exame_medico)

        return instance


class LabRequestItemSerializer(serializers.ModelSerializer):
    """
    Serializer para itens de uma requisição de análise.
    Vincula exames específicos a uma requisição.
    """

    class Meta:
        model = LabRequestItem
        fields = "__all__"
        extra_kwargs = {
            "requisicao": {
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
            "requisicao_item": {
                "required": True,
                "help_text": "Item da requisição para o qual este é o resultado",
            },
            "valor": {
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

    exame_nome = serializers.CharField(source="exame_campo.exame.nome", read_only=True)
    exame_id = serializers.IntegerField(source="exame_campo.exame_id", read_only=True)

    exame_campo_nome = serializers.CharField(source="exame_campo.nome", read_only=True)
    exame_campo_unidade = serializers.CharField(source="exame_campo.unidade", read_only=True)
    exame_campo_tipo = serializers.CharField(source="exame_campo.tipo", read_only=True)
    exame_campo_referencia = serializers.CharField(source="exame_campo.referencia", read_only=True)

    paciente_nome = serializers.CharField(source="resultado.requisicao.paciente.nome", read_only=True)
    requisicao_id = serializers.IntegerField(source="resultado.requisicao_id", read_only=True)
    requisicao_codigo = serializers.CharField(source="resultado.requisicao.id_custom", read_only=True)

    class Meta:
        model = ResultItem
        fields = [
            "id",
            "id_custom",
            "resultado",
            "requisicao_id",
            "requisicao_codigo",
            "paciente_nome",
            "exame_campo",
            "exame_id",
            "exame_nome",
            "exame_campo_nome",
            "exame_campo_unidade",
            "exame_campo_tipo",
            "exame_campo_referencia",
            "resultado_valor",
            "status_clinico",
            "cor_laudo",
            "alerta_critico",
            "estado",
            "validado_por",
            "data_validacao",
            "criado_em",
            "atualizado_em",
        ]
        read_only_fields = [
            "id",
            "id_custom",
            "resultado",
            "requisicao_id",
            "requisicao_codigo",
            "paciente_nome",
            "exame_campo",
            "exame_id",
            "exame_nome",
            "exame_campo_nome",
            "exame_campo_unidade",
            "exame_campo_tipo",
            "exame_campo_referencia",
            "status_clinico",
            "cor_laudo",
            "alerta_critico",
            "estado",
            "validado_por",
            "data_validacao",
            "criado_em",
            "atualizado_em",
        ]


class MedicalResultFileSerializer(serializers.ModelSerializer):

    arquivo = serializers.FileField(required=True)

    def validate(self, attrs):
        exame_medico = attrs.get("exame_medico") or getattr(self.instance, "exame_medico", None)
        tipo = attrs.get("tipo") or getattr(self.instance, "tipo", None)
        arquivo = attrs.get("arquivo") or getattr(self.instance, "arquivo", None)

        erros = {}
        if exame_medico and tipo:
            tipos_permitidos = exame_medico.tipos_resultado_cadastrados
            if tipo not in tipos_permitidos:
                metodo = exame_medico.get_metodo_display() or exame_medico.metodo
                permitidos_fmt = ", ".join(sorted(tipos_permitidos))
                erros["tipo"] = f"Tipo não permitido para o método {metodo}. Permitidos: {permitidos_fmt}."

        if arquivo and tipo:
            try:
                validar_arquivo_medico_por_tipo(arquivo, tipo)
            except ValidationError as err:
                erros["arquivo"] = err.messages[0] if err.messages else "Arquivo inválido."

        if erros:
            raise serializers.ValidationError(erros)

        return attrs

    class Meta:
        model = MedicalResultFile
        fields = "__all__"


SERIALIZER_MAP = {
    "exame": LabExamSerializer,
    "examemedico": MedicalExamSerializer,
    "examecampo": LabExamFieldSerializer,
    "examemedicocampo": MedicalExamFieldSerializer,
    "paciente": PatientSerializer,
    "requisicaoanalise": LabRequestSerializer,
    "requisicaoitem": LabRequestItemSerializer,
    "resultadoitem": ResultItemSerializer,
    "resultadomedicoarquivo": MedicalResultFileSerializer,
}

# Backwards-compatible aliases while imports are migrated incrementally.
PacienteSerializer = PatientSerializer
ExameSerializer = LabExamSerializer
ExameMedicoSerializer = MedicalExamSerializer
ExameCampoSerializer = LabExamFieldSerializer
ExameMedicoCampoSerializer = MedicalExamFieldSerializer
RequisicaoAnaliseSerializer = LabRequestSerializer
RequisicaoItemSerializer = LabRequestItemSerializer
ResultadoItemSerializer = ResultItemSerializer
ResultadoItemLaboratorioSerializer = LaboratoryResultItemSerializer
ResultadoMedicoArquivoSerializer = MedicalResultFileSerializer
