from django.db import models


class HistoricoFatura(models.Model) :
	fatura = models.ForeignKey("faturamento.Fatura", on_delete = models.CASCADE, related_name = "historico", )
	
	descricao = models.TextField()
	
	tipo_evento = models.CharField(max_length = 50, blank = True, )
	
	criado_em = models.DateTimeField(auto_now_add = True)
	
	class Meta :
		ordering = ["-criado_em"]
		indexes = [models.Index(fields = ["fatura"]), models.Index(fields = ["criado_em"]), ]
	
	def __str__(self) :
		return f"{self.fatura.id_custom} - {self.descricao[:40]}"