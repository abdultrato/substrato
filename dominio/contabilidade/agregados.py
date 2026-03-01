from dominio.contabilidade.excecoes import LancamentoDesbalanceado


class LedgerAggregate:
	
	def __init__(
			self,
			linhas,
			):
		self.linhas = linhas
	
	def validar(
			self,
			):
		debitos = sum(
				l.valor for l in self.linhas if l.natureza == "D",
				)
		creditos = sum(
				l.valor for l in self.linhas if l.natureza == "C",
				)
		
		if debitos != creditos:
			raise LancamentoDesbalanceado()
