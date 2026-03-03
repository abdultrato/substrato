# LOCAL: infrastrutura/contexto/inquilino.py
from contextvars import ContextVar

from infrastrutura.contexto.request_user import get_current_user

_inquilino_ctx: ContextVar = ContextVar("inquilino", default = None)

usuario = get_current_user()


def set_inquilino(inquilino) :
	"""
	Define o tenant no contexto atual.
	Retorna token para restauração segura.
	"""
	return _inquilino_ctx.set(inquilino)


def get_inquilino() :
	"""
	Obtém o tenant atual.
	"""
	return _inquilino_ctx.get()


def reset_inquilino(token) :
	"""
	Restaura estado anterior do contexto.
	"""
	_inquilino_ctx.reset(token)


def clear_inquilino() :
	"""
	Remove explicitamente o tenant do contexto.
	"""
	_inquilino_ctx.set(None)