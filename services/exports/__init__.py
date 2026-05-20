"""Generators de exportação para PDF/CSV/Word."""

from .patients import generate_patients_csv

__all__ = [
    "generate_patients_csv",
]
