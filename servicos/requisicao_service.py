from django.db import transaction

from frontend.billing.models import Exame, RequisicaoAnalise

from .base import BaseService


class RequisicaoService(BaseService):
    @classmethod
    @transaction.atomic
    def criar_requisicao(cls, *, paciente, exames_ids, observacoes="", analista=None):
        exames = Exame.objects.filter(id__in=exames_ids, ativo=True)

        if not exames.exists():
            return cls.fail("Nenhum exame válido selecionado.")

        requisicao = RequisicaoAnalise.objects.create(
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
    def cancelar(cls, requisicao: RequisicaoAnalise):
        requisicao.status = RequisicaoAnalise.Status.CANCELADA
        requisicao.save(update_fields=["status"])
        return cls.ok(requisicao)

    @classmethod
    @transaction.atomic
    def validar_resultados(cls, requisicao: RequisicaoAnalise, usuario):
        requisicao.resultados.update(validado=True, validado_por=usuario)
        requisicao.status = RequisicaoAnalise.Status.VALIDADA
        requisicao.save(update_fields=["status"])
        return cls.ok(requisicao)
