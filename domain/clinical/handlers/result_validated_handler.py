"""Handler para registrar histórico quando um resultado é validado."""


class ResultValidatedHandler:
    @staticmethod
    def handle(event):
        from apps.clinical.models.clinical_history import ClinicalHistory
        from apps.clinical.models.result_item import ResultItem

        result = (
            ResultItem.all_objects.select_related(
                "result__request__patient",
                "exam_field",
            )
            .only(
                "result_value",
                "exam_field__name",
                "result__request__patient",
            )
            .get(pk=event.result_id)
        )

        patient = result.result.request.patient
        description = f"Resultado validado: {result.exam_field.name} = {result.result_value}"

        ClinicalHistory.objects.create(
            patient=patient,
            description=description,
        )


ResultadoValidadoHandler = ResultValidatedHandler
