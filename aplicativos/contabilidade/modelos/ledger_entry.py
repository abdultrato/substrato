from django.db import models
from django.db.models import Q

from nucleo.modelos.base import CoreModel


class LedgerEntry(CoreModel, ) :
	prefixo = "LGENT"
	
	# ===============================
	# IDENTIFICAÇÃO
	# ===============================
	
	referencia_externa = models.CharField(max_length = 120, db_index = True, )
	
	idempotency_key = models.CharField(max_length = 150, null = True, blank = True, )
	
	# ===============================
	# CONTÁBIL
	# ===============================
	
	data_contabil = models.DateField(db_index = True, )
	
	descricao = models.CharField(max_length = 255, )
	
	# ===============================
	# REVERSÃO
	# ===============================
	
	revertido = models.BooleanField(default = False, db_index = True, )
	
	reverso_de = models.OneToOneField("self", null = True, blank = True, on_delete = models.PROTECT, related_name = "reversao", )
	
	motivo_reversao = models.TextField(null = True, blank = True, )
	
	# ===============================
	# AUDITORIA
	# ===============================
	
	criado_em = models.DateTimeField(auto_now_add = True, db_index = True, )
	
	# ===============================
	# INTEGRIDADE / ANTIFRAUDE
	# ===============================
	
	hash_anterior = models.CharField(max_length = 64, null = True, blank = True, db_index = True, )
	
	hash_atual = models.CharField(max_length = 64, null = True, blank = True, unique = True, )
	
	class Meta :
		indexes = [models.Index(fields = ["inquilino", "data_contabil", ], ), models.Index(fields = ["inquilino", "criado_em", ], ), models.Index(fields = ["referencia_externa", ], ), ]
		
		constraints = [models.UniqueConstraint(fields = ["inquilino", "idempotency_key", ], condition = Q(idempotency_key__isnull = False, ), name = "unique_ledger_idempotency", ), ]
	
	# ======================================
	# 🔐 IMUTABILIDADE FORTE
	# ======================================
	
	def save(self, *args, **kwargs, ) :
		if self.pk :
			raise RuntimeError("LedgerEntry é imutável.", )
		return super().save(*args, **kwargs, )
	
	def delete(self, *args, **kwargs, ) :
		raise RuntimeError("LedgerEntry é imutável.", )