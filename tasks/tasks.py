"""
Módulo padrão de autodiscovery do Celery.

Celery procura por `<package>.tasks` quando faz autodiscover. Mantemos as tasks
reais em módulos mais específicos e as reexportamos aqui.
"""

from tasks.authorization_worker import process_authorization_task
from tasks.billing.recalculation import recalculate_invoice_task, recalculate_invoices
from tasks.export_jobs import run_export_job

__all__ = [
    "process_authorization_task",
    "recalculate_invoice_task",
    "recalculate_invoices",
    "run_export_job",
]
