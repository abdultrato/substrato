"""Serviços de domínio do módulo de enfermagem."""

from .lab_request_intake import sync_lab_collection_record

__all__ = [
    "sync_lab_collection_record",
]
