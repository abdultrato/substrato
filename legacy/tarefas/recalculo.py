from frontend.models import Fatura

from .base import TaskBase


class RecalculoFaturasTask(TaskBase):
    name = "recalculo_faturas"

    @classmethod
    def run(cls):
        cls.log_inicio()

        for fatura in Fatura.objects.all():
            fatura.recalcular_totais(save=True)

        cls.log_fim()
