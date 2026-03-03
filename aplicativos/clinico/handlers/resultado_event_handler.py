# LOCAL: aplicativos/clinico/handlers/resultado_event_handler.py

from aplicativos.clinico.modelos.evento_clinico import EventoClinico
from aplicativos.clinico.modelos.resultado_analise import ResultadoItem
from nucleo.constantes.tipo_evento_clinico import TipoEventoClinico


def registrar_resultado_validado(event) :
	resultado = ResultadoItem.all_objects.select_related("requisicao__paciente").get(pk = event.resultado_id)
	
	EventoClinico.objects.create(paciente = resultado.requisicao.paciente, requisicao = resultado.requisicao, resultado = resultado, tipo_evento = TipoEventoClinico.RESULTADO_VALIDADO, descricao = (
		f"Resultado validado: "
		f"{resultado.exame_campo.nome} "
		f"= {resultado.resultado}"), )