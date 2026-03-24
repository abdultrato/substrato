"""
Pacote de tasks.

Mantido leve para evitar importação de dependências opcionais
durante descoberta de testes.
"""

try:
    from . import gerar_pdf
except Exception:  # pragma: no cover
    gerar_pdf = None

__all__ = ["gerar_pdf"]
