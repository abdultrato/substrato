class ResultadoValidadoHandler :
	"""
	Handler responsável por reagir ao evento ResultadoValidadoEvent.

	Responsabilidade:
	- Registrar histórico clínico automaticamente
	"""
	
	@staticmethod
	def handle(event) -> None :
		# 🔒 Import lazy para evitar circular import
		from aplicativos.clinico.modelos.resultado_analise import ResultadoItem
		from aplicativos.clinico.modelos.historico_clinico import HistoricoClinico
		
		item = (
			ResultadoItem.all_objects.select_related(
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
		HistoricoClinico.objects.create(
			paciente=paciente,
			descricao=descricao,
		)
