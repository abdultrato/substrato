"""
Módulo padrão de autodiscovery do Celery.

Celery procura por `<package>.tasks` quando faz autodiscover. Mantemos as tasks
reais em módulos mais específicos e as reexportamos aqui.
"""

from tarefas.autorizacao_worker import processar_autorizacao_task

__all__ = [
    "processar_autorizacao_task",
]

