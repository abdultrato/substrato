from django.db import transaction
from frontend.billing.models import LabExam, LabRequest

from ..base import BaseService


class RequisicaoService(BaseService):
    @classmethod
    @transaction.atomic
    def criar_requisicao(cls, *, paciente, exames_ids, observacoes="", analista=None):
        exames = LabExam.objects.filter(id__in=exames_ids, ativo=True)

        if not exames.exists():
            return cls.fail("Nenhum exame válido selecionado.")

        requisicao = LabRequest.objects.create(
            paciente=paciente,
            observacoes=observacoes,
            analista=analista,
        )

        requisicao.exames.set(exames)

        requisicao.criar_itens_automaticos()
        requisicao.criar_resultados_automaticos()

        return cls.ok(requisicao)

    @classmethod
    @transaction.atomic
    def cancel(cls, requisicao: LabRequest):
        requisicao.status = LabRequest.Status.CANCELADA
        requisicao.save(update_fields=["status"])
        return cls.ok(requisicao)

    @classmethod
    @transaction.atomic
    def validar_resultados(cls, requisicao: LabRequest, usuario):
        requisicao.resultados.update(validado=True, validado_por=usuario)
        requisicao.status = LabRequest.Status.VALIDADA
        requisicao.save(update_fields=["status"])
        return cls.ok(requisicao)
