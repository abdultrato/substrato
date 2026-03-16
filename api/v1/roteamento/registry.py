"""
Compat layer.

The canonical route registration lives in `api.v1.roteamento.rotas`.
"""

from .rotas import registrar_rotas

__all__ = ["registrar_rotas"]
