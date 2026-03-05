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
		
		ordering = ["nome", "criado_em"]
		
		indexes = [models.Index(fields = ["setor", "deletado"]), models.Index(fields = ["metodo"]), ]
		
		constraints = [
			
			# unicidade lógica por setor (soft delete)
			models.UniqueConstraint(fields = ["setor", "nome"], condition = Q(deletado = False), name = "unique_nome_exame_por_setor_nao_deletado", ),
			
			# TRL deve ser positivo
			models.CheckConstraint(condition = Q(trl_horas__gt = 0), name = "trl_horas_positivo", ),
			
			# preço não pode ser negativo
			models.CheckConstraint(condition = Q(preco__gte = 0), name = "preco_nao_negativo", ), ]
	
	# =====================================================
	# VALIDAÇÃO DE DOMÍNIO
	# =====================================================
	
	def clean(self) :
		super().clean()
		
		erros = {}
		
		if not self.nome :
			erros["nome"] = "O exame deve possuir um nome."
		
		if self.preco is None :
			erros["preco"] = "O exame deve possuir um preço."
		
		if self.preco == Decimal("0.00") :
			erros["preco"] = "Exame não pode ter preço zero."
		
		if self.trl_horas <= 0 :
			erros["trl_horas"] = "TRL deve ser maior que zero."
		
		if erros :
			raise ValidationError(erros)
	
	# =====================================================
	# REPRESENTAÇÃO
	# =====================================================
	
	def __str__(self) :
		return f"{self.id_custom or 'NOVO'} - {self.nome or 'Sem nome'}"