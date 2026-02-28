from django.db import transaction
from django.db import DatabaseError
from aplicativos.seguradora.modelos.autorizacao import AutorizacaoProcedimento
from servicos.seguradora.servico_integracao import ServicoIntegracaoSeguradora


class ProcessarAutorizacaoService:
	
	@staticmethod
	@transaction.atomic
	def executar(autorizacao_id: int):
		
		autorizacao = (
				AutorizacaoProcedimento.objects
				.select_for_update()
				.get(id = autorizacao_id)
		)
		
		if autorizacao.status != autorizacao.Status.PENDENTE:
			return "ignorado"
		
		adapter = ServicoIntegracaoSeguradora.obter_adapter(
				autorizacao.plano.seguradora
				)
		
		resposta = adapter.consultar_autorizacao(
				{"requisicao_id": autorizacao.requisicao_id}
				)
		
		if resposta["status"] == "APROVADA":
			autorizacao.aprovar(resposta.get("codigo"))
		else:
			autorizacao.negar()
		
		return "processado"
