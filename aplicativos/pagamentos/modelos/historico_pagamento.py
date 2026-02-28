from django.db import models
from frontend.fields import MoneyField
from frontend.models.core import CoreModel


class HistoricoPagamento(CoreModel):
	"""
	Registro imutável de eventos do Pagamento.

	Serve como trilha auditável.
	"""
	
	class TipoEvento(models.TextChoices):
		CRIADO = "CRIADO", "Criado"
		CONFIRMADO = "CONFIRMADO", "Confirmado"
		FALHA = "FALHA", "Falha"
		ESTORNADO = "ESTORNADO", "Estornado"
		CANCELADO = "CANCELADO", "Cancelado"
	
	pagamento = models.ForeignKey(
			"pagamentos.Pagamento",
			on_delete = models.CASCADE,
			related_name = "historico",
			)
	
	tipo_evento = models.CharField(
			max_length = 15,
			choices = TipoEvento.choices,
			db_index = True,
			)
	
	valor = MoneyField(
			null = True,
			blank = True,
			)
	
	descricao = models.CharField(
			max_length = 255,
			blank = True,
			)
	
	referencia_externa = models.CharField(
			max_length = 120,
			blank = True,
			)
	
	class Meta:
		verbose_name = "Histórico de Pagamento"
		verbose_name_plural = "Histórico de Pagamentos"
		ordering = ["-criado_em"]
		indexes = [
				models.Index(fields = ["pagamento"]),
				models.Index(fields = ["tipo_evento"]),
				models.Index(fields = ["criado_em"]),
				]
	
	def __str__(self):
		return f"{self.tipo_evento} - {self.pagamento_id}"
	
	def save(self, *args, **kwargs):
		"""
		Impede alteração após criação.
		"""
		if self.pk:
			raise ValueError("Registros do histórico não podem ser alterados.")
		super().save(*args, **kwargs)
