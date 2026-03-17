from datetime import timedelta

from django.utils import timezone
from frontend.models import RequisicaoAnalise, ResultadoItem

from .base import TaskBase


class CleanupTask(TaskBase):
    name = "cleanup_sistema"

    @classmethod
    def run(cls):
        cls.log_inicio()

        limite = timezone.now() - timedelta(days=90)

        # remover resultados não validados antigos
        ResultadoItem.objects.filter(validado=False, criado_em__lt=limite).delete()

        # marcar requisições antigas pendentes como canceladas
        RequisicaoAnalise.objects.filter(status=RequisicaoAnalise.Status.PENDENTE, criado_em__lt=limite).update(
            status=RequisicaoAnalise.Status.CANCELADA
        )

        cls.log_fim()
