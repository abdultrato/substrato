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
        field = result_item.exame_campo

        indicator = None
        new_color = None
        new_alert = None

        patient = None
        if result_item.resultado and result_item.resultado.requisicao:
            patient = result_item.resultado.requisicao.paciente

        if patient:
            reference = ClinicalReferenceResolver.resolve(field, patient)

            if reference:
                value = str(result_item.resultado_valor) if result_item.resultado_valor is not None else None
                data = ReferenceInterpreter.interpret(value, reference)

                if data:
                    indicator = data.get("status_clinico")
                    new_color = data.get("cor_laudo")
                    new_alert = data.get("alerta_critico")

        if indicator is None:
            indicator = field.interpretar_resultado(result_item.resultado_valor)

        if indicator is None:
            return

        result_item.status_clinico = indicator

        if new_color:
            result_item.cor_laudo = new_color
        else:
            result_item.cor_laudo = STATUS_COLORS.get(indicator)

        if new_alert is not None:
            result_item.alerta_critico = bool(new_alert)
        elif "CRITICO" in indicator:
            result_item.alerta_critico = True

        ResultService._delta_check(result_item)
        ResultService._auto_validate(result_item)

    @staticmethod
    def _delta_check(result_item):
        field = result_item.exame_campo

        if not field.delta_max:
            return

        patient = None
        if result_item.resultado and result_item.resultado.requisicao:
            patient = result_item.resultado.requisicao.paciente

        if not patient:
            return

        previous = (
            result_item.__class__.objects.filter(
                resultado__requisicao__paciente=patient,
                exame_campo=field,
            )
            .exclude(pk=result_item.pk)
            .order_by("-criado_em")
            .first()
        )

        if not previous:
            return

        try:
            current = float(result_item.resultado_valor)
            older = float(previous.resultado_valor)
        except Exception:
            return

        delta = abs(current - older)

        if delta > field.delta_max:
            result_item.alerta_critico = True

    @staticmethod
    def _auto_validate(result_item):
        """
        Auto-validação foi desativada.
        """

        return


ServicoResultado = ResultService
ResultService.interpretar = staticmethod(ResultService.interpret)
ResultService._auto_validar = staticmethod(ResultService._auto_validate)
