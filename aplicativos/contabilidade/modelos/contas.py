from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import (
	Q,
	)

from nucleo.modelos.base import CoreModel


class TipoConta(
		models.TextChoices,
		):
	ATIVO = "ATI", "Ativo"
	PASSIVO = "PAS", "Passivo"
	RECEITA = "REC", "Receita"
	DESPESA = "DES", "Despesa"
	PATRIMONIO = "PAT", "Patrimônio"


class Conta(
		CoreModel,
		):
	
	tipo = models.CharField(
			max_length = 3,
			choices = TipoConta.choices,
			db_index = True,
			)
	
	class Meta:
		indexes = [
				models.Index(
						fields = [
								"inquilino",
								"id_custom",
								],
						),
				models.Index(
						fields = [
								"inquilino",
								"tipo",
								],
						),
				]
		
		constraints = [
				models.UniqueConstraint(
						fields = [
								"inquilino",
								"id_custom",
								],
						condition = Q(
								deletado = False,
								),
						name = "unique_codigo_conta_por_inquilino",
						),
				]
	
	# 🔒 Impedir alteração estrutural após uso
	def save(
			self,
			*args,
			**kwargs,
			):
		
		if self.pk:
			original = Conta.objects.get(
					pk = self.pk,
					)
			
			if original.tipo != self.tipo:
				if self.tem_movimentacao():
					raise ValidationError(
							"Não é permitido alterar o tipo de uma conta já "
							"utilizada.",
							)
		
		return super().save(
				*args,
				**kwargs,
				)
	
	# 🔒 Impedir soft-delete se houver saldo ou histórico
	def delete(
			self,
			*args,
			**kwargs,
			):
		raise ValidationError(
				"Conta não pode ser removida.",
				)
	
	def tem_movimentacao(
			self,
			):
		
		# Verificar LedgerLine se estiver ativo
		from aplicativos.contabilidade.modelos.ledger_line import LedgerLine
		
		return LedgerLine.objects.filter(
				conta_id = self.pk,
				).exists()
	
	def __str__(
			self,
			):
		return f"{self.id_custom} - {self.nome}"
