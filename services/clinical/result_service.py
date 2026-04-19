from domain.clinical.interpreter import ClinicalStatus, interpret
from domain.clinical.reference_values import ClinicalReferenceResolver


class ResultService:
    """
    Orquestra interpretação clínica.
    """

    @staticmethod
    def interpret(result_item):
        request = getattr(result_item, "request", None)
        if request is None and getattr(result_item, "result", None) is not None:
            request = result_item.result.request

        if request is None:
            return

        patient = request.patient
        exam_field = result_item.exam_field

        reference = ClinicalReferenceResolver.resolve(
            exam_field,
            patient,
        )

        status = interpret(
            getattr(result_item, "result_value", getattr(result_item, "result", None)),
            reference,
        )

        result_item.clinical_status = status
        result_item.critical_alert = status == ClinicalStatus.CRITICAL
        result_item.report_color = {
            ClinicalStatus.NORMAL: "preto",
            ClinicalStatus.LOW: "azul",
            ClinicalStatus.HIGH: "vermelho",
            ClinicalStatus.CRITICAL: "vermelho",
        }.get(status)

        result_item.save(update_fields=["clinical_status", "report_color", "critical_alert"])


"""Serviços para emissão e manipulação de resultados de exames."""
