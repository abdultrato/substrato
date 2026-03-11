from django.core.validators import MinValueValidator, MaxValueValidator
from rest_framework import serializers

from aplicativos.clinico.modelos.exame import Exame
from aplicativos.clinico.modelos.exame_campo import ExameCampo
from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from aplicativos.clinico.modelos.requisicao_item import RequisicaoItem
from aplicativos.clinico.modelos.resultado_analise import ResultadoItem


class PacienteSerializer(serializers.ModelSerializer):
	"""
	Serializer para a entidade Paciente com validação robusta.
	Inclui campos de paciente para leitura/escrita com validação de domínio.
	"""

	class Meta:
		model = Paciente
		fields = [
			'id', 'id_custom',
			'nome', 'email', 'contacto',
			'data_nascimento', 'genero', 'raca_origem',
			'tipo_documento', 'numero_id',
			'morada', 'proveniencia',
			'gestante', 'idade_gestacional_semanas',
			'ativo', 'criado_em', 'atualizado_em',
		]
		read_only_fields = ['id', 'id_custom', 'criado_em', 'atualizado_em', 'ativo']
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
				'required': True,
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
			'morada': {
				'required': True,
				'min_length': 5,
				'max_length': 150,
				'help_text': 'Endereço residencial do paciente',
				'error_messages': {
					'required': 'Morada é obrigatória',
					'min_length': 'Morada deve ter no mínimo 5 caracteres',
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
			'ativo', 'criado_em', 'atualizado_em',
		]
		read_only_fields = ['id', 'id_custom', 'criado_em', 'atualizado_em', 'ativo']
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
				'required': True,
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
				'required': True,
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


class RequisicaoAnaliseSerializer(serializers.ModelSerializer):
	"""
	Serializer para requisições de análise laboratorial.
	Agrupa múltiplos exames para um paciente.
	"""

	class Meta:
		model = RequisicaoAnalise
		fields = '__all__'
		extra_kwargs = {
			'paciente': {
				'required': True,
				'help_text': 'Paciente para o qual a análise foi requisitada',
			},
			'data_requisicao': {
				'required': True,
				'help_text': 'Data da requisição do exame',
			},
		}


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
	'examecampo': ExameCampoSerializer,
	'paciente': PacienteSerializer,
	'requisicaoanalise': RequisicaoAnaliseSerializer,
	'requisicaoitem': RequisicaoItemSerializer,
	'resultadoitem': ResultadoItemSerializer,
}