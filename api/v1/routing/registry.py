"""
Compat layer.

The canonical route registration lives in `api.v1.routing.rotas`.
"""

from .routes import register_routes

__all__ = ["register_routes"]
