"""Serviços para interpretar resultados clínicos e gerar labels/cores."""

from domain.clinical.patient_rules import ResultInterpreter as ReferenceInterpreter
from domain.clinical.reference_values import ClinicalReferenceResolver

STATUS_COLORS = {
    "NORMAL": "preto",
    "BAIXO": "azul",
    "ALTO": "vermelho",
    "CRITICO_BAIXO": "vermelho",
    "CRITICO_ALTO": "vermelho",
}


class ResultService:
    @staticmethod
    def interpret(result_item):
        field = result_item.exam_field

        indicator = None
        new_color = None
        new_alert = None

        patient = None
        if result_item.result and result_item.result.request:
            patient = result_item.result.request.patient

        if patient:
            reference = ClinicalReferenceResolver.resolve(field, patient)

            if reference:
                value = str(result_item.result_value) if result_item.result_value is not None else None
                date = ReferenceInterpreter.interpret(value, reference)

                if date:
                    indicator = date.get("clinical_status")
                    new_color = date.get("report_color")
                    new_alert = date.get("critical_alert")

        if indicator is None:
            indicator = field.interpret_result(result_item.result_value)

        if indicator is None:
            return

        result_item.clinical_status = indicator

        if new_color:
            result_item.report_color = new_color
        else:
            result_item.report_color = STATUS_COLORS.get(indicator)

        if new_alert is not None:
            result_item.critical_alert = bool(new_alert)
        elif "CRITICO" in indicator or indicator in ("↑↑", "↓↓"):
            result_item.critical_alert = True

        ResultService._delta_check(result_item)
        ResultService._auto_validate(result_item)

    @staticmethod
    def _delta_check(result_item):
        field = result_item.exam_field

        # LabTestField não define max_delta (delta-check só no LabExamField clínico).
        if not getattr(field, "max_delta", None):
            return

        patient = None
        if result_item.result and result_item.result.request:
            patient = result_item.result.request.patient

        if not patient:
            return

        previous = (
            result_item.__class__.objects.filter(
                result__request__patient=patient,
                exam_field=field,
            )
            .exclude(pk=result_item.pk)
            .order_by("-created_at")
            .first()
        )

        if not previous:
            return

        try:
            current = float(result_item.result_value)
            older = float(previous.result_value)
        except Exception:
            return

        delta = abs(current - older)

        if delta > field.max_delta:
            result_item.critical_alert = True

    @staticmethod
    def _auto_validate(result_item):
        """
        Auto-validação foi desativada.
        """

        return
