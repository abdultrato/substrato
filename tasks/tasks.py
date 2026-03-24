"""
Módulo padrão de autodiscovery do Celery.

Celery procura por `<package>.tasks` quando faz autodiscover. Mantemos as tasks
reais em módulos mais específicos e as reexportamos aqui.
"""

from tasks.authorization_worker import process_authorization_task

__all__ = [
    "process_authorization_task",
]
