from django.core.validators import MinValueValidator, MaxValueValidator
from rest_framework import serializers
from drf_spectacular.utils import OpenApiTypes, extend_schema_field

from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.exame_campo import ExameCampo
from aplicativos.clinico.modelos.exames_medicos import ExameMedico, ExameMedicoCampo
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_item import RequisicaoItem
from aplicativos.clinico.modelos.resultado_analise import ResultadoItem
from nucleo.constantes.proveniencia import Proveniencia


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


@extend_schema_field(OpenApiTypes.STR)
class MoradaField(serializers.Field):
	"""
	Compat layer:
	- Frontend envia `morada` como string
	- Modelo usa JSONField (EnderecoField)
	"""

	def to_representation(self, value):
		if value is None:
			return ""
		if isinstance(value, str):
			return value
		if isinstance(value, dict):
			parts = []
			for k in ("rua", "numero", "bairro", "cidade", "provincia"):
				v = value.get(k)
				if v:
					parts.append(str(v).strip())
			return ", ".join([p for p in parts if p]) or ""
		return str(value)

	def to_internal_value(self, data):
		if data is None:
			return {}
		if isinstance(data, dict):
			return data
		if isinstance(data, str):
			txt = data.strip()
			return {"rua": txt} if txt else {}
		raise serializers.ValidationError("Morada deve ser texto ou objeto JSON.")


class PacienteSerializer(serializers.ModelSerializer):
	"""
	Serializer para a entidade Paciente com validação robusta.
	Inclui campos de paciente para leitura/escrita com validação de domínio.
	"""

	morada = MoradaField()
	empresa_origem_nome = serializers.CharField(source="empresa_origem.nome", read_only=True)

	class Meta:
		model = Paciente
		# Expor todos os campos do modelo (incluindo os de auditoria/tenant).
		# Campos corporativos permanecem read-only para evitar manipulação via API.
		fields = "__all__"
		read_only_fields = CORE_READ_ONLY_FIELDS
		extra_kwargs = {
			'nome': {
				'required': True,
				'min_length': 2,
				'max_length': 150,
				'help_text': 'Nome completo do paciente (2-150 caracteres)',
				'error_messages': {
					'required': 'Nome é obrigatório',
					'min_length': 'Nome deve ter no mínimo 2 caracteres',
					'max_length': 'Nome não pode ter mais de 150 caracteres',
				}
			},
			'email': {
				'required': False,
				'allow_blank': True,
				'help_text': 'Email único do paciente para contato',
				'error_messages': {
					'invalid': 'Email inválido',
					'unique': 'Este email já está registrado no sistema',
				}
			},
			'contacto': {
				'required': False,
				'allow_blank': True,
				'help_text': 'Número de telefone para contato (incluir indicativo país)',
			},
			'data_nascimento': {
				'required': False,
				'allow_null': True,
				'help_text': 'Data de nascimento do paciente (formato YYYY-MM-DD)',
			},
			'genero': {
				# O modelo já define default, então não pode ser required=True
				'required': False,
				'help_text': 'Gênero do paciente (M ou F)',
			},
			'raca_origem': {
				'required': False,
				'help_text': 'Classificação de raça/origem',
			},
			'tipo_documento': {
				'required': False,
				'help_text': 'Tipo de documento de identidade (BI, CC, Passaporte, etc)',
			},
			'numero_id': {
				'required': False,
				'allow_blank': True,
				'help_text': 'Número único do documento de identidade',
				'error_messages': {
					'unique': 'Este número de documento já está registrado',
				}
			},
			'proveniencia': {
				'required': False,
				'help_text': 'Origem/proveniência do paciente na clínica',
			},
			'gestante': {
				'required': False,
				'help_text': 'Indicador se paciente está gestante',
			},
			'idade_gestacional_semanas': {
				'required': False,
				'allow_null': True,
				'help_text': 'Semanas de gestação (preencher apenas se gestante)',
			},
		}

	def validate_email(self, value):
		"""Validação adicional de email."""
		if value and Paciente.objects.filter(email=value).exclude(id=self.instance.id if self.instance else None).exists():
			raise serializers.ValidationError('Este email já está registrado.')
		return value

	def validate_numero_id(self, value):
		"""Validação adicional de número de documento."""
		if value and Paciente.objects.filter(numero_id=value).exclude(id=self.instance.id if self.instance else None).exists():
			raise serializers.ValidationError('Este número de documento já está registrado.')
		return value

	def validate(self, data):
		"""Validación de campos interdependientes."""
		if data.get('gestante') and not data.get('idade_gestacional_semanas'):
			raise serializers.ValidationError({
				'idade_gestacional_semanas': 'Idade gestacional é obrigatória quando gestante é true'
			})

		# Medicina ocupacional: paciente deve estar associado a uma empresa.
		proveniencia = data.get("proveniencia") if "proveniencia" in data else getattr(self.instance, "proveniencia", None)
		empresa = data.get("empresa_origem") if "empresa_origem" in data else getattr(self.instance, "empresa_origem", None)
		if proveniencia == Proveniencia.MEDICINA_OCUPACIONAL and not empresa:
			raise serializers.ValidationError(
				{"empresa_origem": "Empresa é obrigatória quando a proveniência é Medicina Ocupacional."}
			)
		return data


class ExameSerializer(serializers.ModelSerializer):
	"""
	Serializer para a entidade Exame com validação robusta.
	Inclui validação de preço e tempo de resposta.
	"""

	class Meta:
		model = Exame
		fields = "__all__"
		read_only_fields = CORE_READ_ONLY_FIELDS
		extra_kwargs = {
			'nome': {
				'required': True,
				'min_length': 3,
				'max_length': 100,
				'help_text': 'Nome descritivo do exame (3-100 caracteres)',
				'error_messages': {
					'required': 'Nome do exame é obrigatório',
					'min_length': 'Nome deve ter no mínimo 3 caracteres',
					'max_length': 'Nome não pode ter mais de 100 caracteres',
				}
			},
			'trl_horas': {
				# O modelo já define default.
				'required': False,
				'min_value': 1,
				'max_value': 720,  # 30 dias máximo
				'help_text': 'Tempo de resposta em horas (1-720)',
				'error_messages': {
					'required': 'Tempo de resposta é obrigatório',
					'min_value': 'TRL deve ser no mínimo 1 hora',
					'max_value': 'TRL não pode ser maior que 720 horas (30 dias)',
				}
			},
			'preco': {
				# O modelo já define default (mas validamos > 0 em validate_preco).
				'required': False,
				'decimal_places': 2,
				'help_text': 'Preço do exame em unidades monetárias (≥0.01)',
				'error_messages': {
					'required': 'Preço é obrigatório',
					'invalid': 'Preço deve ser um valor decimal válido',
				}
			},
			'metodo': {
				'required': True,
				'help_text': 'Método utilizado para realizar o exame',
			},
				'setor': {
					# O modelo permite null/blank (e há constraint de unicidade).
					# DRF injeta `default=None` para campos nullable em constraints, então
					# não podemos forçar required=True aqui.
					'required': False,
					'help_text': 'Setor do laboratório responsável pelo exame',
				},
			}

	def validate_preco(self, value):
		"""Validação que preço deve ser positivo."""
		if value is not None and value <= 0:
			raise serializers.ValidationError('Preço deve ser maior que zero.')
		return value


class ExameMedicoSerializer(serializers.ModelSerializer):
	"""Serializer para Exame Médico (imagem/diagnóstico)."""
	class Meta:
		model = ExameMedico
		fields = "__all__"
		read_only_fields = CORE_READ_ONLY_FIELDS


class ExameCampoSerializer(serializers.ModelSerializer):
	"""
	Serializer para campos de exame.
	Define parâmetros específicos de cada exame.
	"""

	class Meta:
		model = ExameCampo
		fields = '__all__'
		extra_kwargs = {
			'nome': {
				'required': True,
				'help_text': 'Nome do parâmetro/campo do exame',
			},
			'unidade': {
				'required': False,
				'help_text': 'Unidade de medida do parâmetro (ex: mg/dL, g/L)',
			},
		}


class ExameMedicoCampoSerializer(serializers.ModelSerializer):
	"""Serializer para parâmetros de exame médico."""
	class Meta:
		model = ExameMedicoCampo
		fields = '__all__'


class RequisicaoAnaliseSerializer(serializers.ModelSerializer):
	"""
	Serializer para requisições (por setor).

	- LAB: aceita `exames` (laboratoriais)
	- MED: aceita `exames_medicos`
	"""

	# DRF marca ManyToMany com `through` como read-only por padrão. Mantemos a
	# chave `exames` (compatível com o frontend) mas tratamos manualmente.
	exames = serializers.PrimaryKeyRelatedField(
		many=True,
		queryset=Exame.objects.all(),
		required=False,
	)

	exames_medicos = serializers.PrimaryKeyRelatedField(
		many=True,
		queryset=ExameMedico.objects.all(),
		required=False,
	)

	paciente_nome = serializers.CharField(source="paciente.nome", read_only=True)
	paciente_codigo = serializers.CharField(source="paciente.id_custom", read_only=True)
	empresa_solicitante_nome = serializers.CharField(source="empresa_solicitante.nome", read_only=True)
	empresa_executora_externa_nome = serializers.CharField(source="empresa_executora_externa.nome", read_only=True)

	class RequisicaoItemResumoSerializer(serializers.ModelSerializer):
		exame_nome = serializers.CharField(source="exame.nome", read_only=True)
		exame_medico_nome = serializers.CharField(source="exame_medico.nome", read_only=True)

		class Meta:
			model = RequisicaoItem
			fields = [
				"id",
				"id_custom",
				"exame",
				"exame_nome",
				"exame_medico",
				"exame_medico_nome",
			]

	itens = RequisicaoItemResumoSerializer(many=True, read_only=True)

	class Meta:
		model = RequisicaoAnalise
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
			'paciente': {
				'required': True,
				'help_text': 'Paciente para o qual a análise foi requisitada',
			},
			"tipo": {
				"required": False,
				"help_text": "Tipo/setor da requisição (LAB ou MED).",
			},
		}

	def validate(self, attrs):
		# Normaliza para permitir "default LAB" quando não informado.
		tipo = attrs.get("tipo") or getattr(self.instance, "tipo", None) or RequisicaoAnalise.Tipo.LABORATORIO

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
			if empresa is not None and tenant is not None:
				if getattr(empresa, "inquilino_id", None) != getattr(tenant, "id", None):
					raise serializers.ValidationError({field_name: "Empresa fora do escopo do inquilino."})

		# Regra: requisição por setor, sem mistura.
		if tipo == RequisicaoAnalise.Tipo.LABORATORIO:
			if exames_medicos:
				raise serializers.ValidationError(
					{"exames_medicos": "Requisição LAB não aceita exames médicos."}
				)
		elif tipo == RequisicaoAnalise.Tipo.EXAME_MEDICO:
			if exames:
				raise serializers.ValidationError(
					{"exames": "Requisição MED não aceita exames laboratoriais."}
				)
		else:
			raise serializers.ValidationError({"tipo": "Tipo de requisição inválido."})

		# No create: exigir pelo menos um item.
		if self.instance is None:
			if tipo == RequisicaoAnalise.Tipo.LABORATORIO and not exames:
				raise serializers.ValidationError(
					{"exames": "Informe ao menos um exame laboratorial."}
				)
			if tipo == RequisicaoAnalise.Tipo.EXAME_MEDICO and not exames_medicos:
				raise serializers.ValidationError(
					{"exames_medicos": "Informe ao menos um exame médico."}
				)

		return attrs

	def create(self, validated_data):
		# `exames` (LAB) é ManyToMany com `through`. `exames_medicos` (MED) é derivado dos itens.
		exames = validated_data.pop('exames', [])
		exames_medicos = validated_data.pop("exames_medicos", [])

		tipo = validated_data.get("tipo") or RequisicaoAnalise.Tipo.LABORATORIO

		# Auto-associar empresa solicitante pela empresa do paciente (quando não fornecida).
		if not validated_data.get("empresa_solicitante") and validated_data.get("paciente"):
			try:
				empresa_origem = getattr(validated_data["paciente"], "empresa_origem", None)
				if empresa_origem is not None:
					validated_data["empresa_solicitante"] = empresa_origem
			except Exception:
				pass

		requisicao = RequisicaoAnalise.objects.create(**validated_data)

		if tipo == RequisicaoAnalise.Tipo.LABORATORIO:
			for exame in exames:
				requisicao.adicionar_exame(exame)
		elif tipo == RequisicaoAnalise.Tipo.EXAME_MEDICO:
			for exame_medico in exames_medicos:
				requisicao.adicionar_exame_medico(exame_medico)

		return requisicao

	def update(self, instance, validated_data):
		# tipo é imutável por regra de setor
		tipo_novo = validated_data.get("tipo", instance.tipo)
		if tipo_novo != instance.tipo:
			raise serializers.ValidationError({"tipo": "Tipo/setor da requisição é imutável."})

		exames = validated_data.pop('exames', None)
		exames_medicos = validated_data.pop("exames_medicos", None)

		instance = super().update(instance, validated_data)

		if instance.tipo == RequisicaoAnalise.Tipo.LABORATORIO:
			if exames_medicos is not None:
				raise serializers.ValidationError(
					{"exames_medicos": "Requisição LAB não aceita exames médicos."}
				)
			if exames is not None:
				desejados = {e.id for e in exames}
				atuais = set(
					instance.itens.filter(exame__isnull=False).values_list('exame_id', flat=True)
				)

				remover = atuais - desejados
				adicionar = desejados - atuais

				if remover:
					instance.itens.filter(exame_id__in=remover).delete()

				for exame in Exame.objects.filter(id__in=adicionar):
					instance.adicionar_exame(exame)

		elif instance.tipo == RequisicaoAnalise.Tipo.EXAME_MEDICO:
			if exames is not None:
				raise serializers.ValidationError(
					{"exames": "Requisição MED não aceita exames laboratoriais."}
				)
			if exames_medicos is not None:
				desejados = {e.id for e in exames_medicos}
				atuais = set(
					instance.itens.filter(exame_medico__isnull=False).values_list(
						'exame_medico_id', flat=True
					)
				)

				remover = atuais - desejados
				adicionar = desejados - atuais

				if remover:
					instance.itens.filter(exame_medico_id__in=remover).delete()

				for exame_medico in ExameMedico.objects.filter(id__in=adicionar):
					instance.adicionar_exame_medico(exame_medico)

		return instance


class RequisicaoItemSerializer(serializers.ModelSerializer):
	"""
	Serializer para itens de uma requisição de análise.
	Vincula exames específicos a uma requisição.
	"""

	class Meta:
		model = RequisicaoItem
		fields = '__all__'
		extra_kwargs = {
			'requisicao': {
				'required': True,
				'help_text': 'Requisição pai que contém este item',
			},
		}


class ResultadoItemSerializer(serializers.ModelSerializer):
	"""
	Serializer para resultados de análises.
	Contém os valores medidos para cada parâmetro.
	"""

	class Meta:
		model = ResultadoItem
		fields = '__all__'
		extra_kwargs = {
			'requisicao_item': {
				'required': True,
				'help_text': 'Item da requisição para o qual este é o resultado',
			},
			'valor': {
				'required': False,
				'allow_null': True,
				'help_text': 'Valor medido do parâmetro',
			},
		}


class ResultadoItemLaboratorioSerializer(serializers.ModelSerializer):
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
		model = ResultadoItem
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


SERIALIZER_MAP = {
	'exame': ExameSerializer,
	'examemedico': ExameMedicoSerializer,
	'examecampo': ExameCampoSerializer,
	'examemedicocampo': ExameMedicoCampoSerializer,
	'paciente': PacienteSerializer,
	'requisicaoanalise': RequisicaoAnaliseSerializer,
	'requisicaoitem': RequisicaoItemSerializer,
	'resultadoitem': ResultadoItemSerializer,
}
