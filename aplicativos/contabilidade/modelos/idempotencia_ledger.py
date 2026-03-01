from django.db import models

from nucleo.modelos.base import CoreModel


class IdempotenciaLedger(
		CoreModel,
		):
	
	chave = models.CharField(
			max_length = 150,
			)
	referencia = models.CharField(
			max_length = 150,
			null = True,
			blank = True,
			)
	
	class Meta:
		constraints = [
				models.UniqueConstraint(
						fields = [
								"inquilino",
								"chave",
								],
						name = "unique_idempotencia_ledger",
						),
				]
