from domain.clinical.interpreter import ClinicalStatus, interpret
from domain.clinical.reference_values import ClinicalReferenceResolver


class ResultService:
    """
    Orquestra interpretação clínica.
    """

    @staticmethod
    def interpret(result_item):
        request = getattr(result_item, "requisicao", None)
        if request is None and getattr(result_item, "resultado", None) is not None:
            request = result_item.resultado.requisicao

        if request is None:
            return

        patient = request.paciente
        exam_field = result_item.exame_campo

        reference = ClinicalReferenceResolver.resolve(
            exam_field,
            patient,
        )

        status = interpret(
            getattr(result_item, "resultado_valor", getattr(result_item, "resultado", None)),
            reference,
        )

        result_item.status_clinico = status
        result_item.alerta_critico = status == ClinicalStatus.CRITICAL
        result_item.cor_laudo = {
            ClinicalStatus.NORMAL: "preto",
            ClinicalStatus.LOW: "azul",
            ClinicalStatus.HIGH: "vermelho",
            ClinicalStatus.CRITICAL: "vermelho",
        }.get(status)

        result_item.save(update_fields=["status_clinico", "cor_laudo", "alerta_critico"])


ServicoResultado = ResultService
ResultService.interpretar = ResultService.interpret
