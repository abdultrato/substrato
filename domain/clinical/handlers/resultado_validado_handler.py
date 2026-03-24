# LOCAL: dominio/clinico/handlers/resultado_validado_handler.py

from core.constants.tipo_evento_clinico import TipoEventoClinico


class ResultadoValidadoHandler:
    @staticmethod
    def handle(event):
        # 🔒 Import lazy para evitar circular import
        from apps.clinical.models.clinical_history import ClinicalHistory
        from apps.clinical.models.result_item import ResultItem

        resultado = (
            ResultItem.all_objects.select_related(
                "requisicao__paciente",
                "exame_campo",
            )
            .only(
                "resultado",
                "data_validacao",
                "exame_campo__nome",
                "requisicao__paciente",
            )
            .get(pk=event.resultado_id)
        )

        paciente = resultado.requisicao.paciente

        descricao = f"Resultado validado: {resultado.exame_campo.nome} = {resultado.resultado}"

        ClinicalHistory.objects.create(
            paciente=paciente,
            tipo_evento=TipoEventoClinico.RESULTADO_VALIDADO,
            descricao=descricao,
            data_evento=resultado.data_validacao,
        )
