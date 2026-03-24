class RequestCalculator:
    @staticmethod
    def calculate_total(request):
        return sum(item.total for item in request.itens.all())


class RequestFlow:
    @staticmethod
    def determine_status(request):
        results = getattr(request, "resultados", None)
        if results is not None:
            results = results.all()
        else:
            result = getattr(request, "resultado", None)
            results = result.itens.all() if result is not None else None

        created_state = getattr(getattr(request, "Status", None), "CRIADA", getattr(request, "estado", None))
        in_progress_state = getattr(
            getattr(request, "Status", None),
            "EM_PROCESSAMENTO",
            getattr(request, "estado", None),
        )
        awaiting_validation_state = getattr(
            getattr(request, "Status", None),
            "AGUARDANDO_VALIDACAO",
            getattr(request, "estado", None),
        )
        current_state = getattr(request, "status", getattr(request, "estado", None))

        if results is None or not results.exists():
            return created_state

        field_names = {field.name for field in results.model._meta.get_fields()}
        value_field = "resultado_valor" if "resultado_valor" in field_names else "valor"

        if results.filter(**{f"{value_field}__isnull": False}).exists():
            return in_progress_state

        if results.filter(**{f"{value_field}__isnull": True}).count() == 0:
            return awaiting_validation_state

        return current_state


CalculadoraRequisicao = RequestCalculator
FluxoRequisicao = RequestFlow
RequestCalculator.calcular_total = staticmethod(RequestCalculator.calculate_total)
RequestFlow.determinar_status = staticmethod(RequestFlow.determine_status)
RequestFlow.atualizar = staticmethod(RequestFlow.determine_status)
