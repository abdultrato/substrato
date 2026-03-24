"""
Pacote de tasks.

Mantido leve para evitar importação de dependências opcionais
durante descoberta de testes.
"""

try:
    from . import generate_pdf
except Exception:  # pragma: no cover
    generate_pdf = None

gerar_pdf = generate_pdf

__all__ = ["generate_pdf", "gerar_pdf"]
