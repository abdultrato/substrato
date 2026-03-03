from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from nucleo.modelos.base import CoreModel


class TipoProduto(models.TextChoices) :
	MEDICAMENTO = "MED", "Medicamento"
	CONSUMIVEL = "CON", "Consumível"
	OUTRO = "OUT", "Outro"


class Produto(CoreModel) :
	"""
	Produto farmacêutico corporativo.

	Herda de CoreModel:
	- nome
	- codigo
	- descricao
	- ativo
	- deletado
	- timestamps
	- auditoria
	- inquilino
	"""
	
	prefixo = "PRODT"
	
	tipo = models.CharField(max_length = 3, choices = TipoProduto.choices, db_index = True, )
	
	preco_venda = models.DecimalField(max_digits = 14, decimal_places = 2, validators = [MinValueValidator(Decimal("0.00"))], )
	
	class Meta :
		ordering = ["nome"]
		
		indexes = [models.Index(fields = ["tipo"]), models.Index(fields = ["inquilino", ]), ]
		
		constraints = [models.UniqueConstraint(fields = ["inquilino", "id_custom"], condition = Q(deletado = False), name = "unique_codigo_produto_por_inquilino", )]
	
	def __str__(self) :
		return f"{self.id_custom} - {self.nome}"