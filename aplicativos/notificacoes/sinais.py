from decimal import Decimal

from django.db.models.signals import post_save
from django.dispatch import receiver

from aplicativos.clinico.modelos.resultado_analise import ResultadoItem
from aplicativos.faturamento.modelos.fatura import Fatura
from aplicativos.pagamentos.modelos.recibo import Recibo
from dominio.clinico.estado_resultado import EstadoResultado
from .modelos.notificacao import Notificacao
from .servicos import ServicoNotificacao


def _resolver_paciente_fatura(fatura):
    paciente = getattr(fatura, "paciente", None)
    if paciente:
        return paciente

    origem = getattr(fatura, "origem", None)
    if origem == Fatura.Origem.CLINICO:
        requisicao = getattr(fatura, "requisicao", None)
        return getattr(requisicao, "paciente", None)

    if origem == Fatura.Origem.ENFERMAGEM:
        procedimento = getattr(fatura, "procedimento", None)
        return getattr(procedimento, "paciente", None)

    return None


@receiver(
    post_save,
    sender=ResultadoItem,
    dispatch_uid="notificacoes.resultado_disponivel",
)
def notificar_resultado(sender, instance, created, **kwargs):
    if instance.estado != EstadoResultado.VALIDADO:
        return

    # Notifica quando o último item do resultado foi validado.
    if instance.resultado.itens.exclude(estado=EstadoResultado.VALIDADO).exists():
        return

    paciente = instance.resultado.requisicao.paciente
    if not paciente:
        return

    codigo_requisicao = instance.resultado.requisicao.id_custom or instance.resultado.requisicao_id
    codigo_resultado = instance.resultado.id_custom or instance.resultado_id
    assunto = "Resultado disponível"
    mensagem = (
        f"Seu resultado {codigo_resultado} da requisição {codigo_requisicao} "
        "já está disponível para consulta."
    )

    ServicoNotificacao().enviar_para_paciente(
        paciente=paciente,
        assunto=assunto,
        mensagem=mensagem,
        tipo_evento=Notificacao.TipoEvento.RESULTADO_DISPONIVEL,
        referencia_externa=f"resultado:{instance.resultado_id}:validado",
    )


@receiver(
    post_save,
    sender=Fatura,
    dispatch_uid="notificacoes.fatura_emitida",
)
def notificar_fatura_emitida(sender, instance, created, **kwargs):
    if instance.estado != Fatura.Estado.EMITIDA:
        return

    paciente = _resolver_paciente_fatura(instance)
    if not paciente:
        return

    codigo_fatura = instance.id_custom or instance.pk
    valor_total = instance.total or Decimal("0.00")
    assunto = "Fatura emitida"
    mensagem = (
        f"A sua fatura {codigo_fatura} foi emitida. "
        f"Valor total: {valor_total:.2f}."
    )

    ServicoNotificacao().enviar_para_paciente(
        paciente=paciente,
        assunto=assunto,
        mensagem=mensagem,
        tipo_evento=Notificacao.TipoEvento.FATURA_EMITIDA,
        referencia_externa=f"fatura:{instance.pk}:emitida",
    )


@receiver(
    post_save,
    sender=Recibo,
    dispatch_uid="notificacoes.recibo_gerado",
)
def notificar_recibo_gerado(sender, instance, created, **kwargs):
    if not created:
        return

    paciente = _resolver_paciente_fatura(instance.fatura)
    if not paciente:
        return

    codigo_fatura = instance.fatura.id_custom or instance.fatura_id
    assunto = "Recibo disponível"
    mensagem = (
        f"Seu recibo {instance.numero} foi gerado para a fatura {codigo_fatura}. "
        f"Valor recebido: {instance.valor:.2f}."
    )

    ServicoNotificacao().enviar_para_paciente(
        paciente=paciente,
        assunto=assunto,
        mensagem=mensagem,
        tipo_evento=Notificacao.TipoEvento.RECIBO_GERADO,
        referencia_externa=f"recibo:{instance.pk}:gerado",
    )
