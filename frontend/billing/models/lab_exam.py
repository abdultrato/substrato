"""Reexporta o modelo LabExam para camada de frontend legado."""

from apps.clinical.models.lab_exam import LabExam

__all__ = ["LabExam"]
