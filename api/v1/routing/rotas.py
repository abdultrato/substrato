"""
Camada de compatibilidade para imports legados.
"""

from .routes import VIEWSET_GROUPS, register_routes

__all__ = [
    "VIEWSET_GROUPS",
    "register_routes",
]
