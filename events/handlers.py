import logging

logger = logging.getLogger("eventos")


class ResultadoValidadoHandler:
    """
    Handler responsável por reagir ao evento ResultadoValidadoEvent.

    Responsabilidade:
    - Registrar histórico clínico automaticamente
    """

    @staticmethod
    def handle(event) -> None:
        # 🔒 Import lazy para evitar circular import
        from apps.clinical.models.clinical_history import ClinicalHistory
        from apps.clinical.models.result_item import ResultItem

        item = (
            ResultItem.all_objects.select_related(
                "resultado",
                "resultado__requisicao",
                "resultado__requisicao__paciente",
                "exame_campo",
            )
            .only(
                "resultado_valor",
                "data_validacao",
                "exame_campo__nome",
                "resultado__requisicao__paciente",
            )
            .get(pk=event.resultado_id)
        )

        paciente = item.resultado.requisicao.paciente

        descricao = f"Resultado validado: {item.exame_campo.nome} = {item.resultado_valor}"

        # HistoricoClinico é um log simples (sem tipo_evento).
        ClinicalHistory.objects.create(
            paciente=paciente,
            descricao=descricao,
        )


class AutorizacaoSolicitadaHandler:
    """
    Handler responsável por enfileirar o processamento de autorizações.
    """

    @staticmethod
    def handle(event) -> None:
        try:
            from tasks.autorizacao_worker import processar_autorizacao_task

            processar_autorizacao_task.delay(event.autorizacao_id)
        except Exception:
            logger.exception(
                "Erro ao enfileirar autorizacao",
                extra={"autorizacao_id": getattr(event, "autorizacao_id", None)},
            )
