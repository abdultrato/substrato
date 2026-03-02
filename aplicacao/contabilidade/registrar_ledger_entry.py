from django.db import transaction
from django.utils import timezone

from aplicativos.contabilidade.modelos.idempotencia_ledger import (IdempotenciaLedger)
from aplicativos.contabilidade.modelos.ledger_entry import LedgerEntry
from aplicativos.contabilidade.modelos.ledger_line import LedgerLine
from dominio.contabilidade.agregados import LedgerAggregate
from dominio.contabilidade.excecoes import (DominioContabilidadeErro, ViolacaoInquilinoErro, )
from eventos.contabilidade.handler_atualizar_saldo import handle as atualizar_saldo
from eventos.contabilidade.ledger_entry_criado import (LedgerEntryCriado, LinhaLedgerDTO, )


class OperacaoDuplicadaErro(DominioContabilidadeErro, ) :
	pass


@transaction.atomic
def executar(inquilino, descricao, data_contabil, linhas, idempotency_key = None, ) :
	# =====================================================
	# 🔐 IDEMPOTÊNCIA PERSISTENTE
	# =====================================================
	
	if idempotency_key :
		_, created = IdempotenciaLedger.objects.select_for_update().get_or_create(inquilino = inquilino, chave = idempotency_key, )
		
		if not created :
			raise OperacaoDuplicadaErro("Operação já processada para esta chave.", )
	
	# =====================================================
	# 🔍 VALIDAÇÃO DOMÍNIO
	# =====================================================
	
	aggregate = LedgerAggregate(linhas, )
	aggregate.validar()
	
	# =====================================================
	# 🔎 VALIDAÇÃO MULTI-TENANT
	# =====================================================
	
	for linha in linhas :
		if linha.conta.inquilino_id != inquilino.id :
			raise ViolacaoInquilinoErro("Conta pertence a outro inquilino.", )
	
	# =====================================================
	# 🧾 CRIAR LEDGER ENTRY
	# =====================================================
	
	entry = LedgerEntry.objects.create(inquilino = inquilino, descricao = descricao, data_contabil = data_contabil, criado_em = timezone.now(), idempotency_key = idempotency_key, )
	
	# =====================================================
	# 💰 BULK CREATE LINHAS
	# =====================================================
	
	linhas_model = [LedgerLine(entry = entry, conta = linha.conta, valor = linha.valor, natureza = linha.natureza, inquilino = inquilino, ) for linha in linhas]
	
	LedgerLine.objects.bulk_create(linhas_model, )
	
	# =====================================================
	# 📡 PUBLICAR EVENTO APÓS COMMIT
	# =====================================================
	
	def publicar_evento() :
		evento = LedgerEntryCriado(entry_id = entry.id, inquilino_id = entry.inquilino_id, data_contabil = entry.data_contabil, linhas = [
			LinhaLedgerDTO(conta_id = l.id_custom, valor = str(l.valor, ), natureza = l.natureza, ) for l in linhas_model], )
		
		atualizar_saldo(evento, )
	
	transaction.on_commit(publicar_evento, )
	
	return entry