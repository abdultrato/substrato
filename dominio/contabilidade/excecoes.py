class DominioContabilidadeErro(
		Exception,
		):
	"""
	Classe base para todas as exceções de domínio contábil.
	"""
	
	pass


# =========================================================
# LEDGER
# =========================================================


class LedgerImutavelErro(
		DominioContabilidadeErro,
		):
	"""
	Tentativa de alterar ou remover LedgerEntry.
	"""
	
	pass


class LedgerJaRevertidoErro(
		DominioContabilidadeErro,
		):
	"""
	LedgerEntry já foi revertido anteriormente.
	"""
	
	pass


class ReversaoInvalidaErro(
		DominioContabilidadeErro,
		):
	"""
	Tentativa de reverter algo que não pode ser revertido.
	"""
	
	pass


class PeriodoContabilFechadoErro(
		DominioContabilidadeErro,
		):
	"""
	Operação bloqueada por período fechado.
	"""
	
	pass


# =========================================================
# PARTIDAS
# =========================================================


class PartidasDesbalanceadasErro(
		DominioContabilidadeErro,
		):
	"""
	Débito diferente de crédito.
	"""
	
	pass


class LancamentoSemLinhasSuficientesErro(
		DominioContabilidadeErro,
		):
	"""
	Lançamento com menos de duas linhas.
	"""
	
	pass


# =========================================================
# CONTA
# =========================================================


class AlteracaoTipoContaNaoPermitidaErro(
		DominioContabilidadeErro,
		):
	"""
	Conta com histórico não pode alterar tipo.
	"""
	
	pass


class ContaComSaldoNaoPodeSerDesativadaErro(
		DominioContabilidadeErro,
		):
	"""
	Conta com saldo ≠ 0 não pode ser desativada.
	"""
	
	pass


class ContaInativaErro(
		DominioContabilidadeErro,
		):
	"""
	Tentativa de lançar em conta inativa.
	"""
	
	pass


# =========================================================
# MULTI-TENANT
# =========================================================


class ViolacaoInquilinoErro(
		DominioContabilidadeErro,
		):
	"""
	Operação fora do escopo do inquilino.
	"""
	
	pass
