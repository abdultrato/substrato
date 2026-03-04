from django.db import models

from nucleo.modelos.base import CoreModel


class ConciliacaoFinanceira(CoreModel, ) :
	prefixo = "CONFIN"
	
	fatura = models.ForeignKey("faturamento.Fatura", on_delete = models.PROTECT, related_name = "conciliacoes", )
	
	valor_contabil = models.DecimalField(max_digits = 18, decimal_places = 2, )
	
	valor_recebido = models.DecimalField(max_digits = 18, decimal_places = 2, )
	
	divergencia = models.DecimalField(max_digits = 18, decimal_places = 2, )
	
	conciliado = models.BooleanField(default = False, db_index = True, )
	
	referencia_externa = models.CharField(max_length = 120, null = True, blank = True, db_index = True, )
	
	criado_em = models.DateTimeField(auto_now_add = True, )
	
	class Meta :
		ordering = ["-criado_em", ]
		indexes = [models.Index(fields = ["inquilino", "conciliado", ], ), models.Index(fields = ["fatura", ], ), ]
		
		constraints = [models.UniqueConstraint(fields = ["inquilino", "referencia_externa", ], condition = models.Q(referencia_externa__isnull = False, ), name = "unique_conciliacao_referencia", ), ]
	
	def delete(self, *args, **kwargs, ) :
		raise RuntimeError("Conciliação é imutável.", )