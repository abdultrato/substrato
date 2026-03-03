# LOCAL: aplicativos/clinico/modelos/exame.py

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from infrastrutura.orm.fields.dinheiro_field import DinheiroField
from infrastrutura.orm.fields.metodo_field import MetodoField
from infrastrutura.orm.fields.setor_field import SetorField
from nucleo.modelos.base import CoreModel


class Exame(CoreModel) :
	"""
	Cadastro de exames laboratoriais.
	"""
	
	prefixo = "EXA"
	
	# =====================================================
	# CAMPOS
	# =====================================================
	
	trl_horas = models.PositiveIntegerField(default = 24, help_text = "Tempo de resposta em horas.", )
	
	preco = DinheiroField(default = Decimal("0.00"), validators = [MinValueValidator(Decimal("0.00"))], help_text = "Preço do exame.", )
	
	metodo = MetodoField(db_index = True)
	setor = SetorField(db_index = True)
	
	# =====================================================
	# META
	# =====================================================
	
	class Meta :
		verbose_name = "Exame"
		verbose_name_plural = "Exames"
		
		ordering = ["nome"]
		
		indexes = [# Consulta principal (listagem por setor)
			models.Index(fields = ["setor", "deletado"]), models.Index(fields = ["metodo"]), ]
		
		constraints = [# Unicidade lógica por setor (somente não deletados)
			models.UniqueConstraint(fields = ["setor", "nome"], condition = Q(deletado = False), name = "unique_nome_exame_por_setor_nao_deletado", ), ]
	
	# =====================================================
	# VALIDAÇÃO DE DOMÍNIO
	# =====================================================
	
	def clean(self) :
		super().clean()
		
		erros = {}
		
		if self.preco is None :
			erros["preco"] = "O exame deve possuir um preço."
		
		if self.preco == Decimal("0.00") :
			erros["preco"] = "Exame não pode ter preço zero."
		
		if not self.nome :
			erros["nome"] = "O exame deve possuir um nome."
		
		if erros :
			raise ValidationError(erros)
	
	# =====================================================
	# REPRESENTAÇÃO
	# =====================================================
	
	def __str__(self) :
		return f"{self.id_custom or 'NOVO'} - {self.nome or 'Sem nome'}"