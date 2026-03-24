from core.constants.clinical_event_type import ClinicalEventType


class ResultValidatedHandler:
    @staticmethod
    def handle(event):
        from apps.clinical.models.clinical_history import ClinicalHistory
        from apps.clinical.models.result_item import ResultItem

        result = (
            ResultItem.all_objects.select_related(
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

        patient = result.resultado.requisicao.paciente
        description = f"Resultado validado: {result.exame_campo.nome} = {result.resultado_valor}"

        ClinicalHistory.objects.create(
            paciente=patient,
            tipo_evento=ClinicalEventType.RESULTADO_VALIDADO,
            descricao=description,
            data_evento=result.data_validacao,
        )


ResultadoValidadoHandler = ResultValidatedHandler
