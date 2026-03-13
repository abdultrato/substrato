from django.core.validators import MinValueValidator, MaxValueValidator
from rest_framework import serializers

from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.exame_campo import ExameCampo
from aplicativos.clinico.modelos.exames_medicos import ExameMedico, ExameMedicoCampo
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_item import RequisicaoItem
from aplicativos.clinico.modelos.resultado_analise import ResultadoItem


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

	class Meta:
		model = Paciente
		fields = [
			'id', 'id_custom',
			'nome', 'email', 'contacto',
			'data_nascimento', 'genero', 'raca_origem',
			'tipo_documento', 'numero_id',
			'morada', 'proveniencia',
			'gestante', 'idade_gestacional_semanas',
			'criado_em', 'atualizado_em',
		]
		read_only_fields = ['id', 'id_custom', 'criado_em', 'atualizado_em']
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
		return data


class ExameSerializer(serializers.ModelSerializer):
	"""
	Serializer para a entidade Exame com validação robusta.
	Inclui validação de preço e tempo de resposta.
	"""

	class Meta:
		model = Exame
		fields = [
			'id', 'id_custom',
			'nome',
			'trl_horas',
			'preco',
			'metodo', 'setor',
			'criado_em', 'atualizado_em',
		]
		read_only_fields = ['id', 'id_custom', 'criado_em', 'atualizado_em']
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
				'required': True,
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
		fields = [
			'id', 'id_custom',
			'nome',
			'trl_horas',
			'preco',
			'metodo', 'setor',
			'criado_em', 'atualizado_em',
		]
		read_only_fields = ['id', 'id_custom', 'criado_em', 'atualizado_em']


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
	Serializer para requisições de análise laboratorial.
	Agrupa múltiplos exames para um paciente.
	"""

	# DRF marca ManyToMany com `through` como read-only por padrão. Mantemos a
	# chave `exames` (compatível com o frontend) mas tratamos manualmente.
	exames = serializers.PrimaryKeyRelatedField(
		many=True,
		queryset=Exame.objects.all(),
		required=False,
	)

	class Meta:
		model = RequisicaoAnalise
		fields = [
			'id',
			'id_custom',
			'inquilino',
			'paciente',
			'exames',
			'analista',
			'estado',
			'status_clinico',
			'possui_resultado_critico',
			'criado_em',
			'atualizado_em',
		]
		read_only_fields = [
			'id',
			'id_custom',
			'inquilino',
			'possui_resultado_critico',
			'criado_em',
			'atualizado_em',
		]
		extra_kwargs = {
			'paciente': {
				'required': True,
				'help_text': 'Paciente para o qual a análise foi requisitada',
			},
		}

	def create(self, validated_data):
		# `exames` é ManyToMany com `through`, então precisamos criar os itens manualmente.
		exames = validated_data.pop('exames', [])
		requisicao = RequisicaoAnalise.objects.create(**validated_data)

		for exame in exames:
			requisicao.adicionar_exame(exame)

		return requisicao

	def update(self, instance, validated_data):
		exames = validated_data.pop('exames', None)

		instance = super().update(instance, validated_data)

		if exames is not None:
			desejados = {e.id for e in exames}
			atuais = set(instance.itens.values_list('exame_id', flat=True))

			remover = atuais - desejados
			adicionar = desejados - atuais

			if remover:
				# Remove fisicamente para não bloquear re-adição por `unique_together`.
				instance.itens.filter(exame_id__in=remover).delete()

			for exame in Exame.objects.filter(id__in=adicionar):
				instance.adicionar_exame(exame)

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
			'exame': {
				'required': True,
				'help_text': 'Exame incluído nesta requisição',
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
